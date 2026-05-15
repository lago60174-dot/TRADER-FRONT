import type {
  AccountInfo,
  TradeRecord,
  TradeOpenRequest,
  TradeCloseRequest,
  TradeStats,
  TradingSignal,
  StrategyRunRequest,
  RiskStatus,
  RiskSettings,
  RiskSettingsUpdate,
  NotificationLog,
  SubscriptionStatus,
  TokenResponse,
  CandlesResponse,
} from "../types";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "https://trader-rapv.onrender.com";

const TOKEN_KEY = "fx_token";

const isBrowser = typeof window !== "undefined";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (isBrowser) {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  setToken(token: string): void {
    this.token = token;
    if (isBrowser) localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    this.token = null;
    if (isBrowser) localStorage.removeItem(TOKEN_KEY);
  }

  hasToken(): boolean { return !!this.token; }

  getToken(): string | null { return this.token; }

  private async req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...((opts.headers as Record<string, string>) ?? {}),
        },
      });
    } catch (error) {
      // Network error — backend asleep or unreachable
      const msg = (error as Error).message ?? "";
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
        throw new Error("Backend indisponible — Render est peut-être en train de démarrer (30s). Réessaie dans quelques secondes.");
      }
      throw new Error("Erreur réseau");
    }

    if (response.status === 401) {
      this.clearToken();
      if (isBrowser) window.location.assign("/login");
      throw new Error("Session expirée — reconnecte-toi.");
    }

    let data: unknown;
    try { data = await response.json(); } catch { data = {}; }

    if (!response.ok) {
      const d = data as { detail?: string; error?: string };
      throw new Error(d.detail ?? d.error ?? `HTTP ${response.status}`);
    }

    return data as T;
  }

  private get<T>(path: string): Promise<T> { return this.req<T>(path); }
  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.req<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
  }

  // AUTH
  login(password: string): Promise<TokenResponse> {
    return this.post("/auth/login", { password });
  }

  // ACCOUNT
  getAccount(): Promise<AccountInfo> { return this.get("/account"); }
  getBalance(): Promise<Pick<AccountInfo, "balance" | "equity" | "currency" | "daily_pnl" | "daily_pnl_percent">> {
    return this.get("/account/balance");
  }

  // TRADES
  getOpenTrades(): Promise<TradeRecord[]> { return this.get("/trades/open"); }
  getTradeHistory(limit = 100, strategy?: string): Promise<TradeRecord[]> {
    const query = strategy ? `?limit=${limit}&strategy=${strategy}` : `?limit=${limit}`;
    return this.get(`/trades/history${query}`);
  }
  getTradeStats(): Promise<TradeStats> { return this.get("/trades/stats/summary"); }
  openTrade(req: TradeOpenRequest): Promise<TradeRecord> { return this.post("/trades/open", req); }
  closeTrade(req: TradeCloseRequest): Promise<TradeRecord> { return this.post("/trades/close", req); }
  syncTradesFromOanda(): Promise<{ synced: number; already_in_db: number; total_oanda_trades: number }> {
    return this.post("/trades/sync-from-oanda");
  }

  // STRATEGY
  runStrategy(req: StrategyRunRequest): Promise<TradingSignal> { return this.post("/strategy/run", req); }
  getStrategyStatus(): Promise<Record<string, unknown>> { return this.get("/strategy/status"); }
  listStrategies(): Promise<{ strategies: Array<{ id: string; description: string; min_candles: number; timeframe: string; recommended_symbols: string[] }> }> {
    return this.get("/strategy/list");
  }

  // MARKET
  getCandles(instrument: string, granularity = "H1", count = 120): Promise<CandlesResponse> {
    return this.get(`/market/candles?instrument=${encodeURIComponent(instrument)}&granularity=${granularity}&count=${count}`);
  }

  // RISK
  getRiskStatus(): Promise<RiskStatus> { return this.get("/risk/status"); }
  getRiskSettings(): Promise<RiskSettings> { return this.get("/risk/settings"); }
  updateRiskSettings(updates: RiskSettingsUpdate): Promise<{ success: boolean; settings: RiskSettings }> {
    return this.post("/risk/settings", updates);
  }
  getKillSwitchStatus(): Promise<{ engaged: boolean; reason?: string; engaged_at?: string }> {
    return this.get("/risk/kill-switch/status");
  }
  engageKillSwitch(reason = "manual"): Promise<{ success: boolean; engaged: boolean; reason: string }> {
    return this.post("/risk/kill-switch/engage", { reason });
  }
  disengageKillSwitch(): Promise<{ success: boolean; engaged: boolean }> {
    return this.post("/risk/kill-switch/disengage");
  }
  getDrawdown(): Promise<{ current_balance: number; peak_balance: number; drawdown_pct: number; drawdown_amount: number; position_multiplier: number }> {
    return this.get("/risk/drawdown");
  }

  // NOTIFICATIONS
  subscribePush(payload: { endpoint: string; auth_key: string; p256dh_key: string; user_agent: string }): Promise<{ success: boolean }> {
    return this.post("/notifications/subscribe", payload);
  }
  getSubscriptionStatus(): Promise<SubscriptionStatus> { return this.get("/notifications/status"); }
  testNotification(): Promise<{ success: boolean }> { return this.post("/notifications/test", {}); }
  getNotificationLogs(limit = 50): Promise<NotificationLog[]> { return this.get(`/notifications/logs?limit=${limit}`); }

  // HEALTH
  health(): Promise<{ status: string; env: string; oanda_env: string }> { return this.get("/health"); }
}

export const api = new ApiClient();
