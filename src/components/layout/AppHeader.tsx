import { useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Search, Command } from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";
import { Button } from "../ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useAuth } from "../../lib/auth";

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/trades": "Trades",
  "/strategies": "Strategies",
  "/analytics": "Analytics",
  "/risk": "Risk Management",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "Profile",
};

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const auth = useAuth();
  const title = titleMap[pathname] ?? "Forex Terminal";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/70 px-3 backdrop-blur sm:px-5">
      <SidebarTrigger className="hidden text-muted-foreground md:inline-flex" />
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-elegant)]">
          <span className="text-xs font-bold">FX</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">Forex Terminal</span>
      </div>
      <div className="ml-1 hidden text-sm md:block">
        <span className="text-muted-foreground">Workspace</span>
        <span className="mx-1.5 text-muted-foreground/50">/</span>
        <span className="font-medium text-foreground">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-card md:inline-flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Quick search…</span>
          <span className="ml-2 inline-flex items-center gap-0.5 rounded-md border border-border/60 px-1.5 py-0.5 text-[10px]">
            <Command className="h-2.5 w-2.5" /> K
          </span>
        </button>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 p-1 pr-2 transition hover:bg-card"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">FX</AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium text-foreground sm:inline">Trader</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Signed in</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={auth.logout} className="text-destructive">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
