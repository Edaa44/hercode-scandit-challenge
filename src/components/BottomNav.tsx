import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Settings2, ScanLine, Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

const items = [
  { to: "/", label: "Concierge", icon: Home },
  { to: "/scan", label: "Scan Shelf", icon: ScanLine },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/preferences", label: "Access", icon: Settings2 },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { items: favItems } = useFavorites();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          const isFav = to === "/favorites";
          const count = favItems.length;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className="size-6" aria-hidden="true" />
                  {isFav && count > 0 && (
                    <span
                      aria-label={`${count} saved`}
                      className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground"
                    >
                      {count}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}