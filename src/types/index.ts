export type TradeDirection = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED" | "CANCELLED";
export type SignalType = "BUY" | "SELL" | "NONE";
export type Timeframe = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D";
export type StrategyName = "EMA_PULLBACK" | "RSI_MEAN_REVERSION" | "BREAKOUT_ATR";

export interface AccountInfo {
  account_id: string;
  balance: number;
  equity: number;
  margin_used: number;
  margin_available: number;
  open_trade_count: number;
  currency: string;
  daily_pnl: number;
  daily_pnl_percent: number;
  weekly_pnl?: number;
  monthly_pnl?: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  status: TradeStatus;
  strategy?: StrategyName;
  pnl?: number;
  pnl_pips?: number;
  risk_amount?: number;
  oanda_trade_id?: string;
  timeframe?: string;
  opened_at: string;
  closed_at?: string;
  close_reason?: string;
}

export interface TradeOpenRequest {
  symbol: string;
  direction: TradeDirection;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  strategy: StrategyName;
  timeframe: Timeframe;
}

export interface TradeCloseRequest {
  trade_id: string;
  reason?: string;
}

export interface StrategyStats {
  trades: number;
  wins: number;
  win_rate: number;
  total_pnl: number;
  total_pips: number;
}

export interface TradeStats {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  avg_pips: number;
  best_strategy?: StrategyName;
  per_strategy: Record<StrategyName, StrategyStats>;
}

export interface TradingSignal {
  signal: SignalType;
  symbol: string;
  timeframe: string;
  strategy: StrategyName;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  stop_loss_pips?: number;
  lot_size?: number;
  risk_amount?: number;
  reasoning: string;
  generated_at: string;
}

export interface StrategyRunRequest {
  symbol: string;
  timeframe: Timeframe;
  strategy: StrategyName;
  auto_execute: boolean;
}

export interface StrategyRiskEntry {
  daily_pnl: number;
  daily_loss_limit: number;
  daily_loss_remaining: number;
  open_trades: number;
  risk_percent: number;
  max_daily_loss_pct: number;
}

export interface RiskStatus {
  trading_allowed: boolean;
  reason?: string;
  portfolio_daily_loss: number;
  portfolio_daily_loss_limit: number;
  portfolio_daily_loss_remaining: number;
  active_strategies: number;
  max_concurrent_strategies: number;
  open_trades: number;
  max_open_trades: number;
  per_strategy: Record<StrategyName, StrategyRiskEntry>;
}

export interface RiskSettings {
  max_concurrent_strategies: number;
  max_open_trades: number;
  max_portfolio_daily_loss: number;
  strategy_risk: Record<string, {
    risk_percent: number;
    max_daily_loss: number;
    swing_lookback: number;
    rr_ratio: number;
  }>;
}

export interface RiskSettingsUpdate {
  max_concurrent_strategies?: number;
  max_open_trades?: number;
  max_portfolio_daily_loss?: number;
}

export interface NotificationLog {
  id: string;
  type: string;
  title: string;
  body?: string;
  sent: boolean;
  error?: string;
  sent_at: string;
}

export interface SubscriptionStatus {
  active: boolean;
  endpoint_prefix?: string;
  created_at?: string;
  message?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;


export interface Candle {
  t: string; // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export interface CandlesResponse {
  instrument: string;
  granularity: string;
  candles: Candle[];
  source: "oanda" | "preview";
}
