import { Bug } from "lucide-react";
import type { ScoredRow } from "@/lib/catalog";
import type { RequestGroup } from "@/lib/groups";
import type { SizeType } from "@/lib/sizes";

type Props = {
  totalProducts: number;
  totalVariants: number;
  groups: RequestGroup[];
  perGroupConsidered: {
    id: string;
    label: string;
    considered: number;
    consideredInCategory?: number;
    requestedCategory?: string;
    requestedSize?: string | number;
    sizeType?: SizeType;
    categorySizeType?: SizeType;
    sizeValid?: boolean;
    top: ScoredRow[];
  }[];
};

export function DebugPanel({ totalProducts, totalVariants, groups, perGroupConsidered }: Props) {
  return (
    <details className="rounded-2xl border-2 border-dashed border-foreground/30 bg-muted/30 p-3 text-xs">
      <summary className="flex cursor-pointer items-center gap-2 font-bold uppercase tracking-wider">
        <Bug className="size-3.5" aria-hidden="true" /> Debug panel (dev only)
      </summary>
      <div className="mt-3 space-y-3">
        <p>
          <span className="font-semibold">Catalog:</span> {totalVariants} variants ·{" "}
          {totalProducts} unique products
        </p>
        <div>
          <p className="font-semibold">Detected request groups ({groups.length}):</p>
          <ul className="mt-1 space-y-1">
            {groups.map((g) => (
              <li key={g.id} className="rounded-md bg-card px-2 py-1.5">
                <span className="font-bold">{g.label}</span> ·{" "}
                <span className="text-muted-foreground">
                  cats=[{g.categories.join(", ") || "none → all"}]
                  {g.size !== undefined && `, size=${g.size}`}
                  {g.maxPrice !== undefined && `, maxCHF=${g.maxPrice}`}
                  {g.waterproof && ", waterproof"}
                  {g.winter && ", winter"}
                  {g.lightweight && ", light"}
                  {g.vegan && ", vegan"}
                  {g.beginner && ", beginner"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {perGroupConsidered.map((pg) => (
          <div key={pg.id}>
            <p className="font-semibold">
              {pg.label} — {pg.consideredInCategory ?? pg.considered} after category gate
              {" "}({pg.considered} total). Top 10:
            </p>
            <ul className="mt-1 mb-1 grid grid-cols-1 gap-0.5 rounded-md bg-card px-2 py-1.5 text-[11px] sm:grid-cols-2">
              <li>
                <span className="font-semibold">category:</span>{" "}
                {pg.requestedCategory ?? "—"}
              </li>
              <li>
                <span className="font-semibold">size:</span>{" "}
                {pg.requestedSize ?? "—"}
              </li>
              <li>
                <span className="font-semibold">size type:</span>{" "}
                {pg.sizeType ?? "—"} (cat: {pg.categorySizeType ?? "—"})
              </li>
              <li>
                <span className="font-semibold">valid for category:</span>{" "}
                {pg.sizeValid === undefined ? "—" : pg.sizeValid ? "yes" : "no"}
              </li>
            </ul>
            <ol className="mt-1 space-y-1">
              {pg.top.map((r) => (
                <li
                  key={r.product.product_code}
                  className="rounded-md bg-card px-2 py-1.5"
                >
                  <span className="inline-block w-10 font-bold tabular-nums">{r.score}</span>
                  <span className="font-semibold">{r.product.name}</span>{" "}
                  <span className="text-muted-foreground">
                    ({r.product.category}, size {r.product.size})
                  </span>
                  <span className="block pl-10 text-muted-foreground">{r.reason}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </details>
  );
}