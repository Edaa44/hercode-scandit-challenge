// One row in products.json = one SKU / variant.
export type Product = {
  product_code: string; // barcode / SKU
  product_id: string;   // shared across size & color variants
  name: string;
  brand: string;
  category: string;
  color: string;
  size: string | number;
  price_chf: number;
  discount_pct: number;
  weight_g: number;
  waterproof_rating_mm: number | null;
  temp_rating_c: number | null;
  material: string;
  tags: string[];
  zone: string;
  zone_name: string;
  aisle: string;
  stock_total: number;
  stock_front: number;
  description: string;
};

// All variants belonging to one product_id.
export type ProductGroup = {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  zone: string;
  zone_name: string;
  aisle: string;
  tags: string[];
  material: string;
  weight_g: number;
  waterproof_rating_mm: number | null;
  temp_rating_c: number | null;
  price_chf: number;
  discount_pct: number;
  colors: string[];
  sizes: (string | number)[];
  variants: Product[];
};

export type StockStatus = "ON SHELF" | "ASK STAFF" | "SOLD OUT";

export type A11yPrefs = {
  colorBlind: boolean;
  lowVision: boolean;
  reducedWalking: boolean;
  voiceGuidance: boolean;
  simpleLanguage: boolean;
  beginner: boolean;
  budgetSafe: boolean;
};

export const defaultPrefs: A11yPrefs = {
  colorBlind: false,
  lowVision: false,
  reducedWalking: false,
  voiceGuidance: false,
  simpleLanguage: false,
  beginner: false,
  budgetSafe: false,
};

export type ParsedFilters = {
  categories: string[];
  size?: number | string;
  color?: string;
  maxPrice?: number;
  waterproof?: boolean;
  winter?: boolean;
  lightweight?: boolean;
  vegan?: boolean;
  beginnerFriendly?: boolean;
  fit?: Fit;
  rawText: string;
};

export type MatchTag =
  | "BEST MATCH"
  | "GOOD MATCH"
  | "CLOSEST MATCH"
  | "NEED SIZE"
  | "NOT CARRIED"
  | "OPTIONAL / BORROW"
  | "ASK STAFF"
  | "SOLD OUT";

export type Fit = "any" | "womens" | "mens" | "unisex" | "kids";

export const FIT_TAG: Record<Exclude<Fit, "any">, string> = {
  womens: "womens",
  mens: "mens",
  unisex: "unisex",
  kids: "kids",
};

/** Categories where men's/women's/unisex/kids fit is meaningful. */
export const CATEGORIES_WITH_FIT: ReadonlySet<string> = new Set([
  "rain-jacket",
  "hardshell",
  "insulated-jacket",
  "base-layer",
  "fleece",
  "trousers",
  "boots",
  "trail-shoes",
  "approach-shoes",
  "socks",
  "gloves",
  "hat",
]);

export function categoryHasFit(category: string | undefined | null): boolean {
  if (!category) return true; // unknown → don't suppress
  return CATEGORIES_WITH_FIT.has(category);
}

export type ScoreLine = { points: number; label: string };

export type Recommendation = {
  group: ProductGroup;
  variant: Product;       // best matching variant (or first available)
  score: number;
  reasons: string[];
  tag: MatchTag;
  stockStatus: StockStatus;
  breakdown: ScoreLine[];
  reason: string;         // single plain-English sentence
  matchReasons: string[]; // positive points, e.g. "Waterproof"
  tradeoffs: string[];    // negative points, e.g. "Over budget"
};

export type RouteStop = {
  index: number;
  label: string;          // e.g. "Jackets & Shells"
  sublabel?: string;      // e.g. "Aisles A1, A2"
  kind: "entrance" | "zone" | "checkout" | "exit";
};