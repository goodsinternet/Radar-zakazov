"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ExternalLink,
  KeyRound,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Типы и хелперы                                                       */
/* ------------------------------------------------------------------ */

interface Channel {
  username: string;
  title?: string;
}

interface TgStatus {
  connected: boolean;
  user: { name: string; phone: string } | null;
  channels: Channel[];
  hasPendingLogin: boolean;
  lastSyncAt: number | null;
  lastSyncError: string | null;
}

const SUGGESTED: { username: string; title: string }[] = [
  { username: "workzavr", title: "Воркзавр · фриланс и удалёнка" },
  { username: "webfrl", title: "Web Freelance · сайты и разработка" },
  { username: "normrabota", title: "Норм работа · вакансии" },
  { username: "digitaltender", title: "DIGITAL Tender · фриланс" },
  { username: "theyseeku", title: "Finder.work · работа и вакансии" },
  { username: "zapwork", title: "Удалёнщики · удалённая работа" },
];

function timeAgo(ts: number | null): string {
  if (!ts) return "ещё не было";
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(data.error ?? `Сервер ответил кодом ${r.status}`);
  return data;
}

/* ------------------------------------------------------------------ */
/* Шаги 1–2: ключи, телефон, код, пароль                                */
/* ------------------------------------------------------------------ */

function LoginSection({
  onConnected,
}: {
  onConnected: () => void;
}) {
  const [apiId, setApiId] = React.useState("");
  const [apiHash, setApiHash] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [stage, setStage] = React.useState<
    "keys" | "code" | "password"
  >("keys");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/telegram/login/start", {
        method: "POST",
        body: JSON.stringify({ apiId, apiHash, phone }),
      });
      setStage("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить код");
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ ok?: boolean; needsPassword?: boolean; hint?: string }>(
        "/api/telegram/login/code",
        { method: "POST", body: JSON.stringify({ code }) },
      );
      if (res.needsPassword) {
        setHint(res.hint ?? null);
        setStage("password");
      } else {
        onConnected();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось подтвердить код");
    } finally {
      setBusy(false);
    }
  };

  const confirmPassword = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/telegram/login/password", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-emerald-600/10 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              1
            </span>
            <CardTitle className="text-base">Получите ключи Telegram</CardTitle>
          </div>
          <CardDescription>
            Это официальные ключи доступа Telegram. Создаются один раз за 2 минуты.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Откройте{" "}
              <a
                href="https://my.telegram.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-400"
              >
                my.telegram.org
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>{" "}
              в браузере (удобнее с компьютера). Это отдельный сайт — в самом
              приложении Telegram такого раздела нет
            </li>
            <li>
              Введите номер телефона (например +79991234567). Код придёт
              сообщением в сам Telegram — введите его на сайте
            </li>
            <li>
              Ссылка <b>«API development tools»</b> появляется{" "}
              <b>после</b> ввода кода. Это небольшая текстовая ссылка в блоке
              «Telegram Core» (первая в списке слева), а не кнопка
            </li>
            <li>
              Откроется форма: App title — любое название (например «Мой
              радар»), остальное можно не трогать. Нажмите «Create
              application»
            </li>
            <li>
              Скопируйте <b>App api_id</b> и <b>App api_hash</b> со страницы
              «App configuration» — они нужны ниже
            </li>
          </ol>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Если приложение вы уже создавали раньше — ключи покажутся сразу,
            без формы. Если сайт пишет «ERROR» — это известный глюк
            my.telegram.org: обновите страницу, войдите заново или откройте
            сайт в другом браузере.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="api-id">api_id</Label>
              <Input
                id="api-id"
                inputMode="numeric"
                placeholder="например 12345678"
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
                disabled={stage !== "keys"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-hash">api_hash</Label>
              <Input
                id="api-hash"
                placeholder="32 символа"
                value={apiHash}
                onChange={(e) => setApiHash(e.target.value.trim())}
                disabled={stage !== "keys"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-sm font-bold",
                stage === "keys"
                  ? "bg-muted text-muted-foreground"
                  : "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
              )}
            >
              2
            </span>
            <CardTitle className="text-base">Подтвердите свой номер</CardTitle>
          </div>
          <CardDescription>
            Код придёт в приложение Telegram — не в SMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+79991234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value.trim())}
                disabled={stage !== "keys"}
              />
            </div>
            {stage === "keys" && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || !apiId || !apiHash || !phone}
                onClick={sendCode}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
                Отправить код
              </Button>
            )}
          </div>

          {stage === "code" && (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <Label htmlFor="code">
                Код из Telegram{" "}
                <span className="font-normal text-muted-foreground">
                  (сообщение от Telegram с цифрами)
                </span>
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="12345"
                  className="max-w-40 text-lg tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={busy || code.length < 4}
                  onClick={confirmCode}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="size-4" aria-hidden="true" />
                  )}
                  Подтвердить
                </Button>
              </div>
            </div>
          )}

          {stage === "password" && (
            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="tg-password">
                Пароль двухфакторной защиты Telegram
              </Label>
              <Input
                id="tg-password"
                type="password"
                placeholder="Ваш пароль облака Telegram"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {hint && (
                <p className="text-xs text-muted-foreground">Подсказка: {hint}</p>
              )}
              <p className="text-xs text-muted-foreground">
                У вашего аккаунта включена двухфакторная защита. Пароль нужен
                один раз — приложение сохранит только ключ сессии, сам пароль
                нигде не хранится.
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || !password}
                onClick={confirmPassword}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="size-4" aria-hidden="true" />
                )}
                Войти
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="size-4" aria-hidden="true" />
              <AlertTitle>Не получилось</AlertTitle>
              <AlertDescription>
                {error}{" "}
                {stage !== "keys" && (
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      setStage("keys");
                      setCode("");
                      setPassword("");
                      setError(null);
                    }}
                  >
                    Начать шаг заново
                  </button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Шаг 3: каналы                                                        */
/* ------------------------------------------------------------------ */

function ChannelsSection({
  status,
  refresh,
}: {
  status: TgStatus;
  refresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const channels = status.channels;
  const added = new Set(channels.map((c) => c.username));

  const add = async (raw: string) => {
    if (!raw.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ username: string; title: string }>(
        "/api/telegram/channels",
        { method: "POST", body: JSON.stringify({ username: raw }) },
      );
      toast({
        title: "Канал добавлен",
        description: `@${res.username} — ${res.title}`,
      });
      setInput("");
      await refresh();
    } catch (e) {
      toast({
        title: "Не удалось добавить канал",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (username: string) => {
    setBusy(true);
    try {
      await api("/api/telegram/channels", {
        method: "DELETE",
        body: JSON.stringify({ username }),
      });
      toast({ title: "Канал удалён", description: `@${username}` });
      await refresh();
    } catch (e) {
      toast({
        title: "Не удалось удалить",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await api<{ ok: boolean; count: number; error: string | null }>(
        "/api/telegram/sync",
        { method: "POST" },
      );
      if (res.error) {
        toast({
          title: "Синхронизация прошла с ошибкой",
          description: res.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Готово",
          description: `Из каналов получено заказов: ${res.count}`,
        });
      }
      await refresh();
    } catch (e) {
      toast({
        title: "Ошибка синхронизации",
        description: e instanceof Error ? e.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-600/10 text-sm font-bold text-emerald-700 dark:text-emerald-400">
            3
          </span>
          <CardTitle className="text-base">Каналы с заказами</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {channels.length}
          </Badge>
        </div>
        <CardDescription>
          Добавьте каналы, где публикуют заказы: вставьте ссылку t.me/имя или
          имя с @. Ниже — популярные, можно добавить в один клик.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {channels.length > 0 ? (
          <ul className="space-y-2">
            {channels.map((c) => (
              <li
                key={c.username}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <MessageCircle
                  className="size-4 shrink-0 text-sky-500"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.title ?? c.username}
                  </p>
                  <a
                    href={`https://t.me/${c.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground underline underline-offset-2"
                  >
                    @{c.username}
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Удалить канал @${c.username}`}
                  disabled={busy}
                  onClick={() => remove(c.username)}
                >
                  <Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Пока ни одного канала — добавьте первый из подсказок ниже
          </p>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="@имя_канала или t.me/имя"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add(input);
            }}
            aria-label="Добавить канал"
          />
          <Button
            variant="outline"
            disabled={busy || !input.trim()}
            onClick={() => add(input)}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Добавить
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Популярные каналы с заказами:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.filter((s) => !added.has(s.username)).map((s) => (
              <button
                key={s.username}
                type="button"
                disabled={busy}
                onClick={() => add(s.username)}
                className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                + {s.title}
              </button>
            ))}
            {SUGGESTED.filter((s) => !added.has(s.username)).length === 0 && (
              <span className="text-xs text-muted-foreground">
                Все подсказки добавлены ✓
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Каналы бывают разными — проверьте содержимое по ссылке. Не про
            заказы? Просто удалите.
          </p>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={syncing || channels.length === 0}
            onClick={syncNow}
          >
            <RefreshCw
              className={cn("size-4", syncing && "animate-spin")}
              aria-hidden="true"
            />
            Проверить каналы сейчас
          </Button>
          <span className="text-xs text-muted-foreground">
            Последняя проверка: {timeAgo(status.lastSyncAt)}
            {status.lastSyncError ? ` · ошибка: ${status.lastSyncError}` : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Карточка подключённого аккаунта                                      */
/* ------------------------------------------------------------------ */

function ConnectedCard({
  status,
  refresh,
}: {
  status: TgStatus;
  refresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const disconnect = async () => {
    setBusy(true);
    try {
      await api("/api/telegram/logout", { method: "POST" });
      toast({ title: "Telegram отключён" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
          <BadgeCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 font-semibold">
            <span>Telegram подключён</span>
            <span className="inline-flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <UserRound className="size-3.5" aria-hidden="true" />
              {status.user?.name}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {status.user?.phone
              ? `Номер: ${status.user.phone}`
              : "Ключ сессии сохранён на сервере приложения"}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>
          Отключиться
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Страница                                                             */
/* ------------------------------------------------------------------ */

function TelegramSetup() {
  const [status, setStatus] = React.useState<TgStatus | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const s = await api<TgStatus>("/api/telegram/status");
      setStatus(s);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Не удалось получить статус");
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" aria-label="Назад к радару" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight sm:text-lg">
              Подключение Telegram
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              живые заказы из каналов — в общий радар
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <Alert>
          <ShieldCheck className="size-4" aria-hidden="true" />
          <AlertTitle>Это безопасно</AlertTitle>
          <AlertDescription>
            Пароль от Telegram не нужен никому — ни мне, ни приложению. Нужны
            только: ключи с официального сайта my.telegram.org, ваш номер и
            одноразовый код из Telegram. Всё вводится здесь, не в чате.
            Отключиться можно в любой момент — сессия Telegram отзовётся.
          </AlertDescription>
        </Alert>

        {loadError && (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" aria-hidden="true" />
            <AlertTitle>Не удалось связаться с сервером</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {status === null && !loadError && (
          <div className="space-y-3" aria-label="Загрузка">
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
          </div>
        )}

        {status && status.connected && (
          <>
            <ConnectedCard status={status} refresh={refresh} />
            <ChannelsSection status={status} refresh={refresh} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Что дальше</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                Пока открыта страница радара, приложение каждые 5 минут читает
                новые посты ваших каналов: определяет заголовок, бюджет и нишу,
                скрывает мусор и дубли — и показывает всё в общей ленте рядом с
                FL.ru.{" "}
                <Link
                  href="/"
                  className="font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-400"
                >
                  Вернуться к радару →
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {status && !status.connected && (
          <LoginSection
            onConnected={() => {
              void refresh();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function TelegramPage() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TelegramSetup />
    </ThemeProvider>
  );
}
