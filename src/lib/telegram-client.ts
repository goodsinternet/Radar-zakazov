import { Api, TelegramClient, sessions as TgSessions } from "telegram";
import { parseTelegramPost } from "./telegram-parse";
import {
  readPending,
  readStore,
  updateStore,
  writePending,
  writeStore,
} from "./telegram-store";
import type { Order } from "./types";

/** Сессии берём из главного входа пакета: так класс остаётся тем же
 *  экземпляром, что и внутри GramJS (подпуть telegram/sessions
 *  бандлер дублирует — instanceof ломается). */
const { StringSession } = TgSessions;

/* ------------------------------------------------------------------ */
/* Общие утилиты                                                        */
/* ------------------------------------------------------------------ */

const CONNECT_TIMEOUT = 25_000;
const SYNC_TTL = 5 * 60 * 1000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} — превышено ${Math.round(ms / 1000)} с`)),
        ms,
      ),
    ),
  ]);
}

export class TgError extends Error {
  code: string;
  constructor(message: string, code = "UNKNOWN") {
    super(message);
    this.code = code;
  }
}

function friendlyError(e: unknown): TgError {
  const err = e as { errorMessage?: string; message?: string; seconds?: number };
  const code = err?.errorMessage ?? "";
  switch (true) {
    case code === "API_ID_INVALID" || code === "API_HASH_INVALID":
      return new TgError(
        "Неверные api_id или api_hash. Проверьте их на my.telegram.org и попробуйте снова.",
        "API_ID_INVALID",
      );
    case code === "PHONE_CODE_INVALID":
      return new TgError("Неверный код. Проверьте цифры и попробуйте ещё раз.", code);
    case code === "PHONE_CODE_EXPIRED":
      return new TgError("Код истёк. Нажмите «Отправить код» ещё раз.", code);
    case code === "PHONE_NUMBER_INVALID":
      return new TgError("Похоже, неверный номер телефона. Формат: +79991234567.", code);
    case code === "PASSWORD_HASH_INVALID":
      return new TgError("Неверный пароль двухфакторной защиты.", code);
    case code.startsWith("FLOOD_WAIT"):
      return new TgError(
        `Telegram просит подождать ${err?.seconds ?? 60} с перед следующей попыткой.`,
        code,
      );
    case ["AUTH_KEY_UNREGISTERED", "SESSION_REVOKED", "AUTH_KEY_DUPLICATED", "USER_DEACTIVATED"].includes(
      code,
    ):
      return new TgError(
        "Сессия Telegram больше не действительна — войдите заново.",
        "SESSION_LOST",
      );
    case code === "USERNAME_NOT_OCCUPIED" || code === "USERNAME_INVALID":
      return new TgError("Канал не найден. Проверьте ссылку.", code);
  }
  const msg = err?.message ?? String(e);
  return new TgError(msg.length > 300 ? `${msg.slice(0, 300)}…` : msg, code || "UNKNOWN");
}

/* ------------------------------------------------------------------ */
/* Глобальное состояние (переживает hot-reload в dev)                   */
/* ------------------------------------------------------------------ */

interface PendingLogin {
  client: TelegramClient;
  phone: string;
  phoneCodeHash: string;
  apiId: number;
  apiHash: string;
  createdAt: number;
}

export interface SyncResult {
  at: number;
  orders: Order[];
  error: string | null;
  perChannel: Record<string, { ok: boolean; count: number; error?: string }>;
}

const g = globalThis as unknown as {
  __tgPending?: PendingLogin | null;
  __tgClient?: TelegramClient | null;
  __tgSyncing?: Promise<SyncResult> | null;
  __tgSyncCache?: SyncResult | null;
};

/* ------------------------------------------------------------------ */
/* Подключённый клиент                                                  */
/* ------------------------------------------------------------------ */

export async function getConnectedClient(): Promise<TelegramClient> {
  if (g.__tgClient?.connected) return g.__tgClient;
  const store = await readStore();
  if (!store?.session) {
    throw new TgError("Telegram не подключён.", "NOT_CONNECTED");
  }
  const client = new TelegramClient(
    new StringSession(store.session),
    store.apiId,
    store.apiHash,
    { connectionRetries: 3 },
  );
  await withTimeout(client.connect(), CONNECT_TIMEOUT, "Не удалось соединиться с Telegram");
  g.__tgClient = client;
  return client;
}

/** Роняет текущее соединение — следующий вызов создаст свежее */
async function resetClient(): Promise<void> {
  const c = g.__tgClient;
  g.__tgClient = null;
  if (c) await c.disconnect().catch(() => {});
}

function userFromApi(u: Api.TypeUser): { name: string; phone: string } {
  const user = u as Api.User;
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "вы";
  return { name, phone: user.phone ?? "" };
}

async function finishLogin(pending: PendingLogin, user: Api.TypeUser) {
  const session = pending.client.session.save() as unknown as string;
  const prev = await readStore();
  await writeStore({
    apiId: pending.apiId,
    apiHash: pending.apiHash,
    session,
    user: userFromApi(user),
    channels: prev?.channels ?? [],
  });
  g.__tgClient = pending.client;
  g.__tgPending = null;
  g.__tgSyncCache = null;
  await writePending(null);
}

/** Восстанавливает начатый вход после перезапуска процесса.
 *  На Vercel «Отправить код» и ввод кода могут прилететь в разные
 *  процессы — промежуточная сессия сохранена в хранилище. */
async function restorePending(): Promise<PendingLogin | null> {
  if (g.__tgPending) return g.__tgPending;
  const rec = await readPending();
  if (!rec || Date.now() - rec.createdAt > 10 * 60 * 1000) return null;
  const client = new TelegramClient(
    new StringSession(rec.session),
    rec.apiId,
    rec.apiHash,
    { connectionRetries: 3 },
  );
  try {
    await withTimeout(client.connect(), CONNECT_TIMEOUT, "Не удалось соединиться с Telegram");
  } catch (e) {
    await client.disconnect().catch(() => {});
    throw friendlyError(e);
  }
  const pending: PendingLogin = {
    client,
    phone: rec.phone,
    phoneCodeHash: rec.phoneCodeHash,
    apiId: rec.apiId,
    apiHash: rec.apiHash,
    createdAt: rec.createdAt,
  };
  g.__tgPending = pending;
  return pending;
}

/* ------------------------------------------------------------------ */
/* Вход: три шага                                                       */
/* ------------------------------------------------------------------ */

export async function startLogin(
  apiId: number,
  apiHash: string,
  phone: string,
): Promise<{ isCodeViaApp: boolean }> {
  // чистим прошлые попытки
  if (g.__tgPending) {
    await g.__tgPending.client.disconnect().catch(() => {});
    g.__tgPending = null;
  }
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 3,
  });
  try {
    await withTimeout(client.connect(), CONNECT_TIMEOUT, "Не удалось соединиться с Telegram");
    const { phoneCodeHash, isCodeViaApp } = await client.sendCode(
      { apiId, apiHash },
      phone,
    );
    const createdAt = Date.now();
    g.__tgPending = {
      client,
      phone,
      phoneCodeHash,
      apiId,
      apiHash,
      createdAt,
    };
    // пережить перезапуск сервера: в сессии уже есть ключ сервера,
    // по нему ввод кода сработает и в новом процессе (важно для Vercel)
    await writePending({
      session: client.session.save() as unknown as string,
      phone,
      phoneCodeHash,
      apiId,
      apiHash,
      createdAt,
    });
    return { isCodeViaApp };
  } catch (e) {
    await client.disconnect().catch(() => {});
    throw friendlyError(e);
  }
}

export async function verifyCode(
  code: string,
): Promise<
  | { ok: true; user: { name: string; phone: string } }
  | { needsPassword: true; hint?: string }
> {
  const pending = await restorePending();
  if (!pending) {
    throw new TgError("Сначала нажмите «Отправить код» — шаг сброшен.", "NO_PENDING");
  }
  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    await pending.client.disconnect().catch(() => {});
    g.__tgPending = null;
    throw new TgError("Слишком долгое ожидание кода. Начните вход заново.", "EXPIRED");
  }
  try {
    const result = await pending.client.invoke(
      new Api.auth.SignIn({
        phoneNumber: pending.phone,
        phoneCodeHash: pending.phoneCodeHash,
        phoneCode: code.trim(),
      }),
    );
    if (result instanceof Api.auth.AuthorizationSignUpRequired || !result.user) {
      throw new TgError(
        "Этот номер не зарегистрирован в Telegram. Войдите с номера, на который у вас есть аккаунт.",
        "NO_ACCOUNT",
      );
    }
    const user = result.user;
    await finishLogin(pending, user);
    return { ok: true, user: userFromApi(user) };
  } catch (e) {
    const code_ = (e as { errorMessage?: string })?.errorMessage ?? "";
    if (code_ === "SESSION_PASSWORD_NEEDED") {
      // у аккаунта включена двухфакторка — запросим пароль
      try {
        const pwd = await pending.client.invoke(new Api.account.GetPassword());
        return { needsPassword: true, hint: (pwd as unknown as { hint?: string }).hint };
      } catch {
        return { needsPassword: true };
      }
    }
    throw friendlyError(e);
  }
}

export async function verifyPassword(
  password: string,
): Promise<{ ok: true; user: { name: string; phone: string } }> {
  const pending = await restorePending();
  if (!pending) {
    throw new TgError("Шаг входа сброшен. Начните заново.", "NO_PENDING");
  }
  try {
    const user = await pending.client.signInWithPassword(
      { apiId: pending.apiId, apiHash: pending.apiHash },
      {
        password: async () => password,
        onError: async (err: Error) => {
          throw err;
        },
      },
    );
    await finishLogin(pending, user);
    return { ok: true, user: userFromApi(user) };
  } catch (e) {
    const fe = friendlyError(e);
    if ((e as Error).message === "AUTH_USER_CANCEL") {
      throw new TgError("Неверный пароль двухфакторной защиты.", "PASSWORD_HASH_INVALID");
    }
    throw fe;
  }
}

export async function logout(): Promise<void> {
  const revoke = async (client: TelegramClient) => {
    try {
      await withTimeout(client.invoke(new Api.auth.LogOut()), 10_000, "revoke");
    } catch {
      /* сессия может быть уже недействительна — не страшно */
    }
  };

  const client = g.__tgClient;
  if (client?.connected) {
    await revoke(client);
    await client.disconnect().catch(() => {});
  } else {
    // сессия могла остаться в файле — отзываем её отдельным клиентом
    const store = await readStore();
    if (store?.session) {
      const c = new TelegramClient(
        new StringSession(store.session),
        store.apiId,
        store.apiHash,
        { connectionRetries: 1 },
      );
      try {
        await withTimeout(c.connect(), 15_000, "Не удалось соединиться с Telegram");
        await revoke(c);
      } catch {
        /* даже если Telegram не ответил — локальную сессию чистим */
      }
      await c.disconnect().catch(() => {});
    }
  }
  g.__tgClient = null;
  g.__tgPending = null;
  g.__tgSyncCache = null;
  await writePending(null);
  await writeStore(null);
}

/* ------------------------------------------------------------------ */
/* Каналы                                                               */
/* ------------------------------------------------------------------ */

export async function addChannel(rawUsername: string): Promise<{
  username: string;
  title: string;
}> {
  const { normalizeChannelInput } = await import("./telegram-parse");
  const username = normalizeChannelInput(rawUsername);
  if (!username) {
    throw new TgError(
      "Не похоже на ссылку канала. Пример: @workzavr или https://t.me/workzavr",
      "BAD_INPUT",
    );
  }
  if (/^c\/\d+/.test(rawUsername.trim().toLowerCase()) || /^-?\d+$/.test(rawUsername.trim())) {
    throw new TgError(
      "Приватные каналы (t.me/c/…) пока не поддерживаются — добавьте публичную ссылку вида t.me/имя",
      "PRIVATE",
    );
  }
  const store = await readStore();
  if (!store) throw new TgError("Сначала подключите Telegram.", "NOT_CONNECTED");
  if (store.channels.some((c) => c.username === username)) {
    throw new TgError("Этот канал уже добавлен.", "DUPLICATE");
  }

  const client = await getConnectedClient();
  let title = username;
  try {
    const entity = await withTimeout(
      client.getEntity(username),
      20_000,
      "Не удалось получить данные канала",
    );
    const e = entity as { title?: string; username?: string };
    if (!e.title && !(entity as Api.Channel)) {
      throw new TgError("Это не канал и не чат с заказами.", "NOT_CHANNEL");
    }
    title = e.title ?? username;
  } catch (e) {
    throw friendlyError(e);
  }

  await updateStore({
    channels: [...store.channels, { username, title }],
  });
  g.__tgSyncCache = null; // чтобы следующий /api/orders сразу подтянул новый канал
  return { username, title };
}

export async function removeChannel(username: string): Promise<void> {
  const store = await readStore();
  if (!store) return;
  const norm = username.toLowerCase();
  await updateStore({
    channels: store.channels.filter((c) => c.username !== norm),
  });
  g.__tgSyncCache = null;
}

/* ------------------------------------------------------------------ */
/* Синхронизация: читаем посты каналов и превращаем в заказы            */
/* ------------------------------------------------------------------ */

export async function syncOrders(force = false): Promise<SyncResult> {
  const cached = g.__tgSyncCache;
  if (!force && cached && Date.now() - cached.at < SYNC_TTL) return cached;

  const store = await readStore();
  if (!store?.session || store.channels.length === 0) {
    return { at: Date.now(), orders: [], error: null, perChannel: {} };
  }
  if (g.__tgSyncing) return g.__tgSyncing;

  const task = (async (): Promise<SyncResult> => {
    const perChannel: SyncResult["perChannel"] = {};
    const orders: Order[] = [];
    const weekAgo = Date.now() - 7 * 24 * 3_600_000;

    for (const ch of store.channels) {
      // до двух попыток на канал: между ними пересоздаём соединение —
      // на Vercel «уснувший» сокет может притвориться живым
      for (let attempt = 0; ; attempt++) {
        try {
          const client = await getConnectedClient();
          const messages = await withTimeout(
            client.getMessages(ch.username, { limit: 30 }),
            30_000,
            `Не удалось прочитать @${ch.username}`,
          );
          let count = 0;
          for (const m of messages) {
            const text = (m as { message?: string }).message ?? "";
            const date = (m as { date?: number }).date ?? 0;
            if (!text || !date || date * 1000 < weekAgo) continue;
            const order = parseTelegramPost({
              text,
              username: ch.username,
              messageId: (m as { id?: number }).id ?? 0,
              date,
              channelTitle: ch.title,
            });
            if (order) {
              orders.push(order);
              count += 1;
            }
          }
          perChannel[ch.username] = { ok: true, count };
          break;
        } catch (e) {
          if (attempt >= 1) {
            perChannel[ch.username] = {
              ok: false,
              count: 0,
              error: friendlyError(e).message,
            };
            break;
          }
          await resetClient();
        }
      }
    }

    const failed = Object.values(perChannel).filter((c) => !c.ok).length;
    // если всё упало — сохраняем прошлые заказы (если есть и свежие), чтобы лента не пустела
    if (failed === store.channels.length && cached && cached.orders.length > 0) {
      const firstError = Object.values(perChannel).find((c) => !c.ok)?.error ?? null;
      const result: SyncResult = {
        at: Date.now(),
        orders: cached.orders,
        error: firstError,
        perChannel,
      };
      g.__tgSyncCache = result;
      return result;
    }

    const result: SyncResult = {
      at: Date.now(),
      orders,
      error: failed > 0
        ? `Не удалось обновить ${failed} из ${store.channels.length} каналов`
        : null,
      perChannel,
    };
    g.__tgSyncCache = result;
    return result;
  })().catch((e): SyncResult => {
    const result: SyncResult = {
      at: Date.now(),
      orders: cached?.orders ?? [],
      error: friendlyError(e).message,
      perChannel: {},
    };
    g.__tgSyncCache = result;
    return result;
  });

  g.__tgSyncing = task;
  const res = await task;
  g.__tgSyncing = null;
  return res;
}

/** Краткий статус для главного экрана */
export async function telegramStatus() {
  const store = await readStore();
  const cache = g.__tgSyncCache;
  return {
    connected: Boolean(store?.session),
    user: store?.user ?? null,
    channels: store?.channels ?? [],
    hasPendingLogin: Boolean(g.__tgPending) || Boolean(await readPending()),
    lastSyncAt: cache?.at ?? null,
    lastSyncError: cache?.error ?? null,
  };
}
