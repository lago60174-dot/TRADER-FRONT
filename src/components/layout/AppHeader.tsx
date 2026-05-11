import { Link, useRouterState } from "@tanstack/react-router";

import {
  Bell,
  LogOut,
  Search,
  Command,
  ChevronDown,
  Activity,
} from "lucide-react";

import { SidebarTrigger } from "../ui/sidebar";

import { Button } from "../ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import {
  Avatar,
  AvatarFallback,
} from "../ui/avatar";

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
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const auth = useAuth();

  const title =
    titleMap[pathname] ??
    "Forex Terminal";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/10 bg-[#020817]/80 px-4 backdrop-blur-2xl sm:px-6">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hidden text-slate-400 transition hover:text-white md:inline-flex" />

        {/* MOBILE LOGO */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
            <Activity className="h-4 w-4 text-black" />
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-white">
              FX Terminal
            </span>

            <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">
              Live Trading
            </span>
          </div>
        </div>

        {/* DESKTOP TITLE */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Workspace
            </span>

            <span className="text-slate-600">
              /
            </span>

            <span className="text-sm font-semibold text-white">
              {title}
            </span>
          </div>

          <div className="mt-0.5 text-[11px] text-slate-500">
            Institutional Forex Dashboard
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="ml-auto flex items-center gap-2">
        {/* SEARCH */}
        <button
          type="button"
          className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-white md:inline-flex"
        >
          <Search className="h-3.5 w-3.5" />

          <span>Quick search...</span>

          <span className="ml-3 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-slate-500">
            <Command className="h-2.5 w-2.5" />
            K
          </span>
        </button>

        {/* NOTIFICATIONS */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative rounded-xl border border-transparent text-slate-400 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
          aria-label="Notifications"
        >
          <Link to="/notifications">
            <Bell className="h-4 w-4" />

            {/* PING */}
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </Link>
        </Button>

        {/* USER MENU */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-1.5 py-1.5 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <Avatar className="h-8 w-8 border border-white/10">
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-400 text-xs font-bold text-black">
                  FX
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold text-white">
                  Trader
                </div>

                <div className="text-[10px] text-slate-500">
                  Premium Account
                </div>
              </div>

              <ChevronDown className="mr-1 hidden h-3.5 w-3.5 text-slate-500 transition group-hover:text-slate-300 sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 rounded-2xl border border-white/10 bg-[#0b1220]/95 p-2 text-white backdrop-blur-2xl"
          >
            <DropdownMenuLabel className="pb-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  Trader
                </span>

                <span className="text-xs text-slate-500">
                  Connected to live environment
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              asChild
              className="cursor-pointer rounded-xl text-slate-300 focus:bg-white/[0.06] focus:text-white"
            >
              <Link to="/profile">
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              asChild
              className="cursor-pointer rounded-xl text-slate-300 focus:bg-white/[0.06] focus:text-white"
            >
              <Link to="/settings">
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              onClick={auth.logout}
              className="cursor-pointer rounded-xl text-red-400 focus:bg-red-500/10 focus:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />

              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
