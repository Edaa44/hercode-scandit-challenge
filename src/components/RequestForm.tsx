import {
  ChevronDown,
  Droplets,
  Feather,
  Footprints,
  Leaf,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Fit, Product } from "@/lib/types";
import { categoryHasFit } from "@/lib/types";
import { getSizeOptionsForCategory } from "@/lib/sizes";

export type RequestFormValue = {
  text: string;
  category: string;
  size: string;
  maxPrice: string;
  waterproof: boolean;
  winter: boolean;
  lightweight: boolean;
  vegan: boolean;
  beginner: boolean;
  reducedWalking: boolean;
  fit: Fit;
};

export const defaultRequest: RequestFormValue = {
  text: "",
  category: "",
  size: "",
  maxPrice: "",
  waterproof: false,
  winter: false,
  lightweight: false,
  vegan: false,
  beginner: false,
  reducedWalking: false,
  fit: "any",
};

type Props = {
  value: RequestFormValue;
  onChange: (v: RequestFormValue) => void;
  onSubmit: () => void;
  onReset: () => void;
  categories: string[];
  products: Product[];
  thinking: boolean;
};

const TOGGLES: Array<{
  key: keyof RequestFormValue;
  label: string;
  Icon: typeof Sparkles;
}> = [
  { key: "waterproof", label: "Waterproof required", Icon: Droplets },
  { key: "winter", label: "Winter required", Icon: Snowflake },
  { key: "lightweight", label: "Lightweight preferred", Icon: Feather },
  { key: "vegan", label: "Vegan preferred", Icon: Leaf },
  { key: "beginner", label: "Beginner preferred", Icon: Sparkles },
  { key: "reducedWalking", label: "Reduced walking", Icon: Footprints },
];

const FITS: Array<{ value: Fit; label: string }> = [
  { value: "any", label: "Any fit" },
  { value: "womens", label: "Women's" },
  { value: "mens", label: "Men's" },
  { value: "unisex", label: "Unisex" },
];

export const PROMPT_EXAMPLES = [
  // Specific product examples
  "I need waterproof hiking boots in size 42",
  "Find me a winter jacket under CHF 400",
  "I need a lightweight backpack for a weekend hike",
  "Show me beginner-friendly rain jackets",
  // Trip planning examples
  "I'm planning a 3-day trip in the Alps",
  "Help me pack for a rainy weekend hike",
  "I'm going camping for 2 nights with my family",
  "What gear do I need for a 4-day trip in the Andes under CHF 700?",
  // Accessibility examples
  "I have low vision — read product matches aloud",
  "I'm color-blind — don't use color-only labels",
  "I want the shortest route through the store",
  "Use simple explanations; I'm new to hiking",
  // Combined realistic examples
  "Find waterproof boots in size 42 and use voice guidance",
  "I'm planning a 3-day Alps trip and want the shortest store route",
  "I have low vision and need help choosing a winter jacket",
  "Help me pack for a family camping trip under CHF 1000",
];

export function RequestForm({
  value,
  onChange,
  onSubmit,
  onReset,
  categories,
  products,
  thinking,
}: Props) {
  const textId = useId();
  const catId = useId();
  const sizeId = useId();
  const priceId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [phIndex, setPhIndex] = useState(() =>
    Math.floor(Math.random() * PROMPT_EXAMPLES.length),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setPhIndex((i) => (i + 1) % PROMPT_EXAMPLES.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);
  const placeholder = PROMPT_EXAMPLES[phIndex];

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const set = <K extends keyof RequestFormValue>(k: K, v: RequestFormValue[K]) =>
    onChange({ ...value, [k]: v });

  // Category-aware size options. Empty when no category is selected — the
  // dropdown then only offers "Any" to prevent invalid free-text sizes.
  const sizeOptions = value.category
    ? getSizeOptionsForCategory(products, value.category)
    : [];
  const sizePlaceholder = value.category ? "Any" : "Pick a category first";

  // Fit preference only applies to apparel/footwear/accessory categories.
  const showFit = !value.category || categoryHasFit(value.category);

  const hasOptional =
    !!value.category ||
    !!value.size ||
    !!value.maxPrice ||
    (showFit && value.fit !== "any") ||
    value.waterproof ||
    value.winter ||
    value.lightweight ||
    value.vegan ||
    value.beginner ||
    value.reducedWalking;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-balance text-2xl font-black leading-tight sm:text-3xl">
          What are you shopping for today?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell me in your own words — I'll do the rest.
        </p>
      </div>

      <div>
        <label htmlFor={textId} className="sr-only">
          What are you shopping for today?
        </label>
        <textarea
          id={textId}
          ref={textareaRef}
          value={value.text}
          onChange={(e) => set("text", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          placeholder={placeholder}
          aria-label="What are you shopping for today?"
          className="w-full resize-none rounded-2xl border-2 border-border bg-card px-4 py-4 text-base leading-relaxed shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
      </div>

      <button
        type="submit"
        disabled={thinking}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-5 text-lg font-black text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-70"
      >
        {thinking ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Finding your gear…
          </>
        ) : (
          <>
            <Search className="size-5" aria-hidden="true" /> Find my gear
          </>
        )}
      </button>

      <details
        className="group rounded-2xl border-2 border-dashed border-border bg-card/60 open:bg-card"
        open={hasOptional || undefined}
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold hover:bg-muted/60">
          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left">
            Optional details
            {hasOptional && (
              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Active
              </span>
            )}
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="space-y-5 border-t-2 border-dashed border-border/80 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field id={catId} label="Category" icon={Wand2}>
              <select
                id={catId}
                value={value.category}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  onChange({
                    ...value,
                    category: nextCat,
                    // Reset size whenever category changes — keeps the dropdown
                    // consistent with the new category's available sizes.
                    size: "",
                    // Clear fit when switching to a category where fit isn't meaningful.
                    fit: nextCat && !categoryHasFit(nextCat) ? "any" : value.fit,
                  });
                }}
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary"
              >
                <option value="">Any category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            </Field>

            <Field id={sizeId} label="Size" icon={Search}>
              <select
                id={sizeId}
                value={value.size}
                onChange={(e) => set("size", e.target.value)}
                disabled={!value.category}
                aria-describedby={`${sizeId}-help`}
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">{sizePlaceholder}</option>
                {sizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p
                id={`${sizeId}-help`}
                className="mt-1 text-[11px] text-muted-foreground"
              >
                {value.category
                  ? "Only sizes we carry are shown."
                  : "Pick a category to choose a size."}
              </p>
            </Field>

            <Field id={priceId} label="Max budget (CHF)" icon={Wallet}>
              <input
                id={priceId}
                value={value.maxPrice}
                onChange={(e) =>
                  set("maxPrice", e.target.value.replace(/[^\d]/g, ""))
                }
                inputMode="numeric"
                placeholder="No limit"
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary"
              />
            </Field>
          </div>

          {showFit && (
          <fieldset>
            <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="size-3.5" aria-hidden="true" /> Fit preference
            </legend>
            <div role="radiogroup" aria-label="Fit preference" className="flex flex-wrap gap-2">
              {FITS.map((f) => {
                const on = value.fit === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("fit", f.value)}
                    className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold transition ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          )}

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preferences
            </legend>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TOGGLES.map(({ key, label, Icon }) => {
                const on = value[key] as boolean;
                return (
                  <li key={key as string}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => set(key, !on as never)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition ${
                        on
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                          on
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1">{label}</span>
                      <span
                        className={`rounded-full border-2 px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {on ? "ON" : "OFF"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Reset details
          </button>
        </div>
      </details>
    </form>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: typeof Wand2;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <Icon className="size-3.5" aria-hidden="true" /> {label}
      </label>
      {children}
    </div>
  );
}