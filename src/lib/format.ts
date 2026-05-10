import type { StrategyName } from "../types";

export const STRATEGY_LABELS: Record<StrategyName, string> = {
  EMA_PULLBACK: "EMA Pullback",
  RSI_MEAN_REVERSION: "RSI Reversion",
  BREAKOUT_ATR: "Breakout ATR",
};

export const STRATEGY_COLORS: Record<StrategyName, string> = {
  EMA_PULLBACK: "hsl(160 84% 55%)",
  RSI_MEAN_REVERSION: "hsl(250 84% 65%)",
  BREAKOUT_ATR: "hsl(28 95% 60%)",
};

export const STRATEGY_DESCRIPTIONS: Record<StrategyName, string> = {
  EMA_PULLBACK: "Tendance EMA 50/200 + retracement. Idéal sur H1 en marché trending.",
  RSI_MEAN_REVERSION: "RSI sur/sous-vendu filtré par EMA200. Idéal sur H4 en marché ranging.",
  BREAKOUT_ATR: "Cassure de range avec momentum ATR. Idéal sur H4 en ouverture de session.",
};

export const TIMEFRAMES = ["M15", "M30", "H1", "H4", "D"] as const;

export const SYMBOLS = [
  "EUR_USD", "GBP_USD", "USD_JPY", "AUD_USD",
  "USD_CAD", "GBP_JPY", "EUR_JPY", "USD_CHF",
  "NZD_USD", "EUR_GBP",
] as const;

export const STRATEGIES: StrategyName[] = [
  "EMA_PULLBACK", "RSI_MEAN_REVERSION", "BREAKOUT_ATR",
];

export const NOTIF_ICONS: Record<string, string> = {
  TRADE_OPENED: "🟢", TRADE_CLOSED: "✅", DAILY_REPORT: "📊",
  WEEKLY_REPORT: "📈", MONTHLY_REPORT: "🗓️", ANNUAL_REPORT: "🏆",
  RISK_ALERT: "⚠️", DRAWDOWN_ALERT: "🚨", STRATEGY_DISABLED: "🛑",
  STREAK_ALERT: "🔥", MARKET_OPEN: "🔔", MARKET_CLOSE: "🔕",
  MARGIN_WARNING: "⚠️", SIGNAL_GENERATED: "📡", TEST: "✅",
};

export const fmt = (n: number | null | undefined, d = 2): string =>
  n == null ? "—" : Number(n).toFixed(d);

export const fmtCurrency = (n: number | null | undefined, ccy = "$"): string =>
  n == null
    ? "—"
    : `${ccy}${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtPct = (n: number | null | undefined): string =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${fmt(n)}%`;

export const fmtPnl = (n: number | null | undefined): string =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${fmtCurrency(n)}`;

export const fmtSymbol = (s: string): string => s.replace("_", "/");

export const fmtDate = (iso: string | undefined): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
};

export const fmtDateTime = (iso: string | undefined): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
};

export const pnlColor = (n: number | null | undefined): string => {
  if (n == null || n === 0) return "text-muted-foreground";
  return n > 0 ? "text-success" : "text-destructive";
};