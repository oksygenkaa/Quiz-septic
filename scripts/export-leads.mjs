// Выгрузка заявок из leads.jsonl в CSV (открывается в Excel / Google Таблицах).
// Запуск:  node scripts/export-leads.mjs [путь_к_leads.jsonl] > leads.csv
import { readFileSync } from "node:fs";
import path from "node:path";

const file =
  process.argv[2] ||
  path.join(process.env.LEADS_DIR || path.resolve("data"), "leads.jsonl");

const leads = new Map();
for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let r;
  try { r = JSON.parse(line); } catch { continue; }
  if (r.type === "lead") leads.set(r.id, { ...r, delivery: {} });
  else if (r.type === "delivery" && leads.has(r.id)) {
    leads.get(r.id).delivery[r.channel] = r.ok ? "ok" : "ошибка";
  }
}

const cols = [
  ["Дата заявки", (l) => l.payload.timestamp || l.received_at],
  ["Кол-во человек", (l) => l.payload.answer_1],
  ["Проживание", (l) => l.payload.answer_2],
  ["Грунтовые воды", (l) => l.payload.answer_3],
  ["Способ связи", (l) => l.payload.answer_4],
  ["Имя", (l) => l.payload.name],
  ["Телефон", (l) => l.payload.phone],
  ["utm_source", (l) => l.payload.utm_source],
  ["utm_medium", (l) => l.payload.utm_medium],
  ["utm_campaign", (l) => l.payload.utm_campaign],
  ["utm_content", (l) => l.payload.utm_content],
  ["utm_term", (l) => l.payload.utm_term],
  ["URL страницы", (l) => l.payload.page_url],
  ["amoCRM", (l) => l.delivery.amo || "не отправлено"],
  ["id", (l) => l.id],
];
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const out = [cols.map(([h]) => esc(h)).join(",")];
for (const l of leads.values()) out.push(cols.map(([, f]) => esc(f(l))).join(","));
process.stdout.write("\uFEFF" + out.join("\n") + "\n");
