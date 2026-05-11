import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { api } from "../../api/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import {
  fmtSymbol,
  STRATEGY_LABELS,
} from "../../lib/format";

import type { TradeRecord } from "../../types";

const PAIRS = [
  "EUR_USD",
  "GBP_USD",
  "USD_JPY",
  "GBP_JPY",
  "EUR_GBP",
  "AUD_USD",
  "USD_CAD",
  "NZD_USD",
];

const GRANULARITIES = [
  "M5",
  "M15",
  "M30",
  "H1",
  "H4",
  "D",
] as const;

export function CandleChart({
  trades,
}: {
  trades: TradeRecord[];
}) {
  const symbols = useMemo(() => {
    const set = new Set<string>(PAIRS);

    trades.forEach((t) => set.add(t.symbol));

    return [...set];
  }, [trades]);

  const [symbol, setSymbol] = useState<string>(
    symbols[0] ?? "EUR_USD"
  );

  const [granularity, setGranularity] =
    useState<string>("H1");

  const candlesQuery = useQuery({
    queryKey: ["candles", symbol, granularity],

    queryFn: () =>
      api.getCandles(
        symbol,
        granularity,
        120
      ),

    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const tradesForSymbol = trades.filter(
    (t) => t.symbol === symbol
  );

  // ✅ CORRIGÉ
  const candles = (
    candlesQuery.data?.candles ?? []
  ).map((c) => ({
    t: new Date(c.time).getTime(),
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
  }));

  // ✅ PLUS DE source mock
  const source = "oanda";

  const isLoading = candlesQuery.isLoading;

  // Layout
  const W = 920;
  const H = 360;

  const padL = 12;
  const padR = 62;
  const padT = 18;
  const padB = 30;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (isLoading || !candles.length) {
    return (
      <div className="space-y-4 rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <Toolbar
          symbol={symbol}
          setSymbol={setSymbol}
          symbols={symbols}
          granularity={granularity}
          setGranularity={setGranularity}
          source={source}
          count={tradesForSymbol.length}
        />

        <div className="flex h-[360px] items-center justify-center rounded-2xl border border-border/50 bg-[#0b1220] text-sm text-muted-foreground">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading market data...
            </>
          ) : (
            "No data"
          )}
        </div>
      </div>
    );
  }

  const count = candles.length;
  const cw = innerW / count;

  const lows = candles.map((c) => c.l);
  const highs = candles.map((c) => c.h);

  let yMin = Math.min(...lows);
  let yMax = Math.max(...highs);

  tradesForSymbol.forEach((t) => {
    yMin = Math.min(
      yMin,
      t.entry_price,
      t.stop_loss,
      t.take_profit
    );

    yMax = Math.max(
      yMax,
      t.entry_price,
      t.stop_loss,
      t.take_profit
    );
  });

  const range = yMax - yMin || 1;

  yMin -= range * 0.05;
  yMax += range * 0.05;

  const yScale = (v: number) =>
    padT +
    ((yMax - v) / (yMax - yMin)) *
      innerH;

  const tMin = candles[0].t;

  const tMax =
    candles[candles.length - 1].t +
    60 * 60 * 1000;

  const xForTime = (iso: string) => {
    const ts = Math.min(
      tMax - 1,
      Math.max(tMin, new Date(iso).getTime())
    );

    return (
      padL +
      ((ts - tMin) / (tMax - tMin)) *
        innerW
    );
  };

  const inRange = tradesForSymbol.filter(
    (t) => {
      const ts = new Date(
        t.opened_at
      ).getTime();

      return ts >= tMin && ts <= tMax;
    }
  );

  const markers = inRange.length
    ? inRange.map((t) => ({
        trade: t,
        x: xForTime(t.opened_at),
      }))
    : tradesForSymbol.map((t, i) => ({
        trade: t,
        x:
          padL +
          ((i + 0.5) /
            Math.max(
              1,
              tradesForSymbol.length
            )) *
            innerW,
      }));

  const ticks = Array.from(
    { length: 5 },
    (_, i) =>
      yMin +
      ((yMax - yMin) * i) / 4
  );

  const fmtPrice = (v: number) =>
    v.toFixed(
      symbol.includes("JPY") ? 3 : 5
    );

  return (
    <div className="space-y-4 rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <Toolbar
        symbol={symbol}
        setSymbol={setSymbol}
        symbols={symbols}
        granularity={granularity}
        setGranularity={setGranularity}
        source={source}
        count={markers.length}
      />

      <div className="w-full overflow-x-auto rounded-2xl border border-border/50 bg-[#0b1220] p-3 shadow-2xl">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block min-w-[640px] w-full"
          preserveAspectRatio="none"
          style={{ height: H }}
        >
          {/* DEFINITIONS */}
          <defs>
            <linearGradient
              id="chartBg"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#0f172a"
              />

              <stop
                offset="100%"
                stopColor="#020617"
              />
            </linearGradient>

            <linearGradient
              id="gridFade"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor="#334155"
                stopOpacity="0.1"
              />

              <stop
                offset="100%"
                stopColor="#334155"
                stopOpacity="0.4"
              />
            </linearGradient>
          </defs>

          {/* BACKGROUND */}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="url(#chartBg)"
            rx={16}
          />

          {/* GRID */}
          {ticks.map((v, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="url(#gridFade)"
                strokeDasharray="3 3"
              />

              <text
                x={W - padR + 8}
                y={yScale(v) + 3}
                fontSize="10"
                fill="#94a3b8"
                className="tabular"
              >
                {fmtPrice(v)}
              </text>
            </g>
          ))}

          {/* CANDLES */}
          {candles.map((c, i) => {
            const x =
              padL +
              i * cw +
              cw / 2;

            const up = c.c >= c.o;

            const color = up
              ? "#10b981"
              : "#ef4444";

            const yOpen = yScale(c.o);
            const yClose = yScale(c.c);

            const yHigh = yScale(c.h);
            const yLow = yScale(c.l);

            const bodyTop = Math.min(
              yOpen,
              yClose
            );

            const bodyH = Math.max(
              1.5,
              Math.abs(yClose - yOpen)
            );

            const bw = Math.max(
              2,
              cw * 0.65
            );

            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={yHigh}
                  y2={yLow}
                  stroke={color}
                  strokeWidth={1.1}
                />

                <rect
                  x={x - bw / 2}
                  y={bodyTop}
                  width={bw}
                  height={bodyH}
                  fill={color}
                  rx={1.5}
                  opacity={0.95}
                  style={{
                    transition:
                      "all 0.3s ease",
                    filter: `drop-shadow(0 0 5px ${color})`,
                  }}
                />
              </g>
            );
          })}

          {/* TRADE MARKERS */}
          {markers.map(
            ({ trade, x }) => {
              const buy =
                trade.direction ===
                "BUY";

              const color = buy
                ? "#10b981"
                : "#ef4444";

              const y = yScale(
                trade.entry_price
              );

              const ySL = yScale(
                trade.stop_loss
              );

              const yTP = yScale(
                trade.take_profit
              );

              return (
                <g key={trade.id}>
                  <line
                    x1={x}
                    x2={x}
                    y1={
                      Math.min(
                        y,
                        yTP,
                        ySL
                      ) - 2
                    }
                    y2={
                      Math.max(
                        y,
                        yTP,
                        ySL
                      ) + 2
                    }
                    stroke={color}
                    strokeOpacity={0.35}
                    strokeDasharray="2 3"
                  />

                  <line
                    x1={x - 6}
                    x2={x + 6}
                    y1={ySL}
                    y2={ySL}
                    stroke="#ef4444"
                    strokeOpacity={0.8}
                    strokeWidth={1.5}
                  />

                  <line
                    x1={x - 6}
                    x2={x + 6}
                    y1={yTP}
                    y2={yTP}
                    stroke="#10b981"
                    strokeOpacity={0.8}
                    strokeWidth={1.5}
                  />

                  <polygon
                    points={
                      buy
                        ? `${x},${
                            y - 9
                          } ${x - 5},${y} ${
                            x + 5
                          },${y}`
                        : `${x},${
                            y + 9
                          } ${x - 5},${y} ${
                            x + 5
                          },${y}`
                    }
                    fill={color}
                    stroke="#020617"
                    strokeWidth={1}
                    style={{
                      filter: `drop-shadow(0 0 6px ${color})`,
                    }}
                  >
                    <title>
                      {`${
                        buy
                          ? "BUY"
                          : "SELL"
                      } ${fmtSymbol(
                        trade.symbol
                      )} @ ${fmtPrice(
                        trade.entry_price
                      )} · ${
                        trade.strategy
                          ? STRATEGY_LABELS[
                              trade.strategy
                            ]
                          : ""
                      }`}
                    </title>
                  </polygon>
                </g>
              );
            }
          )}

          {/* X LABELS */}
          {[
            0,
            Math.floor(count / 2),
            count - 1,
          ].map((i) => {
            const c = candles[i];

            const x =
              padL +
              i * cw +
              cw / 2;

            const lbl = new Date(
              c.t
            ).toLocaleString("en-US", {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
            });

            return (
              <text
                key={i}
                x={x}
                y={H - 8}
                fontSize="10"
                fill="#94a3b8"
                textAnchor="middle"
              >
                {lbl}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Toolbar({
  symbol,
  setSymbol,
  symbols,
  granularity,
  setGranularity,
  source,
  count,
}: {
  symbol: string;
  setSymbol: (s: string) => void;
  symbols: string[];

  granularity: string;
  setGranularity: (g: string) => void;

  source: "oanda" | "preview";

  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Select
          value={symbol}
          onValueChange={setSymbol}
        >
          <SelectTrigger className="h-9 w-[150px] rounded-xl border-border/60 bg-[#111827] text-xs text-white">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {symbols.map((s) => (
              <SelectItem
                key={s}
                value={s}
                className="text-xs"
              >
                {fmtSymbol(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={granularity}
          onValueChange={
            setGranularity
          }
        >
          <SelectTrigger className="h-9 w-[90px] rounded-xl border-border/60 bg-[#111827] text-xs text-white">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {GRANULARITIES.map((g) => (
              <SelectItem
                key={g}
                value={g}
                className="text-xs"
              >
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          OANDA LIVE
        </span>

        <span className="text-[11px] text-slate-400">
          {count} bot trades
        </span>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
          BUY
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-red-500" />
          SELL
        </span>
      </div>
    </div>
  );
}
