import { HelpCircle, Sparkles, Users, Ruler, Zap } from "lucide-react";
import type { FollowUpId, TripInfo, TripPrefs } from "@/lib/trip";
import { SAFE_DEFAULTS, contextDefaults } from "@/lib/trip";

export type PartyPreset = "just-me" | "partner" | "family" | "friends" | "custom";

const PARTY_OPTIONS: Array<{ value: PartyPreset; label: string }> = [
  { value: "just-me", label: "Just me" },
  { value: "partner", label: "Me + partner" },
  { value: "family", label: "Family" },
  { value: "friends", label: "Group of friends" },
  { value: "custom", label: "Custom" },
];

type Option<V extends string> = { value: V; label: string };

const TEMP_OPTIONS: Option<NonNullable<TripPrefs["temperature"]>>[] = [
  { value: "warm", label: "Warm — above 10°C" },
  { value: "cool", label: "Cool — 0 to 10°C" },
  { value: "cold", label: "Cold — −10 to 0°C" },
  { value: "very-cold", label: "Very cold — below −10°C" },
  { value: "unsure", label: "Not sure" },
];
const SLEEPING_OPTIONS: Option<NonNullable<TripPrefs["sleeping"]>>[] = [
  { value: "tent", label: "Tent / camping" },
  { value: "hut", label: "Mountain hut" },
  { value: "hotel", label: "Hotel / lodge" },
  { value: "unsure", label: "Not sure" },
];
const WEATHER_OPTIONS: Option<NonNullable<TripPrefs["weather"]>>[] = [
  { value: "dry", label: "Mostly dry" },
  { value: "rain", label: "Rain likely" },
  { value: "snow", label: "Snow possible" },
  { value: "mixed", label: "Mixed mountain weather" },
  { value: "unsure", label: "Not sure" },
];
const CARRYING_OPTIONS: Option<NonNullable<TripPrefs["carrying"]>>[] = [
  { value: "lightweight", label: "Yes, keep it lightweight" },
  { value: "comfort", label: "No, comfort matters more" },
  { value: "unsure", label: "Not sure" },
];
const EXPERIENCE_OPTIONS: Option<NonNullable<TripPrefs["experience"]>>[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Technical / advanced" },
];
const BUDGET_OPTIONS: Option<NonNullable<TripPrefs["budget"]>>[] = [
  { value: "budget", label: "Budget-friendly" },
  { value: "balanced", label: "Balanced" },
  { value: "premium", label: "Premium" },
  { value: "none", label: "No budget" },
];

const QUESTIONS: Record<
  Exclude<FollowUpId, "party" | "sizes">,
  { title: string; key: keyof TripPrefs; options: Option<string>[] }
> = {
  temperature: {
    title: "What temperatures do you expect?",
    key: "temperature",
    options: TEMP_OPTIONS,
  },
  sleeping: {
    title: "Where will you sleep?",
    key: "sleeping",
    options: SLEEPING_OPTIONS,
  },
  weather: {
    title: "What weather should we prepare for?",
    key: "weather",
    options: WEATHER_OPTIONS,
  },
  carrying: {
    title: "Will you carry everything yourself?",
    key: "carrying",
    options: CARRYING_OPTIONS,
  },
  experience: {
    title: "What is your experience level?",
    key: "experience",
    options: EXPERIENCE_OPTIONS,
  },
  budget: {
    title: "Do you have a budget?",
    key: "budget",
    options: BUDGET_OPTIONS,
  },
};

type Props = {
  missing: FollowUpId[];
  prefs: TripPrefs;
  onChange: (next: TripPrefs) => void;
  onUseDefaults: () => void;
  onShowNow: () => void;
  /** Called when the user picks a "Who is going?" preset chip. */
  onPartyPreset?: (preset: PartyPreset) => void;
  /** Called when the user clicks "Add sizes" — typically scrolls to the party panel. */
  onAddSizes?: () => void;
  /** Current party preset, if known, for highlighting the active chip. */
  partyPreset?: PartyPreset | null;
};

export function TripFollowUp({
  missing,
  prefs,
  onChange,
  onUseDefaults,
  onShowNow,
  onPartyPreset,
  onAddSizes,
  partyPreset,
}: Props) {
  if (missing.length === 0) return null;

  return (
    <section
      aria-label="Refine the gear plan"
      className="rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 p-4"
    >
      <div className="mb-3 flex items-start gap-2">
        <HelpCircle
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">
            Refine your kit
          </p>
          <h3 className="text-base font-bold leading-tight">
            A few quick questions for a better plan
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The starter checklist is already below — answers refine it. Skip
            anytime.
          </p>
        </div>
      </div>

      <ul className="space-y-4">
        {missing.map((id) => {
          if (id === "party") {
            return (
              <li key={id}>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                  <Users className="size-3.5 text-primary" aria-hidden="true" />
                  Who is going?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PARTY_OPTIONS.map((opt) => {
                    const on = partyPreset === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onPartyPreset?.(opt.value)}
                        className={`rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          }
          if (id === "sizes") {
            return (
              <li key={id}>
                <p className="mb-1 flex items-center gap-1.5 text-sm font-bold">
                  <Ruler className="size-3.5 text-primary" aria-hidden="true" />
                  Add sizes
                </p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Add clothing and shoe sizes so we don't recommend the wrong
                  variants.
                </p>
                <button
                  type="button"
                  onClick={() => onAddSizes?.()}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Ruler className="size-3.5" aria-hidden="true" />
                  Add sizes per traveler
                </button>
              </li>
            );
          }
          const q = QUESTIONS[id];
          const current = prefs[q.key] as string | undefined;
          return (
            <li key={id}>
              <p className="mb-1.5 text-sm font-bold">{q.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((opt) => {
                  const on = current === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onChange({ ...prefs, [q.key]: opt.value })
                      }
                      className={`rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUseDefaults}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          Use safe defaults
        </button>
        <button
          type="button"
          onClick={onShowNow}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-95"
        >
          <Zap className="size-3.5" aria-hidden="true" />
          Show gear plan now
        </button>
      </div>
    </section>
  );
}

/**
 * Apply safe defaults only to questions still missing answers.
 * When `trip` is provided, prefer context-aware defaults (e.g. mountain trips
 * default to "cool" temps and "mixed" weather) over generic SAFE_DEFAULTS.
 */
export function applySafeDefaults(
  prefs: TripPrefs,
  missing: FollowUpId[],
  trip?: TripInfo,
): TripPrefs {
  const next: TripPrefs = { ...prefs };
  const ctx = trip ? contextDefaults(trip) : undefined;
  for (const id of missing) {
    // party + sizes aren't TripPrefs keys — handled outside this helper.
    if (id === "party" || id === "sizes") continue;
    if (next[id as keyof TripPrefs] !== undefined) continue;
    const fromCtx = ctx
      ? (ctx as Record<string, unknown>)[id]
      : undefined;
    const fromSafe = (SAFE_DEFAULTS as Record<string, unknown>)[id];
    (next as Record<string, unknown>)[id] = fromCtx ?? fromSafe;
  }
  return next;
}