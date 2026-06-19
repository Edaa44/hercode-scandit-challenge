import {
  Accessibility,
  Baby,
  Eye,
  Footprints,
  Languages,
  Palette,
  Volume2,
  Wallet,
} from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import type { A11yPrefs } from "@/lib/types";

const CHIPS: Array<{
  key: keyof A11yPrefs;
  label: string;
  Icon: typeof Eye;
}> = [
  { key: "colorBlind", label: "Color-blind", Icon: Palette },
  { key: "lowVision", label: "Low vision", Icon: Eye },
  { key: "reducedWalking", label: "Less walking", Icon: Footprints },
  { key: "voiceGuidance", label: "Voice", Icon: Volume2 },
  { key: "simpleLanguage", label: "Simple language", Icon: Languages },
  { key: "beginner", label: "Beginner", Icon: Baby },
  { key: "budgetSafe", label: "Budget-safe", Icon: Wallet },
];

export function A11yChips() {
  const { prefs, toggle } = usePrefs();
  return (
    <div className="rounded-2xl border-2 border-border bg-card/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Accessibility className="size-3.5" aria-hidden="true" />
        Accessibility — tap to switch on/off
      </p>
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {CHIPS.map(({ key, label, Icon }) => {
          const on = prefs[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
              <span className="sr-only">{on ? "(on)" : "(off)"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}