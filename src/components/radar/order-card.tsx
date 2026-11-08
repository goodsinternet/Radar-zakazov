"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CircleDollarSign,
  ExternalLink,
  EyeOff,
  FlaskConical,
  Radar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PLATFORMS } from "@/lib/categories";
import { escapeRegExp, formatBudget, timeAgo } from "@/lib/format";
import type { MatchResult, Order } from "@/lib/types";
import { cn } from "@/lib/utils";

function Highlight({ text, words }: { text: string; words: string[] }) {
  const clean = words
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2);
  if (clean.length === 0) return <>{text}</>;
  const re = new RegExp(`(${clean.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);
  const set = new Set(clean);
  return (
    <>
      {parts.map((p, i) =>
        set.has(p.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded-sm bg-emerald-100 px-0.5 text-inherit dark:bg-emerald-950 dark:text-emerald-200"
          >
            {p}
          </mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
}

function MatchBadge({ match }: { match: MatchResult }) {
  const { score, reasons } = match;
  if (score == null) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="cursor-help text-muted-foreground"
              aria-label="Совпадение не рассчитано"
            >
              <Radar className="mr-1 size-3" /> — %
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-60">
            <p className="font-medium">Совпадение не рассчитано</p>
            <p className="mt-1 text-xs opacity-80">
              Задайте нишу, ключевые слова или бюджет в фильтрах — и каждый заказ
              получит оценку.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  const strong = score >= 70;
  const mid = score >= 40;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "cursor-help border font-semibold",
              strong
                ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : mid
                  ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "border-border bg-muted text-muted-foreground",
            )}
            aria-label={`Совпадение ${score}%`}
          >
            <BadgeCheck className="mr-1 size-3" />
            {score}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          <p className="font-medium">
            {reasons.length > 0 ? "Почему подходит" : "Совпадение слабое"}
          </p>
          {reasons.length > 0 ? (
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs opacity-90">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs opacity-80">
              Не попало ни в вашу нишу, ни в ключевые слова.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface OrderCardProps {
  order: Order;
  match: MatchResult;
  keywords: string[];
  onDismiss: (order: Order) => void;
}

export function OrderCard({ order, match, keywords, onDismiss }: OrderCardProps) {
  const platform = PLATFORMS[order.platform];
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
      aria-label={order.title}
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 font-medium",
              order.live
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "text-muted-foreground",
            )}
          >
            {order.live ? (
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
              </span>
            ) : (
              <FlaskConical className="size-3" aria-hidden="true" />
            )}
            {platform.name}
          </Badge>
          {!order.live && (
            <Badge variant="secondary" className="font-medium text-muted-foreground">
              демо
            </Badge>
          )}
          <Badge variant="secondary" className="max-w-56 truncate font-normal text-muted-foreground">
            {order.categoryLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo(order.publishedAt)}</span>
          <span className="ml-auto">
            <MatchBadge match={match} />
          </span>
        </div>

        <a
          href={order.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-semibold leading-snug underline-offset-4 hover:underline sm:text-lg"
        >
          <Highlight text={order.title} words={keywords} />
        </a>

        {order.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            <Highlight text={order.description} words={keywords} />
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              order.budgetMin == null && order.budgetMax == null
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            <CircleDollarSign className="size-4 text-emerald-600" aria-hidden="true" />
            {formatBudget(order.budgetMin, order.budgetMax)}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={order.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Открыть
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(order)}
              aria-label="Скрыть заказ"
              className="text-muted-foreground hover:text-foreground"
            >
              <EyeOff className="size-3.5" aria-hidden="true" />
              Скрыть
            </Button>
          </span>
        </div>
      </div>
    </motion.article>
  );
}
