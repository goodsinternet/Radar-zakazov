import { CATEGORIES } from "./categories";
import type { CategoryId, Order } from "./types";

/* ------------------------------------------------------------------ */
/* Нормализация ссылки на канал: «https://t.me/WorkZavr/123» → «workzavr» */
/* ------------------------------------------------------------------ */

export function normalizeChannelInput(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  s = s
    .replace(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "");
  // отбрасываем номер поста и хвосты вида «?chat», «/12»
  s = s.split(/[/?#\s]/)[0].trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]{3,63}$/.test(s)) return null;
  return s.toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Категория по ключевым словам поста                                   */
/* ------------------------------------------------------------------ */

export function classifyCategory(text: string): CategoryId {
  const t = text.toLowerCase();
  let best: CategoryId = "other";
  let bestHits = 0;
  for (const cat of CATEGORIES) {
    if (cat.id === "other") continue;
    let hits = 0;
    for (const h of cat.hints) {
      if (t.includes(h)) hits += 1;
    }
    if (hits > bestHits) {
      best = cat.id;
      bestHits = hits;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Бюджет из текста поста                                               */
/* ------------------------------------------------------------------ */

const NBSP_RE = /\u00a0/g;

/** «100к» / «100 k» → «100000», чтобы обычный разбор чисел справился
 *  (граница слова — вручную: \b в JS не знает кириллицу) */
function expandK(fragment: string): string {
  return fragment.replace(
    /(\d+(?:[.,]\d+)?)\s*[kк](?![a-zа-яё0-9])/gi,
    (_m, num: string) => String(Math.round(Number(num.replace(",", ".")) * 1000)),
  );
}

/** «1 000» → 1000; берём все числа фрагмента */
function extractNumbers(fragment: string): number[] {
  const f = expandK(fragment).replace(NBSP_RE, " ");
  const groups = f.match(/\d{1,3}(?: \d{3})+|\d+(?:[.,]\d+)?/g) ?? [];
  return groups
    .map((x) => Number(x.replace(/[ ,]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 50_000_000);
}

/** соседние числа через дефис/тире — это диапазон «3000-5000» */
function isRange(fragment: string): boolean {
  return /\d\s*(?:[-–—]\s*)\d/.test(expandK(fragment));
}

const MIN_SENSIBLE = 100; // бюджеты ниже 100 ₽ считаем шумом (графики «с 9 до 18» и т.п.)

export function extractBudget(text: string): {
  min: number | null;
  max: number | null;
} {
  const t = text.replace(NBSP_RE, " ");
  const clamp = (n: number) => (n >= MIN_SENSIBLE && n < 50_000_000 ? n : null);

  // 1. Диапазон «от X до Y»
  const range = t.match(
    /от\s*((?:\d{1,3}[ ])+\d{1,3}|\d+)\s*(?:до|по)\s*((?:\d{1,3}[ ])+\d{1,3}|\d+)/i,
  );
  if (range) {
    const a = extractNumbers(range[1])[0];
    const b = extractNumbers(range[2])[0];
    if (a && b && a >= MIN_SENSIBLE && b >= MIN_SENSIBLE) {
      return { min: clamp(Math.min(a, b)), max: clamp(Math.max(a, b)) };
    }
  }

  // 2. Явная метка: «Бюджет: 50 000 ₽», «Оплата: 3000-5000», «Зарплата 120к»
  const label = t.match(
    /(?:бюджет\w*|оплат\w*|вознаграждени\w*|стоимость|цена|гонорар|зарплат\w*|оклад|budget|fee)\s*[:\-–—]?\s*([^\n]{0,32})/i,
  );
  if (label) {
    const frag = label[1];
    const nums = extractNumbers(frag);
    const fromLabel = /(?:^|\s)от\s/.test(frag);
    const toLabel = /(?:^|\s)до\s/.test(frag);
    if (nums.length >= 2 && isRange(frag)) {
      return {
        min: clamp(Math.min(nums[0], nums[1])),
        max: clamp(Math.max(nums[0], nums[1])),
      };
    }
    if (nums.length >= 2 && fromLabel && toLabel) {
      return { min: clamp(nums[0]), max: clamp(nums[nums.length - 1]) };
    }
    // число, к которому прицеплена валюта — самое надёжное в этом фрагменте
    const withCur = expandK(frag).match(
      /((?:\d{1,3}[ ])+\d{1,3}|\d+)\s*(?:₽|руб\w*|р\.|rub)/i,
    );
    const pick = (a: number) => {
      if (fromLabel && !toLabel) return { min: clamp(a), max: null };
      if (toLabel && !fromLabel) return { min: null, max: clamp(a) };
      return { min: clamp(a), max: clamp(a) };
    };
    if (withCur) {
      const a = extractNumbers(withCur[1])[0];
      if (a) return pick(a);
    }
    if (nums.length > 0) {
      return pick(Math.max(...nums));
    }
  }

  // 3. «от X»
  const from = t.match(/от\s*((?:\d{1,3}[ ])+\d{1,3}|\d+)/i);
  if (from) {
    const a = extractNumbers(from[1])[0];
    if (a && a >= MIN_SENSIBLE) return { min: clamp(a), max: null };
  }

  // 4. «до Y» — только если нет «от»
  if (!from) {
    const to = t.match(/до\s*((?:\d{1,3}[ ])+\d{1,3}|\d+)/i);
    if (to) {
      const b = extractNumbers(to[1])[0];
      if (b && b >= MIN_SENSIBLE) return { min: null, max: clamp(b) };
    }
  }

  // 5. Голая сумма с валютой: «50 000 ₽», «3000 руб.»
  const cur = expandK(t).match(
    /((?:\d{1,3}[ ])+\d{1,3}|\d+)\s*(?:₽|руб\w*|р\.|rub)/i,
  );
  if (cur) {
    const a = extractNumbers(cur[1])[0];
    if (a) return { min: clamp(a), max: clamp(a) };
  }

  return { min: null, max: null };
}

/* ------------------------------------------------------------------ */
/* Заголовок поста                                                      */
/* ------------------------------------------------------------------ */

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0E}\u{FE0F}\u{20D0}-\u{20FF}]/gu;

function cleanLine(line: string): string {
  return line
    .replace(EMOJI_RE, " ")
    .replace(/\s*[\|•·]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTitle(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const raw of lines) {
    // пропускаем ссылки, хэштег-строки и упоминания каналов (@имя · 15:30)
    if (/^(?:https?:\/\/|t\.me\/|@)/i.test(raw)) continue;
    const cleaned = cleanLine(raw)
      .split(/\s+/)
      .filter((w) => !w.startsWith("#"))
      .join(" ")
      .replace(/^[>\-–—*]\s*/, "")
      .trim();
    const letters = cleaned.replace(/[^A-Za-zА-Яа-яЁё]/g, "");
    if (letters.length < 5) continue;
    if (/^(?:чат|подробност\w+|контакт\w+|писать|связ\w+|источник|вакансии?)\s*[:—-]/i.test(cleaned))
      continue;
    return cleaned.length > 110 ? `${cleaned.slice(0, 110).trim()}…` : cleaned;
  }
  return "Заказ из Telegram";
}

/* ------------------------------------------------------------------ */
/* Пост → Order                                                         */
/* ------------------------------------------------------------------ */

export function parseTelegramPost(p: {
  text: string;
  username: string;
  messageId: number;
  /** unix-секунды */
  date: number;
  channelTitle?: string;
}): Order | null {
  const text = p.text.replace(NBSP_RE, " ").trim();
  if (!text) return null;

  const title = extractTitle(text);
  const { min, max } = extractBudget(text);
  const categoryId = classifyCategory(text);
  const categoryLabel =
    CATEGORIES.find((c) => c.id === categoryId)?.label ?? "Прочее";

  // описание: убираем строку-заголовок из тела, чтобы не дублировалось
  const body = text
    .split(/\n+/)
    .filter((l) => cleanLine(l) !== title && l.trim() !== title)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    id: `tg-${p.username}-${p.messageId}`,
    platform: "telegram",
    live: true,
    title,
    description:
      body.length > 900 ? `${body.slice(0, 900).trim()}…` : body || title,
    categoryId,
    categoryLabel: p.channelTitle
      ? `${categoryLabel} · ${p.channelTitle}`
      : categoryLabel,
    budgetMin: min,
    budgetMax: max,
    url: `https://t.me/${p.username}/${p.messageId}`,
    publishedAt: (p.date || 0) * 1000 || Date.now(),
    demo: false,
  };
}
