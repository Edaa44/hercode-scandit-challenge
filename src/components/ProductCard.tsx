import { useState } from "react";
import {
  CheckCircle2,
  HelpCircle,
  Users,
  XOctagon,
  ScanLine,
  Navigation,
  Volume2,
  Layers,
  MapPin,
  AlertTriangle,
  Tag,
  ThumbsUp,
  Ruler,
  Ban,
  AlertCircle,
  Heart,
  Plus,
} from "lucide-react";
import { getEffectivePrice } from "@/lib/catalog";
import { speak, usePrefs } from "@/lib/prefs";
import type { MatchTag, Product, ProductGroup, Recommendation, ScoreLine } from "@/lib/types";
import { categoryHasFit } from "@/lib/types";
import { useFavorites, favoriteId } from "@/lib/favorites";
import { VoiceProductQA } from "@/components/VoiceProductQA";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TOP_LABELS: Record<
  MatchTag,
  { label: string; Icon: typeof CheckCircle2; cls: string }
> = {
  "BEST MATCH": {
    label: "BEST MATCH",
    Icon: CheckCircle2,
    cls: "bg-primary text-primary-foreground border-primary",
  },
  "GOOD MATCH": {
    label: "GOOD MATCH",
    Icon: ThumbsUp,
    cls: "bg-primary/15 text-primary border-primary/60",
  },
  "CLOSEST MATCH": {
    label: "CLOSEST MATCH",
    Icon: HelpCircle,
    cls: "bg-accent text-accent-foreground border-accent border-dashed",
  },
  "NEED SIZE": {
    label: "NEED SIZE",
    Icon: Ruler,
    cls: "bg-accent/20 text-accent border-accent border-dashed",
  },
  "NOT CARRIED": {
    label: "NOT CARRIED",
    Icon: Ban,
    cls: "bg-muted text-muted-foreground border-foreground/40",
  },
  "OPTIONAL / BORROW": {
    label: "OPTIONAL / BORROW",
    Icon: AlertCircle,
    cls: "bg-secondary text-secondary-foreground border-secondary-foreground/40 border-dashed",
  },
  "ASK STAFF": {
    label: "ASK STAFF",
    Icon: Users,
    cls: "bg-secondary text-secondary-foreground border-secondary border-dotted",
  },
  "SOLD OUT": {
    label: "SOLD OUT",
    Icon: XOctagon,
    cls: "bg-destructive text-destructive-foreground border-destructive",
  },
};

export function ProductCard({ rec }: { rec: Recommendation }) {
  const { group: g, variant: v, tag, stockStatus } = rec;
  const { prefs } = usePrefs();
  const [showAlts, setShowAlts] = useState(false);
  const {
    lists,
    isFavorite,
    listsContaining,
    addToList,
    removeFromList,
    createList,
  } = useFavorites();
  const saved = isFavorite(rec);
  const inLists = new Set(listsContaining(rec));
  const [newListName, setNewListName] = useState("");
  const recId = favoriteId(rec);

  const top = TOP_LABELS[tag];
  const effective = getEffectivePrice(v);
  const hasDiscount = v.discount_pct > 0;
  const fitLabel = categoryHasFit(g.category) ? fitLabelFor(v.tags) : null;
  const showSize = categoryHasFit(g.category) || hasMeaningfulSize(g.category, v.size);
  const extraRows = extraAttributeRows(g, v);

  const otherSizes = g.sizes.filter((s) => String(s) !== String(v.size));
  const otherColors = g.colors.filter(
    (c) => c.toLowerCase() !== v.color.toLowerCase(),
  );
  const hasAlternatives = otherSizes.length > 0 || otherColors.length > 0;

  const matchChips = buildMatchChips(rec.breakdown).slice(0, 3);
  const tradeoffChips = buildTradeoffChips(rec.breakdown, stockStatus);
  const explanation = rec.reason;

  const stockText =
    stockStatus === "ON SHELF"
      ? `On shelf · ${v.stock_front} at front`
      : stockStatus === "ASK STAFF"
        ? "In back stock — ask staff"
        : "Sold out";

  const handleGuide = () => {
    document
      .getElementById("store-route")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const handleRead = () => {
    speak(
      `${top.label}. ${g.name}. ${fitLabel ? fitLabel + ". " : ""}Size ${v.size}. ${effective.toFixed(0)} francs. Aisle ${g.aisle}, ${g.zone_name}. ${explanation}`,
      true,
    );
  };
  const handleScan = () => {
    // Stub: in-store this would open the barcode scanner.
    alert(`Scan shelf for ${g.name} — barcode ${v.product_code}`);
  };

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm">
      {/* Top label band */}
      <div
        className={`flex items-center gap-2 border-b-2 px-4 py-1.5 text-xs font-black uppercase tracking-wider ${top.cls}`}
      >
        <top.Icon className="size-3.5" aria-hidden="true" />
        <span>{top.label}</span>
      </div>

      <div className="space-y-3 p-4">
        {/* Main info */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.brand} · {prettyCategory(g.category)}
          </p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-foreground">
            {g.name}
          </h3>

          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {fitLabel && <Row label="Fit" value={fitLabel} />}
            {showSize && <Row label="Size" value={String(v.size)} />}
            {extraRows.map((r: { label: string; value: React.ReactNode }) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
            <Row
              label="Price"
              value={
                hasDiscount ? (
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="font-bold tabular-nums">
                      CHF {effective.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through tabular-nums">
                      {v.price_chf.toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded border border-accent px-1 text-[10px] font-bold uppercase text-accent">
                      <Tag className="size-2.5" aria-hidden="true" />-
                      {v.discount_pct}%
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
                  Aisle {g.aisle} · {g.zone_name}
                </span>
              }
            />
            <Row label="Stock" value={stockText} />
          </dl>
        </div>

        {/* Plain explanation */}
        <p className="rounded-lg bg-muted px-3 py-2 text-sm leading-snug text-foreground">
          {explanation}
        </p>

        {/* Why it matched — max 3 chips */}
        {matchChips.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Why it matched
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {matchChips.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-primary/70 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                >
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tradeoffs — only if relevant */}
        {tradeoffChips.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tradeoffs
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {tradeoffChips.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-accent bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent"
                >
                  <AlertTriangle className="size-3" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionButton onClick={handleScan} Icon={ScanLine} label="Scan shelf" />
          <ActionButton
            onClick={handleGuide}
            Icon={Navigation}
            label="Guide me there"
            primary
          />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-pressed={saved}
                aria-label={saved ? "Edit favorite lists" : "Save to a list"}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                  saved
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <Heart
                  className={`size-3.5 ${saved ? "fill-current" : ""}`}
                  aria-hidden="true"
                />
                {saved ? "Saved" : "Save"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Save to lists
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {lists.map((l) => {
                  const checked = inLists.has(l.id);
                  return (
                    <li key={l.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) removeFromList(l.id, recId);
                            else addToList(l.id, rec);
                          }}
                          className="size-4 accent-primary"
                        />
                        <span className="flex-1 truncate font-medium">{l.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {l.items.length}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <form
                className="mt-2 flex items-center gap-1.5 border-t border-border pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newListName.trim();
                  if (!name) return;
                  const id = createList(name);
                  addToList(id, rec);
                  setNewListName("");
                }}
              >
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="New list (e.g. Andes trip)"
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  aria-label="Create list and add"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add
                </button>
              </form>
            </PopoverContent>
          </Popover>
          {prefs.voiceGuidance && (
            <ActionButton onClick={handleRead} Icon={Volume2} label="Read aloud" />
          )}
          {hasAlternatives && (
            <ActionButton
              onClick={() => setShowAlts((s) => !s)}
              Icon={Layers}
              label={showAlts ? "Hide alternatives" : "Show alternatives"}
            />
          )}
        </div>

        <VoiceProductQA product={v} />

        {showAlts && hasAlternatives && (
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 px-3 py-2 text-xs">
            <p className="font-semibold">Other sizes / colours available</p>
            {otherSizes.length > 0 && (
              <p className="mt-1">
                <span className="text-muted-foreground">Sizes:</span>{" "}
                {otherSizes.join(", ")}
              </p>
            )}
            {otherColors.length > 0 && (
              <p className="mt-0.5">
                <span className="text-muted-foreground">Colours:</span>{" "}
                {otherColors.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ActionButton({
  Icon,
  label,
  onClick,
  primary,
}: {
  Icon: typeof ScanLine;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  const cls = primary
    ? "bg-primary text-primary-foreground border-primary"
    : "bg-card text-foreground border-border hover:bg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${cls}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
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

function prettyCategory(c: string) {
  return c.replace(/-/g, " ");
}

function fitLabelFor(tags: string[]): string | null {
  if (tags.includes("womens")) return "Women's";
  if (tags.includes("mens")) return "Men's";
  if (tags.includes("kids")) return "Kids";
  if (tags.includes("unisex")) return "Unisex";
  return null;
}

/** Size row only worth showing when it carries information (skip "one-size"). */
function hasMeaningfulSize(category: string, size: string | number): boolean {
  const s = String(size).trim().toLowerCase();
  if (!s || s === "one-size" || s === "onesize" || s === "n/a") return false;
  // For gear categories, size text like "1L" or "60L" IS meaningful — keep it.
  return true;
}

/** Category-specific extra attribute rows (capacity, weight, ratings, etc.). */
function extraAttributeRows(
  g: ProductGroup,
  v: Product,
): Array<{ label: string; value: React.ReactNode }> {
  const rows: Array<{ label: string; value: React.ReactNode }> = [];
  const cat = g.category;
  const weight = v.weight_g || g.weight_g;
  const fmtWeight = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(1)} kg` : `${w} g`);

  if (cat === "water-bottle") {
    if (v.size) rows.push({ label: "Capacity", value: String(v.size) });
    if (g.material) rows.push({ label: "Material", value: g.material });
  } else if (cat === "tent") {
    if (v.size) rows.push({ label: "Capacity", value: `${v.size}-person` });
    if (g.tags.some((t) => /season/i.test(t))) {
      const season = g.tags.find((t) => /season/i.test(t));
      if (season) rows.push({ label: "Season", value: season });
    }
    if (weight) rows.push({ label: "Weight", value: fmtWeight(weight) });
    if (g.waterproof_rating_mm)
      rows.push({ label: "Waterproof", value: `${g.waterproof_rating_mm} mm` });
  } else if (cat === "sleeping-bag") {
    if (g.temp_rating_c !== null)
      rows.push({ label: "Temp rating", value: `${g.temp_rating_c}°C` });
    if (weight) rows.push({ label: "Weight", value: fmtWeight(weight) });
  } else if (cat === "backpack") {
    if (v.size) rows.push({ label: "Capacity", value: String(v.size) });
    if (weight) rows.push({ label: "Weight", value: fmtWeight(weight) });
  } else if (cat === "headlamp") {
    const rechargeable = g.tags.some((t) => /rechargeable|usb/i.test(t));
    rows.push({ label: "Power", value: rechargeable ? "Rechargeable" : "Battery" });
    if (weight) rows.push({ label: "Weight", value: fmtWeight(weight) });
  } else if (cat === "sleeping-mat" || cat === "tarp" || cat === "stove") {
    if (weight) rows.push({ label: "Weight", value: fmtWeight(weight) });
  }
  return rows;
}

/** Reduce positive score lines into short chip tokens. */
function buildMatchChips(breakdown: ScoreLine[]): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    if (!seen.has(s)) {
      seen.add(s);
      chips.push(s);
    }
  };
  for (const line of breakdown) {
    if (line.points <= 0) continue;
    const l = line.label.toLowerCase();
    if (l.includes("waterproof")) push("Waterproof");
    else if (l.includes("winter") || l.includes("cold weather")) push("Winter");
    else if (l.startsWith("available in size")) {
      const m = line.label.match(/size\s+(\S+)/i);
      push(m ? `Size ${m[1]}` : "Your size");
    } else if (l.startsWith("within chf")) {
      const m = line.label.match(/within chf\s+(\d+)/i);
      push(m ? `Under CHF ${m[1]}` : "In budget");
    } else if (l.includes("on the shelf")) push("On shelf");
    else if (l.includes("lightweight")) push("Lightweight");
    else if (l.includes("vegan")) push("Vegan");
    else if (l.includes("beginner")) push("Beginner");
    else if (l.includes("recycled")) push("Recycled");
    else if (l.includes("fit")) {
      if (l.includes("women")) push("Women's fit");
      else if (l.includes("men")) push("Men's fit");
      else if (l.includes("unisex")) push("Unisex fit");
      else if (l.includes("kids")) push("Kids' fit");
    }
  }
  return chips;
}

function buildTradeoffChips(
  breakdown: ScoreLine[],
  stockStatus: "ON SHELF" | "ASK STAFF" | "SOLD OUT",
): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    if (!seen.has(s)) {
      seen.add(s);
      chips.push(s);
    }
  };
  if (stockStatus === "ASK STAFF") push("In back stock — ask staff");
  for (const line of breakdown) {
    if (line.points >= 0) continue;
    const l = line.label.toLowerCase();
    if (l.includes("slightly over budget")) push("Slightly over budget");
    else if (l.includes("far over budget")) push("Far over budget");
    else if (l.includes("not waterproof")) push("Not waterproof");
    else if (l.includes("not winter")) push("Not insulated");
    else if (l.includes("size") && l.includes("does not match"))
      push("Closest size available");
    else if (l.includes("fit") && l.includes("you asked"))
      push("Different fit than requested");
  }
  return chips;
}