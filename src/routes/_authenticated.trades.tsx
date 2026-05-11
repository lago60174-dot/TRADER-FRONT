import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { fmtCurrency, fmtDate, fmtSymbol, STRATEGY_LABELS } from "../lib/format";
import { PageHeader } from "../components/common/PageHeader";
import { PnlValue } from "../components/common/PnlValue";
import { StatusPill } from "../components/common/StatusPill";
import { EmptyState } from "../components/common/EmptyState";
import { TableSkeleton } from "../components/common/Skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ChartCard } from "../components/dashboard/ChartCard";
import { CandleChart } from "../components/dashboard/CandleChart";
import type { TradeRecord } from "../types";

export const Route = createFileRoute("/_authenticated/trades")({
  component: TradesPage,
});

function TradesPage() {
  const [tab, setTab] = useState<"open" | "history">("open");
  const [q, setQ] = useState("");

  const open = useQuery({ queryKey: ["trades-open"], queryFn: () => api.getOpenTrades(), refetchInterval: 15_000 });
  const history = useQuery({ queryKey: ["trade-history", 200], queryFn: () => api.getTradeHistory(200) });

  const allTrades = [...(open.data ?? []), ...(history.data ?? [])];

  const filter = (rows: TradeRecord[] | undefined) =>
    (rows ?? []).filter((r) =>
      !q || r.symbol.toLowerCase().includes(q.toLowerCase()) || (r.strategy ?? "").toLowerCase().includes(q.toLowerCase()),
    );

  return (
    <>
      <PageHeader
        title="Trades"
        description="Live positions and historical executions."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol or strategy" className="h-9 w-56 pl-8" />
          </div>
        }
      />

      <ChartCard
        title="Live market chart"
        description="Real OANDA candles when connected · bot entries shown as ▲ BUY / ▼ SELL with SL & TP marks."
        className="mb-4"
      >
        <CandleChart trades={allTrades} />
      </ChartCard>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "open" | "history")}>
        <TabsList>
          <TabsTrigger value="open">Open <span className="ml-1.5 rounded bg-muted/60 px-1.5 text-[10px]">{open.data?.length ?? 0}</span></TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <div className="glass rounded-2xl border border-border/60 bg-card/60 p-2">
            {open.isLoading ? <TableSkeleton /> : <TradesTable rows={filter(open.data)} kind="open" />}
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <div className="glass rounded-2xl border border-border/60 bg-card/60 p-2">
            {history.isLoading ? <TableSkeleton /> : <TradesTable rows={filter(history.data)} kind="history" />}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function TradesTable({ rows, kind }: { rows: TradeRecord[]; kind: "open" | "history" }) {
  const qc = useQueryClient();
  const close = useMutation({
    mutationFn: (id: string) => api.closeTrade({ trade_id: id, reason: "manual" }),
    onSuccess: () => {
      toast.success("Trade closed");
      qc.invalidateQueries({ queryKey: ["trades-open"] });
      qc.invalidateQueries({ queryKey: ["trade-history", 200] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!rows.length) return <EmptyState title={kind === "open" ? "No open trades" : "No history yet"} description="Trades will appear here once your strategies execute." />;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/60 hover:bg-transparent">
          <TableHead>Symbol</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="hidden md:table-cell">Strategy</TableHead>
          <TableHead className="text-right">Entry</TableHead>
          <TableHead className="hidden sm:table-cell text-right">SL / TP</TableHead>
          <TableHead className="text-right">Lots</TableHead>
          <TableHead className="text-right">P&L</TableHead>
          <TableHead className="hidden lg:table-cell">Opened</TableHead>
          <TableHead className="text-right">{kind === "open" ? "" : "Status"}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id} className="border-border/40">
            <TableCell className="font-medium">{fmtSymbol(t.symbol)}</TableCell>
            <TableCell>
              <span className={"inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium " + (t.direction === "BUY" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                {t.direction === "BUY" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {t.direction}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{t.strategy ? STRATEGY_LABELS[t.strategy] : "—"}</TableCell>
            <TableCell className="text-right tabular">{t.entry_price.toFixed(5)}</TableCell>
            <TableCell className="hidden sm:table-cell text-right text-xs tabular text-muted-foreground">{t.stop_loss.toFixed(5)} / {t.take_profit.toFixed(5)}</TableCell>
            <TableCell className="text-right tabular">{t.lot_size}</TableCell>
            <TableCell className="text-right"><PnlValue value={t.pnl} /></TableCell>
            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(t.opened_at)}</TableCell>
            <TableCell className="text-right">
              {kind === "open" ? (
                <Button size="sm" variant="ghost" onClick={() => close.mutate(t.id)} disabled={close.isPending} className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <X className="mr-1 h-3 w-3" /> Close
                </Button>
              ) : (
                <StatusPill tone={t.status === "CLOSED" ? "muted" : "destructive"}>{t.status}</StatusPill>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
