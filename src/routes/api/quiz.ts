import { createFileRoute } from "@tanstack/react-router";
import { markDelivery, saveLead } from "../../lib/lead-store";

/* =============================================================================
 * Обработчик /api/quiz: принимает заявку из квиза и создаёт в amoCRM
 * контакт (имя, телефон) и сделку (ответы квиза, utm-метки) на этапе
 * «поступила заявка».
 *
 * Токен берётся из переменной окружения AMO_TOKEN (файл .env на сервере),
 * в коде и в репозитории его быть не должно.
 * ========================================================================== */

const AMO_SUBDOMAIN = process.env["AMO_SUBDOMAIN"] || "amelinameliorama";
const PIPELINE_ID = 11340862; // воронка «Воронка»
const STATUS_ID = 88887066; // этап «поступила заявка»

// ID полей сделки в amoCRM
const FIELD = {
  date: 418893, // Дата заявки (дата и время)
  people: 418895, // Кол-во человек
  living: 418897, // Проживание
  groundwater: 418899, // Грунтовые воды
  contact: 418901, // Способ связи
  utm_source: 418903,
  utm_medium: 418907,
  utm_campaign: 418909,
  utm_content: 418911,
  utm_term: 418913,
  page_url: 418915, // URL страницы
} as const;

type Payload = Record<string, unknown>;

const str = (v: unknown, max = 500): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

// Телефон приводим к виду +7XXXXXXXXXX
function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (!digits.startsWith("7")) digits = "7" + digits;
  return "+" + digits.slice(0, 11);
}

type CustomField = { field_id: number; values: { value: string | number }[] };

// Пустые значения в amoCRM не отправляем: он отвечает на них ошибкой
function textField(id: number, value: string, max = 500): CustomField | null {
  const v = str(value, max);
  return v ? { field_id: id, values: [{ value: v }] } : null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["AMO_TOKEN"];

        // Защита от слишком больших запросов
        const length = Number(request.headers.get("content-length") || 0);
        if (length > 20_000) return json({ ok: false, error: "too_large" }, 413);

        let data: Payload;
        try {
          data = (await request.json()) as Payload;
        } catch {
          return json({ ok: false, error: "bad_json" }, 400);
        }

        const name = str(data["name"], 200);
        const phoneRaw = str(data["phone"], 50);
        if (!name || phoneRaw.replace(/\D/g, "").length < 10) {
          return json({ ok: false, error: "name_or_phone_missing" }, 400);
        }
        const phone = normalizePhone(phoneRaw);

        // 1) Сначала сохраняем заявку у себя на сервере (резервная копия).
        //    Если запись не удалась, заявка всё равно пойдёт дальше в amoCRM.
        const leadId = await saveLead(data, {
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
        });

        if (!token) {
          console.error("[quiz] AMO_TOKEN не задан в окружении сервера");
          await markDelivery(leadId, "amo", false, "AMO_TOKEN не задан");
          return json({ ok: false, error: "server_not_configured" }, 500);
        }

        const parsedDate = Date.parse(str(data["timestamp"], 50));
        const unixTime = Math.floor(
          (Number.isNaN(parsedDate) ? Date.now() : parsedDate) / 1000,
        );

        const customFields = [
          { field_id: FIELD.date, values: [{ value: unixTime }] } as CustomField,
          textField(FIELD.people, str(data["answer_1"])),
          textField(FIELD.living, str(data["answer_2"])),
          textField(FIELD.groundwater, str(data["answer_3"])),
          textField(FIELD.contact, str(data["answer_4"])),
          textField(FIELD.utm_source, str(data["utm_source"])),
          textField(FIELD.utm_medium, str(data["utm_medium"])),
          textField(FIELD.utm_campaign, str(data["utm_campaign"])),
          textField(FIELD.utm_content, str(data["utm_content"])),
          textField(FIELD.utm_term, str(data["utm_term"])),
          textField(FIELD.page_url, str(data["page_url"], 1000), 1000),
        ].filter((f): f is CustomField => f !== null);

        // Один запрос создаёт и сделку, и контакт, и связывает их
        const body = [
          {
            name: `Заявка с квиза: ${name}`,
            pipeline_id: PIPELINE_ID,
            status_id: STATUS_ID,
            custom_fields_values: customFields,
            _embedded: {
              contacts: [
                {
                  name,
                  custom_fields_values: [
                    {
                      field_code: "PHONE",
                      values: [{ value: phone, enum_code: "WORK" }],
                    },
                  ],
                },
              ],
            },
          },
        ];

        try {
          const res = await fetch(
            `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/complex`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(10_000),
            },
          );

          if (!res.ok) {
            // В лог пишем статус и ответ amoCRM, токен не выводим
            const text = await res.text();
            console.error("[quiz] amoCRM ответил ошибкой", res.status, text.slice(0, 1000));
            await markDelivery(leadId, "amo", false, `HTTP ${res.status}: ${text}`);
            return json({ ok: false, error: "amo_error", status: res.status }, 502);
          }

          await markDelivery(leadId, "amo", true);
          return json({ ok: true });
        } catch (error) {
          console.error("[quiz] не удалось обратиться к amoCRM", error);
          await markDelivery(leadId, "amo", false, String(error));
          return json({ ok: false, error: "amo_unreachable" }, 502);
        }
      },
    },
  },
});