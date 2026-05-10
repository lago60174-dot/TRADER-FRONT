import type {
  AccountInfo, TradeRecord, TradeOpenRequest, TradeCloseRequest, TradeStats,
  TradingSignal, StrategyRunRequest, RiskStatus, RiskSettings, RiskSettingsUpdate,
  NotificationLog, SubscriptionStatus, TokenResponse,
} from "../types";
import { DEMO_TOKEN, mockApiResponse } from "./mock";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
const TOKEN_KEY = "fx_token";
const isBrowser = typeof window !== "undefined";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (isBrowser) {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  setToken(t: string): void {
    this.token = t;
    if (isBrowser) localStorage.setItem(TOKEN_KEY, t);
  }

  clearToken(): void {
    this.token = null;
    if (isBrowser) localStorage.removeItem(TOKEN_KEY);
  }

  hasToken(): boolean {
    return !!this.token;
  }

  isPreviewMode(): boolean {
    return this.token === DEMO_TOKEN;
  }

  private async req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...((opts.headers as Record<string, string>) ?? {}),
        },
      });
    } catch (error) {
      console.warn("Live API unavailable, using preview data.", error);
      return mockApiResponse<T>(path, opts.method ?? "GET", opts.body ? JSON.parse(String(opts.body)) : undefined);
    }

    if (res.status === 401) {
      this.clearToken();
      if (isBrowser) window.location.assign("/login");
      throw new Error("Unauthorized");
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      const d = data as { detail?: string; error?: string };
      throw new Error(d.detail ?? d.error ?? `HTTP ${res.status}`);
    }
    return data as T;
  }

  private get<T>(path: string): Promise<T> {
    return this.req<T>(path);
  }

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
    const q = strategy ? `?limit=${limit}&strategy=${strategy}` : `?limit=${limit}`;
    return this.get(`/trades/history${q}`);
  }
  getTradeStats(): Promise<TradeStats> { return this.get("/trades/stats/summary"); }
  openTrade(req: TradeOpenRequest): Promise<TradeRecord> { return this.post("/trades/open", req); }
  closeTrade(req: TradeCloseRequest): Promise<TradeRecord> { return this.post("/trades/close", req); }

  // STRATEGY
  runStrategy(req: StrategyRunRequest): Promise<TradingSignal> { return this.post("/strategy/run", req); }
  getStrategyStatus(): Promise<Record<string, unknown>> { return this.get("/strategy/status"); }

  // RISK
  getRiskStatus(): Promise<RiskStatus> { return this.get("/risk/status"); }
  getRiskSettings(): Promise<RiskSettings> { return this.get("/risk/settings"); }
  updateRiskSettings(updates: RiskSettingsUpdate): Promise<{ success: boolean; settings: RiskSettings }> {
    return this.post("/risk/settings", updates);
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