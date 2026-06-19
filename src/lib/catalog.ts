import type {
  ParsedFilters,
  Product,
  ProductGroup,
  Recommendation,
  RouteStop,
  ScoreLine,
  StockStatus,
} from "./types";
import { FIT_TAG, categoryHasFit } from "./types";
import type { RequestGroup } from "./groups";
import { zoneForGroup } from "./groups";
import {
  sizeTypeForCategory,
  sizeTypeForValue,
  type SizeType,
  validateSizeForCategory,
  isSizeOutOfRange,
} from "./sizes";

// ---------- price & stock ---------------------------------------------------

export function getEffectivePrice(product: Pick<Product, "price_chf" | "discount_pct">): number {
  const pct = product.discount_pct ?? 0;
  const raw = product.price_chf * (1 - pct / 100);
  return Math.round(raw * 20) / 20; // round to nearest 0.05 CHF
}

export function getStockStatus(product: Pick<Product, "stock_total" | "stock_front">): StockStatus {
  if (!product || product.stock_total <= 0) return "SOLD OUT";
  if (product.stock_front <= 0) return "ASK STAFF";
  return "ON SHELF";
}

// ---------- lookups ---------------------------------------------------------

export function findProductByBarcode(
  products: Product[],
  product_code: string,
): Product | undefined {
  const code = String(product_code).trim();
  return products.find((p) => p.product_code === code);
}

export function groupVariantsByProduct(
  products: Product[],
  product_id: string,
): Product[] {
  return products.filter((p) => p.product_id === product_id);
}

/** Collapse a flat variant list into one ProductGroup per product_id. */
export function buildProductGroups(products: Product[]): ProductGroup[] {
  const byId = new Map<string, Product[]>();
  for (const p of products) {
    const arr = byId.get(p.product_id);
    if (arr) arr.push(p);
    else byId.set(p.product_id, [p]);
  }
  return [...byId.values()].map(toGroup);
}

function toGroup(variants: Product[]): ProductGroup {
  const v0 = variants[0];
  const colors = uniq(variants.map((v) => v.color));
  const sizes = uniq(variants.map((v) => v.size));
  return {
    product_id: v0.product_id,
    name: v0.name,
    brand: v0.brand,
    category: v0.category,
    description: v0.description,
    zone: v0.zone,
    zone_name: v0.zone_name,
    aisle: v0.aisle,
    tags: v0.tags,
    material: v0.material,
    weight_g: v0.weight_g,
    waterproof_rating_mm: v0.waterproof_rating_mm,
    temp_rating_c: v0.temp_rating_c,
    price_chf: v0.price_chf,
    discount_pct: v0.discount_pct,
    colors,
    sizes,
    variants,
  };
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

// ---------- filtering -------------------------------------------------------

/** Filter the raw variant list by hard constraints. */
export function filterProducts(products: Product[], filters: ParsedFilters): Product[] {
  return products.filter((p) => {
    if (filters.categories.length && !filters.categories.includes(p.category)) return false;
    if (filters.size !== undefined && String(p.size).toLowerCase() !== String(filters.size).toLowerCase())
      return false;
    if (filters.color && p.color.toLowerCase() !== filters.color.toLowerCase()) return false;
    if (filters.maxPrice !== undefined && getEffectivePrice(p) > filters.maxPrice) return false;
    if (filters.waterproof && !p.tags.includes("waterproof")) return false;
    return true;
  });
}

// ---------- scoring & matching ---------------------------------------------

/**
 * Forgiving scoring. Returns total score plus a per-rule breakdown.
 *
 * Base
 *   +10 stock_total > 0
 *   +10 stock_front > 0
 * Category
 *   +40 exact match against requested group (first category in list)
 *   +15 related category (any other category in the group)
 * Size
 *   +25 exact size match (no size requested ⇒ neutral)
 *   -10 size requested but does not match
 * Waterproof (when required)
 *   +25 product.tags includes "waterproof"
 *   +20 waterproof_rating_mm > 0
 *   -10 neither
 * Winter (when required)
 *   +25 product.tags includes "winter"
 *   +20 temp_rating_c != null && temp_rating_c <= -5
 *   -10 neither
 * Budget
 *   +20 effective price under budget
 *   -10 slightly over (≤ 20% over)
 *   -25 far over (> 20%)
 * Preferences
 *   +8 for each preferred tag matched (lightweight, vegan, beginner, recycled)
 * Stock
 *   -100 stock_total = 0
 *   -15  stock_front = 0 but stock_total > 0
 */
export function scoreProduct(
  product: Product,
  filters: ParsedFilters,
): { score: number; breakdown: ScoreLine[] } {
  const lines: ScoreLine[] = [];
  const add = (points: number, label: string) => {
    if (points !== 0) lines.push({ points, label });
  };

  // Stock — heavy negative if sold out, otherwise base bonuses.
  if (product.stock_total <= 0) {
    add(-100, "Sold out");
  } else {
    add(10, "In stock");
    if (product.stock_front > 0) {
      add(10, `On the shelf now (${product.stock_front} at front)`);
    } else {
      add(-15, "Not on the shelf — staff has to fetch from back stock");
    }
  }

  // Category — exact vs related.
  if (filters.categories.length) {
    const primary = filters.categories[0];
    if (product.category === primary) {
      add(40, `Matches category “${prettyCategory(primary)}”`);
    } else if (filters.categories.includes(product.category)) {
      add(15, `Related category “${prettyCategory(product.category)}”`);
    }
  }

  // Size
  if (filters.size !== undefined) {
    const match =
      String(product.size).toLowerCase() === String(filters.size).toLowerCase();
    if (match) add(25, `Available in size ${filters.size}`);
    else add(-10, `Size ${product.size} does not match requested ${filters.size}`);
  }

  // Waterproof
  if (filters.waterproof) {
    const hasTag = product.tags.includes("waterproof");
    const hasRating = (product.waterproof_rating_mm ?? 0) > 0;
    if (hasTag) add(25, "Tagged waterproof");
    if (hasRating)
      add(20, `Waterproof to ${product.waterproof_rating_mm} mm`);
    if (!hasTag && !hasRating) add(-10, "Not waterproof");
  }

  // Winter
  if (filters.winter) {
    const hasTag = product.tags.includes("winter");
    const coldRated =
      product.temp_rating_c !== null && product.temp_rating_c <= -5;
    if (hasTag) add(25, "Tagged for winter use");
    if (coldRated)
      add(20, `Rated to ${product.temp_rating_c}°C for cold weather`);
    if (!hasTag && !coldRated) add(-10, "Not winter-suitable");
  }

  // Budget
  if (filters.maxPrice !== undefined) {
    const eff = getEffectivePrice(product);
    if (eff <= filters.maxPrice) {
      add(20, `Within CHF ${filters.maxPrice} budget (CHF ${eff.toFixed(2)})`);
    } else {
      const overshoot = (eff - filters.maxPrice) / filters.maxPrice;
      if (overshoot <= 0.2) {
        add(-10, `Slightly over budget (CHF ${eff.toFixed(2)} vs ${filters.maxPrice})`);
      } else {
        add(-25, `Far over budget (CHF ${eff.toFixed(2)} vs ${filters.maxPrice})`);
      }
    }
  }

  // Preference bonuses — +8 per matched preferred tag.
  const prefTags: Array<{ on: boolean | undefined; tag: string; label: string }> = [
    { on: filters.lightweight, tag: "lightweight", label: "Lightweight to carry" },
    { on: filters.vegan, tag: "vegan", label: "Vegan / animal-free materials" },
    { on: filters.beginnerFriendly, tag: "beginner", label: "Beginner-friendly" },
    { on: filters.lightweight || filters.vegan || filters.beginnerFriendly, tag: "recycled", label: "Made from recycled materials" },
  ];
  for (const pt of prefTags) {
    if (pt.on && product.tags.includes(pt.tag)) add(8, pt.label);
  }

  // Fit preference — only meaningful for apparel/footwear/accessory categories.
  if (filters.fit && filters.fit !== "any" && categoryHasFit(product.category)) {
    const wantTag = FIT_TAG[filters.fit];
    const hasWant = product.tags.includes(wantTag);
    if (hasWant) add(20, `Matches ${prettyFit(filters.fit)} fit`);
    // Unisex products are acceptable for any specified fit.
    if (!hasWant && product.tags.includes("unisex")) add(5, "Unisex fit");
    // Penalise opposite gendered fit only when user asked for men's or women's.
    if (filters.fit === "womens" && product.tags.includes("mens") && !hasWant) {
      add(-25, "Men's fit — you asked for women's");
    }
    if (filters.fit === "mens" && product.tags.includes("womens") && !hasWant) {
      add(-25, "Women's fit — you asked for men's");
    }
    if (filters.fit === "kids" && !product.tags.includes("kids")) {
      add(-15, "Not a kids' fit");
    }
  }

  const score = lines.reduce((s, l) => s + l.points, 0);
  return { score, breakdown: lines };
}

function prettyFit(fit: "womens" | "mens" | "unisex" | "kids"): string {
  return fit === "womens"
    ? "women's"
    : fit === "mens"
      ? "men's"
      : fit === "unisex"
        ? "unisex"
        : "kids'";
}

/** Back-compat alias: previous code calls calculateMatchScore -> number. */
export function calculateMatchScore(product: Product, filters: ParsedFilters): number {
  return scoreProduct(product, filters).score;
}

function prettyCategory(c: string) {
  return c.replace(/-/g, " ");
}

/** Build a single plain-English sentence from a score breakdown. */
function buildReason(lines: ScoreLine[]): string {
  const pos = lines.filter((l) => l.points > 0).map((l) => l.label.toLowerCase());
  const neg = lines.filter((l) => l.points < 0).map((l) => l.label.toLowerCase());
  if (pos.length === 0 && neg.length === 0) return "No matching criteria.";
  const parts: string[] = [];
  if (pos.length) parts.push(joinList(pos));
  if (neg.length) parts.push("but " + joinList(neg));
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

function joinList(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

function splitReasons(lines: ScoreLine[]) {
  return {
    matchReasons: lines.filter((l) => l.points > 0).map((l) => l.label),
    tradeoffs: lines.filter((l) => l.points < 0).map((l) => l.label),
  };
}

function tagFromScore(
  score: number,
  status: StockStatus,
  breakdown: ScoreLine[] = [],
): import("./types").MatchTag {
  if (status === "SOLD OUT") return "SOLD OUT";
  if (status === "ASK STAFF") return "ASK STAFF";
  const hasNegative = breakdown.some((l) => l.points < 0);
  if (score >= 80 && !hasNegative) return "BEST MATCH";
  if (score >= 40) return "GOOD MATCH";
  return "CLOSEST MATCH";
}

/** Recommend product groups; chooses the best in-stock variant per group. */
export function recommendProducts(
  products: Product[],
  filters: ParsedFilters,
  limit = 6,
): Recommendation[] {
  const groups = buildProductGroups(products);

  const recs: Recommendation[] = groups.map((g) => {
    // score each variant, pick the highest score (ties → in-stock first)
    const scored = g.variants
      .map((v) => {
        const { score, breakdown } = scoreProduct(v, filters);
        return { v, score, breakdown, st: getStockStatus(v) };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ar = a.st === "ON SHELF" ? 2 : a.st === "ASK STAFF" ? 1 : 0;
        const br = b.st === "ON SHELF" ? 2 : b.st === "ASK STAFF" ? 1 : 0;
        return br - ar;
      });

    const best = scored[0];
    const tag = tagFromScore(best.score, best.st, best.breakdown);
    const { matchReasons, tradeoffs } = splitReasons(best.breakdown);

    return {
      group: g,
      variant: best.v,
      score: best.score,
      reasons: best.breakdown.filter((l) => l.points !== 0).map((l) => l.label),
      tag,
      stockStatus: best.st,
      breakdown: best.breakdown,
      reason: buildReason(best.breakdown),
      matchReasons,
      tradeoffs,
    };
  });

  return recs
    // Soft scoring: never drop everything. Keep all that scored, sort, slice.
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Group recommendations by product category, preserving best-first order. */
export function groupRecommendationsByCategory(
  recs: Recommendation[],
): { category: string; items: Recommendation[] }[] {
  const byCat = new Map<string, Recommendation[]>();
  for (const r of recs) {
    const list = byCat.get(r.group.category) ?? [];
    list.push(r);
    byCat.set(r.group.category, list);
  }
  return [...byCat.entries()]
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => b.score - a.score),
    }))
    .sort((a, b) => b.items[0].score - a.items[0].score);
}

/** Suggest alternatives from the same category that satisfy hard filters. */
export function recommendAlternatives(
  product: Product,
  allProducts: Product[],
  filters: ParsedFilters,
  limit = 3,
): Recommendation[] {
  const others = allProducts.filter(
    (p) => p.product_id !== product.product_id && p.category === product.category,
  );
  return recommendProducts(others, filters, limit);
}

// ---------- per-request-group soft recommender -----------------------------

export type GroupResult = {
  group: RequestGroup;
  recommendations: Recommendation[];
  isClosestOnly: boolean;   // no rec scored above STRONG_THRESHOLD
  isZoneFallback: boolean;  // we surfaced top items from the zone instead
  considered: number;       // how many product_ids were scored
  /** How many product_ids remained after restricting to the group's categories. */
  consideredInCategory: number;
  /** A friendly warning when the requested size is invalid for the categories. */
  sizeWarning?: string;
  /** The size we actually scored with (size is dropped if invalid for the category). */
  effectiveSize?: string | number;
  /** True when the group had categories but none exist in the catalog. */
  emptyCategory: boolean;
  /** Size-validation metadata for the debug panel. */
  sizeInfo: {
    requestedSize?: string | number;
    requestedCategory?: string;
    sizeType: SizeType;
    categorySizeType: SizeType;
    isValid: boolean;
  };
};

const STRONG_THRESHOLD = 40;  // a true category match is +40

/**
 * Soft, per-RequestGroup recommendation:
 *   - Score every product (no hard filter).
 *   - Always return top `perGroup` (default 3) by score.
 *   - If nothing scored above STRONG_THRESHOLD, fall back to top items from
 *     the most likely zone for the group (or top overall if no zone).
 *   - SOLD-OUT items stay in the list unless `hideSoldOut` is true.
 */
export function recommendForGroup(
  allProducts: Product[],
  group: RequestGroup,
  opts: { perGroup?: number; hideSoldOut?: boolean } = {},
): GroupResult {
  const perGroup = opts.perGroup ?? 3;
  const hideSoldOut = opts.hideSoldOut ?? false;

  // Group is waiting on a traveler size — return no recommendations so the
  // UI can render a "Size needed" placeholder instead of guessing a size.
  if (group.sizeNeeded) {
    return {
      group,
      recommendations: [],
      isClosestOnly: true,
      isZoneFallback: false,
      considered: 0,
      consideredInCategory: 0,
      sizeWarning: undefined,
      effectiveSize: undefined,
      emptyCategory: false,
      sizeInfo: buildSizeInfo(group.size, group.categories[0], false),
    };
  }

  // ---- Category gate: never score products from unrelated categories. -----
  const stockFiltered = hideSoldOut
    ? allProducts.filter((p) => p.stock_total > 0)
    : allProducts;

  const hasCategoryConstraint = group.categories.length > 0;
  const inCategory = hasCategoryConstraint
    ? stockFiltered.filter((p) => group.categories.includes(p.category))
    : stockFiltered;

  // ---- Size validation: only keep size when it suits the category. --------
  const primaryCategory = group.categories[0];
  const requestedSize = group.size;
  const sizeCheck = validateSizeForCategory(requestedSize, group.categories);
  let sizeValid = sizeCheck.isValid;
  let effectiveSize: string | number | undefined = sizeValid ? requestedSize : undefined;
  let sizeWarning = sizeCheck.warning ?? undefined;

  // Out-of-range check — e.g. shoe size 60 is the right TYPE but no neighbour
  // is reasonable. Drop the size filter and warn so we don't recommend a
  // misleading "closest" size (size 37 for a request of 60).
  if (sizeValid && effectiveSize !== undefined) {
    const range = isSizeOutOfRange(effectiveSize, group.categories, stockFiltered);
    if (range.outOfRange) {
      effectiveSize = undefined;
      sizeValid = false;
      sizeWarning = range.warning ?? sizeWarning;
    }
  }

  const filters: ParsedFilters = {
    ...groupToFilters(group),
    size: effectiveSize,
  };

  // ---- Empty-category guard. ----------------------------------------------
  const allProductGroups = buildProductGroups(stockFiltered);
  const productGroups = buildProductGroups(inCategory);

  if (hasCategoryConstraint && productGroups.length === 0) {
    return {
      group,
      recommendations: [],
      isClosestOnly: true,
      isZoneFallback: false,
      considered: allProductGroups.length,
      consideredInCategory: 0,
      sizeWarning,
      effectiveSize,
      emptyCategory: true,
      sizeInfo: buildSizeInfo(requestedSize, primaryCategory, sizeValid),
    };
  }

  const recs: Recommendation[] = productGroups.map((pg) => {
    const scored = pg.variants
      .map((v) => {
        const { score, breakdown } = scoreProduct(v, filters);
        return { v, score, breakdown, st: getStockStatus(v) };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ar = a.st === "ON SHELF" ? 2 : a.st === "ASK STAFF" ? 1 : 0;
        const br = b.st === "ON SHELF" ? 2 : b.st === "ASK STAFF" ? 1 : 0;
        return br - ar;
      });
    const best = scored[0];
    const { matchReasons, tradeoffs } = splitReasons(best.breakdown);
    return {
      group: pg,
      variant: best.v,
      score: best.score,
      reasons: best.breakdown.filter((l) => l.points !== 0).map((l) => l.label),
      tag: tagFromScore(best.score, best.st, best.breakdown),
      stockStatus: best.st,
      breakdown: best.breakdown,
      reason: buildReason(best.breakdown),
      matchReasons,
      tradeoffs,
    };
  });

  recs.sort((a, b) => b.score - a.score);

  // Dedup near-duplicate men's/women's variants when fit is unspecified.
  const deduped = group.fit === "any" ? dedupeByFitSignature(recs) : recs;

  const top = deduped.slice(0, perGroup);
  const hasStrong = top.some((r) => r.score >= STRONG_THRESHOLD);

  // Fallback: if nothing scored well at all, prefer items from the group's zone.
  // Only fall back outside the category gate when the user did NOT specify a category.
  if (top.length === 0 || top[0].score <= 0) {
    const zone = zoneForGroup(group, allProducts);
    if (zone) {
      const zoneOnly = deduped.filter((r) => r.group.zone === zone).slice(0, perGroup);
      if (zoneOnly.length > 0) {
        return {
          group,
          recommendations: zoneOnly,
          isClosestOnly: true,
          isZoneFallback: true,
          considered: productGroups.length,
          consideredInCategory: productGroups.length,
          sizeWarning,
          effectiveSize,
          emptyCategory: false,
          sizeInfo: buildSizeInfo(requestedSize, primaryCategory, sizeValid),
        };
      }
    }
    return {
      group,
      recommendations: deduped.slice(0, perGroup),
      isClosestOnly: true,
      isZoneFallback: false,
      considered: productGroups.length,
      consideredInCategory: productGroups.length,
      sizeWarning,
      effectiveSize,
      emptyCategory: false,
      sizeInfo: buildSizeInfo(requestedSize, primaryCategory, sizeValid),
    };
  }

  return {
    group,
    recommendations: top,
    isClosestOnly: !hasStrong,
    isZoneFallback: false,
    considered: productGroups.length,
    consideredInCategory: productGroups.length,
    sizeWarning,
    effectiveSize,
    emptyCategory: false,
    sizeInfo: buildSizeInfo(requestedSize, primaryCategory, sizeValid),
  };
}

function buildSizeInfo(
  requestedSize: string | number | undefined,
  requestedCategory: string | undefined,
  isValid: boolean,
) {
  return {
    requestedSize,
    requestedCategory,
    sizeType: sizeTypeForValue(requestedSize),
    categorySizeType: requestedCategory
      ? sizeTypeForCategory(requestedCategory)
      : ("unknown" as SizeType),
    isValid,
  };
}

/**
 * Build a signature for a product group that ignores gendered variants so the
 * recommender does not show both the men's and women's version side by side
 * when the user did not specify a fit.
 */
function fitSignature(pg: ProductGroup): string {
  const base = pg.name
    .toLowerCase()
    .replace(/\b(men'?s?|women'?s?|wmn|wmns|mns|unisex|kids?|junior|youth)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${pg.brand.toLowerCase()}|${pg.category}|${base}`;
}

function dedupeByFitSignature(recs: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const r of recs) {
    const sig = fitSignature(r.group);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(r);
  }
  return out;
}

/** Convert a RequestGroup into the legacy ParsedFilters used by scoreProduct. */
export function groupToFilters(g: RequestGroup): ParsedFilters {
  return {
    categories: g.categories,
    size: g.size,
    maxPrice: g.maxPrice,
    waterproof: g.waterproof || undefined,
    winter: g.winter || undefined,
    lightweight: g.lightweight || undefined,
    vegan: g.vegan || undefined,
    beginnerFriendly: g.beginner || undefined,
    fit: g.fit,
    rawText: g.rawText,
  };
}

/** Lightweight scored-row type for the debug panel. */
export type ScoredRow = {
  product: Product;
  score: number;
  breakdown: ScoreLine[];
  reason: string;
};

export function scoreAll(
  products: Product[],
  group: RequestGroup,
  limit = 10,
): ScoredRow[] {
  const filters = groupToFilters(group);
  return products
    .map((p) => {
      const { score, breakdown } = scoreProduct(p, filters);
      return { product: p, score, breakdown, reason: buildReason(breakdown) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------- in-store routing -----------------------------------------------

/**
 * Build an ordered walking route starting at the entrance, visiting every
 * zone that contains any of the given products, then checkout & exit.
 * Zones are visited in alphabetical zone-code order so the path doesn't
 * backtrack (zones A → B → C …).
 */
export function generateRouteFromEntrance(products: Product[]): RouteStop[] {
  const byZone = new Map<string, { zone_name: string; aisles: Set<string> }>();
  for (const p of products) {
    const entry = byZone.get(p.zone) ?? { zone_name: p.zone_name, aisles: new Set<string>() };
    entry.aisles.add(p.aisle);
    byZone.set(p.zone, entry);
  }

  const zoneStops: RouteStop[] = [...byZone.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([zone, info], i) => ({
      index: i + 2,
      kind: "zone" as const,
      label: `Zone ${zone} — ${info.zone_name}`,
      sublabel:
        info.aisles.size === 1
          ? `Aisle ${[...info.aisles][0]}`
          : `Aisles ${[...info.aisles].sort().join(", ")}`,
    }));

  const stops: RouteStop[] = [
    { index: 1, kind: "entrance", label: "Entrance" },
    ...zoneStops,
    { index: zoneStops.length + 2, kind: "checkout", label: "Checkout" },
    { index: zoneStops.length + 3, kind: "exit", label: "Exit" },
  ];
  // re-number sequentially
  return stops.map((s, i) => ({ ...s, index: i + 1 }));
}

/** Short-route variant for reduced-walking mode: cap to the 2 busiest zones. */
export function generateShortRouteFromEntrance(products: Product[]): RouteStop[] {
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.zone, (counts.get(p.zone) ?? 0) + 1);
  const keepZones = new Set(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([z]) => z),
  );
  return generateRouteFromEntrance(products.filter((p) => keepZones.has(p.zone)));
}