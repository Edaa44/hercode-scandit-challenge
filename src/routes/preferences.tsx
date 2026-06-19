import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { usePrefs } from "@/lib/prefs";
import type { A11yPrefs } from "@/lib/types";
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Eye,
  Footprints,
  Palette,
  PiggyBank,
  Sparkles,
  Volume2,
} from "lucide-react";

export const Route = createFileRoute("/preferences")({
  head: () => ({
    meta: [
      { title: "Accessibility — TrailAble" },
      { name: "description", content: "Set your accessibility preferences for shopping." },
    ],
  }),
  component: PreferencesPage,
});

type Item = { key: keyof A11yPrefs; label: string; help: string; Icon: typeof Eye };

const items: Item[] = [
  { key: "colorBlind", label: "Color-blind mode", help: "Use shapes, labels and icons instead of color cues.", Icon: Palette },
  { key: "lowVision", label: "Low-vision mode", help: "Larger text and stronger contrast.", Icon: Eye },
  { key: "reducedWalking", label: "Reduced walking", help: "Shortest possible path through the store.", Icon: Footprints },
  { key: "voiceGuidance", label: "Voice guidance", help: "Read steps aloud.", Icon: Volume2 },
  { key: "simpleLanguage", label: "Simple language", help: "Short sentences, plain words.", Icon: BookOpen },
  { key: "beginner", label: "Beginner mode", help: "Recommend easy-to-use beginner gear.", Icon: Sparkles },
  { key: "budgetSafe", label: "Budget-safe", help: "Cap suggestions at CHF 200 unless you say otherwise.", Icon: PiggyBank },
];

function PreferencesPage() {
  const { prefs, toggle, reset } = usePrefs();

  return (
    <AppShell title="Accessibility" subtitle="Pick what helps you most">
      <div className="mb-4 flex items-start gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
        <Accessibility className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-snug">
          Turn on what you need. You can change this anytime. Nothing here is required.
        </p>
      </div>

      <ul className="space-y-3">
        {items.map(({ key, label, help, Icon }) => {
          const on = prefs[key];
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-pressed={on}
                className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
                  on ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-bold">{label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                        on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {on ? "ON" : "OFF"}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{help}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground shadow-sm hover:opacity-95"
        >
          Continue to shopping
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Reset all preferences
        </button>
      </div>
    </AppShell>
  );
}