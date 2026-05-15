import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Shield, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { PageHeader } from "../components/common/PageHeader";
import { ChartCard } from "../components/dashboard/ChartCard";
import { StatusPill } from "../components/common/StatusPill";
import { TableSkeleton } from "../components/common/Skeletons";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { fmtCurrency, STRATEGY_LABELS } from "../lib/format";
import type { RiskSettingsUpdate, StrategyName } from "../types";

export const Route = createFileRoute("/_authenticated/risk")({
  component: RiskPage,
});

function RiskPage() {
  const status = useQuery({ queryKey: ["risk"], queryFn: () => api.getRiskStatus(), refetchInterval: 15_000 });
  const settings = useQuery({ queryKey: ["risk-settings"], queryFn: () => api.getRiskSettings(), refetchInterval: 60_000 });
  const qc = useQueryClient();

  const [form, setForm] = useState<RiskSettingsUpdate>({});
  useEffect(() => {
    if (settings.data) setForm({
      max_concurrent_strategies: settings.data.max_concurrent_strategies,
      max_open_trades: settings.data.max_open_trades,
      max_portfolio_daily_loss: settings.data.max_portfolio_daily_loss,
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => api.updateRiskSettings(form),
    onSuccess: () => {
      toast.success("Risk settings updated");
      qc.invalidateQueries({ queryKey: ["risk-settings"] });
      qc.invalidateQueries({ queryKey: ["risk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = status.data;
  const lossPct = s ? Math.min(100, (Math.abs(s.portfolio_daily_loss) / (s.portfolio_daily_loss_limit || 1)) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Risk Management"
        description="Portfolio exposure and per-strategy risk caps."
        actions={s && <StatusPill tone={s.trading_allowed ? "success" : "destructive"} dot>{s.trading_allowed ? "Trading allowed" : s.reason ?? "Trading paused"}</StatusPill>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Portfolio loss" description="Daily loss budget consumption" className="lg:col-span-2">
          {!s ? <TableSkeleton rows={3} /> : (
            <div className="space-y-4">
              <Progress value={lossPct} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground tabular">
                <span>{fmtCurrency(Math.abs(s.portfolio_daily_loss))} used</span>
                <span>{fmtCurrency(s.portfolio_daily_loss_remaining)} remaining</span>
                <span>cap {fmtCurrency(s.portfolio_daily_loss_limit)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Stat label="Open trades" value={`${s.open_trades} / ${s.max_open_trades}`} />
                <Stat label="Active strategies" value={`${s.active_strategies} / ${s.max_concurrent_strategies}`} />
                <Stat label="Loss used" value={`${lossPct.toFixed(0)}%`} />
                <Stat label="Status" value={s.trading_allowed ? "OK" : "PAUSED"} />
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Settings" description="Global portfolio limits">
          <div className="space-y-3">
            <Field label="Max concurrent strategies" value={form.max_concurrent_strategies} onChange={(v) => setForm({ ...form, max_concurrent_strategies: v })} />
            <Field label="Max open trades" value={form.max_open_trades} onChange={(v) => setForm({ ...form, max_open_trades: v })} />
            <Field label="Max daily loss (%)" value={form.max_portfolio_daily_loss} step="0.1" onChange={(v) => setForm({ ...form, max_portfolio_daily_loss: v })} />
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full" size="sm">
              <Save className="mr-2 h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Per-strategy risk" description="Daily loss usage by strategy">
        {!s ? <TableSkeleton rows={3} /> : (
          <div className="space-y-3">
            {(Object.entries(s.per_strategy) as [StrategyName, typeof s.per_strategy[StrategyName]][]).map(([k, v]) => {
              const pct = Math.min(100, (Math.abs(v.daily_pnl) / (v.daily_loss_limit || 1)) * 100);
              return (
                <div key={k} className="rounded-xl border border-border/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{STRATEGY_LABELS[k]}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular">{v.open_trades} open · risk {v.risk_percent}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular">
                    <span>{fmtCurrency(v.daily_pnl)} P&L</span>
                    <span>cap {fmtCurrency(v.daily_loss_limit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold tabular text-foreground">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: number | undefined; onChange: (v: number) => void; step?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" step={step ?? "1"} value={value ?? ""} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-9" />
    </div>
  );
}
