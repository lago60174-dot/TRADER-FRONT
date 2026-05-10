import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { PageHeader } from "../components/common/PageHeader";
import { StatusPill } from "../components/common/StatusPill";
import { PnlValue } from "../components/common/PnlValue";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { STRATEGIES, STRATEGY_DESCRIPTIONS, STRATEGY_LABELS, SYMBOLS, TIMEFRAMES, fmtCurrency } from "../lib/format";
import type { StrategyName, Timeframe, TradingSignal } from "../types";

export const Route = createFileRoute("/_authenticated/strategies")({
  component: StrategiesPage,
});

function StrategiesPage() {
  const stats = useQuery({ queryKey: ["trade-stats"], queryFn: () => api.getTradeStats() });
  const [signals, setSignals] = useState<Record<string, TradingSignal>>({});
  const [symbol, setSymbol] = useState<string>("EUR_USD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");

  const run = useMutation({
    mutationFn: (strategy: StrategyName) =>
      api.runStrategy({ strategy, symbol, timeframe, auto_execute: false }),
    onSuccess: (sig, strategy) => {
      setSignals((p) => ({ ...p, [strategy]: sig }));
      toast.success(`Signal generated for ${STRATEGY_LABELS[strategy]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Strategies"
        description="Run quantitative strategies and inspect generated signals."
        actions={
          <div className="flex items-center gap-2">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", "/")}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
              <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STRATEGIES.map((s, i) => {
          const stat = stats.data?.per_strategy?.[s];
          const sig = signals[s];
          return (
            <motion.div
              key={s}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass group flex flex-col rounded-2xl border border-border/60 bg-card/60 p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{STRATEGY_LABELS[s]}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{STRATEGY_DESCRIPTIONS[s]}</p>
                </div>
                <Sparkles className="h-4 w-4 text-primary/60" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border border-border/50 p-2">
                  <div className="text-muted-foreground">Trades</div>
                  <div className="mt-1 text-base font-semibold tabular text-foreground">{stat?.trades ?? 0}</div>
                </div>
                <div className="rounded-lg border border-border/50 p-2">
                  <div className="text-muted-foreground">Win rate</div>
                  <div className="mt-1 text-base font-semibold tabular text-foreground">{(stat?.win_rate ?? 0).toFixed(0)}%</div>
                </div>
                <div className="rounded-lg border border-border/50 p-2">
                  <div className="text-muted-foreground">Total P&L</div>
                  <div className="mt-1 text-base font-semibold tabular"><PnlValue value={stat?.total_pnl} className="text-base" /></div>
                </div>
              </div>

              {sig && (
                <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <StatusPill tone={sig.signal === "BUY" ? "success" : sig.signal === "SELL" ? "destructive" : "muted"}>{sig.signal}</StatusPill>
                    <span className="text-muted-foreground">{sig.symbol} · {sig.timeframe}</span>
                  </div>
                  {sig.entry_price != null && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground tabular">
                      <div>Entry<div className="text-foreground">{sig.entry_price?.toFixed(5)}</div></div>
                      <div>SL<div className="text-foreground">{sig.stop_loss?.toFixed(5)}</div></div>
                      <div>TP<div className="text-foreground">{sig.take_profit?.toFixed(5)}</div></div>
                    </div>
                  )}
                  <p className="mt-2 line-clamp-2 text-muted-foreground">{sig.reasoning}</p>
                  {sig.risk_amount != null && <div className="mt-1 text-[11px] text-muted-foreground">Risk {fmtCurrency(sig.risk_amount)}</div>}
                </div>
              )}

              <Button onClick={() => run.mutate(s)} disabled={run.isPending} className="mt-auto pt-2 sm:mt-5" size="sm">
                <Play className="mr-2 h-3.5 w-3.5" /> Run strategy
              </Button>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}