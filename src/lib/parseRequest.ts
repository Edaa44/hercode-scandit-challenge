import type { A11yPrefs, ParsedFilters } from "./types";

const CATEGORY_WORDS: Record<string, string> = {
  boot: "boots",
  boots: "boots",
  "winter boot": "boots",
  "winter boots": "boots",
  "trail shoe": "trail-shoes",
  "trail shoes": "trail-shoes",
  "approach shoe": "approach-shoes",
  "approach shoes": "approach-shoes",
  shoe: "trail-shoes",
  shoes: "trail-shoes",
  jacket: "rain-jacket",
  "rain jacket": "rain-jacket",
  "hard shell": "hardshell",
  hardshell: "hardshell",
  shell: "hardshell",
  parka: "insulated-jacket",
  "insulated jacket": "insulated-jacket",
  "down jacket": "insulated-jacket",
  fleece: "fleece",
  "base layer": "base-layer",
  baselayer: "base-layer",
  sock: "socks",
  socks: "socks",
  glove: "gloves",
  gloves: "gloves",
  hat: "hat",
  beanie: "hat",
  trouser: "trousers",
  trousers: "trousers",
  pants: "trousers",
  backpack: "backpack",
  rucksack: "backpack",
  pack: "backpack",
  tent: "tent",
  tarp: "tarp",
  "sleeping bag": "sleeping-bag",
  "sleeping mat": "sleeping-mat",
  mat: "sleeping-mat",
  headlamp: "headlamp",
  "head torch": "headlamp",
  stove: "stove",
  "trekking pole": "trekking-poles",
  "trekking poles": "trekking-poles",
  poles: "trekking-poles",
  bottle: "water-bottle",
  "water bottle": "water-bottle",
};

const COLOR_WORDS = [
  "black", "white", "red", "blue", "navy", "green", "olive", "grey", "gray",
  "slate", "yellow", "orange", "pink", "purple", "brown", "tan", "khaki",
];

export function parseRequest(text: string, prefs: A11yPrefs): ParsedFilters {
  const t = ` ${text.toLowerCase()} `;
  const categories = new Set<string>();
  // longest phrases first
  const keys = Object.keys(CATEGORY_WORDS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const re = new RegExp(`\\b${k.replace(/\s+/g, "\\s+")}\\b`);
    if (re.test(t)) categories.add(CATEGORY_WORDS[k]);
  }

  const sizeNum =
    t.match(/\bsize\s*(\d{2})\b/) ?? t.match(/\b(3[5-9]|4[0-9]|50)\b/);
  const sizeLetter = t.match(/\bsize\s*(xs|s|m|l|xl|xxl)\b/i);
  const size: number | string | undefined = sizeNum
    ? parseInt(sizeNum[1], 10)
    : sizeLetter
      ? sizeLetter[1].toUpperCase()
      : undefined;

  const color = COLOR_WORDS.find((c) => new RegExp(`\\b${c}\\b`).test(t));

  const priceMatch =
    t.match(/under\s*(?:chf|fr\.?|\$|€)?\s*(\d{2,5})/) ??
    t.match(/(?:less than|below|max(?:imum)?)\s*(?:chf|fr\.?|\$|€)?\s*(\d{2,5})/) ??
    t.match(/(?:chf|fr\.?|\$|€)\s*(\d{2,5})/);
  const maxPrice = priceMatch
    ? parseInt(priceMatch[1], 10)
    : prefs.budgetSafe
      ? 200
      : undefined;

  return {
    categories: [...categories],
    size,
    color,
    maxPrice,
    waterproof: /\b(waterproof|rain|wet|gore-?tex|dry)\b/.test(t) || undefined,
    winter: /\b(winter|cold|snow|freezing|warm|insulated|down)\b/.test(t) || undefined,
    lightweight:
      /\b(light|lightweight|ultralight)\b/.test(t) || prefs.reducedWalking || undefined,
    vegan: /\bvegan\b/.test(t) || undefined,
    beginnerFriendly: prefs.beginner || undefined,
    rawText: text,
  };
}

// Re-exports so existing imports keep working.
export {
  recommendProducts as recommend,
  generateRouteFromEntrance,
  generateShortRouteFromEntrance,
} from "./catalog";