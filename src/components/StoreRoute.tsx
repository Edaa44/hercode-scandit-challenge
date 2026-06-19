import { ChevronRight, DoorOpen, Footprints, MapPin, ShoppingBag } from "lucide-react";
import type { RouteStop } from "@/lib/types";

export function StoreRoute({ stops, reduced }: { stops: RouteStop[]; reduced: boolean }) {
  return (
    <section
      id="store-route"
      aria-label="Accessible store route"
      className="rounded-2xl border-2 border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Footprints className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-base font-bold">Your route through the store</h2>
      </div>
      {reduced && (
        <p className="mb-3 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
          Reduced walking mode is ON — shortest path selected.
        </p>
      )}
      <ol className="space-y-2">
        {stops.map((stop, i) => {
          const isLast = i === stops.length - 1;
          const Icon =
            stop.kind === "entrance" || stop.kind === "exit"
              ? DoorOpen
              : stop.kind === "checkout"
                ? ShoppingBag
                : MapPin;
          return (
            <li
              key={`${stop.label}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{stop.label}</span>
                {stop.sublabel && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {stop.sublabel}
                  </span>
                )}
              </span>
              {!isLast && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}