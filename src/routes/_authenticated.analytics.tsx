import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { PageHeader } from "../components/common/PageHeader";
import { ChartCard } from "../components/dashboard/ChartCard";
import { TableSkeleton } from "../components/common/Skeletons";
import { fmtCurrency, fmtPnl, STRATEGY_LABELS } from "../lib/format";
import type { StrategyName, TradeRecord } from "../types";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AnalyticsPage() {
  const history = useQuery({ queryKey: ["trade-history-500"], queryFn: () => api.getTradeHistory(500), refetchInterval: 60_000 });
  const stats = useQuery({ queryKey: ["trade-stats"], queryFn: () => api.getTradeStats(), refetchInterval: 60_000 });

  const closed = useMemo(
    () => (history.data ?? []).filter((t) => t.status === "CLOSED" && t.closed_at),
    [history.data],
  );

  const cumByStrat = useMemo(() => buildCumulative(closed), [closed]);
  const distribution = useMemo(() => buildDistribution(closed), [closed]);
  const heatmap = useMemo(() => buildHeatmap(closed), [closed]);

  const strategyBars = stats.data
    ? (Object.entries(stats.data.per_strategy) as [StrategyName, typeof stats.data.per_strategy[StrategyName]][]).map(([k, v]) => ({ name: STRATEGY_LABELS[k], pnl: v.total_pnl }))
    : [];

  return (
    <>
      <PageHeader title="Analytics" description="Performance attribution & trade distribution analysis." />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cumulative P&L by strategy" description="Equity progression over closed trades">
          {history.isLoading ? <TableSkeleton rows={5} /> : cumByStrat.data.length < 2 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Not enough closed trades.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumByStrat.data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="i" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                {cumByStrat.keys.map((k, i) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={["var(--color-primary)", "var(--color-success)", "var(--color-accent)"][i % 3]} strokeWidth={2} dot={false} name={STRATEGY_LABELS[k as StrategyName] ?? k} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="P&L distribution" description="Buckets of trade outcomes">
          {history.isLoading ? <TableSkeleton rows={5} /> : !distribution.length ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distribution} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="bucket" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [v, "Trades"]} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distribution.map((d, i) => (<Cell key={i} fill={d.mid >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="P&L heatmap" description="Average daily P&L by weekday and hour">
        {history.isLoading ? <TableSkeleton rows={5} /> : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-[60px_repeat(24,minmax(0,1fr))] gap-1 text-[10px]">
              <div />
              {Array.from({ length: 24 }).map((_, h) => <div key={h} className="text-center text-muted-foreground">{h}</div>)}
              {DAYS.map((d, di) => (
                <Fragment key={d}>
                  <div className="flex items-center text-muted-foreground">{d}</div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const v = heatmap[di][h];
                    const max = 200;
                    const intensity = Math.min(1, Math.abs(v) / max);
                    const bg = v === 0 ? "var(--color-muted)" : v > 0
                      ? `color-mix(in oklab, var(--color-success) ${15 + intensity * 65}%, transparent)`
                      : `color-mix(in oklab, var(--color-destructive) ${15 + intensity * 65}%, transparent)`;
                    return <div key={h} title={fmtPnl(v)} className="aspect-square rounded-sm" style={{ background: bg }} />;
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard title="P&L by strategy" description="Total profit attribution">
        {stats.isLoading ? <TableSkeleton rows={3} /> : !strategyBars.length ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No data.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={strategyBars} layout="vertical" margin={{ left: 24, right: 24, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} width={120} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => fmtCurrency(v)} />
              <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>
                {strategyBars.map((d, i) => (<Cell key={i} fill={d.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}

function buildCumulative(trades: TradeRecord[]) {
  const sorted = [...trades].sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());
  const sums: Record<string, number> = {};
  const data = sorted.map((t, i) => {
    const k = t.strategy ?? "OTHER";
    sums[k] = (sums[k] ?? 0) + (t.pnl ?? 0);
    return { i: i + 1, ...sums };
  });
  const keys = [...new Set(sorted.map((t) => t.strategy ?? "OTHER"))];
  return { data, keys };
}

function buildDistribution(trades: TradeRecord[]) {
  if (!trades.length) return [];
  const buckets = [-500, -200, -100, -50, -20, 0, 20, 50, 100, 200, 500];
  return buckets.slice(0, -1).map((lo, i) => {
    const hi = buckets[i + 1];
    const count = trades.filter((t) => (t.pnl ?? 0) >= lo && (t.pnl ?? 0) < hi).length;
    return { bucket: `${lo}/${hi}`, mid: (lo + hi) / 2, count };
  });
}

function buildHeatmap(trades: TradeRecord[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  trades.forEach((t) => {
    const d = new Date(t.closed_at!);
    grid[d.getDay()][d.getHours()] += t.pnl ?? 0;
  });
  return grid;
}
