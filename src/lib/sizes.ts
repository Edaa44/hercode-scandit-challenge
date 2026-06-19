/**
 * Category-aware size typing & validation.
 *
 * Each catalog category belongs to one "size type". A user-entered size is
 * only valid for categories of the matching type — e.g. "M" makes sense for
 * a fleece (apparel) but not for a water bottle (gear capacity).
 */

export type SizeType = "apparel" | "footwear" | "gear" | "unknown";

const APPAREL = new Set([
  "rain-jacket",
  "hardshell",
  "insulated-jacket",
  "base-layer",
  "fleece",
  "trousers",
]);

const FOOTWEAR = new Set(["boots", "trail-shoes", "approach-shoes"]);

const GEAR = new Set([
  "backpack",
  "water-bottle",
  "sleeping-bag",
  "sleeping-mat",
  "tent",
  "tarp",
  "stove",
  "headlamp",
  "trekking-poles",
  "gloves",
  "socks",
  "hat",
]);

const APPAREL_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const ONE_SIZE_CATEGORIES = new Set([
  "headlamp",
  "trekking-poles",
  "gloves",
  "socks",
  "hat",
  "stove",
  "tarp",
]);

/** Hard-coded fallback options (kept consistent with the catalog UX spec). */
const STATIC_SIZE_OPTIONS: Record<string, string[]> = {
  // apparel
  "rain-jacket": ["XS", "S", "M", "L", "XL", "XXL"],
  hardshell: ["XS", "S", "M", "L", "XL", "XXL"],
  "insulated-jacket": ["XS", "S", "M", "L", "XL", "XXL"],
  "base-layer": ["XS", "S", "M", "L", "XL", "XXL"],
  fleece: ["XS", "S", "M", "L", "XL", "XXL"],
  trousers: ["XS", "S", "M", "L", "XL", "XXL"],
  // footwear
  boots: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
  "trail-shoes": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
  "approach-shoes": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
  // capacity
  "water-bottle": ["one-size", "0.75L", "1L"],
  backpack: ["20L", "30L", "45L", "60L"],
  tent: ["1P", "2P", "3P", "4P"],
  // one-size accessories
  headlamp: ["one-size"],
  "trekking-poles": ["one-size"],
  gloves: ["one-size"],
  socks: ["one-size"],
  hat: ["one-size"],
  stove: ["one-size"],
  tarp: ["one-size"],
};

export function sizeTypeForCategory(category: string): SizeType {
  if (APPAREL.has(category)) return "apparel";
  if (FOOTWEAR.has(category)) return "footwear";
  if (GEAR.has(category)) return "gear";
  return "unknown";
}

/**
 * Build the size dropdown options for a category.
 * Pulls real values from the catalog where possible, falls back to the
 * spec-driven static list, and always returns a sorted, deduped array
 * (without a leading "Any" — that's added by the UI).
 */
export function getSizeOptionsForCategory(
  products: Array<{ category: string; size: string | number }>,
  category: string,
): string[] {
  if (!category) return [];
  const fromCatalog = new Set<string>();
  for (const p of products) {
    if (p.category === category && p.size !== undefined && p.size !== null) {
      const v = String(p.size).trim();
      if (v) fromCatalog.add(normalizeSizeLabel(v, sizeTypeForCategory(category)));
    }
  }
  const fallback = STATIC_SIZE_OPTIONS[category] ?? [];
  const merged = new Set<string>([...fromCatalog, ...fallback]);
  // One-size-only categories: always collapse to a single option.
  if (ONE_SIZE_CATEGORIES.has(category) && merged.size === 0) merged.add("one-size");
  return sortSizes([...merged], sizeTypeForCategory(category));
}

function normalizeSizeLabel(raw: string, t: SizeType): string {
  if (t === "apparel") return raw.toUpperCase();
  if (t === "footwear") return raw.replace(/\s+/g, "");
  return raw;
}

function sortSizes(values: string[], t: SizeType): string[] {
  if (t === "apparel") {
    return [...values].sort(
      (a, b) => APPAREL_ORDER.indexOf(a.toUpperCase()) - APPAREL_ORDER.indexOf(b.toUpperCase()),
    );
  }
  if (t === "footwear") {
    return [...values].sort((a, b) => parseFloat(a) - parseFloat(b));
  }
  return [...values].sort((a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

/**
 * Detect when a requested size is so far outside the available range for the
 * category that any "closest match" would be misleading.
 *
 * Footwear: > 2 numeric steps outside the available min..max range.
 * Apparel:  outside the available XS..XXXL band by > 1 step.
 * Capacity / one-size gear: out-of-range when the value isn't recognised.
 */
export function isSizeOutOfRange(
  size: string | number | undefined,
  categories: string[],
  products: Array<{ category: string; size: string | number }>,
): { outOfRange: boolean; warning?: string } {
  if (size === undefined || size === null || String(size).trim() === "") {
    return { outOfRange: false };
  }
  const primary = categories[0];
  if (!primary) return { outOfRange: false };

  const t = sizeTypeForCategory(primary);
  const available = getSizeOptionsForCategory(products, primary);
  if (available.length === 0) return { outOfRange: false };

  const raw = String(size).trim();

  if (t === "footwear") {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return { outOfRange: false };
    const nums = available.map((s) => parseFloat(s)).filter((x) => !Number.isNaN(x));
    if (nums.length === 0) return { outOfRange: false };
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (n >= min && n <= max) return { outOfRange: false };
    const distance = n > max ? n - max : min - n;
    if (distance > 2) {
      return {
        outOfRange: true,
        warning: `We don't carry shoe size ${raw}. Available shoe sizes are ${min}–${max}.`,
      };
    }
    return { outOfRange: false };
  }

  if (t === "apparel") {
    const idx = APPAREL_ORDER.indexOf(raw.toUpperCase());
    if (idx === -1) return { outOfRange: false };
    const availIdx = available
      .map((s) => APPAREL_ORDER.indexOf(s.toUpperCase()))
      .filter((i) => i >= 0);
    if (availIdx.length === 0) return { outOfRange: false };
    const min = Math.min(...availIdx);
    const max = Math.max(...availIdx);
    if (idx >= min && idx <= max) return { outOfRange: false };
    const distance = idx > max ? idx - max : min - idx;
    if (distance > 1) {
      const labels = [...availIdx].sort((a, b) => a - b).map((i) => APPAREL_ORDER[i]);
      return {
        outOfRange: true,
        warning: `We don't carry size ${raw.toUpperCase()}. Available sizes are ${labels.join(", ")}.`,
      };
    }
    return { outOfRange: false };
  }

  // Capacity / one-size: must be in the explicit available set.
  const norm = raw.toLowerCase();
  if (available.some((s) => s.toLowerCase() === norm)) return { outOfRange: false };

  // Tent capacity is a common, special case: surface a clear "no single tent"
  // warning when the user needs an N-person shelter that the catalog doesn't
  // stock, instead of the generic "Try 2-person, 3-person, ..." message.
  if (primary === "tent") {
    const personMatch = raw.match(/^(\d+)\s*-?\s*person$/i) ?? raw.match(/^(\d+)\s*p$/i);
    if (personMatch) {
      const requested = parseInt(personMatch[1], 10);
      const personNums = available
        .map((s) => {
          const m = s.match(/^(\d+)\s*-?\s*person$/i) ?? s.match(/^(\d+)\s*p$/i);
          return m ? parseInt(m[1], 10) : NaN;
        })
        .filter((n) => !Number.isNaN(n));
      const max = personNums.length ? Math.max(...personNums) : 0;
      if (requested > max) {
        return {
          outOfRange: true,
          warning: `No single ${requested}-person tent found. Consider multiple tents or ask staff.`,
        };
      }
    }
  }

  return {
    outOfRange: true,
    warning: `Size "${raw}" isn't available. Try ${available.join(", ")}.`,
  };
}

/** Detect the size type a user's typed size value belongs to. */
export function sizeTypeForValue(raw: string | number | undefined): SizeType {
  if (raw === undefined || raw === null || raw === "") return "unknown";
  const s = String(raw).trim().toLowerCase();
  if (/^(xs|s|m|l|xl|xxl|xxxl)$/.test(s)) return "apparel";
  if (/^\d{2}(\.\d)?$/.test(s)) {
    const n = parseFloat(s);
    if (n >= 30 && n <= 50) return "footwear";
    return "gear"; // e.g. "20" → 20L pack
  }
  if (/^(one[-\s]?size|os)$/.test(s)) return "gear";
  if (/^\d+\s*(l|p|cm|mm|g|kg|ml)$/i.test(s)) return "gear";
  return "unknown";
}

/**
 * Is `size` a valid size value for products in `category`?
 * - unknown size type → accept (we don't know, don't block)
 * - unknown category → accept
 * - otherwise the types must match
 */
export function isSizeValidForCategory(
  size: string | number | undefined,
  category: string,
): boolean {
  const valT = sizeTypeForValue(size);
  const catT = sizeTypeForCategory(category);
  if (valT === "unknown" || catT === "unknown") return true;
  return valT === catT;
}

/**
 * Is the requested size compatible with at least one category in the group?
 * Used to decide whether to keep or drop the size filter for a group.
 */
export function isSizeValidForCategories(
  size: string | number | undefined,
  categories: string[],
): boolean {
  if (size === undefined || categories.length === 0) return true;
  return categories.some((c) => isSizeValidForCategory(size, c));
}

/** Human-readable example sizes for a category, used in warnings. */
export function exampleSizesFor(category: string): string {
  const t = sizeTypeForCategory(category);
  if (t === "apparel") return "XS–XXL";
  if (t === "footwear") return "36–46";
  switch (category) {
    case "water-bottle":
      return "one-size or 1L";
    case "tent":
    case "tarp":
      return "1P, 2P or 3P";
    case "backpack":
      return "20L, 30L or 45L";
    case "sleeping-bag":
    case "sleeping-mat":
      return "regular or long";
    default:
      return "one-size";
  }
}

export function prettyCategoryLabel(category: string): string {
  return category.replace(/-/g, " ");
}

export function prettyCategoryPlural(category: string): string {
  const base = prettyCategoryLabel(category);
  if (base.endsWith("s")) return base;
  return base + "s";
}

/**
 * Validate a user-typed size against a set of categories.
 *
 * Returns:
 *   - isValid: true when the size type matches at least one category
 *              (or when either side is unknown — don't block).
 *   - warning: friendly explanation when the size is clearly for a
 *              different kind of product (e.g. "M" for water bottles).
 *   - normalizedSize: canonical form ("M" uppercased, "42" as the
 *              numeric string) — null when the input is empty.
 */
export function validateSizeForCategory(
  size: string | number | undefined,
  categories: string[],
): { isValid: boolean; warning: string | null; normalizedSize: string | null } {
  if (size === undefined || size === null || String(size).trim() === "") {
    return { isValid: true, warning: null, normalizedSize: null };
  }

  const raw = String(size).trim();
  const valT = sizeTypeForValue(raw);
  const normalizedSize = normalizeSize(raw, valT);

  if (categories.length === 0) {
    return { isValid: true, warning: null, normalizedSize };
  }

  const isValid = categories.some((c) => isSizeValidForCategory(raw, c));
  if (isValid) return { isValid: true, warning: null, normalizedSize };

  // Build a friendly, category-specific warning.
  const primary = categories[0];
  const catT = sizeTypeForCategory(primary);
  const plural = prettyCategoryPlural(primary);
  const examples = exampleSizesFor(primary);

  let warning: string;
  if (catT === "footwear" && valT === "apparel") {
    warning = `${capitalize(plural)} use numeric shoe sizes. Try ${examples}.`;
  } else if (catT === "apparel" && valT === "footwear") {
    warning = `${capitalize(plural)} usually use XS, S, M, L, XL. Size ${normalizedSize} looks like a shoe size.`;
  } else if (catT === "gear" && valT === "apparel") {
    warning = `Size ${normalizedSize} is usually for clothing. For ${plural}, try ${examples}.`;
  } else if (catT === "gear" && valT === "footwear") {
    warning = `Size ${normalizedSize} looks like a shoe size. For ${plural}, try ${examples}.`;
  } else if (catT === "apparel" && valT === "gear") {
    warning = `${capitalize(plural)} usually use XS, S, M, L, XL. Size ${normalizedSize} looks like a capacity.`;
  } else if (catT === "footwear" && valT === "gear") {
    warning = `${capitalize(plural)} use numeric shoe sizes. Try ${examples}.`;
  } else {
    warning = `Size ${normalizedSize} does not apply to ${plural}. Try ${examples}.`;
  }

  return { isValid: false, warning, normalizedSize };
}

function normalizeSize(raw: string, t: SizeType): string {
  if (t === "apparel") return raw.toUpperCase();
  if (t === "footwear") return raw.replace(/\s+/g, "");
  return raw;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}