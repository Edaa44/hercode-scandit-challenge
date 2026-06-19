import { HelpCircle, ShoppingBag } from "lucide-react";

export type NeedsChip = { label: string; phrase: string };

export const NEEDS_CHIPS: NeedsChip[] = [
  { label: "Winter jacket", phrase: "winter jacket" },
  { label: "Waterproof boots", phrase: "waterproof boots" },
  {
    label: "3-day Alps trip",
    phrase: "tent, sleeping bag, backpack, jacket and boots for a 3-day Alps trip",
  },
  {
    label: "Beginner camping",
    phrase: "beginner tent, sleeping bag and headlamp for camping",
  },
  {
    label: "Rainy hike",
    phrase: "waterproof jacket and boots for a rainy hike",
  },
];

export function NeedsFollowUp({
  currentText,
  onPick,
}: {
  currentText: string;
  onPick: (combined: string) => void;
}) {
  const hasContext = currentText.trim().length > 0;
  return (
    <section
      role="region"
      aria-label="Tell us what to shop for"
      className="rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-2">
        <HelpCircle
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight">
            What are you shopping for — one item or a full trip?
          </h2>
          {hasContext && (
            <p className="mt-1 text-xs text-muted-foreground">
              I’ll keep your preferences: <em>“{currentText.trim()}”</em>
            </p>
          )}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {NEEDS_CHIPS.map((c) => (
          <li key={c.label}>
            <button
              type="button"
              onClick={() => onPick(combine(currentText, c.phrase))}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-card px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <ShoppingBag className="size-3.5" aria-hidden="true" />
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Combine an existing accessibility prompt with a product/trip phrase. */
export function combine(existing: string, phrase: string): string {
  const e = existing.trim();
  if (!e) return phrase;
  return `${phrase} with ${e}`;
}