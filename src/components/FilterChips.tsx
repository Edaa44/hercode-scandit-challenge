import type { ParsedFilters } from "@/lib/types";
import { Sparkles } from "lucide-react";

export function FilterChips({ filters }: { filters: ParsedFilters }) {
  const chips: string[] = [];
  if (filters.categories.length) chips.push(`Category: ${filters.categories.join(", ")}`);
  if (filters.size !== undefined) chips.push(`Size: ${filters.size}`);
  if (filters.color) chips.push(`Colour: ${filters.color}`);
  if (filters.maxPrice !== undefined) chips.push(`Max CHF ${filters.maxPrice}`);
  if (filters.waterproof) chips.push("Waterproof");
  if (filters.winter) chips.push("Winter / cold");
  if (filters.lightweight) chips.push("Lightweight");
  if (filters.vegan) chips.push("Vegan");
  if (filters.beginnerFriendly) chips.push("Beginner-friendly");

  return (
    <section
      aria-label="What the AI understood"
      className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">What I understood</h2>
      </div>
      {chips.length === 0 ? (
        <p className="text-sm text-muted-foreground">No filters detected — showing general picks.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li
              key={c}
              className="rounded-full border border-primary/40 bg-card px-3 py-1 text-xs font-semibold text-foreground"
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}