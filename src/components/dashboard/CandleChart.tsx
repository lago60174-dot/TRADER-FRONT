import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { api } from "../../api/client";
import { fmtSymbol } from "../../lib/format";
import type { TradeRecord } from "../../types";

/* ───────────────────────────── */

export function CandleChart({ trades }: { trades: TradeRecord[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [symbol, setSymbol] = useState("EUR_USD");
  const [granularity, setGranularity] = useState("H1");

  /* ── CAMERA (TRADINGVIEW STYLE) ── */
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);

  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  const candlesQuery = useQuery({
    queryKey: ["candles", symbol, granularity],
    queryFn: () => api.getCandles(symbol, granularity, 120),
  });

  const candles =
    candlesQuery.data?.candles?.map((c) => ({
      t: c.t,
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
    })) ?? [];

  const tradesForSymbol = trades.filter((t) => t.symbol === symbol);

  const W = 920;
  const H = 360;

  const padL = 50;
  const padR = 60;
  const padT = 20;
  const padB = 30;

  const innerW = (W - padL - padR) * zoom;
  const innerH = H - padT - padB;

  if (!candles.length) {
    return (
      <div className="flex h-[360px] items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  /* ── PRICE RANGE ── */
  let yMin = Math.min(...candles.map((c) => c.l));
  let yMax = Math.max(...candles.map((c) => c.h));

  tradesForSymbol.forEach((t) => {
    yMin = Math.min(yMin, t.entry_price, t.stop_loss, t.take_profit);
    yMax = Math.max(yMax, t.entry_price, t.stop_loss, t.take_profit);
  });

  const range = yMax - yMin || 1;
  yMin -= range * 0.05;
  yMax += range * 0.05;

  const y = (v: number) =>
    padT + ((yMax - v) / (yMax - yMin)) * innerH;

  const candleW = innerW / candles.length;

  const x = (i: number) =>
    padL + i * candleW + candleW / 2 + panX;

  /* ── EVENTS ── */

  const onWheel = (e: any) => {
    e.preventDefault();
    setZoom((z) =>
      Math.min(4, Math.max(0.5, z - e.deltaY * 0.001))
    );
  };

  const onMouseDown = (e: any) => setDrag(e.clientX);

  const onMouseMove = (e: any) => {
    setMouse({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

    if (drag !== null) {
      setPanX((p) => p + (e.clientX - drag));
      setDrag(e.clientX);
    }
  };

  const onMouseUp = () => setDrag(null);

  const hovered = mouse
    ? Math.floor((mouse.x - padL) / candleW)
    : -1;

  /* ───────────────────────────── */

  return (
    <div className="rounded-2xl border border-white/10 bg-[#050814] p-3">
      {/* HEADER */}
      <div className="mb-2 flex justify-between text-xs text-slate-400">
        <div>{fmtSymbol(symbol)}</div>
        <div>{candles.length} candles</div>
      </div>

      {/* CHART */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => setMouse(null)}
      >
        {/* BACKGROUND GRID (TradingView style) */}
        {Array.from({ length: 6 }).map((_, i) => {
          const v = yMin + ((yMax - yMin) * i) / 5;

          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(v)}
                y2={y(v)}
                stroke="#1f2937"
              />
              <text
                x={W - padR + 5}
                y={y(v)}
                fill="#64748b"
                fontSize="10"
              >
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* CANDLES */}
        {candles.map((c, i) => {
          const cx = x(i);
          const up = c.c >= c.o;
          const color = up ? "#22c55e" : "#ef4444";

          const bodyTop = y(Math.max(c.o, c.c));
          const bodyH = Math.max(1, Math.abs(y(c.o) - y(c.c)));

          const bw = Math.max(2, candleW * 0.55);

          const isHover = i === hovered;

          return (
            <g key={i}>
              {/* wick */}
              <line
                x1={cx}
                x2={cx}
                y1={y(c.h)}
                y2={y(c.l)}
                stroke={color}
                opacity={isHover ? 1 : 0.7}
              />

              {/* body */}
              <rect
                x={cx - bw / 2}
                y={bodyTop}
                width={bw}
                height={bodyH}
                fill={color}
                opacity={up ? 0.9 : 0.75}
                style={{
                  filter: isHover
                    ? `drop-shadow(0 0 6px ${color})`
                    : "none",
                }}
              />
            </g>
          );
        })}

        {/* SL / TP + RISK BOX */}
        {tradesForSymbol.map((t, i) => {
          const entryY = y(t.entry_price);
          const slY = y(t.stop_loss);
          const tpY = y(t.take_profit);

          const color = t.direction === "BUY" ? "#22c55e" : "#ef4444";

          return (
            <g key={i}>
              {/* entry */}
              <line
                x1={padL}
                x2={W - padR}
                y1={entryY}
                y2={entryY}
                stroke={color}
                strokeDasharray="3 3"
              />

              {/* SL */}
              <line
                x1={padL}
                x2={W - padR}
                y1={slY}
                y2={slY}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />

              {/* TP */}
              <line
                x1={padL}
                x2={W - padR}
                y1={tpY}
                y2={tpY}
                stroke="#22c55e"
                strokeDasharray="4 4"
              />

              {/* risk zone */}
              <rect
                x={padL}
                y={Math.min(slY, tpY)}
                width={W - padL - padR}
                height={Math.abs(tpY - slY)}
                fill={color}
                opacity={0.05}
              />
            </g>
          );
        })}

        {/* CROSSHAIR */}
        {mouse && (
          <g>
            <line
              x1={mouse.x}
              x2={mouse.x}
              y1={0}
              y2={H}
              stroke="#94a3b8"
              strokeDasharray="3 3"
            />
            <line
              x1={0}
              x2={W}
              y1={mouse.y}
              y2={mouse.y}
              stroke="#94a3b8"
              strokeDasharray="3 3"
            />
          </g>
        )}
      </svg>

      {/* TOOLTIP PRO */}
      {mouse && hovered >= 0 && candles[hovered] && (
        <div className="absolute left-6 top-6 rounded-md bg-black/80 p-2 text-xs text-white">
          <div>O: {candles[hovered].o}</div>
          <div>H: {candles[hovered].h}</div>
          <div>L: {candles[hovered].l}</div>
          <div>C: {candles[hovered].c}</div>
        </div>
      )}
    </div>
  );
}
