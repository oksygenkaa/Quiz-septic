/* =============================================================================
 * Резервное хранение заявок на сервере (дополнение к Google Таблице, Telegram
 * и amoCRM, ничего из них не заменяет).
 *
 * Формат: один файл leads.jsonl, одна строка JSON = одно событие.
 *   - строка "lead"     — сама заявка (пишется ПЕРВОЙ, до отправки в amoCRM);
 *   - строка "delivery" — результат отправки заявки в канал (amo и т.д.).
 * Файл только дописывается, старые строки не меняются — так заявку невозможно
 * потерять при сбое или перезапуске.
 *
 * Папка задаётся переменной LEADS_DIR (по умолчанию ./data рядом с проектом).
 * ВАЖНО: на сервере укажите папку ВНЕ каталога проекта, чтобы деплой её не
 * затёр, например LEADS_DIR=/var/lib/quiz-data
 *
 * Функции никогда не бросают исключений: сбой хранилища не должен ломать
 * отправку заявки в остальные каналы.
 * ========================================================================== */

export type LeadPayload = Record<string, unknown>;

async function appendLine(record: Record<string, unknown>): Promise<boolean> {
  try {
    const { appendFile, mkdir } = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = process.env["LEADS_DIR"] || path.resolve(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "leads.jsonl"), JSON.stringify(record) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    return true;
  } catch (error) {
    console.error("[quiz] не удалось записать заявку в локальное хранилище", error);
    return false;
  }
}

/** Сохраняет заявку. Возвращает id заявки (или null, если запись не удалась). */
export async function saveLead(payload: LeadPayload, meta: { ip?: string } = {}) {
  const { randomUUID } = await import("node:crypto");
  const id = randomUUID();
  const ok = await appendLine({
    type: "lead",
    id,
    received_at: new Date().toISOString(),
    ip: meta.ip ?? "",
    payload,
  });
  return ok ? id : null;
}

/** Записывает результат доставки заявки в канал (amo, telegram, sheet...). */
export async function markDelivery(
  id: string | null,
  channel: string,
  ok: boolean,
  detail = "",
) {
  if (!id) return;
  await appendLine({
    type: "delivery",
    id,
    channel,
    ok,
    detail: detail.slice(0, 500),
    at: new Date().toISOString(),
  });
}
