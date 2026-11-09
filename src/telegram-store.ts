import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

/** Канал, из которого читаем заказы */
export interface TgChannel {
  /** нижний регистр, без @ */
  username: string;
  /** человекочитаемое название канала (как в Telegram) */
  title?: string;
}

/** Всё, что хранится на сервере после успешного входа */
export interface TgStored {
  apiId: number;
  apiHash: string;
  /** строка сессии GramJS — сам пароль не хранится и не нужен */
  session: string;
  user: { name: string; phone: string };
  channels: TgChannel[];
}

/** Промежуточный шаг входа (между «Отправить код» и вводом кода).
 *  Сохраняем отдельно, чтобы вход переживал перезапуск сервера —
 *  на Vercel каждый запрос может прилететь в новый процесс. */
export interface TgPendingRecord {
  /** сессия уже после connect+sendCode: содержит ключ сервера */
  session: string;
  phone: string;
  phoneCodeHash: string;
  apiId: number;
  apiHash: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Куда сохраняем: Upstash Redis (облако) или локальный файл           */
/* ------------------------------------------------------------------ */

const REDIS_KEY = "radar:telegram";
const REDIS_PENDING_KEY = "radar:telegram-pending";

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "telegram.json");
const PENDING_FILE = path.join(DATA_DIR, "telegram-pending.json");

/** кэш в памяти процесса (короткий TTL — процессы на Vercel разные,
 *  и записанное одним должно быстро стать видимым другому).
 *  ВАЖНО: имена слотов не должны совпадать с telegram-client.ts
 *  (там __tgPending — живой объект с клиентом, здесь — запись
 *  без него; совпадение имён приводило к падению второго входа). */
const STORE_TTL = 10_000;
const g = globalThis as unknown as {
  __tgStore?: TgStored | null;
  __tgStoreReadAt?: number;
  __tgStorePending?: TgPendingRecord | null;
  __tgStorePendingReadAt?: number;
};

async function readJsonFile(file: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJsonFile(file: string, data: unknown): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
  } catch {
    /* локальный файл — бонус, работает не везде (на Vercel /tmp мимолётен) */
  }
}

/* ------------------------------------------------------------------ */
/* Основное хранилище (сессия + каналы)                                */
/* ------------------------------------------------------------------ */

export async function readStore(): Promise<TgStored | null> {
  const fresh = g.__tgStoreReadAt && Date.now() - g.__tgStoreReadAt < STORE_TTL;
  if (fresh && g.__tgStore !== undefined) return g.__tgStore ?? null;

  let data: unknown = null;
  const r = getRedis();
  if (r) {
    try {
      data = await r.get(REDIS_KEY);
    } catch {
      /* облако недоступно — пробуем файл */
    }
  }
  if (!data) data = await readJsonFile(FILE);

  const parsed = data as TgStored | null;
  g.__tgStore = parsed && parsed.session ? parsed : null;
  g.__tgStoreReadAt = Date.now();
  return g.__tgStore ?? null;
}

export async function writeStore(data: TgStored | null): Promise<void> {
  g.__tgStore = data;
  g.__tgStoreReadAt = Date.now();
  const r = getRedis();
  if (r) {
    try {
      if (data) await r.set(REDIS_KEY, data);
      else await r.del(REDIS_KEY);
    } catch {
      /* не смогли в облако — локальному прототипу не страшно */
    }
  }
  if (data) await writeJsonFile(FILE, data);
  else await writeJsonFile(FILE, null).catch(() => {});
  if (!data) {
    // заодно чистим и файловый вариант
    try {
      await fs.rm(FILE, { force: true });
    } catch {
      /* ignore */
    }
  }
}

export async function updateStore(patch: Partial<TgStored>): Promise<TgStored> {
  const cur =
    (await readStore()) ??
    ({
      apiId: 0,
      apiHash: "",
      session: "",
      user: { name: "", phone: "" },
      channels: [],
    } satisfies TgStored);
  const next: TgStored = { ...cur, ...patch };
  await writeStore(next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Промежуточный шаг входа                                             */
/* ------------------------------------------------------------------ */

export async function readPending(): Promise<TgPendingRecord | null> {
  const fresh =
    g.__tgStorePendingReadAt && Date.now() - g.__tgStorePendingReadAt < STORE_TTL;
  if (fresh && g.__tgStorePending !== undefined) return g.__tgStorePending ?? null;

  let data: unknown = null;
  const r = getRedis();
  if (r) {
    try {
      data = await r.get(REDIS_PENDING_KEY);
    } catch {
      /* ignore */
    }
  }
  if (!data) data = await readJsonFile(PENDING_FILE);

  const parsed = data as TgPendingRecord | null;
  g.__tgStorePending = parsed && parsed.session ? parsed : null;
  g.__tgStorePendingReadAt = Date.now();
  return g.__tgStorePending ?? null;
}

export async function writePending(data: TgPendingRecord | null): Promise<void> {
  g.__tgStorePending = data;
  g.__tgStorePendingReadAt = Date.now();
  const r = getRedis();
  if (r) {
    try {
      if (data) await r.set(REDIS_PENDING_KEY, data);
      else await r.del(REDIS_PENDING_KEY);
    } catch {
      /* ignore */
    }
  }
  if (data) {
    await writeJsonFile(PENDING_FILE, data);
  } else {
    try {
      await fs.rm(PENDING_FILE, { force: true });
    } catch {
      /* ignore */
    }
  }
}
