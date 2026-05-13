/**
 * useNotifications
 *
 * Hook complet pour les push notifications Web.
 * Basé sur DEPLOYMENT_GUIDE.md — Step 8.
 *
 * Flow :
 *   1. Récupère la clé VAPID publique depuis GET /notifications/vapid-public-key
 *   2. Demande la permission navigateur
 *   3. Souscrit au PushManager avec la clé VAPID
 *   4. Envoie l'abonnement au backend via POST /notifications/subscribe
 *      (format { endpoint, keys: { p256dh, auth }, user_agent })
 *   5. Expose subscribe / unsubscribe / testNotification / status / logs
 */

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

export interface UseNotificationsReturn {
  /** true si une souscription active existe côté backend */
  isSubscribed: boolean;
  /** Statut de la permission navigateur */
  permission: NotifPermission;
  /** true pendant subscribe / unsubscribe */
  isPending: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Souscrire aux push notifications */
  subscribe: () => Promise<void>;
  /** Se désabonner (côté navigateur uniquement — le backend supprime sur 410) */
  unsubscribe: () => Promise<void>;
  /** Envoyer une notification de test */
  testNotification: () => Promise<void>;
  /** Logs des dernières notifications */
  logs: ReturnType<typeof useQuery>["data"];
  /** true si le navigateur supporte les push */
  isSupported: boolean;
}

// ─── Helper : urlBase64 → Uint8Array (requis par PushManager.subscribe) ──────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ─── Helper : vérifie le support navigateur ───────────────────────────────────

function checkSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): UseNotificationsReturn {
  const qc = useQueryClient();
  const isSupported = checkSupport();

  const [permission, setPermission] = useState<NotifPermission>(() => {
    if (!checkSupport()) return "unsupported";
    return Notification.permission as NotifPermission;
  });
  const [error, setError] = useState<string | null>(null);

  // Sync permission state if changed externally
  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as NotifPermission);
  }, [isSupported]);

  // ── Status & logs from backend ──────────────────────────────────────────────

  const statusQuery = useQuery({
    queryKey: ["sub-status"],
    queryFn: () => api.getSubscriptionStatus(),
    refetchInterval: 60_000,
  });

  const logsQuery = useQuery({
    queryKey: ["notif-logs"],
    queryFn: () => api.getNotificationLogs(80),
    refetchInterval: 30_000,
  });

  const isSubscribed = statusQuery.data?.active ?? false;

  // ── Subscribe mutation ──────────────────────────────────────────────────────

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      if (!isSupported) {
        throw new Error("Push notifications are not supported in this browser.");
      }

      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as NotifPermission);

      if (perm !== "granted") {
        throw new Error(
          perm === "denied"
            ? "Notification permission was denied. Please enable it in your browser settings."
            : "Notification permission was dismissed."
        );
      }

      // 2. Fetch VAPID public key from backend
      //    GET /notifications/vapid-public-key → { public_key: string }
      let vapidPublicKey: string;
      try {
        const res = await fetch(
          `${(import.meta.env.VITE_API_URL as string | undefined) ?? "https://trader-rapv.onrender.com"}/notifications/vapid-public-key`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("fx_token") ?? ""}`,
            },
          }
        );
        if (!res.ok) throw new Error(`VAPID key fetch failed: HTTP ${res.status}`);
        const json = (await res.json()) as { public_key: string };
        vapidPublicKey = json.public_key;
      } catch (e) {
        throw new Error(
          `Cannot reach backend to get VAPID key: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // 3. Get or create push subscription
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Send to backend — format from DEPLOYMENT_GUIDE Step 8
      //    { endpoint, keys: { p256dh, auth }, user_agent }
      const subJSON = sub.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };

      if (!subJSON.keys?.p256dh || !subJSON.keys?.auth) {
        throw new Error("Push subscription is missing encryption keys.");
      }

      await api.subscribePush({
        endpoint: subJSON.endpoint,
        // Backend now accepts keys directly (DEPLOYMENT_GUIDE fix)
        // The api.subscribePush still uses auth_key / p256dh_key for backward compat
        auth_key: subJSON.keys.auth,
        p256dh_key: subJSON.keys.p256dh,
        user_agent: navigator.userAgent,
      });
    },

    onSuccess: () => {
      toast.success("Push notifications activated ✓");
      qc.invalidateQueries({ queryKey: ["sub-status"] });
    },

    onError: (e: Error) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  // ── Unsubscribe mutation ────────────────────────────────────────────────────

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      if (!isSupported) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      // Backend removes the subscription automatically on the next 410/404
      // when it tries to send a notification to an invalid endpoint.
    },

    onSuccess: () => {
      toast.info("Push notifications disabled.");
      qc.invalidateQueries({ queryKey: ["sub-status"] });
    },

    onError: (e: Error) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  // ── Test mutation ───────────────────────────────────────────────────────────

  const testMutation = useMutation({
    mutationFn: () => api.testNotification(),

    onSuccess: () => {
      toast.success("Test notification sent.");
      qc.invalidateQueries({ queryKey: ["notif-logs"] });
    },

    onError: (e: Error) => {
      setError(e.message);
      toast.error(`Test failed: ${e.message}`);
    },
  });

  // ── Public API ──────────────────────────────────────────────────────────────

  const subscribe = useCallback(async () => {
    subscribeMutation.mutate();
  }, [subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    unsubscribeMutation.mutate();
  }, [unsubscribeMutation]);

  const testNotification = useCallback(async () => {
    testMutation.mutate();
  }, [testMutation]);

  const isPending =
    subscribeMutation.isPending ||
    unsubscribeMutation.isPending ||
    testMutation.isPending;

  return {
    isSubscribed,
    permission,
    isPending,
    error,
    subscribe,
    unsubscribe,
    testNotification,
    logs: logsQuery.data,
    isSupported,
  };
}
