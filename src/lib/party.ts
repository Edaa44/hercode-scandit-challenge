import type { Fit } from "./types";

/**
 * Who is going on the trip. Drives per-person and shared gear scaling.
 */
export type TravelerProfile = {
  id: string;
  label: string;        // "Me", "Partner", "Child 1", ...
  kind: "adult" | "child";
  fit: Fit;             // "any" when unknown
  apparelSize?: string; // XS..XXL or "" when unknown
  shoeSize?: string;    // "36".."46" or "" when unknown
};

export type PartyInfo = {
  adults: number;
  children: number;
  totalPeople: number;
  travelers: TravelerProfile[];
  /** True when the user explicitly described the party in the prompt. */
  fromText: boolean;
  /** True when "with N people" was used without an adult/child split. */
  splitUnknown: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1,
};

function parseCount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return NUMBER_WORDS[s];
}

/** Parse "with my wife and three kids", "solo", "family", "with 4 people". */
export function detectParty(text: string): PartyInfo {
  const s = text.toLowerCase();

  let adults = 1;        // assume the speaker
  let children = 0;
  let fromText = false;
  let splitUnknown = false;

  // Solo / alone — explicit single traveler.
  if (/\b(solo|alone|by\s+myself|on\s+my\s+own)\b/.test(s)) {
    adults = 1;
    children = 0;
    fromText = true;
  }

  // Partner words add one adult.
  if (/\bwith\s+my\s+(wife|husband|partner|spouse|boyfriend|girlfriend)\b/.test(s)) {
    adults = Math.max(adults, 2);
    fromText = true;
  }

  // "with N kids / children".
  const kidsMatch =
    s.match(/\bwith\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(kids?|children|child)\b/) ??
    s.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(kids?|children)\b/);
  if (kidsMatch) {
    const n = parseCount(kidsMatch[1]);
    if (n !== undefined) {
      children = n;
      fromText = true;
    }
  }

  // "with N adults".
  const adultsMatch = s.match(
    /\bwith\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+adults?\b/,
  );
  if (adultsMatch) {
    const n = parseCount(adultsMatch[1]);
    if (n !== undefined) {
      adults = n;
      fromText = true;
    }
  }

  // "with N people" — total without split.
  const peopleMatch = s.match(
    /\bwith\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(people|persons|of\s+us|friends)\b/,
  );
  if (peopleMatch && !kidsMatch && !adultsMatch) {
    const n = parseCount(peopleMatch[1]);
    if (n !== undefined) {
      // "with N people" means N companions OR N total — assume total when the
      // phrasing is "with 4 of us"; otherwise treat N as companions.
      const inclusive = /\bof\s+us\b/.test(peopleMatch[2]);
      adults = inclusive ? n : Math.max(1, n);
      children = 0;
      splitUnknown = true;
      fromText = true;
    }
  }

  // "family" — default to a small family, mark for follow-up.
  if (/\b(family|with\s+the\s+family|family\s+trip)\b/.test(s) && !fromText) {
    adults = 2;
    children = 2;
    splitUnknown = true;
    fromText = true;
  }

  const totalPeople = adults + children;
  const travelers = buildTravelers(adults, children);

  return { adults, children, totalPeople, travelers, fromText, splitUnknown };
}

/** Build the default traveler profile list for a given adults/children split. */
export function buildTravelers(
  adults: number,
  children: number,
): TravelerProfile[] {
  const out: TravelerProfile[] = [];
  for (let i = 0; i < adults; i++) {
    out.push({
      id: `adult-${i}`,
      label: i === 0 ? "Me" : i === 1 ? "Partner" : `Adult ${i + 1}`,
      kind: "adult",
      fit: "any",
      apparelSize: "",
      shoeSize: "",
    });
  }
  for (let i = 0; i < children; i++) {
    out.push({
      id: `child-${i}`,
      label: children === 1 ? "Child" : `Child ${i + 1}`,
      kind: "child",
      fit: "kids",
      apparelSize: "",
      shoeSize: "",
    });
  }
  return out;
}

/**
 * Pick the tent capacity size string for a party of N. Matches "2-person",
 * "3-person", etc. We do NOT cap — a party of 5 should request a 5-person
 * shelter so the recommender can report "no single tent" when the catalog
 * tops out smaller.
 */
export function tentCapacityFor(total: number): string {
  const n = Math.max(2, total);
  return `${n}-person`;
}

/** Categories that depend on a traveler's apparel size. */
export const APPAREL_FAMILIES = new Set([
  "hardshell",
  "parka",
  "baselayer",
  "trousers",
  "fleece",
]);
/** Categories that depend on a traveler's shoe size. */
export const FOOTWEAR_FAMILIES = new Set(["boots", "shoes"]);

/** Personal families — each traveler gets one. */
export const PERSONAL_FAMILIES = new Set([
  "hardshell",
  "parka",
  "baselayer",
  "trousers",
  "boots",
  "gloves",
  "hat",
  "backpack",
  "bottle",
  "headlamp",
  "poles",
  "sleepingbag",
  "sleepingmat",
]);

/** Shared single-item families — one for the whole group. */
export const SHARED_FAMILIES = new Set(["tent", "stove"]);