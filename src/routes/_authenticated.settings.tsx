import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Shield, Sliders } from "lucide-react";
import { api } from "../api/client";
import { PageHeader } from "../components/common/PageHeader";
import { ChartCard } from "../components/dashboard/ChartCard";
import { StatusPill } from "../components/common/StatusPill";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const sub = useQuery({ queryKey: ["sub-status"], queryFn: () => api.getSubscriptionStatus() });
  const risk = useQuery({ queryKey: ["risk-settings"], queryFn: () => api.getRiskSettings() });

  return (
    <>
      <PageHeader title="Settings" description="Configure trading risk, notifications and workspace preferences." />

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard
          to="/risk"
          icon={Shield}
          title="Risk management"
          description="Adjust max open trades, concurrency, and daily loss caps."
          right={risk.data ? <span className="text-xs text-muted-foreground tabular">{risk.data.max_open_trades} trades · {risk.data.max_portfolio_daily_loss}% cap</span> : null}
        />
        <SettingsCard
          to="/notifications"
          icon={Bell}
          title="Notifications"
          description="Manage push subscription and view system events."
          right={<StatusPill tone={sub.data?.active ? "success" : "muted"} dot>{sub.data?.active ? "Active" : "Off"}</StatusPill>}
        />
        <SettingsCard
          to="/profile"
          icon={Sliders}
          title="Account"
          description="Broker connection, environment and balance overview."
        />
      </div>

      <ChartCard title="Workspace" description="Look & feel preferences">
        <div className="grid gap-3 sm:grid-cols-2">
          <Pref label="Theme" value="Dark (locked)" />
          <Pref label="Time zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
          <Pref label="Number format" value="en-US, tabular" />
          <Pref label="Shortcuts" value="⌘K · g d (dashboard) · g t (trades)" />
        </div>
      </ChartCard>
    </>
  );
}

function SettingsCard({ to, icon: Icon, title, description, right }: { to: "/risk" | "/notifications" | "/profile"; icon: React.ElementType; title: string; description: string; right?: React.ReactNode }) {
  return (
    <Link to={to} className="glass group flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-5 transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          {right && <div className="mt-2">{right}</div>}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
    </Link>
  );
}

function Pref({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}