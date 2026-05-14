import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import {
  Wallet, TrendingUp, Target, Activity,
  ArrowDownRight, ArrowUpRight, ChevronRight,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api/client";
import { fmtCurrency, fmtPnl, fmtDate, fmtSymbol, STRATEGY_LABELS } from "../lib/format";
import { KpiCard } from "../components/dashboard/KpiCard";
import { ChartCard } from "../components/dashboard/ChartCard";
import { CandleChart } from "../components/dashboard/CandleChart";
import { BotControlPanel } from "../components/dashboard/BotControlPanel";
import { LiveLogTerminal, type LogEntry } from "../components/dashboard/LiveLogTerminal";
import { KpiSkeleton, TableSkeleton } from "../components/common/Skeletons";
import { StatusPill } from "../components/common/StatusPill";
import { PnlValue } from "../components/common/PnlValue";
import { EmptyState } from "../components/common/EmptyState";
import { Progress } from "../components/ui/progress";
import { useWebSocket } from "../hooks/useWebSocket";
import type { TradeRecord } from "../types";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

// ── Sub-charts (unchanged from original) ─────────────────────────────────────

function EquityCurve({ trades, start }: { trades: TradeRecord[]; start: number }) {
  const closed = trades
    .filter((t) => t.status === "CLOSED" && t.closed_at)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());

  let equity = start;
  const data = [
    { t: "Start", equity: start },
    ...closed.map((trade) => {
      equity += trade.pnl ?? 0;
      return {
        t: new Date(trade.closed_at!).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
        equity: Number(equity.toFixed(2)),
      };
    }),
  ];

  if (data.length < 2) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">No closed trades yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="t" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={65}
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, fontSize: 12, color: "white" }}
          formatter={(v: number) => [fmtCurrency(v), "Equity"]} />
        <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={3} fill="url(#eq)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DailyPnl({ trades }: { trades: TradeRecord[] }) {
  const byDay = new Map<string, number>();
  trades.filter((t) => t.status === "CLOSED" && t.closed_at).forEach((t) => {
    const key = new Date(t.closed_at!).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + (t.pnl ?? 0));
  });
  const data = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([k, v]) => ({
    day: new Date(k).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    pnl: Number(v.toFixed(2)),
  }));

  if (!data.length) return <div className="flex h-48 items-center justify-center text-sm text-slate-500">No closed trades yet.</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, fontSize: 12, color: "white" }}
          formatter={(v: number) => [fmtPnl(v), "P&L"]} />
        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#ef4444"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

function DashboardPage() {
  const qc = useQueryClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    const id = String(++logIdRef.current);
    setLogs((prev) => [...prev.slice(-199), { id, ts: new Date().toISOString(), level, message }]);
  }, []);

  const token = typeof window !== "undefined" ? localStorage.getItem("fx_token") : null;

  const { connected, latency } = useWebSocket({
    token,
    enabled: !!token,
    onMessage: useCallback((msg) => {
      switch (msg.type) {
        case "trade_opened":
          addLog("SUCCESS", `🟢 Trade opened: ${(msg.data as {symbol?:string;direction?:string}).direction ?? ""} ${(msg.data as {symbol?:string}).symbol ?? ""}`);
          qc.invalidateQueries({ queryKey: ["trades-open"] });
          qc.invalidateQueries({ queryKey: ["account"] });
          qc.invalidateQueries({ queryKey: ["risk"] });
          break;
        case "trade_closed":
          addLog("INFO", `✅ Trade closed: ${(msg.data as {symbol?:string}).symbol ?? ""} PnL ${(msg.data as {pnl?:number}).pnl ?? "?"}`);
          qc.invalidateQueries({ queryKey: ["trades-open"] });
          qc.invalidateQueries({ queryKey: ["trade-history"] });
          qc.invalidateQueries({ queryKey: ["account"] });
          qc.invalidateQueries({ queryKey: ["risk"] });
          qc.invalidateQueries({ queryKey: ["trade-stats"] });
          break;
        case "pnl_update":
          qc.invalidateQueries({ queryKey: ["trades-open"] });
          qc.invalidateQueries({ queryKey: ["account"] });
          break;
        case "account_update":
          qc.invalidateQueries({ queryKey: ["account"] });
          break;
        case "open_trades":
          qc.invalidateQueries({ queryKey: ["trades-open"] });
          break;
        case "risk_update":
          qc.invalidateQueries({ queryKey: ["risk"] });
          qc.invalidateQueries({ queryKey: ["drawdown"] });
          break;
        case "recent_signals":
          qc.invalidateQueries({ queryKey: ["trade-stats"] });
          break;
        case "log":
          addLog(
            (msg.data.level?.toString().toUpperCase() as LogEntry["level"]) ?? "INFO",
            msg.data.message?.toString() ?? ""
          );
          break;
        case "bot_state":
          if ((msg.data as {running?:boolean}).running === false) addLog("WARNING", "Bot state changed: stopped");
          break;
        case "notification":
          addLog("INFO", `[Notification] ${(msg.data as {title?:string}).title ?? ""}: ${(msg.data as {body?:string}).body ?? ""}`);
          break;
      }
    }, [addLog, qc]),
  });

  const account = useQuery({ queryKey: ["account"], queryFn: () => api.getAccount(), refetchInterval: 10_000 });
  const stats = useQuery({ queryKey: ["trade-stats"], queryFn: () => api.getTradeStats(), refetchInterval: 30_000 });
  const history = useQuery({ queryKey: ["trade-history"], queryFn: () => api.getTradeHistory(200), refetchInterval: 30_000 });
  const openTrades = useQuery({ queryKey: ["trades-open"], queryFn: () => api.getOpenTrades(), refetchInterval: 10_000 });
  const risk = useQuery({ queryKey: ["risk"], queryFn: () => api.getRiskStatus(), refetchInterval: 15_000 });

  const a = account.data;
  const startEquity = a ? a.balance - (stats.data?.total_pnl ?? 0) : 10000;

  const recent = [...(history.data ?? [])]
    .sort((x, y) => new Date(y.opened_at).getTime() - new Date(x.opened_at).getTime())
    .slice(0, 5);

  const lossPct = risk.data
    ? Math.min(100, (Math.abs(risk.data.portfolio_daily_loss) / (risk.data.portfolio_daily_loss_limit || 1)) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* TOP STATUS BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Trading Desk</h1>
          <p className="text-xs text-slate-500 mt-0.5">Institutional-grade automated forex terminal</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={connected ? "success" : "muted"} dot>
            {connected ? "WS Live" : "WS Offline"}
          </StatusPill>
          <StatusPill tone={risk.data?.trading_allowed ? "success" : "destructive"} dot>
            {risk.data?.trading_allowed ? "Trading Enabled" : "Trading Paused"}
          </StatusPill>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {!a ? (
          <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
        ) : (
          <>
            <KpiCard index={0} icon={Wallet} tone="primary" label="Equity" value={fmtCurrency(a.equity)}
              hint={`Balance ${fmtCurrency(a.balance)}`} />
            <KpiCard index={1} icon={TrendingUp} tone={a.daily_pnl >= 0 ? "success" : "destructive"}
              label="Daily P&L" value={<PnlValue value={a.daily_pnl} />}
              hint={<PnlValue value={a.daily_pnl_percent} variant="percent" />} />
            <KpiCard index={2} icon={Target} tone="success" label="Win Rate"
              value={`${(stats.data?.win_rate ?? 0).toFixed(1)}%`}
              hint={`${stats.data?.wins ?? 0}W · ${stats.data?.losses ?? 0}L`} />
            <KpiCard index={3} icon={Activity} label="Open Trades"
              value={`${a.open_trade_count}`} hint={`Margin ${fmtCurrency(a.margin_used)}`} />
          </>
        )}
      </div>

      {/* MAIN LAYOUT: chart + right panel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
        {/* LEFT: chart */}
        <div className="space-y-4 min-w-0">
          <CandleChart trades={openTrades.data ?? []} />

          {/* Open Positions inline below chart */}
          {(openTrades.data?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#07101d]/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Open Positions</span>
                <span className="text-xs text-slate-500">{openTrades.data?.length} active</span>
              </div>
              <div className="space-y-2">
                  {openTrades.data?.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/2 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.direction === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {t.direction === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{fmtSymbol(t.symbol)}</div>
                        <div className="text-xs text-slate-500">
                          {t.strategy ? STRATEGY_LABELS[t.strategy] : "—"} · {t.timeframe ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-[10px] text-slate-600 mb-0.5">Entry</div>
                        <div className="text-xs font-mono text-slate-300">{t.entry_price.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 mb-0.5">SL (trailing)</div>
                        <div className="text-xs font-mono text-red-400">{t.stop_loss.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 mb-0.5">TP</div>
                        <div className="text-xs font-mono text-emerald-400">{t.take_profit.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 mb-0.5">Unrealized</div>
                        <PnlValue value={t.pnl} className="text-sm font-bold min-w-[64px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equity + Daily PnL */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Equity Curve" description="Portfolio growth from closed trades"
              className="border border-white/10 bg-[#07101d]/70">
              {history.isLoading ? <TableSkeleton rows={5} /> : <EquityCurve trades={history.data ?? []} start={startEquity} />}
            </ChartCard>
            <ChartCard title="Daily P&L" description="Last 14 sessions"
              className="border border-white/10 bg-[#07101d]/70">
              {history.isLoading ? <TableSkeleton rows={4} /> : <DailyPnl trades={history.data ?? []} />}
            </ChartCard>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          {/* Bot Control */}
          <div className="rounded-2xl border border-white/10 bg-[#07101d]/70 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">Bot Control</span>
            </div>
            <BotControlPanel connected={connected} latency={latency} />
          </div>

          {/* Risk Exposure */}
          {risk.data && (
            <div className="rounded-2xl border border-white/10 bg-[#07101d]/70 p-4 space-y-3">
              <span className="text-sm font-semibold text-white">Risk Exposure</span>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Daily loss</span>
                  <span>{lossPct.toFixed(0)}%</span>
                </div>
                <Progress value={lossPct} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <div className="text-slate-500 mb-1">Open / Max</div>
                  <div className="font-bold text-white">{risk.data.open_trades} / {risk.data.max_open_trades}</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <div className="text-slate-500 mb-1">Strategies</div>
                  <div className="font-bold text-white">{risk.data.active_strategies} / {risk.data.max_concurrent_strategies}</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="rounded-2xl border border-white/10 bg-[#07101d]/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Recent Trades</span>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </div>
            {!recent.length ? (
              <EmptyState icon={Activity} title="No trades yet" description="Strategies will appear here." />
            ) : (
              <div className="space-y-2">
                {recent.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/2 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.direction === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {t.direction === "BUY" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{fmtSymbol(t.symbol)}</div>
                        <div className="text-[10px] text-slate-600">{fmtDate(t.opened_at)}</div>
                      </div>
                    </div>
                    <PnlValue value={t.pnl} className="text-xs" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Live Log Terminal */}
      <LiveLogTerminal logs={logs} onClear={() => setLogs([])} />
    </div>
  );
}
