import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListChecks, CandlestickChart, BarChart3, Shield, User,
} from "lucide-react";
import { cn } from "../../lib/utils";

const items = [
  { title: "Home", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Trades", url: "/trades", icon: ListChecks },
  { title: "Strategies", url: "/strategies", icon: CandlestickChart },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Risk", url: "/risk", icon: Shield },
  { title: "Profile", url: "/profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/")
      || (url === "/profile" && (pathname.startsWith("/settings") || pathname.startsWith("/notifications")));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-6">
        {items.map((it) => {
          const active = isActive(it.url, "exact" in it ? it.exact : false);
          return (
            <li key={it.url}>
              <Link
                to={it.url as "/"}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_var(--color-primary)]")} />
                <span className="leading-none">{it.title}</span>
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
