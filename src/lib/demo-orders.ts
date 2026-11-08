import { PLATFORMS } from "./categories";
import type { CategoryId, Order, PlatformId } from "./types";

/**
 * Демо-заказы для площадок, у которых нет открытых лент (Kwork, Freelance.ru,
 * Telegram). Помечены demo=true и показываются в интерфейсе с бейджем «демо».
 * Пара заказов специально дублирует друг друга (для показа дедупликации)
 * и несколько являются «мусором» (работа за отзыв, оплата процентом).
 */

interface DemoSeed {
  id: string;
  platform: Exclude<PlatformId, "fl">;
  title: string;
  description: string;
  category: CategoryId;
  categoryLabel: string;
  budgetMin: number | null;
  budgetMax: number | null;
  /** возраст заказа в часах от текущего момента */
  ageHours: number;
}

const SEEDS: DemoSeed[] = [
  // ---------- Kwork ----------
  {
    id: "kwork-1", platform: "kwork",
    title: "Нужен телеграм-бот для записи клиентов",
    description:
      "Автосервис хочет принимать записи через бота: выбор услуги, мастера и времени, напоминание за день. Оплата и статистика — плюс, но можно без них.",
    category: "dev", categoryLabel: "Разработка / Боты",
    budgetMin: 12000, budgetMax: 12000, ageHours: 8,
  },
  {
    id: "kwork-2", platform: "kwork",
    title: "Доработать магазин на WordPress + WooCommerce",
    description:
      "Перестал работать фильтр по характеристикам и подтормаживает каталог (около 2000 товаров). Нужен аудит и правки без переезда на другую платформу.",
    category: "dev", categoryLabel: "Разработка / CMS",
    budgetMin: 8000, budgetMax: 8000, ageHours: 20,
  },
  {
    id: "kwork-3", platform: "kwork",
    title: "Логотип для кофейни",
    description:
      "Название «Дым». Нужен знак, логотип в двух вариантах и мини-гайд по использованию. Референсы и конкуренты пришлю после отклика.",
    category: "design", categoryLabel: "Дизайн / Логотипы",
    budgetMin: 5000, budgetMax: 5000, ageHours: 5,
  },
  {
    id: "kwork-4", platform: "kwork",
    title: "Сверстать лендинг по готовому макету Figma",
    description:
      "Макет на 6 блоков, нужен адаптив под мобильные. Чистая вёрстка без конструкторов, чтобы страница быстро грузилась.",
    category: "dev", categoryLabel: "Разработка / Вёрстка",
    budgetMin: 15000, budgetMax: 15000, ageHours: 12,
  },
  {
    id: "kwork-5", platform: "kwork",
    title: "Написать 10 статей для блога ремонтной тематики",
    description:
      "Темы: шумоизоляция, тёплый пол, разводка электрики. Объём 6–8 тысяч знаков, без воды, с экспертными вводными от заказчика.",
    category: "text", categoryLabel: "Тексты / Статьи",
    budgetMin: 15000, budgetMax: 15000, ageHours: 26,
  },
  {
    id: "kwork-6", platform: "kwork",
    title: "Смонтировать 5 видео для YouTube (до 10 минут)",
    description:
      "Материалы на Google Диске: субтитры, звук, цветокор, обложки. Монтаж в DaVinci или Premiere, стиль референсами пришлю.",
    category: "media", categoryLabel: "Видео / Монтаж",
    budgetMin: 10000, budgetMax: 10000, ageHours: 15,
  },
  {
    id: "kwork-7", platform: "kwork",
    title: "Настроить таргет ВКонтакте для онлайн-школы",
    description:
      "Рекламный бюджет 60 000 ₽/мес, цель — заявки на бесплатный вебинар. Нужно 3–5 креативов и настройка кабинета с нуля.",
    category: "marketing", categoryLabel: "Маркетинг / Таргет",
    budgetMin: 7000, budgetMax: 7000, ageHours: 30,
  },
  {
    id: "kwork-8", platform: "kwork",
    title: "Озвучить рекламный ролик (мужской голос)",
    description:
      "Хронометраж 30 секунд, текст готов. Нужна чистая запись без эха, обработка и сведённая дорожка под видеоряд.",
    category: "media", categoryLabel: "Аудио / Озвучка",
    budgetMin: 4000, budgetMax: 4000, ageHours: 48,
  },
  {
    id: "kwork-9", platform: "kwork",
    title: "Спарсить каталог конкурента в Excel",
    description:
      "Название, артикул, цена, характеристики — около 3000 товаров. Результат: аккуратная таблица Excel с проверкой на пропуски.",
    category: "dev", categoryLabel: "Разработка / Парсинг",
    budgetMin: 3000, budgetMax: 3000, ageHours: 7,
  },
  {
    id: "kwork-10", platform: "kwork",
    title: "Сделать презентацию о компании (12 слайдов)",
    description:
      "Есть текст и фото, нужен дизайн слайдов в едином стиле. PowerPoint, чтобы дальше мы могли править сами.",
    category: "design", categoryLabel: "Дизайн / Презентации",
    budgetMin: 6000, budgetMax: 6000, ageHours: 18,
  },
  {
    id: "kwork-11", platform: "kwork",
    title: "Ищу автора карточек: оплата отзывами на Wildberries",
    description:
      "Пишем описания для своего магазина, взамен даём отзывы на вашем профиле и обещаем поток заказов в будущем.",
    category: "text", categoryLabel: "Тексты / Маркетплейсы",
    budgetMin: null, budgetMax: null, ageHours: 33,
  },
  {
    id: "kwork-12", platform: "kwork",
    title: "Перевести сайт с русского на английский (12 страниц)",
    description:
      "Инструкции по садовому инструменту. Нужен живой технический английский, машинный перевод не подойдёт.",
    category: "text", categoryLabel: "Переводы / EN",
    budgetMin: 20000, budgetMax: 20000, ageHours: 40,
  },

  // ---------- Freelance.ru ----------
  {
    id: "fr-1", platform: "freelanceru",
    title: "Разработать корпоративный сайт на Tilda",
    description:
      "6 страниц, интеграция форм с amoCRM, срок — 2 недели. Контент и логотип готовы, структура согласована.",
    category: "dev", categoryLabel: "Проекты / Сайты",
    budgetMin: 45000, budgetMax: 45000, ageHours: 9,
  },
  {
    id: "fr-2", platform: "freelanceru",
    title: "Дизайн мобильного приложения-фитнес-трекера",
    description:
      "Нужны экраны тренировок, статистики и онбординга (12 экранов), тёмная и светлая темы. Логотип и брендбук есть.",
    category: "design", categoryLabel: "Проекты / Mobile",
    budgetMin: 60000, budgetMax: 60000, ageHours: 22,
  },
  {
    id: "fr-3", platform: "freelanceru",
    title: "Ведение соцсетей стоматологии (ВК + Telegram)",
    description:
      "12 постов в месяц, 4 reels, ответы на комментарии. Медицинская тематика, важно уметь работать с дисклеймерами.",
    category: "marketing", categoryLabel: "Проекты / SMM",
    budgetMin: 35000, budgetMax: 35000, ageHours: 14,
  },
  {
    id: "fr-4", platform: "freelanceru",
    title: "Создать онлайн-курс по Excel: сценарий и материалы",
    description:
      "У заказчика есть экспертиза, нужна методическая упаковка: структура модулей, сценарии уроков, презентации и проверочные задания.",
    category: "consult", categoryLabel: "Проекты / Обучение",
    budgetMin: 25000, budgetMax: 25000, ageHours: 28,
  },
  {
    id: "fr-5", platform: "freelanceru",
    title: "Промоделировать интерьер квартиры 58 м²",
    description:
      "3ds Max + Corona, план приложу. Нужно 5–7 фотореалистичных рендеров и подборка материалов для ремонта.",
    category: "design", categoryLabel: "Проекты / Интерьер",
    budgetMin: 30000, budgetMax: 30000, ageHours: 36,
  },
  {
    id: "fr-6", platform: "freelanceru",
    title: "Копирайтер для карточек Wildberries",
    description:
      "Поставщик мебели: 120 карточек, структура по SEO-ключам, уникальность. Оплата за партию, дальше — постоянная работа.",
    category: "text", categoryLabel: "Проекты / Тексты",
    budgetMin: 16000, budgetMax: 16000, ageHours: 11,
  },
  {
    id: "fr-7", platform: "freelanceru",
    title: "Разработать чат-бота с ИИ для клиентской поддержки",
    description:
      "База знаний — 200 вопросов-ответов. Нужен RAG на базе GPT, чтобы бот отвечал по документам и передавал сложные вопросы оператору.",
    category: "ai", categoryLabel: "Проекты / AI",
    budgetMin: 55000, budgetMax: 55000, ageHours: 3,
  },
  {
    id: "fr-8", platform: "freelanceru",
    title: "Съёмка и монтаж 3 роликов для Reels",
    description:
      "Кофейня, формат «за кадром». Съёмка один день, монтаж с субтитрами и трендовой музыкой, обложки включите в смету.",
    category: "media", categoryLabel: "Проекты / Видео",
    budgetMin: 25000, budgetMax: 25000, ageHours: 25,
  },
  {
    id: "fr-9", platform: "freelanceru",
    title: "Аудит и ускорение сайта на Битриксе",
    description:
      "Загрузка 8 секунд по PageSpeed, нужно до 2,5. Кэширование, оптимизация картинок, критический CSS, отчёт по итогам.",
    category: "dev", categoryLabel: "Проекты / Оптимизация",
    budgetMin: 20000, budgetMax: 20000, ageHours: 44,
  },
  {
    id: "fr-10", platform: "freelanceru",
    title: "Интеграция МойСклад и интернет-магазина",
    description:
      "Синхронизация остатков, цен и заказов через API. Магазин на самописной платформе, доступы предоставим.",
    category: "dev", categoryLabel: "Проекты / Интеграции",
    budgetMin: 18000, budgetMax: 18000, ageHours: 50,
  },
  {
    id: "fr-11", platform: "freelanceru",
    title: "Ищу партнёра в бизнес — оплата процентом с прибыли",
    description:
      "Есть идея маркетплейса, нужен разработчик. Готов поделиться долей 30% после запуска, вложений не требуется.",
    category: "consult", categoryLabel: "Проекты / Партнёрство",
    budgetMin: null, budgetMax: null, ageHours: 60,
  },

  // ---------- Telegram ----------
  {
    id: "tg-1", platform: "telegram",
    title: "Верстальщик email-писем для рассылок (постоянно)",
    description:
      "Сеть клиник. Шаблоны в MJML, 4–6 писем в месяц. Оплата 900 ₽ за письмо, оформление по брендбуку.",
    category: "dev", categoryLabel: "Канал / Email-вёрстка",
    budgetMin: 12000, budgetMax: 12000, ageHours: 1.5,
  },
  {
    id: "tg-2", platform: "telegram",
    title: "Motion-дизайнер на YouTube-канал (3 видео в неделю)",
    description:
      "Канал про бизнес-кейсы, нужны динамичные вставки, инфографика и звуковые акценты. Примеры пришлю в личку.",
    category: "media", categoryLabel: "Канал / Motion",
    budgetMin: 45000, budgetMax: 45000, ageHours: 4,
  },
  {
    id: "tg-3", platform: "telegram",
    title: "Ищем SMM-специалиста в команду студии",
    description:
      "Ведём 4 клиента: контент-планы, посты, сторис. Полная занятость удалённо, оформление по договору, оплата 2 раза в месяц.",
    category: "marketing", categoryLabel: "Канал / SMM",
    budgetMin: 40000, budgetMax: 40000, ageHours: 2,
  },
  {
    id: "tg-4", platform: "telegram",
    title: "Настроить аналитику GA4 и серверный трекинг",
    description:
      "Интернет-магазин, теряем часть конверсий после iOS-обновлений. Нужны события, серверный тег и проверка целей.",
    category: "marketing", categoryLabel: "Канал / Аналитика",
    budgetMin: 15000, budgetMax: 15000, ageHours: 6,
  },
  {
    id: "tg-5", platform: "telegram",
    title: "Репетитор по Python для школьника (Zoom)",
    description:
      "Сын 15 лет, готовится к олимпиаде. Нужны 2 занятия в неделю, разбор задач и домашние задания.",
    category: "consult", categoryLabel: "Канал / Репетиторство",
    budgetMin: 12000, budgetMax: 12000, ageHours: 9,
  },
  {
    id: "tg-6", platform: "telegram",
    title: "Рерайтер на постоянку, 150 ₽/1000 знаков",
    description:
      "Портал о стройке. Свои темы, без копипаста, объём от 3000 знаков в день. Долгосрочное сотрудничество, оплата еженедельно.",
    category: "text", categoryLabel: "Канал / Рерайт",
    budgetMin: null, budgetMax: null, ageHours: 13,
  },
  {
    id: "tg-7", platform: "telegram",
    title: "Визитки и логотип для барбершопа",
    description:
      "Название «Остриж». Нужен строгий мужской стиль, 2 макета визиток под печать и логотип в векторе.",
    category: "design", categoryLabel: "Канал / Фирстиль",
    budgetMin: 8000, budgetMax: 8000, ageHours: 12,
  },
  {
    id: "tg-8", platform: "telegram",
    title: "Разработчик на Unity — прототип мобильной игры",
    description:
      "Головоломка, 20 уровней, механика описана на бумаге. Нужен играбельный прототип за месяц, арт дадим.",
    category: "dev", categoryLabel: "Канал / Игры",
    budgetMin: 70000, budgetMax: 70000, ageHours: 30,
  },
  {
    id: "tg-9", platform: "telegram",
    title: "Фотограф: съёмка 40 SKU для маркетплейса",
    description:
      "Товары — ручной инструмент. Студия у вас или выезд. Обработка включена, требования WB/Ozon по ваттинам пришлю.",
    category: "media", categoryLabel: "Канал / Предметка",
    budgetMin: 22000, budgetMax: 22000, ageHours: 16,
  },
  {
    id: "tg-10", platform: "telegram",
    title: "Доработка 1С:ЗУП — обмен с банком",
    description:
      "Не выгружается зарплатный реестр после обновления конфигурации. Нужен разбор и исправление обмена, доступ по RDP.",
    category: "dev", categoryLabel: "Канал / 1С",
    budgetMin: 14000, budgetMax: 14000, ageHours: 20,
  },
  {
    id: "tg-11", platform: "telegram",
    title: "Создать нейросетевые аватары для команды",
    description:
      "13 сотрудников, по 3 варианта на каждого в едином стиле. Исходные фото есть, стиль референсами согласуем.",
    category: "ai", categoryLabel: "Канал / AI-графика",
    budgetMin: 10000, budgetMax: 10000, ageHours: 5,
  },
  {
    id: "tg-12", platform: "telegram",
    title: "Тестировщики приложения — оплата отзывом в сторах",
    description:
      "Нужно установить приложение, пройти сценарии и оставить отзыв. Самым активным — скидка на подписку.",
    category: "dev", categoryLabel: "Канал / Тестирование",
    budgetMin: null, budgetMax: null, ageHours: 45,
  },
  {
    // дубль заказа kwork-4 — моложе, поэтому при дедупликации останется этот,
    // а kwork-4 будет скрыт как дубликат
    id: "tg-13", platform: "telegram",
    title: "Сверстать лендинг по готовому макету Figma",
    description:
      "Макет на 6 блоков, нужен адаптив. Чистая вёрстка без конструкторов, сроки — неделя.",
    category: "dev", categoryLabel: "Канал / Вёрстка",
    budgetMin: 15000, budgetMax: 15000, ageHours: 10,
  },
  {
    // дубль заказа fr-1 (старше — будет скрыт при дедупликации)
    id: "tg-14", platform: "telegram",
    title: "Разработать корпоративный сайт на Tilda",
    description:
      "6 страниц, интеграция форм с amoCRM. Контент готов, нужно собрать и запустить.",
    category: "dev", categoryLabel: "Канал / Сайты",
    budgetMin: 45000, budgetMax: 45000, ageHours: 52,
  },
  {
    id: "tg-15", platform: "telegram",
    title: "Оптимизировать рекламные кампании в Директе",
    description:
      "Расход 300 тыс. ₽/мес, конверсия упала после смены лендинга. Нужен аудит, перекройка структуры и минус-слова.",
    category: "marketing", categoryLabel: "Канал / Директ",
    budgetMin: 12000, budgetMax: 12000, ageHours: 7,
  },
];

export function getDemoOrders(now: number = Date.now()): Order[] {
  return SEEDS.map((s) => ({
    id: s.id,
    platform: s.platform,
    live: false,
    title: s.title,
    description: s.description,
    categoryId: s.category,
    categoryLabel: s.categoryLabel,
    budgetMin: s.budgetMin,
    budgetMax: s.budgetMax,
    url: PLATFORMS[s.platform].url,
    publishedAt: Math.round(now - s.ageHours * 3_600_000),
    demo: true,
  }));
}
