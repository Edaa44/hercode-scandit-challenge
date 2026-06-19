import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Camera, ScanLine, Sparkles, X, MapPin, Tag } from "lucide-react";
import { toast } from "sonner";
import { useFavorites, favoriteId } from "@/lib/favorites";
import {
  processBarcode,
  type BarcodeResult,
  type BarcodeSource,
} from "@/lib/barcode";
import { getEffectivePrice, getStockStatus } from "@/lib/catalog";
import { VoiceProductQA } from "@/components/VoiceProductQA";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan Shelf — TrailAble" },
      { name: "description", content: "Scan a product barcode on the shelf." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { items: favorites, remove } = useFavorites();
  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  /**
   * Single barcode entry point. The future SparkScan / camera scanner will
   * call this same function with `source: "camera"` — no other wiring needed.
   */
  const handleBarcode = (raw: string, source: BarcodeSource = "manual") => {
    const result: BarcodeResult = processBarcode(raw, { source });
    if (!result.ok) {
      if (result.reason === "empty") return;
      setScanned(null);
      setNotFound(result.code);
      toast.error("Barcode not found", {
        description: `No product matches ${result.code}.`,
      });
      setCode("");
      return;
    }
    const product = result.product;
    setScanned(product);
    setNotFound(null);
    setCode("");
    toast.success("Product found", { description: product.name });

    // If the scanned product is on the user's favorites, drop it.
    const favHit = favorites.find(
      (r) => r.variant.product_code === product.product_code,
    );
    if (favHit) {
      remove(favoriteId(favHit));
      toast("Removed from favorites", { description: product.name });
    }
  };

  return (
    <AppShell title="Scan Shelf" subtitle="Point your phone at a barcode">
      {/* Scanner viewfinder — placeholder until camera SDK is wired in. */}
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 text-center">
        <div
          role="img"
          aria-label="Scanner viewfinder"
          className="relative mx-auto grid aspect-[3/4] w-full max-w-xs place-items-center overflow-hidden rounded-2xl bg-foreground/90"
        >
          <ScanLine
            className="size-20 animate-pulse text-background"
            aria-hidden="true"
          />
          <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-accent" />
          <span className="absolute left-3 top-3 size-6 rounded-tl-lg border-l-4 border-t-4 border-accent" />
          <span className="absolute right-3 top-3 size-6 rounded-tr-lg border-r-4 border-t-4 border-accent" />
          <span className="absolute bottom-3 left-3 size-6 rounded-bl-lg border-b-4 border-l-4 border-accent" />
          <span className="absolute bottom-3 right-3 size-6 rounded-br-lg border-b-4 border-r-4 border-accent" />
          <span className="absolute bottom-1 right-0 left-0 text-[10px] font-bold uppercase tracking-wider text-background/80">
            Camera scanner coming soon
          </span>
        </div>

        <p className="mt-5 text-base font-semibold">Enter a barcode to continue</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The same lookup will run automatically once the camera scanner ships.
        </p>

        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleBarcode(code, "manual");
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
            Look up barcode
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
                  onClick={() => handleBarcode(r.variant.product_code, "manual")}
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

      {notFound && (
        <div className="mt-5 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Barcode not found</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {notFound}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotFound(null)}
              aria-label="Dismiss"
              className="rounded-lg p-1 hover:bg-background"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {scanned && <ScannedProductView product={scanned} onDismiss={() => setScanned(null)} />}

      {!scanned && (
        <div className="mt-5 rounded-2xl border-2 border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              In the meantime
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Use the Concierge to describe what you need in plain language, and
            we&apos;ll guide you to the right aisle.
          </p>
          <Link
            to="/"
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground"
          >
            Go to Concierge
          </Link>
        </div>
      )}
    </AppShell>
  );
}

function ScannedProductView({
  product,
  onDismiss,
}: {
  product: Product;
  onDismiss: () => void;
}) {
  const effective = getEffectivePrice(product);
  const stockStatus = getStockStatus(product);
  const hasDiscount = product.discount_pct > 0;

  return (
    <div className="mt-5 space-y-4">
      <article className="overflow-hidden rounded-2xl border-2 border-primary bg-card">
        <div className="flex items-center justify-between border-b-2 border-primary bg-primary px-4 py-1.5 text-xs font-black uppercase tracking-wider text-primary-foreground">
          <span>Scanned product</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Clear scanned product"
            className="rounded p-0.5 hover:bg-primary-foreground/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-2 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {product.brand} · {product.category.replace(/-/g, " ")}
          </p>
          <h2 className="text-lg font-bold leading-tight">{product.name}</h2>
          <p className="font-mono text-xs text-muted-foreground">
            {product.product_code}
          </p>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 text-sm">
            <Row label="Size" value={String(product.size)} />
            <Row label="Colour" value={product.color} />
            <Row
              label="Price"
              value={
                hasDiscount ? (
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="font-bold tabular-nums">
                      CHF {effective.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through tabular-nums">
                      {product.price_chf.toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded border border-accent px-1 text-[10px] font-bold uppercase text-accent">
                      <Tag className="size-2.5" aria-hidden="true" />-
                      {product.discount_pct}%
                    </span>
                  </span>
                ) : (
                  <span className="font-bold tabular-nums">
                    CHF {effective.toFixed(2)}
                  </span>
                )
              }
            />
            <Row
              label="Find it"
              value={
                <span className="inline-flex items-center gap-1">
                  <MapPin
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Aisle {product.aisle} · {product.zone_name}
                </span>
              }
            />
            <Row
              label="Stock"
              value={
                stockStatus === "ON SHELF"
                  ? `On shelf · ${product.stock_front} at front`
                  : stockStatus === "ASK STAFF"
                    ? "In back stock — ask staff"
                    : "Sold out"
              }
            />
          </dl>

          {product.description && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm leading-snug">
              {product.description}
            </p>
          )}
        </div>
      </article>

      <VoiceProductQA product={product} />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 truncate font-semibold">{value}</dd>
    </div>
  );
}
