import { useMemo } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Backpack,
  Ban,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Navigation,
  Package,
  PiggyBank,
  Ruler,
  Scale,
  ShieldCheck,
  Sparkles,
  Tag,
  ThumbsUp,
  Users,
  XOctagon,
} from "lucide-react";
import type { ReactNode } from "react";
import { getEffectivePrice, type GroupResult } from "@/lib/catalog";
import type { Recommendation, MatchTag } from "@/lib/types";
import type { TripInfo } from "@/lib/trip";
import {
  allocateKit,
  REASON_LABEL,
  type AllocatedItem,
  type Allocation,
  type PremiumUpgrade,
  type ReasonKey,
} from "@/lib/budget";

type Props = {
  trip: TripInfo;
  groupResults: GroupResult[];
  onGuide: () => void;
  /** Total kit budget (CHF). When set, the plan is allocated to stay under it. */
  totalBudget?: number;
};

export function TripKit({ trip, groupResults, onGuide, totalBudget }: Props) {
  const allocation: Allocation = useMemo(() => {
    const cold = /cold|winter|mountain/.test(trip.conditions);
    return allocateKit(groupResults, totalBudget, {
      cold,
      durationDays: trip.durationDays,
      tripType: trip.tripType,
    });
  }, [groupResults, totalBudget, trip]);

  const { recommended, optional, premium, recommendedTotal, warning } = allocation;
  const overBudget =
    totalBudget !== undefined && recommendedTotal > totalBudget;

  const totals = useMemo(() => {
    let weight = 0;
    let onShelf = 0;
    let staff = 0;
    for (const it of recommended) {
      if (!it.rec) continue;
      weight += it.rec.group.weight_g || 0;
      if (it.rec.stockStatus === "ON SHELF") onShelf += 1;
      if (it.rec.stockStatus === "ASK STAFF") staff += 1;
    }
    return { price: recommendedTotal, weight, onShelf, staff };
  }, [recommended, recommendedTotal]);

  const byZone = useMemo(() => groupByZone(recommended), [recommended]);
  const summaryNeeds = buildNeedsSummary(trip, recommended);

  const budgetPct =
    totalBudget && totalBudget > 0
      ? Math.min(100, Math.round((recommendedTotal / totalBudget) * 100))
      : 0;

  return (
    <section className="space-y-5">
      {/* Trip summary card */}
      <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <Backpack className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">
              Trip Kit mode
            </p>
            <h2 className="text-lg font-bold leading-tight">
              {trip.durationDays ? `${trip.durationDays}-day ` : ""}
              {trip.tripType} trip
              {trip.destination ? ` · ${trip.destination}` : ""}
            </h2>
            <p className="mt-1 text-sm">Likely needs: {summaryNeeds}.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Conditions: {trip.conditions}.
            </p>
          </div>
        </div>
      </div>

      {/* Kit budget meter */}
      {totalBudget !== undefined && (
        <div
          className={`rounded-2xl border-2 p-4 ${
            overBudget ? "border-destructive bg-destructive/10" : "border-primary bg-card"
          }`}
        >
          <div className="flex items-center gap-2">
            <PiggyBank
              className={`size-5 shrink-0 ${overBudget ? "text-destructive" : "text-primary"}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Kit budget
              </p>
              <p className="text-base font-black tabular-nums">
                CHF {recommendedTotal.toFixed(0)}{" "}
                <span className="text-muted-foreground">/ CHF {totalBudget.toFixed(0)}</span>
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                overBudget
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {overBudget ? "Over budget" : `${budgetPct}%`}
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalBudget}
            aria-valuenow={Math.round(recommendedTotal)}
          >
            <div
              className={`h-full ${overBudget ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          {warning && (
            <p
              className={`mt-2 flex items-start gap-1.5 text-xs font-semibold ${
                overBudget ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {warning}
            </p>
          )}
          {!warning && optional.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Some lower-priority items moved to "Optional — borrow or rent" to keep the kit under CHF {totalBudget}.
            </p>
          )}
        </div>
      )}

      {/* Totals strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat Icon={Tag} label="Est. kit price" value={`CHF ${totals.price.toFixed(0)}`} />
        <Stat
          Icon={Scale}
          label="Est. weight"
          value={
            totals.weight > 0
              ? totals.weight >= 1000
                ? `${(totals.weight / 1000).toFixed(1)} kg`
                : `${totals.weight} g`
              : "—"
          }
        />
        <Stat
          Icon={Package}
          label="On shelf"
          value={`${totals.onShelf} / ${recommended.filter((it) => it.rec).length}`}
        />
        <Stat Icon={Users} label="Ask staff" value={String(totals.staff)} warn={totals.staff > 0} />
      </div>

      <button
        type="button"
        onClick={onGuide}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-black text-primary-foreground shadow-sm transition hover:opacity-95"
      >
        <Navigation className="size-5" aria-hidden="true" />
        Guide me through the store
      </button>

      {/* Section A — Recommended kit within budget */}
      <SectionHeader
        icon={<ShieldCheck className="size-4" aria-hidden="true" />}
        title="Recommended kit within budget"
        sub={`Total CHF ${recommendedTotal.toFixed(0)}${
          totalBudget !== undefined ? ` / CHF ${totalBudget}` : ""
        }`}
        tone="primary"
      />
      <div className="space-y-4">
        {byZone.map(({ zone, zoneName, items }) => (
          <section
            key={zone}
            aria-label={`Zone ${zone} — ${zoneName}`}
            className="overflow-hidden rounded-2xl border-2 border-border bg-card"
          >
            <header className="flex items-center gap-2 border-b-2 border-border bg-secondary px-4 py-2 text-secondary-foreground">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                {zone}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Zone {zone} · {zoneName}
              </h3>
              <span className="ml-auto text-xs font-semibold opacity-80">
                {items.length} item{items.length === 1 ? "" : "s"}
              </span>
            </header>
            <ul className="divide-y-2 divide-border">
              {items.map((it) => (
                <ChecklistRow key={it.groupId} item={it} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Section B — Optional / borrow or rent */}
      {optional.length > 0 && (
        <>
          <SectionHeader
            icon={<AlertCircle className="size-4" aria-hidden="true" />}
            title="Optional — borrow or rent"
            sub={`${optional.length} item${
              optional.length === 1 ? "" : "s"
            } not in the purchased total`}
            tone="accent"
          />
          <section
            aria-label="Optional — borrow or rent"
            className="overflow-hidden rounded-2xl border-2 border-dashed border-accent bg-accent/5"
          >
            <ul className="divide-y-2 divide-dashed divide-accent/40">
              {optional.map((it) => (
                <ChecklistRow key={it.groupId} item={it} />
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Section C — Premium upgrades */}
      {premium.length > 0 && (
        <>
          <SectionHeader
            icon={<Sparkles className="size-4" aria-hidden="true" />}
            title="Premium upgrades"
            sub="Higher-spec alternatives — not included in the kit total"
            tone="muted"
          />
          <ul className="space-y-2">
            {premium.map((p) => (
              <PremiumRow key={p.groupId} upgrade={p} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- subcomponents ---------- */

function Stat({
  Icon,
  label,
  value,
  warn,
}: {
  Icon: typeof Tag;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 px-3 py-2 ${
        warn ? "border-accent bg-accent/15 text-accent" : "border-border bg-card text-foreground"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-0.5 text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  sub,
  tone,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  tone: "primary" | "accent" | "muted";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : "text-muted-foreground";
  return (
    <div className={`flex items-baseline gap-2 ${toneCls}`}>
      <span className="grid size-6 place-items-center">{icon}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-black uppercase tracking-wider">{title}</h3>
        {sub && <p className="text-xs font-semibold opacity-80">{sub}</p>}
      </div>
    </div>
  );
}

function ChecklistRow({ item }: { item: AllocatedItem }) {
  const rec = item.rec;
  if (item.sizeNeeded) {
    return (
      <li className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 grid size-5 place-items-center rounded-full border-2 border-dashed border-accent text-[10px] font-black text-accent">
          {item.index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold leading-tight">{item.label}</p>
            <TopTag tag="NEED SIZE" />
          </div>
          <p className="mt-1 inline-flex items-center gap-1 rounded-md border-2 border-dashed border-accent bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">
            <Ruler className="size-3" aria-hidden="true" />
            Add{item.traveler ? ` ${item.traveler}'s ` : " a "}size to finalise this item
          </p>
        </div>
      </li>
    );
  }
  if (!rec) {
    return (
      <li className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 grid size-5 place-items-center rounded-full border-2 border-dashed border-muted-foreground/50 text-[10px] font-black text-muted-foreground">
          {item.index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold">{item.label}</p>
            <TopTag tag="NOT CARRIED" />
          </div>
          <p className="mt-0.5 inline-flex items-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/60 bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            <Ban className="size-3" aria-hidden="true" />
            Not carried in this size/category
          </p>
        </div>
      </li>
    );
  }
  const eff = getEffectivePrice(rec.variant);
  const optionalReasons: ReasonKey[] = [
    "moved-optional",
    "borrow-overnight",
    "depends-on-sleeping",
  ];
  const displayTag: MatchTag = optionalReasons.includes(item.reason)
    ? "OPTIONAL / BORROW"
    : rec.tag;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
        {item.index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
          <TopTag tag={displayTag} />
        </div>
        <p className="text-sm font-bold leading-tight">{rec.group.name}</p>
        <ReasonBadge reason={item.reason} />
        {item.note ? (
          <p className="mt-1 inline-flex items-center gap-1 rounded-md border-2 border-dashed border-accent bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">
            <AlertCircle className="size-3" aria-hidden="true" />
            {item.note}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
          <span className="font-black tabular-nums">CHF {eff.toFixed(2)}</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" />
            Aisle {rec.group.aisle}
          </span>
          <StockChip status={rec.stockStatus} />
        </div>
        <p className="mt-1.5 text-xs leading-snug text-foreground/80">{rec.reason}</p>
      </div>
    </li>
  );
}

function ReasonBadge({ reason }: { reason: ReasonKey }) {
  const styles: Record<ReasonKey, string> = {
    "safety-essential": "border-primary bg-primary/10 text-primary",
    "essential-over-budget": "border-destructive bg-destructive/10 text-destructive",
    "fits-budget": "border-primary/60 bg-primary/5 text-primary",
    "moved-optional": "border-accent bg-accent/15 text-accent",
    "borrow-overnight": "border-accent bg-accent/15 text-accent",
    "depends-on-sleeping": "border-accent bg-accent/15 text-accent",
    "premium-upgrade": "border-secondary-foreground/30 bg-secondary text-secondary-foreground",
  };
  const Icon =
    reason === "safety-essential" || reason === "essential-over-budget"
      ? ShieldCheck
      : reason === "fits-budget"
        ? CheckCircle2
        : AlertCircle;
  return (
    <p
      className={`mt-1 inline-flex items-center gap-1 rounded-md border-2 border-dashed px-2 py-0.5 text-[11px] font-bold ${styles[reason]}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {REASON_LABEL[reason]}
    </p>
  );
}

function PremiumRow({ upgrade }: { upgrade: PremiumUpgrade }) {
  const u = upgrade.upgrade;
  return (
    <li className="rounded-2xl border-2 border-dashed border-border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {upgrade.label}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-secondary-foreground">
          <ArrowUpRight className="size-3" aria-hidden="true" />
          +CHF {upgrade.delta.toFixed(0)}
        </span>
      </div>
      <p className="text-sm font-bold leading-tight">{u.group.name}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
        <span className="font-black tabular-nums">CHF {getEffectivePrice(u.variant).toFixed(2)}</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MapPin className="size-3" aria-hidden="true" />
          Aisle {u.group.aisle}
        </span>
        <StockChip status={u.stockStatus} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{u.reason}</p>
    </li>
  );
}

function TopTag({ tag }: { tag: MatchTag }) {
  const cfg: Record<
    MatchTag,
    { cls: string; Icon: typeof CheckCircle2; label: string }
  > = {
    "BEST MATCH": {
      cls: "bg-primary text-primary-foreground",
      Icon: CheckCircle2,
      label: "Best match",
    },
    "GOOD MATCH": {
      cls: "border-2 border-primary/60 bg-primary/10 text-primary",
      Icon: ThumbsUp,
      label: "Good match",
    },
    "CLOSEST MATCH": {
      cls: "border-2 border-dashed border-accent bg-accent/15 text-accent",
      Icon: HelpCircle,
      label: "Closest match",
    },
    "NEED SIZE": {
      cls: "border-2 border-dashed border-accent bg-accent/15 text-accent",
      Icon: Ruler,
      label: "Need size",
    },
    "NOT CARRIED": {
      cls: "border-2 border-muted-foreground/50 bg-muted text-muted-foreground",
      Icon: Ban,
      label: "Not carried",
    },
    "OPTIONAL / BORROW": {
      cls: "border-2 border-dashed border-secondary-foreground/40 bg-secondary text-secondary-foreground",
      Icon: AlertCircle,
      label: "Optional / borrow",
    },
    "ASK STAFF": {
      cls: "border-2 border-dotted border-secondary-foreground/60 bg-secondary text-secondary-foreground",
      Icon: Users,
      label: "Ask staff",
    },
    "SOLD OUT": {
      cls: "bg-destructive text-destructive-foreground",
      Icon: XOctagon,
      label: "Sold out",
    },
  };
  const { cls, Icon, label } = cfg[tag];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${cls}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function StockChip({ status }: { status: Recommendation["stockStatus"] }) {
  if (status === "ON SHELF") {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <Package className="size-3" aria-hidden="true" /> On shelf
      </span>
    );
  }
  if (status === "ASK STAFF") {
    return (
      <span className="inline-flex items-center gap-1 text-accent">
        <AlertCircle className="size-3" aria-hidden="true" /> Ask staff
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-destructive">
      <XOctagon className="size-3" aria-hidden="true" /> Sold out
    </span>
  );
}

/* ---------- helpers ---------- */

const ZONE_ORDER = ["A", "B", "F", "E", "G", "C", "D", "Z"];

function groupByZone(items: AllocatedItem[]) {
  const map = new Map<string, { zone: string; zoneName: string; items: AllocatedItem[] }>();
  for (const it of items) {
    const key = it.zone;
    if (!map.has(key)) {
      map.set(key, { zone: key, zoneName: it.zoneName, items: [] });
    }
    map.get(key)!.items.push(it);
  }
  return [...map.values()].sort((a, b) => indexOrLast(a.zone) - indexOrLast(b.zone));
}

function indexOrLast(z: string) {
  const i = ZONE_ORDER.indexOf(z);
  return i === -1 ? 999 : i;
}

function buildNeedsSummary(trip: TripInfo, items: AllocatedItem[]): string {
  const needs: string[] = [];
  const hasOvernight = items.some((it) =>
    ["tent", "sleeping-bag", "sleeping-mat", "stove"].includes(it.rec?.group.category ?? ""),
  );
  if (/wet|rain|mountain/.test(trip.conditions)) needs.push("waterproof");
  if (/cold|winter|mountain/.test(trip.conditions)) needs.push("warm layers");
  needs.push("durable footwear");
  if (hasOvernight) needs.push("overnight gear");
  return needs.join(", ");
}
