import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Wallet } from "lucide-react";
import { api } from "../api/client";
import { PageHeader } from "../components/common/PageHeader";
import { ChartCard } from "../components/dashboard/ChartCard";
import { PnlValue } from "../components/common/PnlValue";
import { TableSkeleton } from "../components/common/Skeletons";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { fmtCurrency } from "../lib/format";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const auth = useAuth();
  const account = useQuery({ queryKey: ["account"], queryFn: () => api.getAccount() });
  const health = useQuery({ queryKey: ["health"], queryFn: () => api.health() });
  const a = account.data;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Account, broker connection and session."
        actions={<Button variant="outline" size="sm" onClick={auth.logout}><LogOut className="mr-2 h-3.5 w-3.5" /> Log out</Button>}
      />

      <ChartCard title="Identity" description="Trading session details">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-base font-semibold text-primary-foreground">FX</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-foreground">Trader</div>
            <div className="text-xs text-muted-foreground">Account {a?.account_id ?? "—"} · {health.data?.env ?? "—"} env · OANDA {health.data?.oanda_env ?? "—"}</div>
          </div>
        </div>
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Account balance" description="Current funds and exposure">
          {!a ? <TableSkeleton rows={4} /> : (
            <div className="space-y-3">
              <Row label="Balance" value={<span className="text-lg font-semibold tabular text-foreground">{fmtCurrency(a.balance)} <span className="text-xs text-muted-foreground">{a.currency}</span></span>} />
              <Row label="Equity" value={<span className="tabular text-foreground">{fmtCurrency(a.equity)}</span>} />
              <Row label="Margin used" value={<span className="tabular text-foreground">{fmtCurrency(a.margin_used)}</span>} />
              <Row label="Margin available" value={<span className="tabular text-foreground">{fmtCurrency(a.margin_available)}</span>} />
            </div>
          )}
        </ChartCard>

        <ChartCard title="P&L overview" description="Period performance">
          {!a ? <TableSkeleton rows={4} /> : (
            <div className="space-y-3">
              <Row label="Daily" value={<PnlValue value={a.daily_pnl} />} />
              {a.weekly_pnl != null && <Row label="Weekly" value={<PnlValue value={a.weekly_pnl} />} />}
              {a.monthly_pnl != null && <Row label="Monthly" value={<PnlValue value={a.monthly_pnl} />} />}
              <Row label="Open trades" value={<span className="tabular text-foreground">{a.open_trade_count}</span>} />
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}