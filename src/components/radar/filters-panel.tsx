"use client";

import * as React from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, PLATFORMS } from "@/lib/categories";
import type {
  CategoryId,
  Freshness,
  PlatformId,
  Profile,
  SortMode,
  ViewState,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface FiltersPanelProps {
  profile: Profile;
  view: ViewState;
  onProfileChange: (p: Profile) => void;
  onViewChange: (v: ViewState) => void;
  categoryCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  onReset: () => void;
  /** Telegram подключён и отдаёт живые заказы — метка «демо» не нужна */
  telegramLive?: boolean;
}

function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
      {count != null && (
        <span className={cn("text-xs", active ? "text-emerald-100" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  );
}

function KeywordInput({
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const [draft, setDraft] = React.useState("");

  const add = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim().slice(0, 30))
      .filter((s) => s.length >= 2 && !values.includes(s));
    if (parts.length === 0) return;
    onChange([...values, ...parts].slice(0, 12));
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={addLabel}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="shrink-0">
          Добавить
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {w}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== w))}
                aria-label={`Удалить слово ${w}`}
                className="rounded-full p-0.5 hover:bg-background"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Вводите слова через запятую или нажимайте Enter.
      </p>
    </div>
  );
}

export function FiltersPanel({
  profile,
  view,
  onProfileChange,
  onViewChange,
  categoryCounts,
  platformCounts,
  onReset,
  telegramLive = false,
}: FiltersPanelProps) {
  const toggleCategory = (id: CategoryId) => {
    const has = profile.categories.includes(id);
    onProfileChange({
      ...profile,
      categories: has
        ? profile.categories.filter((c) => c !== id)
        : [...profile.categories, id],
    });
  };

  const togglePlatform = (id: PlatformId) => {
    const has = view.platforms.includes(id);
    const next = has
      ? view.platforms.filter((p) => p !== id)
      : [...view.platforms, id];
    onViewChange({ ...view, platforms: next.length === 0 ? view.platforms : next });
  };

  const setBudget = (min: number | null, max: number | null) =>
    onProfileChange({ ...profile, budgetMin: min, budgetMax: max });

  const presetActive = (min: number | null, max: number | null) =>
    profile.budgetMin === min && profile.budgetMax === max;

  const setSort = (s: string) => onViewChange({ ...view, sort: s as SortMode });
  const setFreshness = (f: string) =>
    onViewChange({ ...view, freshness: Number(f) as Freshness });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Фильтры</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 gap-1.5 px-2 text-muted-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Сбросить
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ниша */}
        <section className="space-y-2.5" aria-labelledby="f-niche">
          <div className="flex items-baseline justify-between">
            <h3 id="f-niche" className="text-sm font-medium">
              Ваша ниша
            </h3>
            {profile.categories.length === 0 && (
              <span className="text-xs text-muted-foreground">показываю все</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.filter((c) => c.id !== "other" || (categoryCounts["other"] ?? 0) > 0).map(
              (c) => (
                <Chip
                  key={c.id}
                  active={profile.categories.includes(c.id)}
                  onClick={() => toggleCategory(c.id)}
                  count={categoryCounts[c.id] ?? 0}
                >
                  {c.short}
                </Chip>
              ),
            )}
          </div>
        </section>

        {/* Площадки */}
        <section className="space-y-2.5" aria-labelledby="f-platforms">
          <h3 id="f-platforms" className="text-sm font-medium">
            Площадки
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PLATFORMS) as PlatformId[]).map((id) => (
              <Chip
                key={id}
                active={view.platforms.includes(id)}
                onClick={() => togglePlatform(id)}
                count={platformCounts[id] ?? 0}
              >
                {PLATFORMS[id].name}
                {!PLATFORMS[id].live && !(id === "telegram" && telegramLive) && (
                  <span className="text-[10px] uppercase opacity-70">демо</span>
                )}
              </Chip>
            ))}
          </div>
        </section>

        {/* Бюджет */}
        <section className="space-y-2.5" aria-labelledby="f-budget">
          <h3 id="f-budget" className="text-sm font-medium">
            Бюджет, ₽
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="budget-min" className="sr-only">
                Бюджет от
              </Label>
              <Input
                id="budget-min"
                type="number"
                min={0}
                placeholder="от"
                value={profile.budgetMin ?? ""}
                onChange={(e) =>
                  setBudget(e.target.value ? Number(e.target.value) : null, profile.budgetMax)
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="budget-max" className="sr-only">
                Бюджет до
              </Label>
              <Input
                id="budget-max"
                type="number"
                min={0}
                placeholder="до"
                value={profile.budgetMax ?? ""}
                onChange={(e) =>
                  setBudget(profile.budgetMin, e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={presetActive(null, null)} onClick={() => setBudget(null, null)}>
              любой
            </Chip>
            <Chip active={presetActive(null, 5000)} onClick={() => setBudget(null, 5000)}>
              до 5 тыс.
            </Chip>
            <Chip active={presetActive(5000, 20000)} onClick={() => setBudget(5000, 20000)}>
              5–20 тыс.
            </Chip>
            <Chip active={presetActive(20000, null)} onClick={() => setBudget(20000, null)}>
              от 20 тыс.
            </Chip>
          </div>
          <p className="text-xs text-muted-foreground">
            Заказы без указанного бюджета не скрываются.
          </p>
        </section>

        {/* Ключевые слова */}
        <section className="space-y-2.5" aria-labelledby="f-keywords">
          <h3 id="f-keywords" className="text-sm font-medium">
            Ключевые слова
          </h3>
          <KeywordInput
            values={profile.keywords}
            onChange={(keywords) => onProfileChange({ ...profile, keywords })}
            placeholder="бот, лендинг, figma…"
            addLabel="Добавить ключевое слово"
          />
        </section>

        {/* Стоп-слова */}
        <section className="space-y-2.5" aria-labelledby="f-exclude">
          <h3 id="f-exclude" className="text-sm font-medium">
            Исключать слова
          </h3>
          <KeywordInput
            values={profile.exclude}
            onChange={(exclude) => onProfileChange({ ...profile, exclude })}
            placeholder="за отзыв, партнёрство…"
            addLabel="Добавить стоп-слово"
          />
        </section>

        {/* Дополнительно */}
        <section className="space-y-3" aria-labelledby="f-extra">
          <h3 id="f-extra" className="text-sm font-medium">
            Дополнительно
          </h3>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="junk-switch" className="text-sm font-normal leading-snug">
              Скрывать мусор
              <span className="block text-xs text-muted-foreground">
                «за отзыв», оплата процентом, капс
              </span>
            </Label>
            <Switch
              id="junk-switch"
              checked={view.hideJunk}
              onCheckedChange={(hideJunk) => onViewChange({ ...view, hideJunk })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="freshness-select" className="text-xs text-muted-foreground">
              Период
            </Label>
            <Select value={String(view.freshness)} onValueChange={setFreshness}>
              <SelectTrigger id="freshness-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">За всё время</SelectItem>
                <SelectItem value="24">За 24 часа</SelectItem>
                <SelectItem value="72">За 3 дня</SelectItem>
                <SelectItem value="168">За 7 дней</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sort-select" className="text-xs text-muted-foreground">
              Сортировка
            </Label>
            <Select value={view.sort} onValueChange={setSort}>
              <SelectTrigger id="sort-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Сначала подходящие</SelectItem>
                <SelectItem value="new">Сначала новые</SelectItem>
                <SelectItem value="budget">Бюджет побольше</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
