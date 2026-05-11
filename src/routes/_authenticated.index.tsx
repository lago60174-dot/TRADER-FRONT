import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Target, Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { fmtCurrency, fmtPnl, fmtDate, fmtSymbol, STRATEGY_LABELS } from "../lib/format";
import { KpiCard } from "../components/dashboard/KpiCard";
import { ChartCard } from "../components/dashboard/ChartCard";
import { CandleChart } from "../components/dashboard/CandleChart";
import { KpiSkeleton, TableSkeleton } from "../components/common/Skeletons";
import { PageHeader } from "../components/common/PageHeader";
import { StatusPill } from "../components/common/StatusPill";
import { PnlValue } from "../components/common/PnlValue";
import { EmptyState } from "../components/common/EmptyState";
import { Progress } from "../components/ui/progress";
import type { TradeRecord } from "../types";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function EquityCurve({ trades, start }: { trades: TradeRecord[]; start: number }) {
  const closed = trades.filter((t) => t.status === "CLOSED" && t.closed_at)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());
  let r = start;
  const data = [{ t: "Start", equity: start }, ...closed.map((trade) => {
    r += trade.pnl ?? 0;
    return { t: new Date(trade.closed_at!).toLocaleDateString("en-US", { month: "short", day: "2-digit" }), equity: Number(r.toFixed(2)) };
  })];
  if (data.length < 2) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Not enough closed trades yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
        <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [fmtCurrency(v), "Equity"]} />
        <Area type="monotone" dataKey="equity" stroke="var(--color-primary)" strokeWidth={2} fill="url(#eq)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DailyPnl({ trades }: { trades: TradeRecord[] }) {
  const byDay = new Map<string, number>();
  trades.filter((t) => t.status === "CLOSED" && t.closed_at).forEach((t) => {
    const k = new Date(t.closed_at!).toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + (t.pnl ?? 0));
  });
  const data = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14)
    .map(([k, v]) => ({ day: new Date(k).toLocaleDateString("en-US", { month: "short", day: "2-digit" }), pnl: Number(v.toFixed(2)) }));
  if (!data.length) return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No closed trades yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => `$${v}`} />
        <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [fmtPnl(v), "P&L"]} />
        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (<Cell key={i} fill={d.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardPage() {
  const account = useQuery({ queryKey: ["account"], queryFn: () => api.getAccount(), refetchInterval: 30_000 });
  const stats = useQuery({ queryKey: ["trade-stats"], queryFn: () => api.getTradeStats(), refetchInterval: 60_000 });
  const history = useQuery({ queryKey: ["trade-history"], queryFn: () => api.getTradeHistory(200), refetchInterval: 60_000 });
  const risk = useQuery({ queryKey: ["risk"], queryFn: () => api.getRiskStatus(), refetchInterval: 30_000 });

  const a = account.data;
  const startEquity = a ? a.balance - (stats.data?.total_pnl ?? 0) : 10000;
  const recent = [...(history.data ?? [])].sort((x, y) => new Date(y.opened_at).getTime() - new Date(x.opened_at).getTime()).slice(0, 6);
  const lossPct = risk.data ? Math.min(100, (Math.abs(risk.data.portfolio_daily_loss) / (risk.data.portfolio_daily_loss_limit || 1)) * 100) : 0;
  const open = useQuery({ queryKey: ["open-trades"], queryFn: () => api.getOpenTrades(), refetchInterval: 30_000 });
  const allTrades = [...(open.data ?? []), ...(history.data ?? [])];

  return (
    <>
      <PageHeader
        title="Trading Dashboard"
        description="Real-time overview of your account, strategies and risk exposure."
        actions={<StatusPill tone={risk.data?.trading_allowed ? "success" : "destructive"} dot>{risk.data?.trading_allowed ? "Trading enabled" : "Trading paused"}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!a ? (<><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>) : (
          <>
            <KpiCard index={0} icon={Wallet} tone="primary" label="Equity" value={fmtCurrency(a.equity)} hint={<>Balance {fmtCurrency(a.balance)}</>} />
            <KpiCard index={1} icon={TrendingUp} tone={a.daily_pnl >= 0 ? "success" : "destructive"} label="Daily P&L" value={<PnlValue value={a.daily_pnl} />} hint={<PnlValue value={a.daily_pnl_percent} variant="percent" />} />
            <KpiCard index={2} icon={Target} tone="success" label="Win Rate" value={`${(stats.data?.win_rate ?? 0).toFixed(1)}%`} hint={`${stats.data?.wins ?? 0}W · ${stats.data?.losses ?? 0}L`} />
            <KpiCard index={3} icon={Activity} label="Open Trades" value={`${a.open_trade_count}`} hint={`Margin ${fmtCurrency(a.margin_used)}`} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Equity Curve" description="Cumulative P&L since first closed trade" className="lg:col-span-2">
          {history.isLoading ? <TableSkeleton rows={6} /> : <EquityCurve trades={history.data ?? []} start={startEquity} />}
        </ChartCard>
        <ChartCard title="Risk Exposure" description="Daily portfolio loss budget">
          {!risk.data ? <TableSkeleton rows={4} /> : (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Loss used</span><span className="tabular text-foreground">{lossPct.toFixed(0)}%</span></div>
                <Progress value={lossPct} className="h-2" />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular"><span>${Math.abs(risk.data.portfolio_daily_loss).toFixed(0)} used</span><span>${risk.data.portfolio_daily_loss_limit.toFixed(0)} cap</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border/60 p-3"><div className="text-muted-foreground">Open trades</div><div className="mt-1 text-lg font-semibold tabular text-foreground">{risk.data.open_trades}<span className="text-xs font-normal text-muted-foreground"> / {risk.data.max_open_trades}</span></div></div>
                <div className="rounded-xl border border-border/60 p-3"><div className="text-muted-foreground">Strategies</div><div className="mt-1 text-lg font-semibold tabular text-foreground">{risk.data.active_strategies}<span className="text-xs font-normal text-muted-foreground"> / {risk.data.max_concurrent_strategies}</span></div></div>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Daily P&L" description="Last 14 trading days">
        {history.isLoading ? <TableSkeleton rows={4} /> : <DailyPnl trades={history.data ?? []} />}
      </ChartCard>

      <ChartCard title="Bot activity" description="Candlestick view with bot entries (▲ BUY / ▼ SELL · SL/TP marks)">
        {history.isLoading ? <TableSkeleton rows={6} /> : (
          <CandleChart trades={allTrades} />
        )}
      </ChartCard>

      <ChartCard title="Recent Activity" description="Latest opened or closed trades">
        {history.isLoading ? <TableSkeleton rows={5} /> : !recent.length ? (
          <EmptyState icon={Activity} title="No trades yet" description="Trades will appear here as your strategies run." />
        ) : (
          <div className="divide-y divide-border/60">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={"flex h-8 w-8 items-center justify-center rounded-lg " + (t.direction === "BUY" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                    {t.direction === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{fmtSymbol(t.symbol)}</div>
                    <div className="text-xs text-muted-foreground">{t.strategy ? STRATEGY_LABELS[t.strategy] : "—"} · {fmtDate(t.opened_at)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <PnlValue value={t.pnl} className="text-sm" />
                  <div className="text-xs text-muted-foreground">{t.lot_size} lots</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </>
  );
}
