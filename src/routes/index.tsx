import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { StoreRoute } from "@/components/StoreRoute";
import { DebugPanel } from "@/components/DebugPanel";
import { A11yChips } from "@/components/A11yChips";
import { UnderstoodChips } from "@/components/UnderstoodChips";
import { NeedsFollowUp } from "@/components/NeedsFollowUp";
import {
  buildTripGroups,
  detectMissing,
  detectTrip,
  detectTotalBudget,
  type FollowUpId,
  type TripInfo,
  type TripPrefs,
} from "@/lib/trip";
import { TripKit } from "@/components/TripKit";
import { TripFollowUp, applySafeDefaults, type PartyPreset } from "@/components/TripFollowUp";
import { TripParty } from "@/components/TripParty";
import { buildTravelers, detectParty, type PartyInfo } from "@/lib/party";
import productsData from "@/data/products.json";
import {
  RequestForm,
  defaultRequest,
  type RequestFormValue,
} from "@/components/RequestForm";
import {
  generateRouteFromEntrance,
  generateShortRouteFromEntrance,
  recommendForGroup,
  scoreAll,
  type GroupResult,
} from "@/lib/catalog";
import { parseRequestGroups, type RequestGroup } from "@/lib/groups";
import { usePrefs, speak } from "@/lib/prefs";
import { playElevenLabs } from "@/services/elevenLabsService";
import type { Product } from "@/lib/types";
import { CircleAlert, Volume2, AlertTriangle } from "lucide-react";
import { Bug } from "lucide-react";
import type { Fit } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrailAble — Accessible AI shopping concierge" },
      { name: "description", content: "A calm, accessible AI concierge that helps you find outdoor gear and walks you through the store." },
      { property: "og:title", content: "TrailAble" },
      { property: "og:description", content: "Accessible AI shopping concierge for outdoor gear." },
    ],
  }),
  component: ConciergePage,
});

function ConciergePage() {
  const { prefs } = usePrefs();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<RequestFormValue>({
    ...defaultRequest,
    reducedWalking: prefs.reducedWalking,
    beginner: prefs.beginner,
  });
  const [submitted, setSubmitted] = useState<RequestFormValue | null>(null);
  const [thinking, setThinking] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [tripPrefs, setTripPrefs] = useState<TripPrefs>({});
  const [followUpDismissed, setFollowUpDismissed] = useState(false);
  const [party, setParty] = useState<PartyInfo | null>(null);
  const [partyPreset, setPartyPreset] = useState<PartyPreset | null>(null);

  useEffect(() => {
    console.log("Loading products.json");
    try {
      const data = productsData as Product[];
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("products.json is empty or not an array");
      }
      console.log("Products loaded:", data.length);
      console.log("First product:", data[0]);
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products.json", err);
      setLoadError(err instanceof Error ? err.message : String(err));
      setProducts([]);
    }
  }, []);

  const categories = useMemo(
    () => (products ? [...new Set(products.map((p) => p.category))].sort() : []),
    [products],
  );

  const trip: TripInfo | null = useMemo(() => {
    if (!submitted) return null;
    return detectTrip(submitted.text);
  }, [submitted]);

  // Party detection re-runs whenever a trip prompt is submitted. The user
  // can then refine the breakdown with the TripParty UI (state above).
  useEffect(() => {
    if (!submitted || !trip?.isTrip) {
      setParty(null);
      return;
    }
    setParty(detectParty(submitted.text));
  }, [submitted, trip?.isTrip]);

  // Total kit budget (Trip Kit mode). Prompt text wins; custom budget prefs
  // are treated as a TOTAL kit budget, never per-item.
  const totalBudget: number | undefined = useMemo(() => {
    if (!submitted || !trip?.isTrip) return undefined;
    const fromText = detectTotalBudget(submitted.text);
    const fromPrefs =
      tripPrefs.budget === "custom" && tripPrefs.budgetAmount
        ? tripPrefs.budgetAmount
        : undefined;
    return fromText ?? fromPrefs;
  }, [submitted, trip, tripPrefs]);

  const requestGroups: RequestGroup[] = useMemo(() => {
    if (!submitted) return [];
    const defaults = formToDefaults(submitted);
    if (trip?.isTrip) {
      return buildTripGroups(
        trip,
        {
          size: defaults.size,
          maxPrice: defaults.maxPrice,
          fit: defaults.fit,
          lightweight: defaults.lightweight,
          vegan: defaults.vegan,
          beginner: defaults.beginner,
        },
        tripPrefs,
        party ?? undefined,
      );
    }
    return parseRequestGroups(submitted.text, defaults);
  }, [submitted, trip, tripPrefs, party]);

  const missingFollowUps: FollowUpId[] = useMemo(() => {
    if (!submitted || !trip?.isTrip) return [];
    const defaults = formToDefaults(submitted);
    const partyResolved =
      !!party && (party.fromText || party.totalPeople !== 1 || partyPreset !== null);
    const sizesResolved =
      !!defaults.size ||
      (!!party &&
        party.travelers.some((t) => !!t.apparelSize || !!t.shoeSize));
    const all = detectMissing(trip, submitted.text, defaults.maxPrice, {
      partyResolved,
      sizesResolved,
    });
    // Hide questions the user has already answered.
    return all.filter((id) => {
      if (id === "party" || id === "sizes") return true;
      return tripPrefs[id as keyof TripPrefs] === undefined;
    });
  }, [submitted, trip, tripPrefs, party, partyPreset]);

  const groupResults: GroupResult[] = useMemo(() => {
    if (!products || requestGroups.length === 0) return [];
    return requestGroups.map((g) => recommendForGroup(products, g, { perGroup: 3 }));
  }, [products, requestGroups]);

  const allRecs = useMemo(
    () => groupResults.flatMap((gr) => gr.recommendations),
    [groupResults],
  );

  // "Accessibility-only" request: the user typed something, but no product
  // family was detected and no category was picked in the form.
  const isNeedsOnly = useMemo(() => {
    if (!submitted) return false;
    if (trip?.isTrip) return false;
    const hasText = submitted.text.trim().length > 0;
    const noCategoryPicked = !submitted.category;
    const noFamilyDetected =
      requestGroups.length === 1 && requestGroups[0].categories.length === 0;
    return hasText && noCategoryPicked && noFamilyDetected;
  }, [submitted, requestGroups, trip]);

  const stops = useMemo(() => {
    const inStock = allRecs
      .filter((r) => r.stockStatus !== "SOLD OUT")
      .map((r) => r.variant);
    if (inStock.length === 0) return [];
    return submitted?.reducedWalking
      ? generateShortRouteFromEntrance(inStock)
      : generateRouteFromEntrance(inStock);
  }, [allRecs, submitted]);

  const isDev = import.meta.env.DEV;
  const debugRows = useMemo(() => {
    if (!isDev || !products) return [];
    return requestGroups.map((g, idx) => {
      const gr = groupResults[idx];
      return {
        id: g.id,
        label: g.label,
        considered: new Set(products.map((p) => p.product_id)).size,
        consideredInCategory: gr?.consideredInCategory,
        requestedCategory: g.categories[0],
        requestedSize: g.size,
        sizeType: gr?.sizeInfo.sizeType,
        categorySizeType: gr?.sizeInfo.categorySizeType,
        sizeValid: gr?.sizeInfo.isValid,
        top: scoreAll(
          g.categories.length
            ? products.filter((p) => g.categories.includes(p.category))
            : products,
          g,
          10,
        ),
      };
    });
  }, [isDev, products, requestGroups, groupResults]);

  const handleSubmit = () => {
    if (!products || products.length === 0) {
      console.warn("Cannot recommend: catalog not loaded");
      return;
    }
    setThinking(true);
    setSubmitted(null);
    setTripPrefs({});
    setFollowUpDismissed(false);
    setPartyPreset(null);
    window.setTimeout(() => {
      setSubmitted(form);
      setThinking(false);
      const reply =
        "I found some matches. Showing your route through the store.";
      if (prefs.voiceGuidance) {
        // ElevenLabs via secure /api/tts-proxy with native fallback baked in.
        void playElevenLabs(reply);
      } else {
        speak(reply, prefs.voiceGuidance);
      }
    }, 350);
  };

  const handleReset = () => {
    setForm({
      ...defaultRequest,
      reducedWalking: prefs.reducedWalking,
      beginner: prefs.beginner,
    });
    setSubmitted(null);
  };

  const applyPartyPreset = (preset: PartyPreset) => {
    setPartyPreset(preset);
    const presets: Record<PartyPreset, { adults: number; children: number; splitUnknown?: boolean }> = {
      "just-me": { adults: 1, children: 0 },
      partner: { adults: 2, children: 0 },
      family: { adults: 2, children: 2, splitUnknown: true },
      friends: { adults: 4, children: 0 },
      custom: { adults: party?.adults ?? 1, children: party?.children ?? 0 },
    };
    const p = presets[preset];
    setParty({
      adults: p.adults,
      children: p.children,
      totalPeople: p.adults + p.children,
      travelers: buildTravelers(p.adults, p.children),
      fromText: true,
      splitUnknown: !!p.splitUnknown,
    });
    if (preset === "custom") {
      window.setTimeout(
        () =>
          document
            .getElementById("trip-party")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0,
      );
    }
  };

  const clearField = (field: keyof RequestFormValue) => {
    if (!submitted) return;
    const blank: RequestFormValue = {
      ...submitted,
      [field]:
        field === "fit"
          ? ("any" as Fit)
          : typeof submitted[field] === "boolean"
            ? false
            : "",
    } as RequestFormValue;
    setForm(blank);
    setSubmitted(blank);
  };

  const subtitle = prefs.simpleLanguage
    ? "Tell me what you need. I will help."
    : "Your accessible shopping assistant";

  return (
    <AppShell title="Shopping Concierge" subtitle={subtitle}>
      <div className="space-y-5">
        <A11yChips />

        <RequestForm
          value={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onReset={handleReset}
          categories={categories}
          products={products ?? []}
          thinking={thinking}
        />
      </div>

      {(loadError || (products && products.length === 0)) && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Catalog not loaded.</p>
            <p>Check products.json import path.</p>
            {loadError && <p className="mt-1 text-xs opacity-80">{loadError}</p>}
          </div>
        </div>
      )}

      {isDev && products && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDebug((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-foreground/30 bg-transparent px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
            aria-expanded={showDebug}
          >
            <Bug className="size-3" aria-hidden="true" />
            {showDebug ? "Hide dev debug" : "Dev debug"}
          </button>
          {showDebug && (
            <div className="mt-2">
              <DebugPanel
                totalVariants={products.length}
                totalProducts={new Set(products.map((p) => p.product_id)).size}
                groups={requestGroups}
                perGroupConsidered={debugRows}
              />
            </div>
          )}
        </div>
      )}

      {submitted && groupResults.length > 0 && (
        <div className="mt-6 space-y-5">
          <UnderstoodChips
            submitted={submitted}
            groups={requestGroups}
            onClearField={clearField}
          />

          {isNeedsOnly ? (
            <NeedsFollowUp
              currentText={submitted.text}
              onPick={(combined) => {
                const next = { ...form, text: combined };
                setForm(next);
                setSubmitted(null);
                setThinking(true);
                window.setTimeout(() => {
                  setSubmitted(next);
                  setThinking(false);
                }, 250);
              }}
            />
          ) : (
            <>
          {trip?.isTrip ? (
            <>
                  <div id="trip-party">
                  <TripParty
                    party={party ?? { adults: 1, children: 0, totalPeople: 1, travelers: [], fromText: false, splitUnknown: false }}
                    onChange={setParty}
                  />
                  </div>
              {!followUpDismissed && missingFollowUps.length > 0 && (
                <TripFollowUp
                  missing={missingFollowUps}
                  prefs={tripPrefs}
                  onChange={setTripPrefs}
                  onUseDefaults={() => {
                    setTripPrefs((p) =>
                      applySafeDefaults(p, missingFollowUps, trip),
                    );
                        // Safe default for "Who is going?" → just me.
                        if (missingFollowUps.includes("party") && !partyPreset) {
                          applyPartyPreset("just-me");
                        }
                    setFollowUpDismissed(true);
                  }}
                  onShowNow={() => setFollowUpDismissed(true)}
                      partyPreset={partyPreset}
                      onPartyPreset={applyPartyPreset}
                      onAddSizes={() => {
                        document
                          .getElementById("trip-party")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                />
              )}
              <TripKit
                trip={trip}
                groupResults={groupResults}
                totalBudget={totalBudget}
                onGuide={() =>
                  document
                    .getElementById("store-route")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              />
              {stops.length > 2 && (
                <StoreRoute stops={stops} reduced={submitted.reducedWalking} />
              )}
            </>
          ) : (
            <>
          {submitted.fit === "any" &&
            requestGroups.every((g) => !g.fitFromText) && (
              <div className="rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 p-3">
                <p className="mb-2 text-sm font-semibold">
                  Do you prefer women's, men's, or unisex fit?
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["womens", "mens", "unisex"] as Fit[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        const next = { ...form, fit: f };
                        setForm(next);
                        setSubmitted(next);
                      }}
                      className="rounded-full border-2 border-primary bg-card px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      {f === "womens" ? "Women's" : f === "mens" ? "Men's" : "Unisex"}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {stops.length > 2 && (
            <StoreRoute stops={stops} reduced={submitted.reducedWalking} />
          )}

          <div className="space-y-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">
                Recommendations ({allRecs.length})
              </h2>
              {prefs.voiceGuidance && (
                <button
                  type="button"
                  onClick={() =>
                    speak(
                      allRecs
                        .map(
                          (r) =>
                            `${r.tag}. ${r.group.name}. ${r.score} points. ${r.reason}`,
                        )
                        .join(". "),
                      true,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground"
                >
                  <Volume2 className="size-3.5" aria-hidden="true" /> Read aloud
                </button>
              )}
            </div>
            {groupResults.map((gr, idx) => (
              <section key={gr.group.id} aria-labelledby={`grp-${gr.group.id}`}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3
                    id={`grp-${gr.group.id}`}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    <span
                      className="inline-block size-2 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {gr.group.label} ({gr.recommendations.length})
                  </h3>
                  {gr.isClosestOnly && (
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-foreground/50 bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      <CircleAlert className="size-3" aria-hidden="true" /> Closest matches
                    </span>
                  )}
                </div>
                {gr.isClosestOnly && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {gr.isZoneFallback
                      ? `No strong match — showing top items from the most relevant zone.`
                      : `No strong match for "${gr.group.rawText || gr.group.label}". Showing the closest options we have.`}
                  </p>
                )}
                {gr.sizeWarning && (
                  <p
                    role="status"
                    className="mb-2 flex items-start gap-1.5 rounded-lg border-2 border-dashed border-foreground/40 bg-accent/40 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>{gr.sizeWarning}</span>
                  </p>
                )}
                {gr.emptyCategory ? (
                  <p className="rounded-xl border-2 border-dashed border-border bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground">
                    No products found in this category.
                  </p>
                ) : (
                <ul className="space-y-3">
                  {gr.recommendations.map((r) => (
                    <li key={`${gr.group.id}-${r.group.product_id}`}>
                      <ProductCard rec={r} />
                    </li>
                  ))}
                </ul>
                )}
              </section>
            ))}
          </div>
            </>
          )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function formToDefaults(f: RequestFormValue) {
  const sizeStr = f.size.trim();
  const sizeNum = sizeStr && /^\d+$/.test(sizeStr) ? parseInt(sizeStr, 10) : undefined;
  const size: string | number | undefined =
    sizeNum !== undefined ? sizeNum : sizeStr || undefined;

  return {
    size,
    maxPrice: f.maxPrice ? parseInt(f.maxPrice, 10) : undefined,
    waterproof: f.waterproof,
    winter: f.winter,
    lightweight: f.lightweight,
    vegan: f.vegan,
    beginner: f.beginner,
    fit: f.fit,
    // When the user only picked a category in the form (no free text),
    // use that category as the fallback for the single resulting group.
    fallbackCategories: f.category ? [f.category] : [],
  };
}