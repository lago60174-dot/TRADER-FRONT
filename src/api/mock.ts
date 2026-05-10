import type {
  AccountInfo,
  NotificationLog,
  RiskSettings,
  RiskStatus,
  StrategyName,
  TradeCloseRequest,
  TradeOpenRequest,
  TradeRecord,
  TradeStats,
  TradingSignal,
} from "../types";

export const DEMO_TOKEN = "preview-demo-token";

const now = Date.now();
const isoDaysAgo = (days: number, hour = 10) => {
  const d = new Date(now - days * 24 * 60 * 60 * 1000);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

let openTrades: TradeRecord[] = [
  {
    id: "T-1048",
    symbol: "EUR_USD",
    direction: "BUY",
    entry_price: 1.07742,
    stop_loss: 1.0729,
    take_profit: 1.0862,
    lot_size: 0.28,
    status: "OPEN",
    strategy: "EMA_PULLBACK",
    pnl: 84.2,
    pnl_pips: 31,
    risk_amount: 120,
    timeframe: "H1",
    opened_at: isoDaysAgo(0, 8),
  },
  {
    id: "T-1047",
    symbol: "GBP_JPY",
    direction: "SELL",
    entry_price: 192.284,
    stop_loss: 193.15,
    take_profit: 190.62,
    lot_size: 0.14,
    status: "OPEN",
    strategy: "BREAKOUT_ATR",
    pnl: -42.75,
    pnl_pips: -18,
    risk_amount: 95,
    timeframe: "H4",
    opened_at: isoDaysAgo(1, 14),
  },
];

let historyTrades: TradeRecord[] = [
  ["T-1046", "USD_JPY", "BUY", "BREAKOUT_ATR", 156.92, 181.4, 2],
  ["T-1045", "EUR_GBP", "SELL", "RSI_MEAN_REVERSION", 0.8574, -68.2, 3],
  ["T-1044", "AUD_USD", "BUY", "EMA_PULLBACK", 0.6612, 124.55, 4],
  ["T-1043", "GBP_USD", "SELL", "EMA_PULLBACK", 1.2518, 96.1, 5],
  ["T-1042", "USD_CAD", "BUY", "RSI_MEAN_REVERSION", 1.3692, -34.6, 6],
  ["T-1041", "EUR_JPY", "BUY", "BREAKOUT_ATR", 168.42, 212.3, 7],
  ["T-1040", "NZD_USD", "SELL", "RSI_MEAN_REVERSION", 0.6031, 58.9, 8],
  ["T-1039", "USD_CHF", "BUY", "EMA_PULLBACK", 0.9052, -51.3, 9],
  ["T-1038", "EUR_USD", "BUY", "EMA_PULLBACK", 1.0715, 143.8, 10],
  ["T-1037", "GBP_JPY", "SELL", "BREAKOUT_ATR", 191.76, 188.7, 11],
  ["T-1036", "AUD_USD", "SELL", "RSI_MEAN_REVERSION", 0.6678, -22.4, 12],
  ["T-1035", "EUR_GBP", "BUY", "EMA_PULLBACK", 0.8542, 77.6, 13],
] .map(([id, symbol, direction, strategy, entry, pnl, days], i) => {
  const numericEntry = Number(entry);
  const positive = Number(pnl) >= 0;
  return {
    id: String(id),
    symbol: String(symbol),
    direction: direction as TradeRecord["direction"],
    entry_price: numericEntry,
    stop_loss: Number((numericEntry * (positive ? 0.995 : 1.005)).toFixed(5)),
    take_profit: Number((numericEntry * (positive ? 1.009 : 0.991)).toFixed(5)),
    lot_size: i % 3 === 0 ? 0.24 : i % 3 === 1 ? 0.18 : 0.12,
    status: "CLOSED" as const,
    strategy: strategy as StrategyName,
    pnl: Number(pnl),
    pnl_pips: Math.round(Number(pnl) / 4),
    risk_amount: 85 + i * 7,
    timeframe: i % 2 ? "H4" : "H1",
    opened_at: isoDaysAgo(Number(days), 9 + (i % 6)),
    closed_at: isoDaysAgo(Number(days) - 0.4, 12 + (i % 5)),
    close_reason: positive ? "Take profit" : "Stop loss",
  } satisfies TradeRecord;
});

let riskSettings: RiskSettings = {
  max_concurrent_strategies: 3,
  max_open_trades: 6,
  max_portfolio_daily_loss: 4,
  strategy_risk: {
    EMA_PULLBACK: { risk_percent: 1.2, max_daily_loss: 2, swing_lookback: 20, rr_ratio: 2 },
    RSI_MEAN_REVERSION: { risk_percent: 0.8, max_daily_loss: 1.5, swing_lookback: 14, rr_ratio: 1.8 },
    BREAKOUT_ATR: { risk_percent: 1, max_daily_loss: 2.2, swing_lookback: 30, rr_ratio: 2.4 },
  },
};

export function mockApiResponse<T>(path: string, method = "GET", body?: unknown): T {
  const url = new URL(path, "https://preview.local");
  const pathname = url.pathname;

  if (pathname === "/auth/login") {
    return { access_token: DEMO_TOKEN, token_type: "bearer", expires_in_minutes: 240 } as T;
  }

  if (pathname === "/account" || pathname === "/account/balance") return mockAccount() as T;
  if (pathname === "/trades/open") return (method === "POST" ? openTrade(body) : openTrades) as T;
  if (pathname === "/trades/history") return historyTrades.slice(0, Number(url.searchParams.get("limit") ?? 100)) as T;
  if (pathname === "/trades/stats/summary") return mockStats() as T;
  if (pathname === "/trades/close" && method === "POST") return closeTrade(body as TradeCloseRequest) as T;
  if (pathname === "/strategy/run") return runStrategy(body as { strategy?: StrategyName; symbol?: string; timeframe?: string }) as T;
  if (pathname === "/strategy/status") return { active: true, mode: "preview", strategies: 3 } as T;
  if (pathname === "/risk/status") return mockRiskStatus() as T;
  if (pathname === "/risk/settings") {
    if (method === "POST") riskSettings = { ...riskSettings, ...(body as Partial<RiskSettings>) };
    return (method === "POST" ? { success: true, settings: riskSettings } : riskSettings) as T;
  }
  if (pathname === "/notifications/status") return { active: false, message: "Preview mode: push notifications are not connected." } as T;
  if (pathname === "/notifications/test") return { success: true } as T;
  if (pathname === "/notifications/logs") return mockNotifications(Number(url.searchParams.get("limit") ?? 50)) as T;
  if (pathname === "/health") return { status: "ok", env: "preview", oanda_env: "demo" } as T;

  return {} as T;
}

function mockAccount(): AccountInfo {
  const closedPnl = historyTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const floatingPnl = openTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const balance = 24850 + closedPnl;
  return {
    account_id: "PREVIEW-EDGE-01",
    balance,
    equity: balance + floatingPnl,
    margin_used: 1840,
    margin_available: balance + floatingPnl - 1840,
    open_trade_count: openTrades.length,
    currency: "USD",
    daily_pnl: floatingPnl + 138.4,
    daily_pnl_percent: 0.72,
    weekly_pnl: 771.9,
    monthly_pnl: 2434.2,
  };
}

function mockStats(): TradeStats {
  const perStrategy = ["EMA_PULLBACK", "RSI_MEAN_REVERSION", "BREAKOUT_ATR"].reduce((acc, strategy) => {
    const rows = historyTrades.filter((t) => t.strategy === strategy);
    const wins = rows.filter((t) => (t.pnl ?? 0) > 0).length;
    acc[strategy as StrategyName] = {
      trades: rows.length,
      wins,
      win_rate: rows.length ? (wins / rows.length) * 100 : 0,
      total_pnl: rows.reduce((sum, t) => sum + (t.pnl ?? 0), 0),
      total_pips: rows.reduce((sum, t) => sum + (t.pnl_pips ?? 0), 0),
    };
    return acc;
  }, {} as TradeStats["per_strategy"]);
  const wins = historyTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const totalPnl = historyTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  return {
    total_trades: historyTrades.length,
    wins,
    losses: historyTrades.length - wins,
    win_rate: (wins / historyTrades.length) * 100,
    total_pnl: totalPnl,
    avg_pnl: totalPnl / historyTrades.length,
    avg_pips: historyTrades.reduce((sum, t) => sum + (t.pnl_pips ?? 0), 0) / historyTrades.length,
    best_strategy: "BREAKOUT_ATR",
    per_strategy: perStrategy,
  };
}

function mockRiskStatus(): RiskStatus {
  const dailyLoss = Math.min(0, mockAccount().daily_pnl);
  const per_strategy = {
    EMA_PULLBACK: strategyRisk("EMA_PULLBACK", 1, 2_000, 1.2),
    RSI_MEAN_REVERSION: strategyRisk("RSI_MEAN_REVERSION", 0, 1_500, 0.8),
    BREAKOUT_ATR: strategyRisk("BREAKOUT_ATR", 1, 2_200, 1),
  } satisfies RiskStatus["per_strategy"];
  return {
    trading_allowed: true,
    portfolio_daily_loss: dailyLoss,
    portfolio_daily_loss_limit: 1_000,
    portfolio_daily_loss_remaining: 1_000 - Math.abs(dailyLoss),
    active_strategies: 3,
    max_concurrent_strategies: riskSettings.max_concurrent_strategies,
    open_trades: openTrades.length,
    max_open_trades: riskSettings.max_open_trades,
    per_strategy,
  };
}

function strategyRisk(strategy: StrategyName, openCount: number, limit: number, riskPercent: number) {
  const pnl = [...openTrades, ...historyTrades]
    .filter((t) => t.strategy === strategy)
    .slice(0, 4)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  return {
    daily_pnl: pnl,
    daily_loss_limit: limit,
    daily_loss_remaining: limit - Math.max(0, -pnl),
    open_trades: openCount,
    risk_percent: riskPercent,
    max_daily_loss_pct: riskSettings.strategy_risk[strategy]?.max_daily_loss ?? 2,
  };
}

function closeTrade(req: TradeCloseRequest): TradeRecord {
  const idx = openTrades.findIndex((t) => t.id === req.trade_id);
  const trade = idx >= 0 ? openTrades[idx] : openTrades[0];
  const closed: TradeRecord = {
    ...trade,
    status: "CLOSED",
    closed_at: new Date().toISOString(),
    close_reason: req.reason ?? "Manual close",
  };
  openTrades = openTrades.filter((t) => t.id !== trade.id);
  historyTrades = [closed, ...historyTrades];
  return closed;
}

function openTrade(body: unknown): TradeRecord {
  const req = body as TradeOpenRequest;
  const trade: TradeRecord = {
    id: `T-${1050 + openTrades.length}`,
    ...req,
    status: "OPEN",
    pnl: 0,
    opened_at: new Date().toISOString(),
  };
  openTrades = [trade, ...openTrades];
  return trade;
}

function runStrategy(req: { strategy?: StrategyName; symbol?: string; timeframe?: string }): TradingSignal {
  const signal = req.strategy === "RSI_MEAN_REVERSION" ? "SELL" : "BUY";
  const entry = req.symbol?.includes("JPY") ? 156.74 : 1.07865;
  return {
    signal,
    symbol: req.symbol ?? "EUR_USD",
    timeframe: req.timeframe ?? "H1",
    strategy: req.strategy ?? "EMA_PULLBACK",
    entry_price: entry,
    stop_loss: Number((entry * (signal === "BUY" ? 0.996 : 1.004)).toFixed(5)),
    take_profit: Number((entry * (signal === "BUY" ? 1.008 : 0.992)).toFixed(5)),
    stop_loss_pips: 42,
    lot_size: 0.18,
    risk_amount: 95,
    reasoning: "Preview signal generated from demo market conditions while the live API is unavailable.",
    generated_at: new Date().toISOString(),
  };
}

function mockNotifications(limit: number): NotificationLog[] {
  return [
    { id: "N-1", type: "TRADE_OPENED", title: "EUR/USD long opened", body: "EMA Pullback generated a BUY setup on H1.", sent: true, sent_at: isoDaysAgo(0, 8) },
    { id: "N-2", type: "RISK_ALERT", title: "Risk budget checked", body: "Portfolio exposure remains inside daily limits.", sent: true, sent_at: isoDaysAgo(1, 15) },
    { id: "N-3", type: "DAILY_REPORT", title: "Daily trading report", body: "Net performance positive with controlled drawdown.", sent: true, sent_at: isoDaysAgo(2, 18) },
  ].slice(0, limit);
}