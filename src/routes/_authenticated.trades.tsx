import { createFileRoute } from "@tanstack/react-router";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  X,
  TrendingUp,
  Activity,
  Clock3,
  BarChart3,
} from "lucide-react";

import { toast } from "sonner";

import { api } from "../api/client";

import {
  fmtDate,
  fmtSymbol,
  STRATEGY_LABELS,
} from "../lib/format";

import { PageHeader } from "../components/common/PageHeader";

import { PnlValue } from "../components/common/PnlValue";

import { StatusPill } from "../components/common/StatusPill";

import { EmptyState } from "../components/common/EmptyState";

import { TableSkeleton } from "../components/common/Skeletons";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

import { Input } from "../components/ui/input";

import { Button } from "../components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

import { ChartCard } from "../components/dashboard/ChartCard";

import { CandleChart } from "../components/dashboard/CandleChart";

import type { TradeRecord } from "../types";

export const Route =
  createFileRoute(
    "/_authenticated/trades"
  )({
    component: TradesPage,
  });

function TradesPage() {
  const [tab, setTab] = useState<
    "open" | "history"
  >("open");

  const [q, setQ] = useState("");

  const open = useQuery({
    queryKey: ["trades-open"],

    queryFn: () =>
      api.getOpenTrades(),

    refetchInterval: 15_000,
  });

  const history = useQuery({
    queryKey: ["trade-history", 200],

    queryFn: () =>
      api.getTradeHistory(200),
  });

  const allTrades = [
    ...(open.data ?? []),
    ...(history.data ?? []),
  ];

  const filteredOpen = useMemo(
    () =>
      filterTrades(
        open.data,
        q
      ),
    [open.data, q]
  );

  const filteredHistory = useMemo(
    () =>
      filterTrades(
        history.data,
        q
      ),
    [history.data, q]
  );

  const totalPnl = (
    history.data ?? []
  ).reduce(
    (acc, t) => acc + (t.pnl ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trades"
        description="Monitor live positions, executions and historical performance."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />

            <Input
              value={q}
              onChange={(e) =>
                setQ(e.target.value)
              }
              placeholder="Search symbol or strategy..."
              className="h-10 w-64 rounded-2xl border-white/10 bg-[#0b1220]/70 pl-9 text-white placeholder:text-slate-500"
            />
          </div>
        }
      />

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Open Trades"
          value={
            open.data?.length ?? 0
          }
          icon={
            <Activity className="h-4 w-4" />
          }
        />

        <StatsCard
          title="Trade History"
          value={
            history.data?.length ??
            0
          }
          icon={
            <Clock3 className="h-4 w-4" />
          }
        />

        <StatsCard
          title="Total P&L"
          value={
            <PnlValue
              value={totalPnl}
            />
          }
          icon={
            <TrendingUp className="h-4 w-4" />
          }
        />
      </div>

      {/* CHART */}
      <ChartCard
        title="Live market chart"
        description="Real-time OANDA candles with automated strategy entries."
        className="border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
      >
        <CandleChart
          trades={allTrades}
        />
      </ChartCard>

      {/* TABLE */}
      <div className="rounded-3xl border border-white/10 bg-[#07101d]/70 p-4 shadow-[0_0_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <Tabs
          value={tab}
          onValueChange={(v) =>
            setTab(
              v as
                | "open"
                | "history"
            )
          }
        >
          <div className="mb-5 flex items-center justify-between">
            <TabsList className="rounded-2xl border border-white/10 bg-[#0b1220]/80 p-1">
              <TabsTrigger
                value="open"
                className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black"
              >
                Open

                <span className="ml-2 rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]">
                  {open.data?.length ??
                    0}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="rounded-xl data-[state=active]:bg-cyan-400 data-[state=active]:text-black"
              >
                History
              </TabsTrigger>
            </TabsList>

            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-[#0b1220]/60 px-3 py-2 text-xs text-slate-400 md:flex">
              <BarChart3 className="h-3.5 w-3.5" />
              Institutional Trading Feed
            </div>
          </div>

          <TabsContent value="open">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {open.isLoading ? (
                <TableSkeleton />
              ) : (
                <TradesTable
                  rows={filteredOpen}
                  kind="open"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {history.isLoading ? (
                <TableSkeleton />
              ) : (
                <TradesTable
                  rows={
                    filteredHistory
                  }
                  kind="history"
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TradesTable({
  rows,
  kind,
}: {
  rows: TradeRecord[];

  kind:
    | "open"
    | "history";
}) {
  const qc = useQueryClient();

  const close = useMutation({
    mutationFn: (id: string) =>
      api.closeTrade({
        trade_id: id,
        reason: "manual",
      }),

    onSuccess: () => {
      toast.success(
        "Trade closed"
      );

      qc.invalidateQueries({
        queryKey: [
          "trades-open",
        ],
      });

      qc.invalidateQueries({
        queryKey: [
          "trade-history",
          200,
        ],
      });
    },

    onError: (e: Error) =>
      toast.error(e.message),
  });

  if (!rows.length) {
    return (
      <EmptyState
        title={
          kind === "open"
            ? "No open trades"
            : "No history yet"
        }
        description="Trades will appear here once your strategies execute."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-[#0b1220]/80 hover:bg-[#0b1220]/80">
            <TableHead className="text-slate-400">
              Symbol
            </TableHead>

            <TableHead className="text-slate-400">
              Side
            </TableHead>

            <TableHead className="hidden text-slate-400 md:table-cell">
              Strategy
            </TableHead>

            <TableHead className="text-right text-slate-400">
              Entry
            </TableHead>

            <TableHead className="hidden text-right text-slate-400 sm:table-cell">
              SL / TP
            </TableHead>

            <TableHead className="text-right text-slate-400">
              Lots
            </TableHead>

            <TableHead className="text-right text-slate-400">
              P&L
            </TableHead>

            <TableHead className="hidden text-slate-400 lg:table-cell">
              Opened
            </TableHead>

            <TableHead className="text-right text-slate-400">
              {kind === "open"
                ? ""
                : "Status"}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((t) => (
            <TableRow
              key={t.id}
              className="border-white/5 transition hover:bg-white/[0.03]"
            >
              <TableCell className="font-semibold text-white">
                {fmtSymbol(
                  t.symbol
                )}
              </TableCell>

              <TableCell>
                <span
                  className={
                    "inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-lg " +
                    (t.direction ===
                    "BUY"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400")
                  }
                >
                  {t.direction ===
                  "BUY" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}

                  {t.direction}
                </span>
              </TableCell>

              <TableCell className="hidden text-xs text-slate-400 md:table-cell">
                {t.strategy
                  ? STRATEGY_LABELS[
                      t.strategy
                    ]
                  : "—"}
              </TableCell>

              <TableCell className="text-right font-mono text-white">
                {t.entry_price.toFixed(
                  5
                )}
              </TableCell>

              <TableCell className="hidden text-right text-xs font-mono text-slate-400 sm:table-cell">
                <div>
                  SL:{" "}
                  {t.stop_loss.toFixed(
                    5
                  )}
                </div>

                <div>
                  TP:{" "}
                  {t.take_profit.toFixed(
                    5
                  )}
                </div>
              </TableCell>

              <TableCell className="text-right font-mono text-white">
                {t.lot_size}
              </TableCell>

              <TableCell className="text-right">
                <PnlValue
                  value={t.pnl}
                />
              </TableCell>

              <TableCell className="hidden text-xs text-slate-500 lg:table-cell">
                {fmtDate(
                  t.opened_at
                )}
              </TableCell>

              <TableCell className="text-right">
                {kind ===
                "open" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      close.mutate(
                        t.id
                      )
                    }
                    disabled={
                      close.isPending
                    }
                    className="h-8 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Close
                  </Button>
                ) : (
                  <StatusPill
                    tone={
                      t.status ===
                      "CLOSED"
                        ? "muted"
                        : "destructive"
                    }
                  >
                    {t.status}
                  </StatusPill>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
}: {
  title: string;

  value:
    | string
    | number
    | React.ReactNode;

  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#07101d]/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {title}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400">
          {icon}
        </div>
      </div>

      <div className="text-2xl font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function filterTrades(
  rows:
    | TradeRecord[]
    | undefined,
  q: string
) {
  return (rows ?? []).filter(
    (r) =>
      !q ||
      r.symbol
        .toLowerCase()
        .includes(
          q.toLowerCase()
        ) ||
      (r.strategy ?? "")
        .toLowerCase()
        .includes(
          q.toLowerCase()
        )
  );
}
