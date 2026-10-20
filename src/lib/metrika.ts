/* =============================================================================
 * Яндекс Метрика (счётчик 113673841): константы и безопасный вызов целей.
 *
 * Сам счётчик подключается в src/routes/__root.tsx и выполняется только в
 * браузере. Здесь — строковые идентификаторы целей и функция reachGoal().
 *
 * reachGoal() передаёт только название цели: имя, телефон и любые другие
 * введённые данные в Метрику не отправляются. Функция никогда не бросает
 * исключений — сбой или блокировка счётчика не должны ломать отправку заявки.
 * Возвращает true, если вызов действительно ушёл в счётчик.
 * ========================================================================== */

export const YM_ID = 113673841;

// Строковые идентификаторы целей. В код передаётся именно строка,
// числовые ID из кабинета Метрики в коде не используются.
export const GOALS = {
  quizStarted: "quiz_started",
  quizCompleted: "quiz_completed",
  leadSent: "lead_otpravlen",
} as const;

export type Goal = (typeof GOALS)[keyof typeof GOALS];

export function reachGoal(goal: Goal): boolean {
  try {
    if (typeof window === "undefined") return false;
    const w = window as unknown as { ym?: (...args: unknown[]) => void };
    // Счётчик может быть заблокирован блокировщиком рекламы или не успеть
    // загрузиться — в этом случае просто ничего не делаем.
    if (typeof w.ym !== "function") return false;
    w.ym(YM_ID, "reachGoal", goal);
    return true;
  } catch {
    return false;
  }
}
