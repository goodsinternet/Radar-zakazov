"use client";

import * as React from "react";
import Link from "next/link";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  EyeOff,
  Inbox,
  Moon,
  Radar,
  RefreshCw,
  Search,
  SearchX,
  Send,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { FiltersPanel } from "@/components/radar/filters-panel";
import { OrderCard } from "@/components/radar/order-card";
import { ThemeProvider } from "@/components/theme-provider";
import { CATEGORIES } from "@/lib/categories";
import { applyFilters } from "@/lib/filters";
import type { OrdersResponse, Order, Profile, ViewState } from "@/lib/types";
import { cn } from "@/lib/utils";

const LS_PROFILE = "radar.profile.v1";
const LS_VIEW = "radar.view.v1";
const LS_DISMISSED = "radar.dismissed.v1";

const DEFAULT_PROFILE: Profile = {
  categories: [],
  keywords: [],
  exclude: [],
  budgetMin: null,
  budgetMax: null,
};
const DEFAULT_VIEW: ViewState = {
  platforms: ["fl", "kwork", "freelanceru", "telegram"],
  hideJunk: true,
  freshness: 0,
  sort: "match",
  search: "",
};

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [key]);
  React.useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value, loaded]);
  return [value, setValue] as const;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Переключить тему"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}

function LiveStatus({ ok, count }: { ok: boolean; count: number }) {
  if (ok) {
    return (
      <Badge
        variant="outline"
        className="hidden gap-1.5 border-emerald-300 bg-emerald-50 font-medium text-emerald-700 sm:inline-flex dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      >
        <Wifi className="size-3" aria-hidden="true" />
        FL.ru: {count} заказов
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="hidden gap-1.5 border-destructive/40 bg-destructive/10 font-medium text-destructive sm:inline-flex"
    >
      <WifiOff className="size-3" aria-hidden="true" />
      FL.ru недоступен
    </Badge>
  );
}

function TelegramStatus({
  connected,
  count,
  error,
}: {
  connected: boolean;
  count: number;
  error?: string;
}) {
  if (!connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900"
        asChild
      >
        <Link href="/telegram">
          <Send className="size-3.5" aria-hidden="true" />
          Подключить Telegram
        </Link>
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-8 gap-1.5",
        error
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900",
      )}
      title={error ? `Ошибка синхронизации: ${error}` : "Каналы Telegram подключены"}
      asChild
    >
      <Link href="/telegram">
        <Send className="size-3.5" aria-hidden="true" />
        {error ? "TG: ошибка" : `Telegram: ${count}`}
      </Link>
    </Button>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { toast } = useToast();
  const [profile, setProfile] = usePersisted(LS_PROFILE, DEFAULT_PROFILE);
  const [view, setView] = usePersisted(LS_VIEW, DEFAULT_VIEW);
  const [dismissed, setDismissed] = usePersisted<string[]>(LS_DISMISSED, []);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const lastDismissed = React.useRef<string | null>(null);

  const query = useQuery<OrdersResponse>({
    queryKey: ["orders"],
    queryFn: async () => {
      const r = await fetch("/api/orders");
      if (!r.ok) throw new Error(`Сервер ответил кодом ${r.status}`);
      return (await r.json()) as OrdersResponse;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
    retry: 1,
  });

  const orders = React.useMemo(() => query.data?.orders ?? [], [query.data]);
  const fl = query.data?.fl;
  const tg = query.data?.tg;
  const demoCount = query.data?.demoCount ?? 0;

  const dismissedSet = React.useMemo(() => new Set(dismissed), [dismissed]);

  const result = React.useMemo(
    () => applyFilters(orders, profile, view, dismissedSet),
    [orders, profile, view, dismissedSet],
  );

  const categoryCounts = React.useMemo(() => {
    const acc: Record<string, number> = {};
    for (const o of orders) acc[o.categoryId] = (acc[o.categoryId] ?? 0) + 1;
    return acc;
  }, [orders]);

  const platformCounts = React.useMemo(() => {
    const acc: Record<string, number> = {};
    for (const o of orders) acc[o.platform] = (acc[o.platform] ?? 0) + 1;
    return acc;
  }, [orders]);

  const stats = React.useMemo(() => {
    const now = Date.now();
    const new24 = orders.filter((o) => now - o.publishedAt < 24 * 3_600_000).length;
    const strong = result.list.filter(
      (o) => (result.matches.get(o.id)?.score ?? -1) >= 70,
    ).length;
    return { new24, strong, total: orders.length };
  }, [orders, result]);

  const profileEmpty =
    profile.categories.length === 0 &&
    profile.keywords.length === 0 &&
    profile.budgetMin == null &&
    profile.budgetMax == null;

  const resetAll = () => {
    setProfile(DEFAULT_PROFILE);
    setView(DEFAULT_VIEW);
    toast({ title: "Фильтры сброшены" });
  };

  const dismissOrder = (o: Order) => {
    lastDismissed.current = o.id;
    setDismissed((d) => [...d, o.id]);
    toast({
      title: "Заказ скрыт",
      description: o.title.length > 64 ? `${o.title.slice(0, 64)}…` : o.title,
      action: (
        <ToastAction
          altText="Вернуть заказ"
          onClick={() => {
            const id = lastDismissed.current;
            if (id) setDismissed((d) => d.filter((x) => x !== id));
          }}
        >
          Вернуть
        </ToastAction>
      ),
    });
  };

  const restoreAll = () => {
    setDismissed([]);
    toast({ title: "Скрытые заказы возвращены" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Шапка */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm"
            aria-hidden="true"
          >
            <Radar className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight sm:text-lg">
              Радар заказов
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              живая лента FL.ru + демо других площадок
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {fl && <LiveStatus ok={fl.ok} count={fl.count} />}
            <TelegramStatus
              connected={Boolean(tg?.connected)}
              count={tg?.count ?? 0}
              error={tg?.error}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Обновить ленту"
              disabled={query.isFetching}
              onClick={() => {
                query.refetch();
                toast({ title: "Обновляю ленту…" });
              }}
            >
              <RefreshCw
                className={cn("size-4", query.isFetching && "animate-spin")}
                aria-hidden="true"
              />
            </Button>
            <ThemeToggle />
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 lg:hidden"
              onClick={() => setSheetOpen(true)}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Фильтры
            </Button>
          </div>
        </div>
      </header>

      {/* Контент */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Фильтры: десктоп */}
        <aside className="hidden w-80 shrink-0 lg:block" aria-label="Панель фильтров">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            <FiltersPanel
              profile={profile}
              view={view}
              onProfileChange={setProfile}
              onViewChange={setView}
              categoryCounts={categoryCounts}
              platformCounts={platformCounts}
              onReset={resetAll}
              telegramLive={Boolean(tg?.connected)}
            />
          </div>
        </aside>

        {/* Лента */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Статистика */}
          <section
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
            aria-label="Статистика"
          >
            <StatCard
              icon={<Inbox className="size-4" aria-hidden="true" />}
              label="Всего в ленте"
              value={String(stats.total)}
              sub={`FL.ru: ${fl?.count ?? 0} · TG: ${tg?.count ?? 0} · демо: ${demoCount}`}
            />
            <StatCard
              icon={<Search className="size-4" aria-hidden="true" />}
              label="После фильтров"
              value={String(result.list.length)}
              sub={`мусора скрыто: ${result.hidden.junk}`}
            />
            <StatCard
              icon={<Sparkles className="size-4" aria-hidden="true" />}
              label="Сильное совпадение"
              value={String(stats.strong)}
              sub="оценка 70% и выше"
            />
            <StatCard
              icon={<Radar className="size-4" aria-hidden="true" />}
              label="Новых за 24 часа"
              value={String(stats.new24)}
              sub="по всем источникам"
            />
          </section>

          {/* Подсказка: подключить Telegram */}
          {query.data && !tg?.connected && !query.isLoading && (
            <Alert>
              <Send className="size-4" aria-hidden="true" />
              <AlertTitle>Добавьте заказы из Telegram-каналов</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Во многих каналах заказы публикуют раньше и без комиссии бирж.
                  Подключите свой Telegram — и они появятся здесь вместе с FL.ru.
                </span>
                <Button size="sm" className="shrink-0 bg-sky-600 hover:bg-sky-700" asChild>
                  <Link href="/telegram">Подключить за 5 минут</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Ошибка синхронизации Telegram */}
          {tg?.connected && tg.error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertTitle>Не удалось обновить заказы из Telegram</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>{tg.error}</span>
                <Button size="sm" variant="outline" className="shrink-0" asChild>
                  <Link href="/telegram">Открыть настройки Telegram</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Проблемы с живой лентой */}
          {query.data && !fl?.ok && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertTitle>Живая лента FL.ru сейчас недоступна</AlertTitle>
              <AlertDescription>
                {fl && fl.count > 0
                  ? `Ошибка: ${fl.error ?? "неизвестно"}. Показаны последние сохранённые заказы и демо-данные.`
                  : `Ошибка: ${fl?.error ?? "неизвестно"}. Показаны только демо-данные. Нажмите «Обновить» через пару минут.`}
              </AlertDescription>
            </Alert>
          )}

          {/* Подсказка про профиль */}
          {profileEmpty && !query.isLoading && (
            <Alert>
              <Sparkles className="size-4" aria-hidden="true" />
              <AlertTitle>Настройте профиль — и заказы получат оценку</AlertTitle>
              <AlertDescription>
                Выберите нишу и добавьте ключевые слова (например: «бот», «лендинг»,
                «figma») — каждый заказ будет подсвечен и оценён по совпадению,
                а мусор и дубли скроются автоматически.
              </AlertDescription>
            </Alert>
          )}

          {/* Строка поиска и сортировки */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={view.search}
                onChange={(e) => setView({ ...view, search: e.target.value })}
                placeholder="Поиск по заказам…"
                className="pl-9"
                aria-label="Поиск по заказам"
              />
            </div>
            <Select
              value={view.sort}
              onValueChange={(s) => setView({ ...view, sort: s as ViewState["sort"] })}
            >
              <SelectTrigger className="w-full sm:w-52" aria-label="Сортировка">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Сначала подходящие</SelectItem>
                <SelectItem value="new">Сначала новые</SelectItem>
                <SelectItem value="budget">Бюджет побольше</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Сводка скрытого */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Показано <b className="text-foreground">{result.list.length}</b> из{" "}
              {orders.length}
            </span>
            {result.hidden.duplicates > 0 && <span>дублей убрано: {result.hidden.duplicates}</span>}
            {result.hidden.junk > 0 && <span>мусора скрыто: {result.hidden.junk}</span>}
            {dismissed.length > 0 && (
              <button
                type="button"
                onClick={restoreAll}
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                <EyeOff className="size-3" aria-hidden="true" />
                вручную скрыто: {dismissed.length} — вернуть
              </button>
            )}
          </div>

          {/* Состояния */}
          {query.isLoading && (
            <div className="space-y-3" aria-label="Загрузка">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          )}

          {query.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertTitle>Не удалось загрузить заказы</AlertTitle>
              <AlertDescription className="flex items-center gap-3">
                <span>
                  {query.error instanceof Error ? query.error.message : "Что-то пошло не так"}
                </span>
                <Button size="sm" variant="outline" onClick={() => query.refetch()}>
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!query.isLoading && !query.isError && result.list.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-muted">
                  <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">
                    {orders.length === 0 ? "Лента пока пуста" : "Ничего не нашлось"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {orders.length === 0
                      ? "Обновите страницу через пару минут — заказы появятся."
                      : "Попробуйте ослабить фильтры: расширить бюджет, период или убрать стоп-слова."}
                  </p>
                </div>
                {orders.length > 0 && (
                  <Button variant="outline" onClick={resetAll}>
                    Сбросить фильтры
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Список заказов */}
          <div className="space-y-3">
            {result.list.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                match={result.matches.get(o.id) ?? { score: null, reasons: [] }}
                keywords={profile.keywords}
                onDismiss={dismissOrder}
              />
            ))}
          </div>
        </main>
      </div>

      {/* Фильтры: мобильные */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="left"
          className="w-[88vw] max-w-96 overflow-y-auto p-0"
        >
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Фильтры
            </SheetTitle>
            <SheetDescription className="sr-only">
              Настройки подбора заказов: ниша, площадки, бюджет и ключевые слова
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <FiltersPanel
              profile={profile}
              view={view}
              onProfileChange={setProfile}
              onViewChange={setView}
              categoryCounts={categoryCounts}
              platformCounts={platformCounts}
              onReset={resetAll}
              telegramLive={Boolean(tg?.connected)}
            />
            <Button
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setSheetOpen(false)}
            >
              Показать {result.list.length} заказов
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Подвал */}
      <footer className="mt-auto border-t bg-muted/40">
        <div className="mx-auto w-full max-w-7xl space-y-1 px-4 py-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            FL.ru — живая лента заказов, обновляется автоматически каждые 5
            минут. Telegram — живые заказы из ваших каналов после подключения
            (кнопка в шапке). Если Telegram не подключён или случилась ошибка —
            показываются демо-примеры, они помечены значком «демо».
          </p>
          <p>
            «Радар заказов» — прототип персонального агрегатора
            фриланс-заказов. Следующие шаги: генерация откликов, помощник в
            переписке и «защитник» от мошенников.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        <Dashboard />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
