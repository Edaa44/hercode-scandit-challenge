import { getEffectivePrice, type GroupResult } from "./catalog";
import type { Recommendation } from "./types";
import { familyIdFromTripGroupId, TRIP_PRIORITY } from "./trip";

/* ============================================================
 * Budget allocator for Trip Kit mode
 *
 * Splits checklist items into ESSENTIAL / CONDITIONAL / OPTIONAL,
 * picks the best-value variant per group from up to 5 candidates,
 * then fits as much as possible under `totalBudget`.
 * ========================================================== */

export type Tier = "essential" | "conditional" | "optional";

export type ReasonKey =
  | "safety-essential"
  | "essential-over-budget"
  | "fits-budget"
  | "moved-optional"
  | "borrow-overnight"
  | "depends-on-sleeping"
  | "premium-upgrade";

export const REASON_LABEL: Record<ReasonKey, string> = {
  "safety-essential": "Included: safety essential",
  "essential-over-budget": "Included: safety essential (over budget)",
  "fits-budget": "Included: fits budget",
  "moved-optional": "Moved optional: would exceed budget",
  "borrow-overnight": "Borrow/rent suggested: expensive overnight item",
  "depends-on-sleeping": "Optional depending on sleeping plan",
  "premium-upgrade": "Premium upgrade",
};

export type AllocatedItem = {
  groupId: string;
  familyId: string;
  tier: Tier;
  label: string;
  rec: Recommendation | null;
  price: number;
  reason: ReasonKey;
  zone: string;
  zoneName: string;
  index: number;
  /** Extra note carried from the source group (e.g. "Needed only if camping"). */
  note?: string | null;
  /** True when the group is waiting on a traveler size — render placeholder. */
  sizeNeeded?: boolean;
  /** Traveler this item is for (party mode). */
  traveler?: string | null;
};

export type PremiumUpgrade = {
  groupId: string;
  familyId: string;
  label: string;
  current: Recommendation;
  upgrade: Recommendation;
  delta: number;
};

export type Allocation = {
  recommended: AllocatedItem[];
  optional: AllocatedItem[];
  premium: PremiumUpgrade[];
  recommendedTotal: number;
  budget: number | undefined;
  warning: string | null;
};

/* ---------- tier classification ---------- */

const ESSENTIAL_ALWAYS = new Set([
  "hardshell",
  "boots",
  "baselayer",
  "backpack",
  "bottle",
  "headlamp",
]);
const CONDITIONAL = new Set([
  "parka",
  "gloves",
  "hat",
  "trousers",
  "poles",
  "tent",
  "sleepingbag",
  "sleepingmat",
  "stove",
  "fleece",
  "socks",
]);
const OVERNIGHT = new Set(["tent", "sleepingbag", "sleepingmat", "stove"]);

export function classifyTier(
  familyId: string,
  opts: { cold?: boolean } = {},
): Tier {
  if (ESSENTIAL_ALWAYS.has(familyId)) return "essential";
  // Insulating layer is a safety essential when the trip is cold.
  if (familyId === "parka" && opts.cold) return "essential";
  if (CONDITIONAL.has(familyId)) return "conditional";
  return "optional";
}

/* ---------- candidate picking ---------- */

/**
 * Best value = highest match score among the top-5 candidates, preferring
 * lower effective price when scores are close (within 80% of the max).
 */
export function pickBestValue(recs: Recommendation[]): Recommendation | null {
  const available = recs.filter((r) => r.stockStatus !== "SOLD OUT").slice(0, 5);
  if (available.length === 0) return recs[0] ?? null;
  const maxScore = Math.max(...available.map((r) => r.score));
  const eligible = available.filter((r) => r.score >= maxScore * 0.8);
  return [...eligible].sort(
    (a, b) => getEffectivePrice(a.variant) - getEffectivePrice(b.variant),
  )[0];
}

/** Find a higher-scoring, higher-priced alternative among the top-5. */
export function pickPremiumUpgrade(
  recs: Recommendation[],
  chosen: Recommendation,
): Recommendation | null {
  const pool = recs.filter((r) => r.stockStatus !== "SOLD OUT").slice(0, 5);
  const chosenPrice = getEffectivePrice(chosen.variant);
  const upgrades = pool.filter(
    (r) =>
      r !== chosen &&
      r.score > chosen.score &&
      getEffectivePrice(r.variant) > chosenPrice,
  );
  if (upgrades.length === 0) return null;
  return [...upgrades].sort((a, b) => b.score - a.score)[0];
}

/* ---------- main allocator ---------- */

export function allocateKit(
  groupResults: GroupResult[],
  totalBudget: number | undefined,
  ctx: { cold?: boolean; durationDays?: number | null; tripType?: string } = {},
): Allocation {
  // 1. Build candidates per group.
  const entries = groupResults.map((gr, idx) => {
    const familyId = familyIdFromTripGroupId(gr.group.id);
    const tier = classifyTier(familyId, { cold: ctx.cold || gr.group.winter });
    const chosen = pickBestValue(gr.recommendations);
    const upgrade = chosen ? pickPremiumUpgrade(gr.recommendations, chosen) : null;
    return { gr, idx, familyId, tier, chosen, upgrade };
  });

  // 2. Order: essentials first, then conditional/optional by priority.
  const tierWeight: Record<Tier, number> = {
    essential: 0,
    conditional: 1,
    optional: 2,
  };
  const ordered = [...entries].sort((a, b) => {
    if (tierWeight[a.tier] !== tierWeight[b.tier]) {
      return tierWeight[a.tier] - tierWeight[b.tier];
    }
    return priorityRank(a.familyId) - priorityRank(b.familyId);
  });

  // 3. Walk and allocate.
  const recommended: AllocatedItem[] = [];
  const optional: AllocatedItem[] = [];
  const premium: PremiumUpgrade[] = [];
  let total = 0;
  let essentialOverflow = false;

  for (const e of ordered) {
    const price = e.chosen ? getEffectivePrice(e.chosen.variant) : 0;
    const base: Omit<AllocatedItem, "reason"> = {
      groupId: e.gr.group.id,
      familyId: e.familyId,
      tier: e.tier,
      label: e.gr.group.label,
      rec: e.chosen,
      price,
      index: e.idx,
      zone: e.chosen?.group.zone ?? "Z",
      zoneName: e.chosen?.group.zone_name ?? "Other",
      // Size warnings (e.g. "No single 5-person tent found") are more
      // actionable than the generic "Optional depending on sleeping plan",
      // so they take precedence when both are present.
      note: e.gr.sizeWarning ?? e.gr.group.optional ?? null,
      sizeNeeded: e.gr.group.sizeNeeded ?? false,
      traveler: e.gr.group.traveler ?? null,
    };

    // Items the trip layer flagged as "depends on sleeping plan" always go
    // into the optional section and are NEVER counted in the purchased total.
    if (e.gr.group.forceOptional) {
      optional.push({ ...base, reason: "depends-on-sleeping" });
      continue;
    }

    // Size needed — show placeholder in the recommended section but don't
    // count anything toward the budget (no product chosen).
    if (e.gr.group.sizeNeeded) {
      recommended.push({ ...base, reason: "safety-essential" });
      continue;
    }

    if (e.tier === "essential") {
      // Essentials always go into the kit, even if they push us over budget.
      const overBudget =
        totalBudget !== undefined && total + price > totalBudget;
      if (overBudget) essentialOverflow = true;
      total += price;
      recommended.push({
        ...base,
        reason: overBudget ? "essential-over-budget" : "safety-essential",
      });
    } else if (totalBudget === undefined || total + price <= totalBudget) {
      // Conditional / optional that fits.
      total += price;
      recommended.push({ ...base, reason: "fits-budget" });
    } else {
      // Doesn't fit — move to "Optional / borrow or rent".
      optional.push({
        ...base,
        reason: OVERNIGHT.has(e.familyId) ? "borrow-overnight" : "moved-optional",
      });
    }

    // Premium upgrade only relevant when the item is in the recommended kit
    // and would still leave the kit affordable to consider.
    if (e.upgrade && e.chosen) {
      const delta = getEffectivePrice(e.upgrade.variant) - price;
      if (delta > 0) {
        premium.push({
          groupId: e.gr.group.id,
          familyId: e.familyId,
          label: e.gr.group.label,
          current: e.chosen,
          upgrade: e.upgrade,
          delta,
        });
      }
    }
  }

  // Sort the displayed sections by checklist order (index) for stable reading.
  recommended.sort((a, b) => a.index - b.index);
  optional.sort((a, b) => a.index - b.index);

  const warning = buildWarning(
    totalBudget,
    essentialOverflow,
    optional,
    ctx.durationDays,
    ctx.tripType,
  );

  return {
    recommended,
    optional,
    premium,
    recommendedTotal: recommended.reduce((s, it) => s + it.price, 0),
    budget: totalBudget,
    warning,
  };
}

function priorityRank(familyId: string): number {
  const i = TRIP_PRIORITY.indexOf(familyId);
  return i === -1 ? 999 : i;
}

function buildWarning(
  budget: number | undefined,
  essentialOverflow: boolean,
  optional: AllocatedItem[],
  durationDays: number | null | undefined,
  tripType: string | undefined,
): string | null {
  if (budget === undefined) return null;
  const dayLabel = durationDays ? `${durationDays}-day ` : "";
  const typeLabel = tripType?.includes("mountain") ? "mountain " : "";
  if (essentialOverflow) {
    return `CHF ${budget} is tight for buying a full ${dayLabel}${typeLabel}kit. Consider borrowing or renting overnight gear.`;
  }
  if (optional.some((o) => OVERNIGHT.has(o.familyId))) {
    return `Overnight gear pushed the kit over CHF ${budget} — borrow or rent the items below.`;
  }
  return null;
}