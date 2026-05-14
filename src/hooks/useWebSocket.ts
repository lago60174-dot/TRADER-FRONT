import { useEffect, useRef, useCallback, useState } from "react";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "https://trader-rapv.onrender.com";

const WS_BASE = API_BASE.replace(/^http/, "ws");

export type WsMessage =
  | { type: "candle"; data: Record<string, unknown> }
  | { type: "trade_opened"; data: Record<string, unknown> }
  | { type: "trade_closed"; data: Record<string, unknown> }
  | { type: "pnl_update"; data: Record<string, unknown> }
  | { type: "account_update"; data: Record<string, unknown> }
  | { type: "log"; data: { level: string; message: string; ts: string } }
  | { type: "bot_state"; data: { running: boolean; scheduler: boolean } }
  | { type: "notification"; data: { title: string; body: string } }
  | { type: "heartbeat"; data: Record<string, unknown> };

type WsHandler = (msg: WsMessage) => void;

interface UseWebSocketOptions {
  token: string | null;
  onMessage?: WsHandler;
  enabled?: boolean;
}

export function useWebSocket({ token, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingSentAt = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !token || !mountedRef.current) return;

    const url = `${WS_BASE}/ws/live?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        retryCount.current = 0;
        setConnected(true);

        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingSentAt.current = Date.now();
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 10_000);
      };

      ws.onmessage = (ev) => {
        try {
          const raw = JSON.parse(ev.data as string) as { type: string; data: Record<string, unknown> };
          // Normalize type to lowercase so we handle both "TRADE_OPENED" and "trade_opened"
          const msg = { ...raw, type: raw.type?.toLowerCase() } as WsMessage;

          if (msg.type === "heartbeat") {
            if (pingSentAt.current) {
              setLatency(Date.now() - pingSentAt.current);
              pingSentAt.current = null;
            }
            return;
          }
          onMessageRef.current?.(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        if (pingRef.current) clearInterval(pingRef.current);
        const delay = Math.min(1000 * 2 ** retryCount.current, 30_000);
        retryCount.current++;
        retryRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available (backend not configured) — fail silently
    }
  }, [token, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, latency, send };
}
