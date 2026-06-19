import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultPrefs, type A11yPrefs } from "./types";

const STORAGE_KEY = "trailable.prefs";

type Ctx = {
  prefs: A11yPrefs;
  setPref: <K extends keyof A11yPrefs>(k: K, v: A11yPrefs[K]) => void;
  toggle: (k: keyof A11yPrefs) => void;
  reset: () => void;
};

const PrefsContext = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(defaultPrefs);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...defaultPrefs, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
    const html = document.documentElement;
    html.classList.toggle("a11y-color-blind", prefs.colorBlind);
    html.classList.toggle("a11y-high-contrast", prefs.lowVision);
    html.classList.toggle("a11y-large-text", prefs.lowVision);
  }, [prefs]);

  const value: Ctx = {
    prefs,
    setPref: (k, v) => setPrefs((p) => ({ ...p, [k]: v })),
    toggle: (k) => setPrefs((p) => ({ ...p, [k]: !p[k] })),
    reset: () => setPrefs(defaultPrefs),
  };

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}

export function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {}
}