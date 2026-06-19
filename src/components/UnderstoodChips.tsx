import { X } from "lucide-react";
import type { RequestFormValue } from "./RequestForm";
import type { RequestGroup } from "@/lib/groups";
import { usePrefs } from "@/lib/prefs";
import type { A11yPrefs } from "@/lib/types";

type Chip = { key: string; label: string; onRemove?: () => void };

const A11Y_LABELS: Partial<Record<keyof A11yPrefs, string>> = {
  colorBlind: "Color-blind",
  lowVision: "Low vision",
  reducedWalking: "Less walking",
  voiceGuidance: "Voice",
  simpleLanguage: "Simple language",
  beginner: "Beginner",
  budgetSafe: "Budget-safe",
};

const FIT_LABEL: Record<string, string> = {
  womens: "Women's fit",
  mens: "Men's fit",
  unisex: "Unisex fit",
  kids: "Kids fit",
};

export function UnderstoodChips({
  submitted,
  groups,
  onClearField,
}: {
  submitted: RequestFormValue;
  groups: RequestGroup[];
  onClearField: (field: keyof RequestFormValue) => void;
}) {
  const { prefs, toggle } = usePrefs();

  const chips: Chip[] = [];

  // Detected product intents
  for (const g of groups) {
    chips.push({ key: `cat-${g.id}`, label: g.label });
  }

  if (submitted.category) {
    chips.push({
      key: "category",
      label: `Category: ${submitted.category.replace(/-/g, " ")}`,
      onRemove: () => onClearField("category"),
    });
  }
  if (submitted.size) {
    chips.push({
      key: "size",
      label: `Size ${submitted.size}`,
      onRemove: () => onClearField("size"),
    });
  }
  if (submitted.maxPrice) {
    chips.push({
      key: "maxPrice",
      label: `Under CHF ${submitted.maxPrice}`,
      onRemove: () => onClearField("maxPrice"),
    });
  }
  if (submitted.fit && submitted.fit !== "any") {
    chips.push({
      key: "fit",
      label: FIT_LABEL[submitted.fit] ?? submitted.fit,
      onRemove: () => onClearField("fit"),
    });
  }
  for (const key of ["waterproof", "winter", "lightweight", "vegan", "beginner", "reducedWalking"] as const) {
    if (submitted[key]) {
      chips.push({
        key,
        label:
          key === "waterproof"
            ? "Waterproof"
            : key === "winter"
              ? "Winter"
              : key === "lightweight"
                ? "Lightweight"
                : key === "vegan"
                  ? "Vegan"
                  : key === "beginner"
                    ? "Beginner"
                    : "Less walking",
        onRemove: () => onClearField(key),
      });
    }
  }

  // Accessibility chips
  const activeA11y = (Object.keys(A11Y_LABELS) as Array<keyof A11yPrefs>).filter(
    (k) => prefs[k],
  );

  return (
    <section
      aria-label="Here's what I understood"
      className="hidden rounded-2xl border-2 border-border bg-card p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Here's what I understood
      </p>
      <p className="mt-1 text-base font-bold">
        {submitted.text.trim() || "Browsing everything"}
      </p>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-background px-2.5 py-1 text-xs font-bold"
            >
              {c.label}
              {c.onRemove && (
                <button
                  type="button"
                  onClick={c.onRemove}
                  aria-label={`Remove ${c.label}`}
                  className="-mr-1 grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {activeA11y.length > 0 && (
        <div className="mt-3 border-t-2 border-dashed border-border pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Accessibility on
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeA11y.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full border-2 border-primary bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
              >
                {A11Y_LABELS[k]}
                <button
                  type="button"
                  onClick={() => toggle(k)}
                  aria-label={`Turn off ${A11Y_LABELS[k]}`}
                  className="-mr-1 grid size-4 place-items-center rounded-full hover:bg-primary/20"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
