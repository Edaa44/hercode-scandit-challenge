import type { RequestGroup } from "./groups";
import { CATEGORY_FAMILIES } from "./groups";
import type { Fit } from "./types";
import {
  tentCapacityFor,
  type PartyInfo,
  type TravelerProfile,
} from "./party";

export type TripInfo = {
  isTrip: boolean;
  durationDays: number | null;
  destination: string | null;
  tripType: string; // e.g. "mountain trekking"
  conditions: string; // e.g. "variable mountain weather"
  /** True when the prompt explicitly mentions camping/tent/sleeping outside. */
  mentionsCamping: boolean;
};

/** Refinements gathered from follow-up questions. */
export type TripPrefs = {
  temperature?: "warm" | "cool" | "cold" | "very-cold" | "unsure";
  sleeping?: "tent" | "hut" | "hotel" | "unsure";
  weather?: "dry" | "rain" | "snow" | "mixed" | "unsure";
  carrying?: "lightweight" | "comfort" | "unsure";
  experience?: "beginner" | "intermediate" | "advanced";
  budget?: "budget" | "balanced" | "premium" | "custom" | "none";
  budgetAmount?: number; // when budget === "custom"
};

export type FollowUpId =
  | "party"
  | "temperature"
  | "sleeping"
  | "weather"
  | "carrying"
  | "experience"
  | "sizes"
  | "budget";

/** Safety-critical / priority order for fitting a mountain trip kit under budget. */
export const TRIP_PRIORITY: string[] = [
  "hardshell",      // 1. waterproof shell
  "boots",          // 2. footwear
  "parka",          // 3. insulating layer
  "baselayer",      // 4. base layer
  "backpack",       // 5. backpack
  "bottle",         // 6. water bottle
  "headlamp",       // 7. headlamp
  "gloves",         // 8a. gloves
  "hat",            // 8b. hat
  "trousers",       // (clothing)
  "poles",          // 9. trekking poles
  "tent",           // 10. overnight gear...
  "sleepingbag",
  "sleepingmat",
  "stove",
];

/** Items we never strip out, even if the budget is too tight. */
export const ESSENTIAL_FAMILIES = new Set([
  "hardshell",
  "boots",
  "baselayer",
  "parka",
  "headlamp",
]);

/** Parse "under 700 CHF", "budget 700", "max 700", "700 chf" → 700. */
export function detectTotalBudget(text: string): number | undefined {
  const s = text.toLowerCase();
  const m =
    s.match(/\bunder\s*(?:chf|fr\.?|\$|€)?\s*(\d{2,5})\b/) ??
    s.match(/\b(?:budget|max(?:imum)?|less\s+than|below)\s*(?:of\s*)?(?:chf|fr\.?|\$|€)?\s*(\d{2,5})\b/) ??
    s.match(/\b(?:chf|fr\.?|\$|€)\s*(\d{2,5})\b/) ??
    s.match(/\b(\d{2,5})\s*(?:chf|fr\.?|\$|€)\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Extract the family id from a trip group id (`trip-${familyId}-${i}`). */
export function familyIdFromTripGroupId(id: string): string {
  return id.replace(/^trip-/, "").replace(/-\d+$/, "");
}

const TRIP_KEYWORDS = [
  "trip",
  "hike",
  "hiking",
  "camping",
  "backpacking",
  "trek",
  "trekking",
  "expedition",
  "alps",
  "andes",
  "himalaya",
  "rockies",
  "pyrenees",
  "mountain",
  "mountains",
  "alpine",
  "weekend",
  "overnight",
  "day trip",
  "days",
  "nights",
  "week",
];

const MOUNTAIN_PLACES = ["alps", "andes", "himalaya", "rockies", "pyrenees"];
const MOUNTAIN_WORDS = [
  "mountain",
  "mountains",
  "alpine",
  "trek",
  "trekking",
  "expedition",
];

/** Detect whether free text describes a trip, and extract its shape. */
export function detectTrip(text: string): TripInfo {
  const s = text.toLowerCase();
  const hit = TRIP_KEYWORDS.some((k) =>
    new RegExp(`\\b${k.replace(" ", "\\s+")}\\b`).test(s),
  );
  if (!hit) {
    return {
      isTrip: false,
      durationDays: null,
      destination: null,
      tripType: "",
      conditions: "",
      mentionsCamping: false,
    };
  }

  const durationDays = detectDuration(s);
  const destination = detectDestination(s);
  const isMountain =
    MOUNTAIN_PLACES.some((p) => s.includes(p)) ||
    MOUNTAIN_WORDS.some((w) => s.includes(w));

  const tripType = isMountain
    ? "mountain trekking"
    : /camping|backpacking/.test(s)
      ? "camping"
      : "hiking";
  const conditions = isMountain
    ? "variable mountain weather — cold and wet possible"
    : /rain|wet/.test(s)
      ? "wet weather"
      : /winter|snow|cold|freezing/.test(s)
        ? "cold weather"
        : "variable weather";

  const mentionsCamping =
    /\b(camping|camp\s+out|wild\s+camp(?:ing)?|tent|bivy|bivvy|sleeping\s+outside|sleep\s+outside|under\s+the\s+stars)\b/.test(
      s,
    );

  return {
    isTrip: true,
    durationDays,
    destination,
    tripType,
    conditions,
    mentionsCamping,
  };
}

/**
 * Pick the top-3 most useful follow-up questions for a trip prompt.
 * Skips questions the prompt already answers.
 */
export function detectMissing(
  trip: TripInfo,
  text: string,
  formMaxPrice?: number,
  opts: { partyResolved?: boolean; sizesResolved?: boolean } = {},
): FollowUpId[] {
  const s = text.toLowerCase();
  const has = {
    party: !!opts.partyResolved,
    sizes: !!opts.sizesResolved,
    temperature:
      /\b(warm|hot|cool|cold|chilly|freezing|winter|sub[-\s]?zero|-?\d+\s*°?c)\b/.test(
        s,
      ),
    weather: /\b(dry|sunny|rain|wet|storm|snow|blizzard|mixed)\b/.test(s),
    sleeping: /\b(tent|camp(?:ing)?|hut|refuge|hotel|lodge|cabin|hostel)\b/.test(
      s,
    ),
    carrying: /\b(ultralight|lightweight|porter|guided|guide|carry)\b/.test(s),
    experience: /\b(beginner|first[-\s]?time|intermediate|advanced|technical|expert)\b/.test(
      s,
    ),
    budget: formMaxPrice !== undefined || /\b(budget|premium|cheap|chf\s*\d+)\b/.test(s),
  };

  const overnight = (trip.durationDays ?? 1) >= 2;

  // Priority order — most impactful first.
  //  1. Who is going (drives quantity + tent capacity)
  //  2. Where will you sleep (drives tent / sleeping bag / stove)
  //  3. Temperatures (drives insulation + sleeping bag rating)
  //  4. Add sizes (drives apparel/footwear matches)
  //  5. Budget (drives the whole optimisation)
  const candidates: FollowUpId[] = [
    "party",
    overnight ? "sleeping" : null,
    "temperature",
    "sizes",
    "budget",
  ].filter(Boolean) as FollowUpId[];

  const missing = candidates.filter((id) => !has[id]);
  return missing.slice(0, 3);
}

/** Safe defaults applied when the user clicks "Use safe defaults". */
export const SAFE_DEFAULTS: Required<
  Pick<TripPrefs, "temperature" | "weather" | "sleeping" | "carrying" | "experience" | "budget">
> = {
  temperature: "cool",
  weather: "mixed",
  sleeping: "tent",
  carrying: "comfort",
  experience: "intermediate",
  budget: "balanced",
};

function detectDuration(s: string): number | null {
  // "7 day", "7-day", "7 days", "2 nights"
  const m =
    s.match(/\b(\d{1,2})\s*[-\s]?\s*(?:day|days|night|nights)\b/) ??
    s.match(/\bfor\s+a?\s*(\d{1,2})\s+(?:day|days|night|nights)\b/);
  if (m) return parseInt(m[1], 10);
  if (/\b(weekend|overnight)\b/.test(s)) return 2;
  if (/\bfor\s+a\s+week\b|\b1\s+week\b|\bone\s+week\b/.test(s)) return 7;
  if (/\b(\d{1,2})\s+weeks?\b/.test(s)) {
    const m2 = s.match(/\b(\d{1,2})\s+weeks?\b/);
    return m2 ? parseInt(m2[1], 10) * 7 : null;
  }
  if (/\bday\s+trip\b/.test(s)) return 1;
  return null;
}

function detectDestination(s: string): string | null {
  for (const place of ["alps", "andes", "himalaya", "rockies", "pyrenees"]) {
    if (new RegExp(`\\b${place}\\b`).test(s)) {
      return place.charAt(0).toUpperCase() + place.slice(1);
    }
  }
  return null;
}

/**
 * Formal checklist item model. Each entry on the trip checklist is described
 * by these fields so downstream logic (quantity, size routing, missing-data
 * detection) is data-driven rather than hard-coded.
 */
export type ItemType =
  | "personal_sized"   // one per person, depends on a body size
  | "personal_unsized" // one per person, no size needed
  | "shared_group";    // one (or few) for the whole party

export type SizeSource =
  | "apparel_size"
  | "shoe_size"
  | "capacity"
  | "one_size"
  | "none";

export type ItemPriority = "essential" | "conditional" | "optional";

export type ProfileField = "apparel_size" | "shoe_size" | "fit_preference";
export type TripField =
  | "total_people"
  | "sleeping_situation"
  | "duration_days"
  | "temperature"
  | "weather";

export type ChecklistItem = {
  itemName: string;
  familyId: keyof typeof CATEGORY_FAMILIES;
  categoryCandidates: readonly string[];
  itemType: ItemType;
  /**
   * "per_person" → one per traveler.
   * "total_people" → quantity equals party size (emitted as a single shared
   * group whose label reflects the count).
   * "one" → exactly one for the whole group.
   */
  quantity: "per_person" | "total_people" | "one";
  requiredProfileFields: readonly ProfileField[];
  requiredTripFields: readonly TripField[];
  priority: ItemPriority;
  sizeSource: SizeSource;
  waterproof?: boolean;
  winter?: boolean;
};

function item(
  familyId: keyof typeof CATEGORY_FAMILIES,
  itemName: string,
  overrides: Partial<ChecklistItem> & Pick<ChecklistItem, "itemType" | "sizeSource" | "priority">,
): ChecklistItem {
  return {
    itemName,
    familyId,
    categoryCandidates: CATEGORY_FAMILIES[familyId],
    quantity:
      overrides.quantity ??
      (overrides.itemType === "shared_group" ? "one" : "per_person"),
    requiredProfileFields: overrides.requiredProfileFields ?? [],
    requiredTripFields: overrides.requiredTripFields ?? [],
    waterproof: overrides.waterproof,
    winter: overrides.winter,
    itemType: overrides.itemType,
    sizeSource: overrides.sizeSource,
    priority: overrides.priority,
  };
}

const APPAREL_PROFILE: ProfileField[] = ["apparel_size", "fit_preference"];
const SHOE_PROFILE: ProfileField[] = ["shoe_size"];

const CORE_CHECKLIST: ChecklistItem[] = [
  item("hardshell", "Waterproof shell", {
    itemType: "personal_sized", sizeSource: "apparel_size",
    requiredProfileFields: APPAREL_PROFILE,
    priority: "essential", waterproof: true,
  }),
  item("parka", "Insulating jacket", {
    itemType: "personal_sized", sizeSource: "apparel_size",
    requiredProfileFields: APPAREL_PROFILE,
    requiredTripFields: ["temperature"],
    priority: "essential", winter: true,
  }),
  item("boots", "Hiking boots", {
    itemType: "personal_sized", sizeSource: "shoe_size",
    requiredProfileFields: SHOE_PROFILE,
    priority: "essential", waterproof: true,
  }),
  item("baselayer", "Base layer", {
    itemType: "personal_sized", sizeSource: "apparel_size",
    requiredProfileFields: APPAREL_PROFILE,
    priority: "essential",
  }),
  item("trousers", "Hiking trousers", {
    itemType: "personal_sized", sizeSource: "apparel_size",
    requiredProfileFields: APPAREL_PROFILE,
    priority: "conditional",
  }),
  item("backpack", "Backpack", {
    itemType: "personal_unsized", sizeSource: "capacity",
    priority: "essential",
  }),
  item("headlamp", "Headlamp", {
    itemType: "personal_unsized", sizeSource: "one_size",
    priority: "essential",
  }),
  item("bottle", "Water bottle", {
    itemType: "personal_unsized", sizeSource: "capacity",
    requiredTripFields: ["total_people"],
    priority: "essential",
  }),
  item("gloves", "Gloves", {
    itemType: "personal_sized", sizeSource: "apparel_size",
    requiredProfileFields: APPAREL_PROFILE,
    requiredTripFields: ["temperature"],
    priority: "conditional",
  }),
  item("hat", "Hat", {
    itemType: "personal_unsized", sizeSource: "one_size",
    requiredTripFields: ["temperature"],
    priority: "conditional",
  }),
  item("poles", "Trekking poles", {
    itemType: "personal_unsized", sizeSource: "one_size",
    priority: "optional",
  }),
];

const OVERNIGHT_EXTRAS: ChecklistItem[] = [
  item("tent", "Tent", {
    itemType: "shared_group", sizeSource: "capacity",
    requiredTripFields: ["sleeping_situation", "total_people"],
    priority: "conditional",
  }),
  item("sleepingbag", "Sleeping bag", {
    itemType: "personal_sized", sizeSource: "capacity",
    requiredTripFields: ["sleeping_situation", "temperature"],
    priority: "conditional", winter: true,
  }),
  item("sleepingmat", "Sleeping mat", {
    itemType: "personal_unsized", sizeSource: "one_size",
    requiredTripFields: ["sleeping_situation"],
    priority: "conditional",
  }),
  item("stove", "Stove", {
    itemType: "shared_group", sizeSource: "one_size",
    requiredTripFields: ["sleeping_situation"],
    priority: "optional",
  }),
];

export const TRIP_CHECKLIST: ChecklistItem[] = [
  ...CORE_CHECKLIST,
  ...OVERNIGHT_EXTRAS,
];

export function buildTripGroups(
  trip: TripInfo,
  base: {
    size?: string | number;
    maxPrice?: number;
    fit?: Fit;
    lightweight?: boolean;
    vegan?: boolean;
    beginner?: boolean;
  },
  tripPrefs: TripPrefs = {},
  party?: PartyInfo,
): RequestGroup[] {
  // Merge user-supplied prefs with context-aware defaults derived from the
  // trip itself. User answers always win; defaults only fill in blanks.
  const ctx = contextDefaults(trip);
  const prefs: TripPrefs = {
    temperature: tripPrefs.temperature ?? ctx.temperature,
    weather: tripPrefs.weather ?? ctx.weather,
    sleeping: tripPrefs.sleeping, // intentionally not auto-filled
    carrying: tripPrefs.carrying ?? ctx.carrying,
    experience: tripPrefs.experience ?? ctx.experience,
    budget: tripPrefs.budget ?? ctx.budget,
    budgetAmount: tripPrefs.budgetAmount,
  };

  const nights = trip.durationDays ?? 1;
  const overnight = nights >= 2;
  // Overnight gear rules:
  //   tent  → include all overnight extras as buyable
  //   hut   → no tent/stove (sleeping bag stays as optional liner suggestion)
  //   hotel → skip all overnight extras
  //   unknown → include only if prompt mentions camping/tent; otherwise show
  //             them in the "Optional depending on sleeping plan" section
  //             so they never inflate the purchased kit total.
  const sleeping = prefs.sleeping;
  const camping = trip.mentionsCamping || sleeping === "tent";
  const hut = sleeping === "hut";
  const hotel = sleeping === "hotel";
  const includeOvernight = overnight && !hotel;
  const overnightForceOptional =
    includeOvernight && !camping && !hut; // unknown / unsure

  const items: Array<
    ChecklistItem & { optional?: string; forceOptional?: boolean }
  > = [
    ...CORE_CHECKLIST,
  ];
  if (includeOvernight) {
    for (const it of OVERNIGHT_EXTRAS) {
      // Mountain hut → no tent, no stove (kitchens/beds provided).
      if (hut && (it.familyId === "tent" || it.familyId === "stove")) continue;
      // Hut → keep sleeping bag as a liner suggestion only.
      const hutLiner = hut && it.familyId === "sleepingbag";
      items.push({
        ...it,
        optional: hutLiner
          ? "Sleeping bag liner — most huts provide blankets"
          : overnightForceOptional
            ? "Optional depending on sleeping plan"
            : undefined,
        forceOptional: overnightForceOptional || hutLiner,
      });
    }
  }

  // Refinement flags.
  const veryCold = prefs.temperature === "very-cold";
  const cold = prefs.temperature === "cold" || veryCold;
  const cool = prefs.temperature === "cool";
  const wet =
    prefs.weather === "rain" ||
    prefs.weather === "snow" ||
    prefs.weather === "mixed";
  const premium = prefs.budget === "premium";
  const lightweight =
    !!base.lightweight ||
    prefs.carrying === "lightweight" ||
    premium;
  const beginner = !!base.beginner || prefs.experience === "beginner";
  // IMPORTANT: budget tier no longer caps individual items — the total kit
  // budget is enforced at render time in TripKit. Only the explicit form
  // `maxPrice` field still applies as a per-item ceiling.
  const maxPrice = base.maxPrice;

  const baseFlagsFor = (familyId: string, winterFlag: boolean) => ({
    maxPrice,
    waterproof:
      (wet && needsWaterproof(familyId)) ||
      (premium && needsWaterproof(familyId)),
    winter:
      winterFlag ||
      ((cold || (cool && needsWarmth(familyId) && familyId !== "hardshell")) &&
        needsWarmth(familyId)) ||
      (veryCold && ["boots", "hardshell", "trousers"].includes(familyId)),
    lightweight,
    vegan: !!base.vegan,
    beginner,
  });

  // Party-aware scaling: expand personal items per traveler, keep shared
  // items singular, derive tent capacity from the group total.
  // Only treat the party as authoritative when the user actually expressed
  // multiple people or edited the panel. A solo, untouched party would
  // otherwise force "Size needed" placeholders on every apparel item even
  // when the form already has a default size.
  const usingParty =
    !!party &&
    party.travelers.length > 0 &&
    (party.totalPeople > 1 ||
      party.fromText ||
      party.travelers.some(
        (t) => !!t.apparelSize || !!t.shoeSize || t.fit !== "any",
      ));
  const total = party?.totalPeople ?? 1;
  const travelers: TravelerProfile[] = usingParty
    ? party!.travelers
    : [
        {
          id: "solo",
          label: "Me",
          kind: "adult",
          fit: base.fit ?? "any",
          apparelSize: typeof base.size === "string" ? base.size : "",
          shoeSize: typeof base.size === "number" ? String(base.size) : "",
        },
      ];

  const out: RequestGroup[] = [];
  let counter = 0;

  for (const it of items) {
    const isShared = it.itemType === "shared_group";
    const isPersonal =
      it.itemType === "personal_sized" || it.itemType === "personal_unsized";
    const needsApparel = it.sizeSource === "apparel_size";
    const needsShoe = it.sizeSource === "shoe_size";
    const flags = baseFlagsFor(it.familyId, !!it.winter || false);
    const baseGroup = {
      label: it.itemName,
      categories: it.categoryCandidates as string[],
      ...flags,
      waterproof: !!it.waterproof || flags.waterproof,
      fitFromText: false,
      rawText: it.itemName,
      optional: it.optional ?? null,
      forceOptional: it.forceOptional ?? false,
    };

    if (isShared || (!isPersonal && !usingParty)) {
      // One group for the whole party (tent capacity scales with total).
      let size: string | number | undefined = base.size;
      let label = it.itemName;
      if (it.familyId === "tent") {
        size = tentCapacityFor(total);
        label = `${it.itemName} (${total}-person)`;
      }
      out.push({
        ...baseGroup,
        id: `trip-${it.familyId}-${counter++}`,
        label,
        size,
        fit: base.fit ?? "any",
        traveler: null,
      });
      continue;
    }

    // Personal item — emit one group per traveler.
    for (const t of travelers) {
      const size = needsApparel
        ? t.apparelSize || (typeof base.size === "string" ? base.size : undefined)
        : needsShoe
          ? t.shoeSize || (typeof base.size === "number" ? base.size : undefined)
          : undefined;
      const sizeNeeded = (needsApparel || needsShoe) && !size;
      const label = usingParty ? `${it.itemName} — ${t.label}` : it.itemName;
      out.push({
        ...baseGroup,
        id: `trip-${it.familyId}-${counter++}`,
        label,
        size,
        fit: t.fit !== "any" ? t.fit : (base.fit ?? "any"),
        traveler: usingParty ? t.label : null,
        sizeNeeded,
        optional: baseGroup.optional,
      });
    }
  }

  return out;
}

/**
 * Context-aware safe defaults derived from the trip itself (destination,
 * type, season hints in conditions). Used when the user hasn't answered the
 * matching follow-up question. User answers always override these.
 */
export function contextDefaults(trip: TripInfo): Required<
  Pick<TripPrefs, "temperature" | "weather" | "carrying" | "experience" | "budget">
> {
  const mountain =
    /mountain|alpine/.test(trip.tripType) ||
    trip.destination === "Alps" ||
    trip.destination === "Andes" ||
    trip.destination === "Himalaya" ||
    trip.destination === "Rockies" ||
    trip.destination === "Pyrenees";
  return {
    // Alps / Andes / alpine → assume mixed mountain weather, cool temps.
    temperature: mountain ? "cool" : "warm",
    weather: mountain ? "mixed" : "dry",
    carrying: "comfort",
    experience: "intermediate",
    budget: "balanced",
  };
}

function needsWaterproof(familyId: string): boolean {
  return ["hardshell", "boots", "trousers", "backpack"].includes(familyId);
}
function needsWarmth(familyId: string): boolean {
  return [
    "parka",
    "baselayer",
    "gloves",
    "hat",
    "sleepingbag",
    "fleece",
  ].includes(familyId);
}
function budgetCap(prefs: TripPrefs): number | undefined {
  // Kept for backwards compatibility but intentionally unused. Per-item caps
  // were the source of the "700 CHF means every item ≤ 700" bug.
  void prefs;
  return undefined;
}