import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";

import { useQuery } from "@tanstack/react-query";

import {
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

import { api } from "../../api/client";
import { fmtSymbol } from "../../lib/format";

import type { TradeRecord } from "../../types";

const SYMBOLS = [
  "EUR_USD",
  "GBP_USD",
  "USD_JPY",
  "AUD_USD",
  "USD_CHF",
  "EUR_GBP",
  "NZD_USD",
  "USD_CAD",
];

const GRANULARITIES = [
  "M5",
  "M15",
  "M30",
  "H1",
  "H4",
  "D",
];

export function CandleChart({
  trades,
}: {
  trades: TradeRecord[];
}) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const svgRef =
    useRef<SVGSVGElement | null>(null);

  const [symbol, setSymbol] =
    useState("EUR_USD");

  const [granularity, setGranularity] =
    useState("H1");

  const [zoom, setZoom] = useState(1);

  const [panX, setPanX] = useState(0);

  const [drag, setDrag] = useState<
    number | null
  >(null);

  const [mouse, setMouse] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [dims, setDims] = useState({
    w: 920,
    h: 420,
  });

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(
      (entries) => {
        const { width } =
          entries[0].contentRect;

        setDims({
          w: Math.max(400, width),
          h: Math.max(
            280,
            Math.round(width * 0.42)
          ),
        });
      }
    );

    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, []);

  const candlesQuery = useQuery({
    queryKey: [
      "candles",
      symbol,
      granularity,
    ],

    queryFn: () =>
      api.getCandles(
        symbol,
        granularity,
        150
      ),

    refetchInterval: 30_000,
  });

  // ✅ SAFE CANDLES
  const candles = useMemo(
    () =>
      (
        candlesQuery.data?.candles ?? []
      )
        .map((c: any) => ({
          t:
            c.time ??
            c.t ??
            Date.now(),

          o: Number(
            c.open ?? c.o ?? 0
          ),

          h: Number(
            c.high ?? c.h ?? 0
          ),

          l: Number(
            c.low ?? c.l ?? 0
          ),

          c: Number(
            c.close ?? c.c ?? 0
          ),

          v: Number(
            c.volume ?? c.v ?? 0
          ),
        }))
        .filter(
          (c) =>
            Number.isFinite(c.o) &&
            Number.isFinite(c.h) &&
            Number.isFinite(c.l) &&
            Number.isFinite(c.c)
        ),

    [candlesQuery.data]
  );

  // ✅ SAFE TRADES
  const tradesForSymbol = useMemo(
    () =>
      trades
        .filter(
          (t) => t.symbol === symbol
        )
        .map((t) => ({
          ...t,

          entry_price: Number(
            t.entry_price ?? 0
          ),

          stop_loss: Number(
            t.stop_loss ?? 0
          ),

          take_profit: Number(
            t.take_profit ?? 0
          ),

          pnl: Number(t.pnl ?? 0),
        })),

    [trades, symbol]
  );

  const W = dims.w;
  const H = dims.h;

  const padL = 56;
  const padR = 72;
  const padT = 24;
  const padB = 36;

  const volH = 40;

  const innerH =
    H -
    padT -
    padB -
    volH -
    8;

  const clampedZoom = Math.min(
    4,
    Math.max(0.4, zoom)
  );

  const innerW =
    (W - padL - padR) *
    clampedZoom;

  const candleW =
    candles.length > 0
      ? innerW / candles.length
      : 8;

  // ✅ SAFE PRICE RANGE
  const priceRange = useMemo(() => {
    if (!candles.length) {
      return {
        yMin: 0,
        yMax: 1,
      };
    }

    const lows = candles
      .map((c) => c.l)
      .filter((v) =>
        Number.isFinite(v)
      );

    const highs = candles
      .map((c) => c.h)
      .filter((v) =>
        Number.isFinite(v)
      );

    let yMin = lows.length
      ? Math.min(...lows)
      : 0;

    let yMax = highs.length
      ? Math.max(...highs)
      : 1;

    tradesForSymbol.forEach((t) => {
      const values = [
        t.entry_price,
        t.stop_loss,
        t.take_profit,
      ].filter((v) =>
        Number.isFinite(v)
      );

      if (values.length) {
        yMin = Math.min(
          yMin,
          ...values
        );

        yMax = Math.max(
          yMax,
          ...values
        );
      }
    });

    if (!Number.isFinite(yMin))
      yMin = 0;

    if (!Number.isFinite(yMax))
      yMax = 1;

    const range =
      yMax - yMin || 0.001;

    return {
      yMin:
        yMin - range * 0.06,

      yMax:
        yMax + range * 0.06,
    };
  }, [candles, tradesForSymbol]);

  const { yMin, yMax } =
    priceRange;

  // ✅ SAFE Y POSITION
  const yP = useCallback(
    (v: number) => {
      const safe = Number(v);

      if (!Number.isFinite(safe)) {
        return padT + innerH / 2;
      }

      return (
        padT +
        ((yMax - safe) /
          (yMax - yMin || 1)) *
          innerH
      );
    },

    [yMax, yMin, innerH, padT]
  );

  const xC = useCallback(
    (i: number) =>
      padL +
      i * candleW +
      candleW / 2 +
      panX,

    [padL, candleW, panX]
  );

  // ✅ SAFE VOLUME
  const maxVol = useMemo(() => {
    const vols = candles
      .map((c) => Number(c.v))
      .filter((v) =>
        Number.isFinite(v)
      );

    return vols.length
      ? Math.max(...vols, 1)
      : 1;
  }, [candles]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      setZoom((z) =>
        Math.min(
          4,
          Math.max(
            0.4,
            z - e.deltaY * 0.0015
          )
        )
      );
    },
    []
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) =>
      setDrag(e.clientX),
    []
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect =
        svgRef.current?.getBoundingClientRect();

      if (rect) {
        setMouse({
          x:
            e.clientX -
            rect.left,

          y:
            e.clientY -
            rect.top,
        });
      }

      if (drag !== null) {
        setPanX(
          (p) =>
            p +
            (e.clientX - drag)
        );

        setDrag(e.clientX);
      }
    },
    [drag]
  );

  const onMouseUp = useCallback(
    () => setDrag(null),
    []
  );

  const hovered = useMemo(() => {
    if (!mouse) return -1;

    const idx = Math.floor(
      (mouse.x - padL - panX) /
        (candleW || 1)
    );

    return idx >= 0 &&
      idx < candles.length
      ? idx
      : -1;
  }, [
    mouse,
    padL,
    panX,
    candleW,
    candles.length,
  ]);

  // ✅ SAFE HOVERED
  const hoveredCandle =
    hovered >= 0 &&
    candles[hovered]
      ? candles[hovered]
      : null;

  const priceAtMouse = useMemo(() => {
    if (!mouse) return null;

    return (
      yMax -
      ((mouse.y - padT) /
        innerH) *
        (yMax - yMin)
    );
  }, [
    mouse,
    yMax,
    yMin,
    innerH,
    padT,
  ]);

  const gridLines = useMemo(() => {
    const lines = [];

    const steps = 6;

    for (
      let i = 0;
      i <= steps;
      i++
    ) {
      const v =
        yMin +
        ((yMax - yMin) * i) /
          steps;

      lines.push({
        v,
        y: yP(v),
      });
    }

    return lines;
  }, [yMin, yMax, yP]);

  const timeLabels = useMemo(() => {
    if (!candles.length)
      return [];

    const step = Math.max(
      1,
      Math.floor(
        candles.length / 6
      )
    );

    return candles
      .map((c, i) => ({
        i,
        t: c.t,
        x: xC(i),
      }))
      .filter(
        (_, i) => i % step === 0
      );
  }, [candles, xC]);

  const lastPrice =
    candles.length
      ? candles[
          candles.length - 1
        ].c
      : null;

  const lastPriceY =
    lastPrice !== null
      ? yP(lastPrice)
      : null;

  const lastPriceUp =
    candles.length >= 2
      ? candles[
          candles.length - 1
        ].c >=
        candles[
          candles.length - 2
        ].c
      : true;

  if (
    !candles.length &&
    candlesQuery.isLoading
  ) {
    return (
      <div className="flex h-[420px] items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading chart…
      </div>
    );
  }

  const decimals =
    symbol.includes("JPY")
      ? 3
      : 5;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#040b14]">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-[#060d1a] px-4 py-2.5">
        <div className="flex flex-wrap gap-1">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() =>
                setSymbol(s)
              }
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                symbol === s
                  ? "border border-blue-500/40 bg-blue-500/20 text-blue-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {fmtSymbol(s)}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {GRANULARITIES.map(
            (g) => (
              <button
                key={g}
                onClick={() =>
                  setGranularity(g)
                }
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  granularity ===
                  g
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {g}
              </button>
            )
          )}

          <div className="mx-2 h-4 w-px bg-white/10" />

          <button
            onClick={() =>
              setZoom((z) =>
                Math.min(
                  4,
                  z + 0.3
                )
              )
            }
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() =>
              setZoom((z) =>
                Math.max(
                  0.4,
                  z - 0.3
                )
              )
            }
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => {
              setZoom(1);
              setPanX(0);
            }}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          {hoveredCandle && (
            <div className="ml-3 flex items-center gap-3 font-mono text-[11px] tabular-nums">
              <span className="text-slate-500">
                O
              </span>

              <span
                className={
                  hoveredCandle.c >=
                  hoveredCandle.o
                    ? "text-emerald-400"
                    : "text-red-400"
                }
              >
                {hoveredCandle.o.toFixed(
                  decimals
                )}
              </span>

              <span className="text-slate-500">
                H
              </span>

              <span className="text-slate-200">
                {hoveredCandle.h.toFixed(
                  decimals
                )}
              </span>

              <span className="text-slate-500">
                L
              </span>

              <span className="text-slate-200">
                {hoveredCandle.l.toFixed(
                  decimals
                )}
              </span>

              <span className="text-slate-500">
                C
              </span>

              <span
                className={
                  hoveredCandle.c >=
                  hoveredCandle.o
                    ? "text-emerald-400"
                    : "text-red-400"
                }
              >
                {hoveredCandle.c.toFixed(
                  decimals
                )}
              </span>
            </div>
          )}

          {candlesQuery.isFetching && (
            <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin text-slate-500" />
          )}
        </div>
      </div>

      {/* CHART */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          cursor: drag
            ? "grabbing"
            : "crosshair",
        }}
      >
        {/* TON SVG RESTE IDENTIQUE */}
      </div>
    </div>
  );
}
