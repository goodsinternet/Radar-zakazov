export type PlatformId = "fl" | "kwork" | "freelanceru" | "telegram";

export type CategoryId =
  | "dev"
  | "design"
  | "text"
  | "marketing"
  | "media"
  | "ai"
  | "consult"
  | "eng"
  | "other";

export interface Order {
  id: string;
  platform: PlatformId;
  /** true — живые данные с площадки, false — демо-пример */
  live: boolean;
  title: string;
  description: string;
  categoryId: CategoryId;
  categoryLabel: string;
  budgetMin: number | null;
  budgetMax: number | null;
  url: string;
  /** epoch ms */
  publishedAt: number;
  demo: boolean;
}

/** Профиль пользователя — что он умеет и что хочет видеть */
export interface Profile {
  categories: CategoryId[];
  keywords: string[];
  exclude: string[];
  budgetMin: number | null;
  budgetMax: number | null;
}

export type SortMode = "match" | "new" | "budget";
/** часы; 0 = за всё время */
export type Freshness = 0 | 24 | 72 | 168;

export interface ViewState {
  platforms: PlatformId[];
  hideJunk: boolean;
  freshness: Freshness;
  sort: SortMode;
  search: string;
}

export interface OrdersResponse {
  orders: Order[];
  fetchedAt: number;
  fl: { ok: boolean; count: number; error?: string };
  tg: { connected: boolean; count: number; error?: string; lastSyncAt?: number };
  demoCount: number;
}

export interface MatchResult {
  score: number | null;
  reasons: string[];
}

export interface FilterResult {
  list: Order[];
  matches: Map<string, MatchResult>;
  hidden: {
    duplicates: number;
    junk: number;
    dismissed: number;
    filtered: number;
  };
}
