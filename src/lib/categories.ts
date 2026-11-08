import type { CategoryId, PlatformId } from "./types";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  short: string;
  /** верхние категории FL.ru, которые сюда мапятся */
  flKeys: string[];
  hints: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "dev",
    label: "Разработка и сайты",
    short: "Разработка",
    flKeys: ["Программирование", "Сайты", "Мессенджеры", "Разработка", "Тестирование"],
    hints: [
      "сайт", "бот", "приложени", "парсер", "интеграц", "api", "1с", "битрикс",
      "wordpress", "тильд", "tilda", "python", "телеграм", "верстк", "лендинг",
      "crm", "интернет-магазин", "бэкенд", "фронтенд", "react", "unity",
    ],
  },
  {
    id: "design",
    label: "Дизайн и графика",
    short: "Дизайн",
    flKeys: ["Дизайн", "Анимация"],
    hints: [
      "логотип", "макет", "figma", "фигм", "баннер", "иллюстрац", "интерфейс",
      "презентац", "визитк", "моушн", "motion", "3d", "рендер", "интерьер",
    ],
  },
  {
    id: "text",
    label: "Тексты и переводы",
    short: "Тексты",
    flKeys: ["Тексты", "Переводы"],
    hints: [
      "текст", "стать", "копирайт", "рерайт", "перевод", "описан", "пост",
      "сценар", "контент", "редакт", "карточк",
    ],
  },
  {
    id: "marketing",
    label: "Маркетинг и реклама",
    short: "Маркетинг",
    flKeys: ["Реклама и Маркетинг", "Продвижение сайтов (SEO, GEO)", "Социальные сети", "Маркетинг"],
    hints: [
      "реклам", "таргет", "директ", "seo", "трафик", "рассылк", "smm",
      "соцсет", "продвижен", "аналитик", "ga4", "ваканс",
    ],
  },
  {
    id: "media",
    label: "Аудио, видео, фото",
    short: "Медиа",
    flKeys: ["Аудио/Видео/Фото"],
    hints: [
      "видео", "монтаж", "ролик", "съемк", "съёмк", "фото", "озвучк", "диктор",
      "reels", "youtube", "клип", "подкаст",
    ],
  },
  {
    id: "ai",
    label: "AI и нейросети",
    short: "AI",
    flKeys: ["AI — искусственный интеллект"],
    hints: [
      "нейросет", "нейрон", " gpt", "chatgpt", "midjourney", "stable diffusion",
      "промпт", "аватар", "генерац", "ии ",
    ],
  },
  {
    id: "consult",
    label: "Обучение и консалтинг",
    short: "Консалтинг",
    flKeys: ["Аутсорсинг и консалтинг", "Обучение", "Консалтинг"],
    hints: ["консультац", "обучен", "репетитор", "курс", "эксперт", "аудит", "наставник"],
  },
  {
    id: "eng",
    label: "Инжиниринг и CAD",
    short: "Инжиниринг",
    flKeys: ["Инжиниринг"],
    hints: ["чертеж", "cad", "autocad", "solidworks", "смета", "проект", "модел"],
  },
  {
    id: "other",
    label: "Прочее",
    short: "Прочее",
    flKeys: [],
    hints: [],
  },
];

const FL_MAP = new Map<string, CategoryId>();
for (const c of CATEGORIES) {
  for (const k of c.flKeys) FL_MAP.set(k.trim().toLowerCase(), c.id);
}

export function categoryFromFl(top: string): CategoryId {
  return FL_MAP.get(top.trim().toLowerCase()) ?? "other";
}

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryDef>;

export const PLATFORMS: Record<
  PlatformId,
  { name: string; url: string; live: boolean }
> = {
  fl: { name: "FL.ru", url: "https://www.fl.ru/projects/", live: true },
  kwork: { name: "Kwork", url: "https://kwork.ru/projects", live: false },
  freelanceru: { name: "Freelance.ru", url: "https://freelance.ru/projects", live: false },
  telegram: { name: "Telegram", url: "https://t.me/", live: false },
};
