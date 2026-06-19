import { Users, UserPlus, UserMinus } from "lucide-react";
import type { Fit } from "@/lib/types";
import {
  buildTravelers,
  type PartyInfo,
  type TravelerProfile,
} from "@/lib/party";

type Props = {
  party: PartyInfo;
  onChange: (next: PartyInfo) => void;
};

const FITS: Array<{ value: Fit; label: string }> = [
  { value: "any", label: "Any" },
  { value: "womens", label: "Women's" },
  { value: "mens", label: "Men's" },
  { value: "unisex", label: "Unisex" },
];

const APPAREL_SIZES = ["", "XS", "S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = [
  "", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46",
];

export function TripParty({ party, onChange }: Props) {
  const setAdults = (n: number) => rebuild(Math.max(0, n), party.children);
  const setChildren = (n: number) => rebuild(party.adults, Math.max(0, n));

  const rebuild = (adults: number, children: number) => {
    // Preserve sizes/fit of existing travelers where labels still match.
    const next = buildTravelers(adults, children).map((t) => {
      const existing = party.travelers.find((p) => p.id === t.id);
      return existing ? { ...t, ...existing, id: t.id, label: t.label, kind: t.kind } : t;
    });
    onChange({
      ...party,
      adults,
      children,
      totalPeople: adults + children,
      travelers: next,
      splitUnknown: false,
    });
  };

  const updateTraveler = (id: string, patch: Partial<TravelerProfile>) => {
    onChange({
      ...party,
      travelers: party.travelers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  };

  return (
    <section
      aria-label="Who is going on this trip?"
      className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4"
    >
      <header className="flex items-center gap-2">
        <Users className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-black uppercase tracking-wider text-primary">
          Who is going?
        </h3>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {party.totalPeople} {party.totalPeople === 1 ? "person" : "people"}
        </span>
      </header>

      {party.splitUnknown && (
        <p className="mt-2 text-xs text-muted-foreground">
          Set the number of adults and children below to split the group.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Counter label="Adults" value={party.adults} onChange={setAdults} min={0} />
        <Counter label="Children" value={party.children} onChange={setChildren} min={0} />
      </div>

      {party.travelers.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sizes per traveler (optional — speeds up the kit)
          </p>
          <ul className="space-y-2">
            {party.travelers.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border-2 border-border bg-card px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold">{t.label}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t.kind}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {t.kind === "child" ? (
                    <p className="sm:col-span-3 rounded-lg border-2 border-dashed border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
                      Children's sizes aren't carried in this store — staff can help find a fit or suggest the smallest adult size.
                    </p>
                  ) : (
                    <>
                  <LabeledSelect
                    label="Fit"
                    value={t.fit}
                    onChange={(v) => updateTraveler(t.id, { fit: v as Fit })}
                    options={FITS.map((f) => ({ value: f.value, label: f.label }))}
                  />
                  <LabeledSelect
                    label="Apparel"
                    value={t.apparelSize ?? ""}
                    onChange={(v) => updateTraveler(t.id, { apparelSize: v })}
                    options={APPAREL_SIZES.map((s) => ({
                      value: s,
                      label: s || "Unknown",
                    }))}
                  />
                  <LabeledSelect
                    label="Shoes"
                    value={t.shoeSize ?? ""}
                    onChange={(v) => updateTraveler(t.id, { shoeSize: v })}
                    options={SHOE_SIZES.map((s) => ({
                      value: s,
                      label: s || "Unknown",
                    }))}
                  />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Counter({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
}) {
  return (
    <div className="rounded-xl border-2 border-border bg-card px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid size-8 place-items-center rounded-full border-2 border-border hover:border-primary"
        >
          <UserMinus className="size-3.5" aria-hidden="true" />
        </button>
        <span className="min-w-[2ch] text-center text-lg font-black tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + 1)}
          className="grid size-8 place-items-center rounded-full border-2 border-border hover:border-primary"
        >
          <UserPlus className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border-2 border-border bg-background px-2 py-1.5 text-sm font-semibold outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}