import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Camera, ScanLine, Sparkles, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useFavorites, favoriteId } from "@/lib/favorites";
import type { Recommendation } from "@/lib/types";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan Shelf — TrailAble" },
      { name: "description", content: "Scan a product barcode on the shelf." },
    ],
  }),
  component: ScanPage,
});

type CloseMatch = { rec: Recommendation; score: number; reason: string };

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function findClosest(code: string, favs: Recommendation[]): CloseMatch[] {
  const c = code.trim();
  return favs
    .map<CloseMatch>((rec) => {
      const fc = rec.variant.product_code;
      const dist = levenshtein(c, fc);
      const maxLen = Math.max(c.length, fc.length, 1);
      const sim = 1 - dist / maxLen;
      // Prefix overlap bonus
      let prefix = 0;
      for (let i = 0; i < Math.min(c.length, fc.length); i++) {
        if (c[i] === fc[i]) prefix++;
        else break;
      }
      const score = sim * 100 + prefix * 2;
      const reason =
        prefix >= 4
          ? `First ${prefix} digits match`
          : dist <= 2
            ? `Only ${dist} character${dist === 1 ? "" : "s"} different`
            : `${Math.round(sim * 100)}% similar`;
      return { rec, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function ScanPage() {
  const { items: favorites, remove } = useFavorites();
  const [code, setCode] = useState("");
  const [lastScanned, setLastScanned] = useState<Recommendation | null>(null);
  const [closest, setClosest] = useState<CloseMatch[] | null>(null);

  const handleScan = (raw: string) => {
    const c = raw.trim();
    if (!c) return;
    const match = favorites.find((r) => r.variant.product_code === c);
    if (match) {
      setLastScanned(match);
      setClosest(null);
      remove(favoriteId(match));
      toast.success("Item scanned", {
        description: `${match.group.name} removed from your favorites.`,
      });
    } else {
      setLastScanned(null);
      if (favorites.length === 0) {
        setClosest([]);
        toast("No favorites yet", {
          description: "Save items from search to scan them here.",
        });
      } else {
        const close = findClosest(c, favorites);
        setClosest(close);
        toast.error("Not in your favorites", {
          description: `Closest match: ${close[0]?.rec.group.name ?? "—"}`,
        });
      }
    }
    setCode("");
  };

  return (
    <AppShell title="Scan Shelf" subtitle="Point your phone at a barcode">
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 text-center">
        <div
          role="img"
          aria-label="Scanner viewfinder"
          className="relative mx-auto grid aspect-[3/4] w-full max-w-xs place-items-center overflow-hidden rounded-2xl bg-foreground/90"
        >
          <ScanLine className="size-20 animate-pulse text-background" aria-hidden="true" />
          <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-accent" />
          <span className="absolute left-3 top-3 size-6 rounded-tl-lg border-l-4 border-t-4 border-accent" />
          <span className="absolute right-3 top-3 size-6 rounded-tr-lg border-r-4 border-t-4 border-accent" />
          <span className="absolute bottom-3 left-3 size-6 rounded-bl-lg border-b-4 border-l-4 border-accent" />
          <span className="absolute bottom-3 right-3 size-6 rounded-br-lg border-b-4 border-r-4 border-accent" />
        </div>

        <p className="mt-5 text-base font-semibold">Enter or scan a barcode</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Scanning a favorite removes it from your list. Camera support is coming soon.
        </p>

        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleScan(code);
          }}
        >
          <label htmlFor="barcode-input" className="sr-only">Barcode</label>
          <input
            id="barcode-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. 7612345678901"
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-center text-base font-mono"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground"
          >
            <Camera className="size-5" aria-hidden="true" />
            Scan barcode
          </button>
        </form>

        {favorites.length > 0 && (
          <div className="mt-4 text-left">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quick scan from favorites
            </p>
            <div className="flex flex-wrap gap-2">
              {favorites.slice(0, 6).map((r) => (
                <button
                  key={favoriteId(r)}
                  type="button"
                  onClick={() => handleScan(r.variant.product_code)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary"
                  title={r.variant.product_code}
                >
                  {r.group.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {lastScanned && (
        <div className="mt-5 rounded-2xl border-2 border-primary bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="text-base font-bold text-primary">Item scanned</h2>
              <p className="mt-1 text-sm">
                <span className="font-semibold">{lastScanned.group.name}</span> was
                removed from your favorites.
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {lastScanned.variant.product_code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastScanned(null)}
              aria-label="Dismiss"
              className="rounded-lg p-1 hover:bg-background"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {closest && closest.length > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold">Not in your favorites</h2>
            <button
              type="button"
              onClick={() => setClosest(null)}
              aria-label="Dismiss"
              className="rounded-lg p-1 hover:bg-background"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Closest items already on your list:
          </p>
          <ul className="mt-3 space-y-2">
            {closest.map(({ rec, reason }) => (
              <li
                key={favoriteId(rec)}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{rec.group.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {rec.variant.product_code}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    {reason}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 rounded-2xl border-2 border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">In the meantime</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Use the Concierge to describe what you need in plain language, and we'll guide you to the right aisle.
        </p>
        <Link
          to="/"
          className="mt-3 inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground"
        >
          Go to Concierge
        </Link>
      </div>
    </AppShell>
  );
}