const rub = new Intl.NumberFormat("ru-RU");

/** «15 000 ₽» / «5 000 – 20 000 ₽» / «бюджет не указан» */
export function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "бюджет не указан";
  if (min != null && max != null && min !== max) {
    return `${rub.format(min)} – ${rub.format(max)} ₽`;
  }
  const v = max ?? min ?? 0;
  return `${rub.format(v)} ₽`;
}

/** «5 мин назад», «3 ч назад», «вчера», дата */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const m = Math.floor((now - ts) / 60_000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return "вчера";
  if (d < 7) return `${d} дн назад`;
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
