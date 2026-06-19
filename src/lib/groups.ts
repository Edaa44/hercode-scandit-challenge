import type { Product } from "./types";
import type { Fit } from "./types";

/**
 * A "request group" represents one shopping intent (e.g. boots, jacket).
 * Each group has its OWN category family and its OWN emphasis on filters
 * like waterproof/winter — that way "winter boots and waterproof jacket"
 * doesn't force every product to satisfy every flag.
 */
export type RequestGroup = {
  id: string;
  label: string;
  categories: string[];   // OR-matched against product.category
  size?: string | number;
  maxPrice?: number;
  waterproof: boolean;
  winter: boolean;
  lightweight: boolean;
  vegan: boolean;
  beginner: boolean;
  fit: Fit;
  fitFromText: boolean; // true if fit was detected in free text
  rawText: string;
  /** Optional note shown next to the item, e.g. "Needed only if camping". */
  optional?: string | null;
  /**
   * If true, this item is always rendered in the "Optional / borrow or rent"
   * section and never counted in the purchased kit total — used for overnight
   * gear when the user hasn't confirmed a sleeping plan.
   */
  forceOptional?: boolean;
  /**
   * True when this group depends on a traveler size that hasn't been
   * provided yet. Recommender returns nothing; UI renders "Size needed".
   */
  sizeNeeded?: boolean;
  /** Optional human label for the person this item is for ("Me", "Child 1"). */
  traveler?: string | null;
};

/** Category families used for OR-matching. Key = family id used in parsing. */
export const CATEGORY_FAMILIES: Record<string, string[]> = {
  boots: ["boots", "trail-shoes", "approach-shoes"],
  shoes: ["trail-shoes", "approach-shoes", "boots"],
  jacket: ["rain-jacket", "hardshell", "insulated-jacket"],
  hardshell: ["hardshell", "rain-jacket"],
  rainjacket: ["rain-jacket", "hardshell"],
  parka: ["insulated-jacket"],
  fleece: ["fleece"],
  baselayer: ["base-layer"],
  trousers: ["trousers"],
  socks: ["socks"],
  gloves: ["gloves"],
  hat: ["hat"],
  backpack: ["backpack"],
  shelter: ["tent", "tarp"],
  tent: ["tent"],
  sleep: ["sleeping-bag", "sleeping-mat"],
  sleepingbag: ["sleeping-bag"],
  sleepingmat: ["sleeping-mat"],
  headlamp: ["headlamp"],
  stove: ["stove"],
  poles: ["trekking-poles"],
  bottle: ["water-bottle"],
};

/** Catalog category → which family it belongs to (for hint/labels). */
export function familyFor(category: string): string | undefined {
  for (const [k, cats] of Object.entries(CATEGORY_FAMILIES)) {
    if (cats.includes(category)) return k;
  }
  return undefined;
}

/** Map family id → human label. */
const FAMILY_LABEL: Record<string, string> = {
  boots: "Boots",
  shoes: "Shoes",
  jacket: "Jackets",
  hardshell: "Hardshell",
  rainjacket: "Rain jacket",
  parka: "Insulated jacket",
  fleece: "Fleece",
  baselayer: "Base layer",
  trousers: "Trousers",
  socks: "Socks",
  gloves: "Gloves",
  hat: "Hats",
  backpack: "Backpack",
  shelter: "Shelter",
  tent: "Tent",
  sleep: "Sleep system",
  sleepingbag: "Sleeping bag",
  sleepingmat: "Sleeping mat",
  headlamp: "Headlamp",
  stove: "Stove",
  poles: "Trekking poles",
  bottle: "Water bottle",
};

/** Phrases that map to a family id. Longest match wins. */
const FAMILY_PHRASES: Array<[RegExp, string]> = [
  [/\b(winter\s+boots|hiking\s+boots|boots?)\b/, "boots"],
  [/\b(trail\s+shoes?|approach\s+shoes?|shoes?)\b/, "shoes"],
  [/\b(rain\s+jacket|waterproof\s+jacket|hard\s*shell|hardshell|shell)\b/, "hardshell"],
  [/\b(insulated\s+jacket|down\s+jacket|parka|puffer|puffy)\b/, "parka"],
  [/\b(jackets?|coats?)\b/, "jacket"],
  [/\b(fleece)\b/, "fleece"],
  [/\b(base[-\s]?layer|baselayer)\b/, "baselayer"],
  [/\b(trousers?|pants?)\b/, "trousers"],
  [/\b(socks?)\b/, "socks"],
  [/\b(gloves?|mittens?)\b/, "gloves"],
  [/\b(beanie|hats?)\b/, "hat"],
  [/\b(backpacks?|rucksacks?|day\s*packs?|packs?)\b/, "backpack"],
  [/\b(tarp)\b/, "shelter"],
  [/\b(tents?)\b/, "tent"],
  [/\b(sleeping\s+bag)\b/, "sleepingbag"],
  [/\b(sleeping\s+mat|sleep\s+mat|mats?)\b/, "sleepingmat"],
  [/\b(sleep\s+system|sleep\s+kit)\b/, "sleep"],
  [/\b(head\s*lamps?|head\s*torches?)\b/, "headlamp"],
  [/\b(stoves?)\b/, "stove"],
  [/\b(trekking\s+poles?|hiking\s+poles?|poles?)\b/, "poles"],
  [/\b(water\s+bottles?|bottles?|flasks?)\b/, "bottle"],
];

export type GroupParseDefaults = {
  size?: string | number;
  maxPrice?: number;
  waterproof?: boolean;
  winter?: boolean;
  lightweight?: boolean;
  vegan?: boolean;
  beginner?: boolean;
  fit?: Fit;
};

/**
 * Parse a natural-language request into one or more RequestGroups.
 * Falls back to a single group whose categories come from `defaults.fallbackCategories`.
 */
export function parseRequestGroups(
  text: string,
  defaults: GroupParseDefaults & { fallbackCategories?: string[] } = {},
): RequestGroup[] {
  const clean = text.trim();
  const textFit = detectFit(clean);
  const effectiveFit: Fit = textFit ?? defaults.fit ?? "any";
  const fitFromText = textFit !== undefined;
  if (!clean) {
    return [singleGroupFrom("Any product", defaults.fallbackCategories ?? [], "", defaults, effectiveFit, fitFromText)];
  }

  // Split on conjunctions / commas / "+" / "/" — segments often correspond to
  // separate product intents in one sentence.
  const segments = clean
    .split(/\s*(?:,|\band\b|\bplus\b|\+|\/| & )\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const groups: RequestGroup[] = [];
  for (const seg of segments) {
    const familyId = detectFamily(seg);
    if (!familyId) continue;
    const local = detectLocalFlags(seg);
    const size = detectSize(seg) ?? defaults.size;
    const maxPrice = detectMaxPrice(seg) ?? defaults.maxPrice;
    const segFit = detectFit(seg) ?? effectiveFit;
    groups.push({
      id: `${familyId}-${groups.length}`,
      label: FAMILY_LABEL[familyId] ?? familyId,
      categories: CATEGORY_FAMILIES[familyId],
      size,
      maxPrice,
      waterproof: local.waterproof ?? defaults.waterproof ?? false,
      winter: local.winter ?? defaults.winter ?? false,
      lightweight: local.lightweight ?? defaults.lightweight ?? false,
      vegan: defaults.vegan ?? false,
      beginner: defaults.beginner ?? false,
      fit: segFit,
      fitFromText: fitFromText || detectFit(seg) !== undefined,
      rawText: seg,
    });
  }

  if (groups.length === 0) {
    // No family detected anywhere → single fallback group covering all categories.
    const local = detectLocalFlags(clean);
    return [
      singleGroupFrom(
        "Closest matches",
        defaults.fallbackCategories ?? [],
        clean,
        { ...defaults, ...local, size: detectSize(clean) ?? defaults.size, maxPrice: detectMaxPrice(clean) ?? defaults.maxPrice },
        effectiveFit,
        fitFromText,
      ),
    ];
  }
  return groups;
}

function singleGroupFrom(
  label: string,
  categories: string[],
  rawText: string,
  d: GroupParseDefaults,
  fit: Fit = "any",
  fitFromText = false,
): RequestGroup {
  return {
    id: "all",
    label,
    categories,
    size: d.size,
    maxPrice: d.maxPrice,
    waterproof: d.waterproof ?? false,
    winter: d.winter ?? false,
    lightweight: d.lightweight ?? false,
    vegan: d.vegan ?? false,
    beginner: d.beginner ?? false,
    fit,
    fitFromText,
    rawText,
  };
}

function detectFamily(seg: string): string | undefined {
  const s = seg.toLowerCase();
  for (const [re, id] of FAMILY_PHRASES) if (re.test(s)) return id;
  return undefined;
}

function detectLocalFlags(seg: string): {
  waterproof?: boolean;
  winter?: boolean;
  lightweight?: boolean;
} {
  const s = seg.toLowerCase();
  return {
    waterproof: /\b(waterproof|rain|wet|gore-?tex|dry)\b/.test(s) || undefined,
    winter: /\b(winter|cold|snow|freezing|insulated|down)\b/.test(s) || undefined,
    lightweight: /\b(light|lightweight|ultralight)\b/.test(s) || undefined,
  };
}

function detectSize(seg: string): string | number | undefined {
  const s = seg.toLowerCase();
  const num = s.match(/\bsize\s*(\d{2})\b/) ?? s.match(/\b(3[5-9]|4[0-9]|50)\b/);
  if (num) return parseInt(num[1], 10);
  const letter = s.match(/\bsize\s*(xs|s|m|l|xl|xxl)\b/i);
  if (letter) return letter[1].toUpperCase();
  return undefined;
}

function detectMaxPrice(seg: string): number | undefined {
  const s = seg.toLowerCase();
  const m =
    s.match(/under\s*(?:chf|fr\.?|\$|€)?\s*(\d{2,5})/) ??
    s.match(/(?:less than|below|max(?:imum)?)\s*(?:chf|fr\.?|\$|€)?\s*(\d{2,5})/) ??
    s.match(/(?:chf|fr\.?|\$|€)\s*(\d{2,5})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function detectFit(seg: string): Fit | undefined {
  const s = seg.toLowerCase();
  if (/\b(women(?:'s)?|woman|female|for\s+her|ladies)\b/.test(s)) return "womens";
  if (/\b(men(?:'s)?|male|for\s+him|gents)\b/.test(s)) return "mens";
  if (/\b(unisex)\b/.test(s)) return "unisex";
  if (/\b(kid'?s?|child(?:ren)?|junior|youth)\b/.test(s)) return "kids";
  return undefined;
}

/** Pick the most likely zone for a group (used as a fallback when nothing scores well). */
export function zoneForGroup(group: RequestGroup, allProducts: Product[]): string | undefined {
  const counts = new Map<string, number>();
  for (const p of allProducts) {
    if (group.categories.includes(p.category)) {
      counts.set(p.zone, (counts.get(p.zone) ?? 0) + 1);
    }
  }
  let best: [string, number] | undefined;
  for (const e of counts) if (!best || e[1] > best[1]) best = e;
  return best?.[0];
}