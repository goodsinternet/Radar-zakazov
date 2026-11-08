import { NextResponse } from "next/server";
import { categoryFromFl } from "@/lib/categories";
import { getDemoOrders } from "@/lib/demo-orders";
import { syncOrders, telegramStatus } from "@/lib/telegram-client";
import type { Order, OrdersResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const FL_RSS_URL = "https://www.fl.ru/rss/all.xml";
const TTL_MS = 5 * 60 * 1000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

interface FlCache {
  at: number;
  orders: Order[];
  ok: boolean;
  error?: string;
}
let cache: FlCache | null = null;

function cdata(block: string, name: string): string | null {
  return block.match(new RegExp(`<${name}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`))?.[1] ?? null;
}

function plainTag(block: string, name: string): string | null {
  return block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? null;
}

/**
 * Разбор RSS FL.ru. Бюджет заказчик оставляет в заголовке в виде
 * «(Бюджет: 1 000 &#8381;)» — вытаскиваем его в отдельные поля.
 */
function parseFlRss(xml: string): Order[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const orders: Order[] = [];

  for (const b of blocks) {
    const rawTitle = cdata(b, "title");
    const link = plainTag(b, "link");
    if (!rawTitle || !link) continue;

    const desc = (cdata(b, "description") ?? "").replace(/\s+/g, " ").trim();
    const cat = (cdata(b, "category") ?? "").trim();
    const pub = plainTag(b, "pubDate");

    let title = rawTitle.replace(/\s+/g, " ").trim();
    let budgetMin: number | null = null;
    let budgetMax: number | null = null;

    const bm = title.match(/\(\s*[Бб]юджет\s*:\s*([^)]*)\)/);
    if (bm) {
      // суммы идут с разделителями тысяч: «1 000», «20 000 – 30 000»
      const cleaned = bm[1].replace(/&#\d+;/g, " ").replace(/\u00a0/g, " ");
      const groups = cleaned.match(/\d{1,3}(?:\s\d{3})+|\d+/g) ?? [];
      const nums = groups.map((g) => Number(g.replace(/\s/g, "")));
      if (nums.length === 1) {
        budgetMin = nums[0];
        budgetMax = nums[0];
      } else if (nums.length > 1) {
        budgetMin = Math.min(...nums);
        budgetMax = Math.max(...nums);
      }
      title = title.replace(bm[0], "").replace(/\s+/g, " ").trim();
    }

    const top = cat.split("/")[0].trim();
    const numId = link.match(/projects\/(\d+)/)?.[1] ?? link.slice(-40);

    orders.push({
      id: `fl-${numId}`,
      platform: "fl",
      live: true,
      title,
      description: desc,
      categoryId: categoryFromFl(top),
      categoryLabel: cat || "Без категории",
      budgetMin,
      budgetMax,
      url: link,
      publishedAt: pub ? new Date(pub).getTime() : Date.now(),
      demo: false,
    });
  }
  return orders;
}

export async function GET() {
  let flOrders: Order[] = [];
  let ok = false;
  let error: string | undefined;

  const fresh = cache != null && Date.now() - cache.at < TTL_MS;
  if (fresh && cache) {
    flOrders = cache.orders;
    ok = cache.ok;
    error = cache.error;
  } else {
    try {
      const res = await fetch(FL_RSS_URL, {
        headers: {
          "User-Agent": UA,
          Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`FL.ru ответил кодом ${res.status}`);
      const xml = await res.text();
      flOrders = parseFlRss(xml);
      ok = flOrders.length > 0;
      error = ok ? undefined : "лента пришла пустой";
      cache = { at: Date.now(), orders: flOrders, ok, error };
    } catch (e) {
      error = e instanceof Error ? e.message : "неизвестная ошибка";
      // отдаём устаревший кэш, если он есть — лучше старые заказы, чем ничего
      if (cache) flOrders = cache.orders;
    }
  }

  /* ------- Telegram: если подключён — подтягиваем живые заказы ------- */
  let tgOrders: Order[] = [];
  let tgMeta: OrdersResponse["tg"] = { connected: false, count: 0 };
  try {
    const status = await telegramStatus();
    if (status.connected) {
      const sync = await syncOrders(); // с внутренним TTL 5 минут
      tgOrders = sync.orders;
      tgMeta = {
        connected: true,
        count: sync.orders.length,
        error: sync.error ?? undefined,
        lastSyncAt: sync.at,
      };
    }
  } catch {
    tgMeta = { connected: false, count: 0 };
  }

  const demo = getDemoOrders();
  // если реальные TG-заказы уже получены — не подмешиваем демо-Telegram,
  // чтобы одни и те же заказы не дублировались в ленте
  const demoClean = tgOrders.length > 0 ? demo.filter((d) => d.platform !== "telegram") : demo;

  const body: OrdersResponse = {
    orders: [...flOrders, ...tgOrders, ...demoClean],
    fetchedAt: Date.now(),
    fl: { ok, count: flOrders.length, error },
    tg: tgMeta,
    demoCount: demoClean.length,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
