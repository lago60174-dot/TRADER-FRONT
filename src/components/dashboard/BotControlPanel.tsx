import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Play, Square, Zap, Pause, RotateCcw, AlertTriangle,
  Wifi, WifiOff, Clock, Activity, TrendingUp, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../api/client";
import { fmtCurrency } from "../../lib/format";

interface BotControlPanelProps {
  connected: boolean;
  latency: number | null;
}

export function BotControlPanel({ connected, latency }: BotControlPanelProps) {
  const [killConfirm, setKillConfirm] = useState(false);
  const qc = useQueryClient();

  const killSwitch = useQuery({
    queryKey: ["kill-switch"],
    queryFn: () => api.getKillSwitchStatus(),
    refetchInterval: 15_000,
  });

  const risk = useQuery({
    queryKey: ["risk"],
    queryFn: () => api.getRiskStatus(),
    refetchInterval: 20_000,
  });

  const drawdown = useQuery({
    queryKey: ["drawdown"],
    queryFn: () => api.getDrawdown(),
    refetchInterval: 30_000,
  });

  const stats = useQuery({
    queryKey: ["trade-stats"],
    queryFn: () => api.getTradeStats(),
    refetchInterval: 60_000,
  });

  const stratStatus = useQuery({
    queryKey: ["strategy-status"],
    queryFn: () => api.getStrategyStatus(),
    refetchInterval: 30_000,
  });

  const engage = useMutation({
    mutationFn: () => api.engageKillSwitch("manual"),
    onSuccess: () => {
      toast.warning("Kill switch engaged — trading paused");
      qc.invalidateQueries({ queryKey: ["kill-switch"] });
      qc.invalidateQueries({ queryKey: ["risk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disengage = useMutation({
    mutationFn: () => api.disengageKillSwitch(),
    onSuccess: () => {
      toast.success("Trading resumed");
      qc.invalidateQueries({ queryKey: ["kill-switch"] });
      qc.invalidateQueries({ queryKey: ["risk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isKilled = killSwitch.data?.engaged ?? false;
  const tradingAllowed = risk.data?.trading_allowed ?? false;

  const winRate = stats.data?.win_rate ?? 0;
  const ddPct = drawdown.data?.drawdown_pct ?? 0;
  const openTrades = risk.data?.open_trades ?? 0;
  const activeStrategies = risk.data?.active_strategies ?? 0;

  const strategies = stratStatus.data
    ? (stratStatus.data as Record<string, Record<string, unknown>>).strategies
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* STATUS HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${tradingAllowed && !isKilled ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${tradingAllowed && !isKilled ? "text-emerald-400" : "text-red-400"}`}>
            {isKilled ? "PAUSED" : tradingAllowed ? "LIVE" : "BLOCKED"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {connected ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <Wifi className="h-3 w-3" /> {latency !== null ? `${latency}ms` : "WS"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500">
              <WifiOff className="h-3 w-3" /> offline
            </span>
          )}
        </div>
      </div>

      {/* CONTROL BUTTONS */}
      <div className="grid grid-cols-2 gap-2">
        {isKilled ? (
          <button
            onClick={() => disengage.mutate()}
            disabled={disengage.isPending}
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/25 transition disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Resume Trading
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                if (!killConfirm) { setKillConfirm(true); setTimeout(() => setKillConfirm(false), 3000); return; }
                engage.mutate();
                setKillConfirm(false);
              }}
              disabled={engage.isPending}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                killConfirm
                  ? "bg-red-500/30 border-red-500/60 text-red-300 animate-pulse"
                  : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              }`}
            >
              {killConfirm ? <AlertTriangle className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {killConfirm ? "Confirm?" : "Kill Switch"}
            </button>

            <button
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition"
              onClick={() => toast.info("Scheduler controlled via backend")}
            >
              <Pause className="h-4 w-4" />
              Pause Auto
            </button>
          </>
        )}
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Open Trades"
          value={`${openTrades} / ${risk.data?.max_open_trades ?? "—"}`}
          color="text-blue-400"
        />
        <MetricTile
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Strategies"
          value={`${activeStrategies} / ${risk.data?.max_concurrent_strategies ?? "—"}`}
          color="text-purple-400"
        />
        <MetricTile
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          color={winRate >= 50 ? "text-emerald-400" : "text-yellow-400"}
        />
        <MetricTile
          icon={<Shield className="h-3.5 w-3.5" />}
          label="Drawdown"
          value={`${ddPct.toFixed(2)}%`}
          color={ddPct < 5 ? "text-emerald-400" : ddPct < 10 ? "text-yellow-400" : "text-red-400"}
        />
      </div>

      {/* DAILY RISK */}
      {risk.data && (
        <div className="rounded-xl border border-white/8 bg-white/3 p-3">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 uppercase tracking-wider">Daily Risk Used</span>
            <span className="font-mono text-slate-300">
              {fmtCurrency(Math.abs(risk.data.portfolio_daily_loss))} / {fmtCurrency(risk.data.portfolio_daily_loss_limit)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (Math.abs(risk.data.portfolio_daily_loss) / (risk.data.portfolio_daily_loss_limit || 1)) * 100)}%`,
                background: ddPct < 5 ? "#22c55e" : ddPct < 10 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </div>
      )}

      {/* STRATEGY STATUS */}
      {strategies && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-600 px-1">Active Strategies</div>
          {Object.entries(strategies as Record<string, Record<string, unknown>>).map(([name, s]) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-white/6 bg-white/2 px-3 py-2">
              <div>
                <div className="text-[11px] font-medium text-slate-300">{name.replace(/_/g, " ")}</div>
                <div className="text-[10px] text-slate-600">
                  {String(s.open_trades ?? 0)} trades · {String(s.timeframe ?? "")}
                </div>
              </div>
              <div className={`text-xs font-mono font-semibold ${Number(s.daily_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {Number(s.daily_pnl ?? 0) >= 0 ? "+" : ""}{Number(s.daily_pnl ?? 0).toFixed(0)}$
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SCHEDULER */}
      <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-[11px] text-slate-500">Scheduler</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400">Running</span>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
      <div className={`flex items-center gap-1.5 mb-1.5 ${color}`}>{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
