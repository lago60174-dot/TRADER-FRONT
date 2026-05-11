import { createFileRoute } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";

import {
  Wallet,
  TrendingUp,
  Target,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Shield,
  LineChart,
  Sparkles,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../api/client";

import {
  fmtCurrency,
  fmtPnl,
  fmtDate,
  fmtSymbol,
  STRATEGY_LABELS,
} from "../lib/format";

import { KpiCard } from "../components/dashboard/KpiCard";

import { ChartCard } from "../components/dashboard/ChartCard";

import {
  KpiSkeleton,
  TableSkeleton,
} from "../components/common/Skeletons";

import { PageHeader } from "../components/common/PageHeader";

import { StatusPill } from "../components/common/StatusPill";

import { PnlValue } from "../components/common/PnlValue";

import { EmptyState } from "../components/common/EmptyState";

import { Progress } from "../components/ui/progress";

import type { TradeRecord } from "../types";

export const Route =
  createFileRoute(
    "/_authenticated/"
  )({
    component: DashboardPage,
  });

function EquityCurve({
  trades,
  start,
}: {
  trades: TradeRecord[];

  start: number;
}) {
  const closed = trades
    .filter(
      (t) =>
        t.status === "CLOSED" &&
        t.closed_at
    )
    .sort(
      (a, b) =>
        new Date(
          a.closed_at!
        ).getTime() -
        new Date(
          b.closed_at!
        ).getTime()
    );

  let equity = start;

  const data = [
    {
      t: "Start",
      equity: start,
    },

    ...closed.map((trade) => {
      equity += trade.pnl ?? 0;

      return {
        t: new Date(
          trade.closed_at!
        ).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "2-digit",
          }
        ),

        equity: Number(
          equity.toFixed(2)
        ),
      };
    }),
  ];

  if (data.length < 2) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
        No enough closed trades yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={300}
    >
      <AreaChart
        data={data}
        margin={{
          left: 0,
          right: 8,
          top: 10,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient
            id="eq"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#10b981"
              stopOpacity={0.5}
            />

            <stop
              offset="100%"
              stopColor="#10b981"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />

        <XAxis
          dataKey="t"
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={65}
          tickFormatter={(v) =>
            `$${(
              v / 1000
            ).toFixed(1)}k`
          }
        />

        <Tooltip
          contentStyle={{
            background:
              "#0f172a",
            border:
              "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            fontSize: 12,
            color: "white",
          }}
          formatter={(
            v: number
          ) => [
            fmtCurrency(v),
            "Equity",
          ]}
        />

        <Area
          type="monotone"
          dataKey="equity"
          stroke="#10b981"
          strokeWidth={3}
          fill="url(#eq)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DailyPnl({
  trades,
}: {
  trades: TradeRecord[];
}) {
  const byDay =
    new Map<string, number>();

  trades
    .filter(
      (t) =>
        t.status === "CLOSED" &&
        t.closed_at
    )
    .forEach((t) => {
      const key = new Date(
        t.closed_at!
      )
        .toISOString()
        .slice(0, 10);

      byDay.set(
        key,
        (byDay.get(key) ??
          0) +
          (t.pnl ?? 0)
      );
    });

  const data = [
    ...byDay.entries(),
  ]
    .sort(([a], [b]) =>
      a.localeCompare(b)
    )
    .slice(-14)
    .map(([k, v]) => ({
      day: new Date(
        k
      ).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "2-digit",
        }
      ),

      pnl: Number(
        v.toFixed(2)
      ),
    }));

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        No closed trades yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={260}
    >
      <BarChart
        data={data}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />

        <XAxis
          dataKey="day"
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          stroke="#64748b"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip
          contentStyle={{
            background:
              "#0f172a",
            border:
              "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            fontSize: 12,
            color: "white",
          }}
          formatter={(
            v: number
          ) => [
            fmtPnl(v),
            "P&L",
          ]}
        />

        <Bar
          dataKey="pnl"
          radius={[
            8,
            8,
            0,
            0,
          ]}
        >
          {data.map(
            (d, i) => (
              <Cell
                key={i}
                fill={
                  d.pnl >= 0
                    ? "#10b981"
                    : "#ef4444"
                }
              />
            )
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardPage() {
  const account = useQuery({
    queryKey: ["account"],

    queryFn: () =>
      api.getAccount(),

    refetchInterval: 30_000,
  });

  const stats = useQuery({
    queryKey: [
      "trade-stats",
    ],

    queryFn: () =>
      api.getTradeStats(),

    refetchInterval: 60_000,
  });

  const history = useQuery({
    queryKey: [
      "trade-history",
    ],

    queryFn: () =>
      api.getTradeHistory(
        200
      ),

    refetchInterval: 60_000,
  });

  const risk = useQuery({
    queryKey: ["risk"],

    queryFn: () =>
      api.getRiskStatus(),

    refetchInterval: 30_000,
  });

  const a = account.data;

  const startEquity = a
    ? a.balance -
      (stats.data
        ?.total_pnl ?? 0)
    : 10000;

  const recent = [
    ...(history.data ??
      []),
  ]
    .sort(
      (x, y) =>
        new Date(
          y.opened_at
        ).getTime() -
        new Date(
          x.opened_at
        ).getTime()
    )
    .slice(0, 6);

  const lossPct =
    risk.data
      ? Math.min(
          100,
          (Math.abs(
            risk.data
              .portfolio_daily_loss
          ) /
            (risk.data
              .portfolio_daily_loss_limit ||
              1)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trading Dashboard"
        description="Institutional-grade forex analytics and live portfolio monitoring."
        actions={
          <StatusPill
            tone={
              risk.data
                ?.trading_allowed
                ? "success"
                : "destructive"
            }
            dot
          >
            {risk.data
              ?.trading_allowed
              ? "Trading Enabled"
              : "Trading Paused"}
          </StatusPill>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!a ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              index={0}
              icon={Wallet}
              tone="primary"
              label="Equity"
              value={fmtCurrency(
                a.equity
              )}
              hint={`Balance ${fmtCurrency(
                a.balance
              )}`}
            />

            <KpiCard
              index={1}
              icon={TrendingUp}
              tone={
                a.daily_pnl >= 0
                  ? "success"
                  : "destructive"
              }
              label="Daily P&L"
              value={
                <PnlValue
                  value={
                    a.daily_pnl
                  }
                />
              }
              hint={
                <PnlValue
                  value={
                    a.daily_pnl_percent
                  }
                  variant="percent"
                />
              }
            />

            <KpiCard
              index={2}
              icon={Target}
              tone="success"
              label="Win Rate"
              value={`${(
                stats.data
                  ?.win_rate ??
                0
              ).toFixed(1)}%`}
              hint={`${
                stats.data
                  ?.wins ?? 0
              }W · ${
                stats.data
                  ?.losses ??
                0
              }L`}
            />

            <KpiCard
              index={3}
              icon={Activity}
              label="Open Trades"
              value={`${a.open_trade_count}`}
              hint={`Margin ${fmtCurrency(
                a.margin_used
              )}`}
            />
          </>
        )}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard
          title="Equity Curve"
          description="Portfolio growth based on closed trades"
          className="lg:col-span-2 border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
        >
          {history.isLoading ? (
            <TableSkeleton
              rows={6}
            />
          ) : (
            <EquityCurve
              trades={
                history.data ??
                []
              }
              start={
                startEquity
              }
            />
          )}
        </ChartCard>

        <ChartCard
          title="Risk Exposure"
          description="Daily portfolio risk management"
          className="border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
        >
          {!risk.data ? (
            <TableSkeleton
              rows={4}
            />
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#0b1220]/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    Daily Risk
                  </div>

                  <span className="text-sm font-semibold text-white">
                    {lossPct.toFixed(
                      0
                    )}
                    %
                  </span>
                </div>

                <Progress
                  value={
                    lossPct
                  }
                  className="h-2"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>
                    $
                    {Math.abs(
                      risk.data
                        .portfolio_daily_loss
                    ).toFixed(0)}{" "}
                    used
                  </span>

                  <span>
                    $
                    {risk.data.portfolio_daily_loss_limit.toFixed(
                      0
                    )}{" "}
                    max
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#0b1220]/70 p-4">
                  <div className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-500">
                    Open Trades
                  </div>

                  <div className="text-2xl font-bold text-white">
                    {
                      risk.data
                        .open_trades
                    }

                    <span className="ml-1 text-sm font-normal text-slate-500">
                      /
                      {
                        risk.data
                          .max_open_trades
                      }
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1220]/70 p-4">
                  <div className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-500">
                    Strategies
                  </div>

                  <div className="text-2xl font-bold text-white">
                    {
                      risk.data
                        .active_strategies
                    }

                    <span className="ml-1 text-sm font-normal text-slate-500">
                      /
                      {
                        risk.data
                          .max_concurrent_strategies
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* DAILY PNL */}
      <ChartCard
        title="Daily P&L"
        description="Last 14 trading sessions"
        className="border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
      >
        {history.isLoading ? (
          <TableSkeleton
            rows={4}
          />
        ) : (
          <DailyPnl
            trades={
              history.data ??
              []
            }
          />
        )}
      </ChartCard>

      {/* RECENT ACTIVITY */}
      <ChartCard
        title="Recent Activity"
        description="Latest portfolio executions"
        className="border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
      >
        {history.isLoading ? (
          <TableSkeleton
            rows={5}
          />
        ) : !recent.length ? (
          <EmptyState
            icon={Sparkles}
            title="No trades yet"
            description="Your automated strategies will appear here."
          />
        ) : (
          <div className="space-y-3">
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0b1220]/60 p-4 transition hover:border-white/10 hover:bg-[#0f172a]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "flex h-10 w-10 items-center justify-center rounded-2xl " +
                      (t.direction ===
                      "BUY"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400")
                    }
                  >
                    {t.direction ===
                    "BUY" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">
                      {fmtSymbol(
                        t.symbol
                      )}
                    </div>

                    <div className="text-xs text-slate-500">
                      {t.strategy
                        ? STRATEGY_LABELS[
                            t.strategy
                          ]
                        : "—"}{" "}
                      ·{" "}
                      {fmtDate(
                        t.opened_at
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <PnlValue
                    value={t.pnl}
                    className="text-sm"
                  />

                  <div className="text-xs text-slate-500">
                    {
                      t.lot_size
                    }{" "}
                    lots
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
