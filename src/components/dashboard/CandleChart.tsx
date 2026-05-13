import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { api } from "../../api/client";
import { fmtSymbol } from "../../lib/format";
import type { TradeRecord } from "../../types";

const SYMBOLS = ["EUR_USD","GBP_USD","USD_JPY","AUD_USD","USD_CHF","EUR_GBP","NZD_USD","USD_CAD"];
const GRANULARITIES = ["M5","M15","M30","H1","H4","D"];

export function CandleChart({ trades }: { trades: TradeRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [symbol, setSymbol] = useState("EUR_USD");
  const [granularity, setGranularity] = useState("H1");
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [dims, setDims] = useState({ w: 920, h: 420 });

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDims({ w: Math.max(400, width), h: Math.max(280, Math.round(width * 0.42)) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const candlesQuery = useQuery({
    queryKey: ["candles", symbol, granularity],
    queryFn: () => api.getCandles(symbol, granularity, 150),
    refetchInterval: 30_000,
  });

  const candles = useMemo(() =>
    candlesQuery.data?.candles?.map((c) => ({
      t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume ?? 0,
    })) ?? [],
    [candlesQuery.data]
  );

  const tradesForSymbol = useMemo(
    () => trades.filter((t) => t.symbol === symbol),
    [trades, symbol]
  );

  const W = dims.w;
  const H = dims.h;
  const padL = 56;
  const padR = 72;
  const padT = 24;
  const padB = 36;
  const volH = 40;
  const innerH = H - padT - padB - volH - 8;

  const clampedZoom = Math.min(4, Math.max(0.4, zoom));
  const innerW = (W - padL - padR) * clampedZoom;
  const candleW = candles.length > 0 ? innerW / candles.length : 8;

  const priceRange = useMemo(() => {
    if (!candles.length) return { yMin: 0, yMax: 1 };
    let yMin = Math.min(...candles.map((c) => c.l));
    let yMax = Math.max(...candles.map((c) => c.h));
    tradesForSymbol.forEach((t) => {
      yMin = Math.min(yMin, t.entry_price, t.stop_loss, t.take_profit);
      yMax = Math.max(yMax, t.entry_price, t.stop_loss, t.take_profit);
    });
    const range = yMax - yMin || 0.001;
    return { yMin: yMin - range * 0.06, yMax: yMax + range * 0.06 };
  }, [candles, tradesForSymbol]);

  const { yMin, yMax } = priceRange;

  const yP = useCallback(
    (v: number) => padT + ((yMax - v) / (yMax - yMin || 1)) * innerH,
    [yMax, yMin, innerH, padT]
  );

  const xC = useCallback(
    (i: number) => padL + i * candleW + candleW / 2 + panX,
    [padL, candleW, panX]
  );

  const maxVol = useMemo(() => Math.max(...candles.map((c) => c.v), 1), [candles]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.4, z - e.deltaY * 0.0015)));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => setDrag(e.clientX), []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    if (drag !== null) {
      setPanX((p) => p + (e.clientX - drag));
      setDrag(e.clientX);
    }
  }, [drag]);
  const onMouseUp = useCallback(() => setDrag(null), []);

  const hovered = useMemo(() => {
    if (!mouse) return -1;
    const idx = Math.floor((mouse.x - padL - panX) / (candleW || 1));
    return idx >= 0 && idx < candles.length ? idx : -1;
  }, [mouse, padL, panX, candleW, candles.length]);

  const hoveredCandle = hovered >= 0 ? candles[hovered] : null;

  // Price at mouse Y
  const priceAtMouse = useMemo(() => {
    if (!mouse) return null;
    return yMax - ((mouse.y - padT) / innerH) * (yMax - yMin);
  }, [mouse, yMax, yMin, innerH, padT]);

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const v = yMin + ((yMax - yMin) * i) / steps;
      lines.push({ v, y: yP(v) });
    }
    return lines;
  }, [yMin, yMax, yP]);

  // Time labels
  const timeLabels = useMemo(() => {
    if (!candles.length) return [];
    const step = Math.max(1, Math.floor(candles.length / 6));
    return candles
      .map((c, i) => ({ i, t: c.t, x: xC(i) }))
      .filter((_, i) => i % step === 0);
  }, [candles, xC]);

  // Last price
  const lastPrice = candles.length ? candles[candles.length - 1].c : null;
  const lastPriceY = lastPrice ? yP(lastPrice) : null;
  const lastPriceUp = candles.length >= 2 ? candles[candles.length - 1].c >= candles[candles.length - 2].c : true;

  if (!candles.length && candlesQuery.isLoading) {
    return (
      <div className="flex h-[420px] items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2 h-5 w-5" />
        Loading chart…
      </div>
    );
  }

  const decimals = symbol.includes("JPY") ? 3 : 5;

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-white/10 bg-[#040b14] overflow-hidden">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-[#060d1a]">
        {/* Symbol selector */}
        <div className="flex gap-1 flex-wrap">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                symbol === s
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {s.replace("_", "/")}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Granularity */}
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                granularity === g
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {g}
            </button>
          ))}

          <div className="mx-2 h-4 w-px bg-white/10" />

          <button onClick={() => setZoom((z) => Math.min(4, z + 0.3))} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.3))} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setZoom(1); setPanX(0); }} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          {/* OHLC tooltip inline */}
          {hoveredCandle && (
            <div className="ml-3 flex items-center gap-3 text-[11px] tabular-nums font-mono">
              <span className="text-slate-500">O</span><span className={hoveredCandle.c >= hoveredCandle.o ? "text-emerald-400" : "text-red-400"}>{hoveredCandle.o.toFixed(decimals)}</span>
              <span className="text-slate-500">H</span><span className="text-slate-200">{hoveredCandle.h.toFixed(decimals)}</span>
              <span className="text-slate-500">L</span><span className="text-slate-200">{hoveredCandle.l.toFixed(decimals)}</span>
              <span className="text-slate-500">C</span><span className={hoveredCandle.c >= hoveredCandle.o ? "text-emerald-400" : "text-red-400"}>{hoveredCandle.c.toFixed(decimals)}</span>
            </div>
          )}

          {candlesQuery.isFetching && <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin text-slate-500" />}
        </div>
      </div>

      {/* CHART SVG */}
      <div ref={containerRef} className="relative w-full" style={{ cursor: drag ? "grabbing" : "crosshair" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: "block" }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setMouse(null); setDrag(null); }}
        >
          <defs>
            <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.7" />
            </linearGradient>
            <filter id="glow-bull">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-bear">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="chartClip">
              <rect x={padL} y={padT} width={W - padL - padR} height={innerH + volH + 8} />
            </clipPath>
          </defs>

          {/* BACKGROUND */}
          <rect x={0} y={0} width={W} height={H} fill="#040b14" />
          <rect x={padL} y={padT} width={W - padL - padR} height={innerH} fill="rgba(255,255,255,0.01)" rx="2" />

          {/* HORIZONTAL GRID LINES */}
          {gridLines.map(({ v, y }, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={W - padR + 5} y={y + 4} fill="#475569" fontSize="10" fontFamily="monospace">{v.toFixed(decimals)}</text>
            </g>
          ))}

          {/* TIME LABELS */}
          {timeLabels.map(({ i, t, x }) => (
            <text key={i} x={x} y={H - 8} fill="#475569" fontSize="10" textAnchor="middle" fontFamily="monospace">
              {new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </text>
          ))}

          {/* WATERMARK */}
          <text x={padL + (W - padL - padR) / 2} y={padT + innerH / 2 + 14} fill="rgba(255,255,255,0.025)" fontSize="36" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">TRAEX</text>

          {/* CANDLES + VOLUME (clipped) */}
          <g clipPath="url(#chartClip)">
            {/* Volume bars */}
            {candles.map((c, i) => {
              const cx = xC(i);
              const up = c.c >= c.o;
              const bw = Math.max(1.5, candleW * 0.55);
              const volBarH = (c.v / maxVol) * volH;
              const volY = padT + innerH + 8 + (volH - volBarH);
              return (
                <rect key={`v${i}`} x={cx - bw / 2} y={volY} width={bw} height={volBarH}
                  fill={up ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"} rx="1" />
              );
            })}

            {/* Candles */}
            {candles.map((c, i) => {
              const cx = xC(i);
              const up = c.c >= c.o;
              const color = up ? "#22c55e" : "#ef4444";
              const gradId = up ? "url(#bullGrad)" : "url(#bearGrad)";
              const bodyTop = yP(Math.max(c.o, c.c));
              const bodyH = Math.max(1.5, Math.abs(yP(c.o) - yP(c.c)));
              const bw = Math.max(1.5, candleW * 0.55);
              const isHover = i === hovered;

              return (
                <g key={i} filter={isHover ? (up ? "url(#glow-bull)" : "url(#glow-bear)") : undefined}>
                  {/* Wick */}
                  <line x1={cx} x2={cx} y1={yP(c.h)} y2={yP(c.l)}
                    stroke={color} strokeWidth={isHover ? 1.5 : 1} opacity={isHover ? 1 : 0.7} />
                  {/* Body */}
                  <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH}
                    fill={isHover ? gradId : color}
                    opacity={isHover ? 1 : up ? 0.85 : 0.75}
                    rx={bw > 3 ? 1 : 0} />
                </g>
              );
            })}

            {/* TRADE OVERLAYS */}
            {tradesForSymbol.map((t, i) => {
              const entryY = yP(t.entry_price);
              const slY = yP(t.stop_loss);
              const tpY = yP(t.take_profit);
              const isBuy = t.direction === "BUY";
              const color = isBuy ? "#22c55e" : "#ef4444";
              const riskTop = Math.min(slY, entryY);
              const riskH = Math.abs(slY - entryY);
              const rewardTop = Math.min(tpY, entryY);
              const rewardH = Math.abs(tpY - entryY);
              const rr = riskH > 0 ? (rewardH / riskH).toFixed(1) : "—";
              const x0 = padL;
              const x1 = W - padR;

              return (
                <g key={i}>
                  {/* Risk zone */}
                  <rect x={x0} y={riskTop} width={x1 - x0} height={riskH} fill="rgba(239,68,68,0.06)" />
                  {/* Reward zone */}
                  <rect x={x0} y={rewardTop} width={x1 - x0} height={rewardH} fill="rgba(34,197,94,0.06)" />

                  {/* Entry line */}
                  <line x1={x0} x2={x1} y1={entryY} y2={entryY} stroke={color} strokeWidth="1.5" strokeDasharray="5 3" />
                  {/* SL line */}
                  <line x1={x0} x2={x1} y1={slY} y2={slY} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
                  {/* TP line */}
                  <line x1={x0} x2={x1} y1={tpY} y2={tpY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />

                  {/* Entry badge */}
                  <rect x={x1 + 1} y={entryY - 9} width={padR - 2} height={18} fill={isBuy ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"} rx="3" />
                  <text x={x1 + (padR / 2)} y={entryY + 4} fill={color} fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                    {isBuy ? "▲BUY" : "▼SELL"}
                  </text>

                  {/* RR badge */}
                  <rect x={x0 + 4} y={entryY - 9} width={32} height={18} fill="rgba(0,0,0,0.6)" rx="3" />
                  <text x={x0 + 20} y={entryY + 4} fill="#f59e0b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                    {rr}R
                  </text>

                  {/* SL label */}
                  <text x={x0 + 4} y={slY - 3} fill="#ef4444" fontSize="9" fontFamily="monospace" opacity="0.8">SL</text>
                  {/* TP label */}
                  <text x={x0 + 4} y={tpY - 3} fill="#22c55e" fontSize="9" fontFamily="monospace" opacity="0.8">TP</text>

                  {/* Strategy label */}
                  {t.strategy && (
                    <text x={x0 + 44} y={entryY + 4} fill="rgba(148,163,184,0.7)" fontSize="9" fontFamily="monospace">
                      {t.strategy.replace("_", " ")}
                    </text>
                  )}

                  {/* Live PnL floating */}
                  {t.pnl !== undefined && t.pnl !== null && (
                    <>
                      <rect x={x1 - 56} y={entryY - 22} width={52} height={16} fill="rgba(0,0,0,0.7)" rx="3" />
                      <text x={x1 - 30} y={entryY - 11} fill={t.pnl >= 0 ? "#22c55e" : "#ef4444"} fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                        {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(0)}$
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* CURRENT PRICE LINE */}
            {lastPriceY !== null && lastPrice !== null && (
              <g>
                <line x1={padL} x2={W - padR} y1={lastPriceY} y2={lastPriceY}
                  stroke={lastPriceUp ? "#22c55e" : "#ef4444"} strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
                <rect x={W - padR} y={lastPriceY - 9} width={padR - 1} height={18}
                  fill={lastPriceUp ? "#22c55e" : "#ef4444"} rx="3" />
                <text x={W - padR + (padR - 1) / 2} y={lastPriceY + 4}
                  fill="white" fontSize="9.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                  {lastPrice.toFixed(decimals)}
                </text>
              </g>
            )}

            {/* CROSSHAIR */}
            {mouse && (
              <g>
                <line x1={mouse.x} x2={mouse.x} y1={padT} y2={padT + innerH}
                  stroke="rgba(148,163,184,0.4)" strokeWidth="1" strokeDasharray="3 3" />
                <line x1={padL} x2={W - padR} y1={mouse.y} y2={mouse.y}
                  stroke="rgba(148,163,184,0.4)" strokeWidth="1" strokeDasharray="3 3" />

                {/* Price label on Y axis */}
                {priceAtMouse !== null && mouse.y >= padT && mouse.y <= padT + innerH && (
                  <>
                    <rect x={W - padR} y={mouse.y - 9} width={padR - 1} height={18}
                      fill="rgba(30,41,59,0.95)" stroke="rgba(148,163,184,0.3)" strokeWidth="1" rx="3" />
                    <text x={W - padR + (padR - 1) / 2} y={mouse.y + 4}
                      fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      {priceAtMouse.toFixed(decimals)}
                    </text>
                  </>
                )}
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
