import type {
  FilterResult,
  MatchResult,
  Order,
  Profile,
  ViewState,
} from "./types";

/* ------------------------------------------------------------------ */
/* Мусор: работа «за отзыв», оплата процентом, крикливые заголовки     */
/* ------------------------------------------------------------------ */

const JUNK_PATTERNS: { re: RegExp; reason: string }[] = [
  {
    re: /за\s+отзыв|взамен\s+на\s+отзыв|отзыв(?:ам|ы)?\s+на\s+(?:wildberries|озон|маркет|wb)|оплат[ау]?\s+отзыв/i,
    reason: "предлагают работать «за отзыв»",
  },
  {
    re: /\b(?:бесплатно|без\s+оплаты)\b/i,
    reason: "упоминается бесплатная работа",
  },
  {
    re: /за\s+процент|процентом\s+с\s+прибыл|партн[её]рств|дол[юя]\s+в\s+проект|партн[её]ра\s+в\s+бизнес/i,
    reason: "оплата «процентом» вместо денег",
  },
];

export function junkReason(o: Order): string | null {
  const text = `${o.title} ${o.description}`;
  for (const p of JUNK_PATTERNS) {
    if (p.re.test(text)) return p.reason;
  }
  if (o.budgetMax != null && o.budgetMax < 300) {
    return "бюджет ниже 300 ₽";
  }
  const letters = o.title.replace(/[^A-Za-zА-Яа-яЁё]/g, "");
  if (letters.length > 10) {
    const upper = letters.replace(/[^A-ZА-ЯЁ]/g, "").length / letters.length;
    if (upper > 0.7) return "заголовок набран капсом";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Дедупликация похожих заказов                                        */
/* ------------------------------------------------------------------ */

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .sort()
    .join(" ");
}

export function dedupeOrders(orders: Order[]): { orders: Order[]; duplicates: number } {
  const byKey = new Map<string, Order>();
  let duplicates = 0;
  for (const o of orders) {
    const key = normalizeTitle(o.title);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, o);
    } else {
      duplicates += 1;
      if (o.publishedAt > existing.publishedAt) byKey.set(key, o);
    }
  }
  return { orders: [...byKey.values()], duplicates };
}

/* ------------------------------------------------------------------ */
/* Оценка совпадения с профилем (0–100)                                */
/* ------------------------------------------------------------------ */

export function scoreOrder(o: Order, p: Profile): MatchResult {
  const configured =
    p.categories.length > 0 ||
    p.keywords.length > 0 ||
    p.budgetMin != null ||
    p.budgetMax != null;
  if (!configured) return { score: null, reasons: [] };

  let score = 0;
  const reasons: string[] = [];

  if (p.categories.length > 0) {
    if (p.categories.includes(o.categoryId)) {
      score += 35;
      reasons.push("ваша ниша");
    } else {
      score -= 30;
    }
  }

  const t = o.title.toLowerCase();
  const d = o.description.toLowerCase();
  let titleHits = 0;
  let descHits = 0;
  for (const raw of p.keywords) {
    const k = raw.trim().toLowerCase();
    if (!k) continue;
    if (titleHits < 2 && t.includes(k)) {
      score += 25;
      titleHits += 1;
      reasons.push(`«${raw.trim()}» в заголовке`);
    } else if (descHits < 2 && d.includes(k)) {
      score += 10;
      descHits += 1;
      reasons.push(`«${raw.trim()}» в описании`);
    }
  }

  const oMin = o.budgetMin ?? o.budgetMax;
  const oMax = o.budgetMax ?? o.budgetMin;
  if (oMin != null && oMax != null && (p.budgetMin != null || p.budgetMax != null)) {
    const okMin = p.budgetMin == null || oMax >= p.budgetMin;
    const okMax = p.budgetMax == null || oMin <= p.budgetMax;
    if (okMin && okMax) {
      score += 10;
      reasons.push("бюджет в вашем диапазоне");
    } else {
      score -= 20;
    }
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/* ------------------------------------------------------------------ */
/* Полный конвейер фильтрации                                          */
/* ------------------------------------------------------------------ */

export function applyFilters(
  all: Order[],
  p: Profile,
  v: ViewState,
  dismissed: Set<string>,
): FilterResult {
  const hidden = { duplicates: 0, junk: 0, dismissed: 0, filtered: 0 };

  // 1. дедупликация
  const deduped = dedupeOrders(all);
  hidden.duplicates = deduped.duplicates;

  // 2. скрытые вручную
  const notDismissed = deduped.orders.filter((o) => {
    if (dismissed.has(o.id)) {
      hidden.dismissed += 1;
      return false;
    }
    return true;
  });

  // 3. площадки
  let list = notDismissed.filter((o) => {
    if (!v.platforms.includes(o.platform)) {
      hidden.filtered += 1;
      return false;
    }
    return true;
  });

  // 4. мусор (считаем до отсечения, чтобы показать статистику)
  const junkByld = new Map<string, string>();
  for (const o of list) {
    const r = junkReason(o);
    if (r) junkByld.set(o.id, r);
  }
  hidden.junk = junkByld.size;
  if (v.hideJunk) {
    list = list.filter((o) => {
      if (junkByld.has(o.id)) {
        hidden.filtered += 1;
        return false;
      }
      return true;
    });
  }

  // 5. свежесть
  if (v.freshness > 0) {
    const since = Date.now() - v.freshness * 3_600_000;
    list = list.filter((o) => {
      if (o.publishedAt < since) {
        hidden.filtered += 1;
        return false;
      }
      return true;
    });
  }

  // 6. ниша (жёсткий фильтр)
  if (p.categories.length > 0) {
    const cats = new Set(p.categories);
    list = list.filter((o) => {
      if (!cats.has(o.categoryId)) {
        hidden.filtered += 1;
        return false;
      }
      return true;
    });
  }

  // 7. стоп-слова (жёсткий фильтр)
  if (p.exclude.length > 0) {
    list = list.filter((o) => {
      const hay = `${o.title} ${o.description}`.toLowerCase();
      const bad = p.exclude.find((w) => w.trim() && hay.includes(w.trim().toLowerCase()));
      if (bad) {
        hidden.filtered += 1;
        return false;
      }
      return true;
    });
  }

  // 8. бюджет (заказы без бюджета не отсекаем — бюджет часто уточняют в чате)
  if (p.budgetMin != null || p.budgetMax != null) {
    list = list.filter((o) => {
      const oMin = o.budgetMin ?? o.budgetMax;
      const oMax = o.budgetMax ?? o.budgetMin;
      if (oMin == null || oMax == null) return true;
      const okMin = p.budgetMin == null || oMax >= p.budgetMin;
      const okMax = p.budgetMax == null || oMin <= p.budgetMax;
      if (!(okMin && okMax)) {
        hidden.filtered += 1;
        return false;
      }
      return true;
    });
  }

  // 9. поиск по тексту
  const q = v.search.trim().toLowerCase();
  if (q) {
    list = list.filter((o) => {
      if (!`${o.title} ${o.description}`.toLowerCase().includes(q)) {
        hidden.filtered += 1;
        return false;
      }
      return true;
    });
  }

  // 10. скоринг для выживших
  const matches = new Map<string, MatchResult>();
  for (const o of list) matches.set(o.id, scoreOrder(o, p));

  // 11. сортировка
  if (v.sort === "new") {
    list.sort((a, b) => b.publishedAt - a.publishedAt);
  } else if (v.sort === "budget") {
    list.sort(
      (a, b) =>
        (b.budgetMax ?? b.budgetMin ?? -1) - (a.budgetMax ?? a.budgetMin ?? -1),
    );
  } else {
    list.sort((a, b) => {
      const sa = matches.get(a.id)?.score ?? -1;
      const sb = matches.get(b.id)?.score ?? -1;
      return sb - sa || b.publishedAt - a.publishedAt;
    });
  }

  return { list, matches, hidden };
}
