import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Mountain } from "lucide-react";

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Mountain className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-wider text-secondary-foreground">
            TRAILABLE
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}