import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, LineChart, ListChecks, Shield, Bell, Settings as SettingsIcon,
  CandlestickChart, User, BarChart3,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; exact?: boolean };

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Trades", url: "/trades", icon: ListChecks },
  { title: "Strategies", url: "/strategies", icon: CandlestickChart },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Risk", url: "/risk", icon: Shield },
];

const accountItems: NavItem[] = [
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (url: string, exact = false) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-elegant)]">
            <LineChart className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Forex Terminal</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Pro · v1.0</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
                    <Link to={item.url as "/"} className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url as "/"} className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-3">
        {!collapsed && (
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs">
            <div className="font-medium text-sidebar-foreground">Live trading</div>
            <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Connected to OANDA
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}