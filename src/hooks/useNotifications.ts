/**
 * useNotifications
 *
 * Hook complet pour les Web Push Notifications.
 * Basé sur DEPLOYMENT_GUIDE.md — Step 8.
 *
 * Flow :
 *   1. Enregistre le Service Worker (/sw.js)
 *   2. Demande la permission navigateur
 *   3. Récupère la clé VAPID depuis GET /notifications/vapid-public-key (pas d'auth requis)
 *   4. Souscrit au PushManager avec la clé VAPID
 *   5. Envoie l'abonnement via POST /notifications/subscribe
 *      format backend : { endpoint, auth_key, p256dh_key, user_agent }
 */

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../api/client";
import type { NotificationLog, SubscriptionStatus } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

export interface UseNotificationsReturn {
  /** true si une souscription active existe côté backend */
  isSubscribed: boolean;
  /** Statut de la permission navigateur */
  permission: NotifPermission;
  /** true pendant subscribe / unsubscribe / test */
  isPending: boolean;
  /** Erreur courante, null si aucune */
  error: string | null;
  /** Souscrire aux push notifications */
  subscribe: () => void;
  /** Se désabonner (navigateur + backend) */
  unsubscribe: () => void;
  /** Envoyer une notification de test */
  testNotification: () => void;
  /** Logs des dernières notifications */
  logs: NotificationLog[] | undefined;
  /** Données de statut de la souscription */
  status: SubscriptionStatus | undefined;
  /** true si le navigateur supporte les push */
  isSupported: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convertit une VAPID key base64url → Uint8Array.
 * Requis par pushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function checkSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** Enregistre /sw.js et attend qu'il soit actif. */
async function registerSW(): Promise<ServiceWorkerRegistration> {
  // Vérifie si déjà enregistré
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

  // Attend que le SW soit actif (install → activate)
  await new Promise<void>((resolve) => {
    if (reg.active) { resolve(); return; }
    const target = reg.installing ?? reg.waiting;
    if (!target) { resolve(); return; }
    target.addEventListener("statechange", function handler() {
      if (this.state === "activated") {
        this.removeEventListener("statechange", handler);
        resolve();
      }
    });
  });

  return reg;
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

  // Sync permission si changé depuis l'extérieur
  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as NotifPermission);
  }, [isSupported]);

  // ── Queries ─────────────────────────────────────────────────────────────────

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

  // ── Subscribe ────────────────────────────────────────────────────────────────

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      if (!isSupported) {
        throw new Error(
          "Push notifications ne sont pas supportées par ce navigateur."
        );
      }

      // 1. Demander la permission
      const perm = await Notification.requestPermission();
      setPermission(perm as NotifPermission);

      if (perm !== "granted") {
        throw new Error(
          perm === "denied"
            ? "Permission refusée. Autorise les notifications dans les paramètres du navigateur."
            : "Permission ignorée. Réessaie et clique sur 'Autoriser'."
        );
      }

      // 2. Enregistrer le Service Worker
      let reg: ServiceWorkerRegistration;
      try {
        reg = await registerSW();
      } catch (e) {
        throw new Error(
          `Échec du Service Worker: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // 3. Récupérer la clé VAPID publique depuis le backend
      //    GET /notifications/vapid-public-key — pas d'auth requise côté backend
      const apiBase =
        (import.meta.env.VITE_API_URL as string | undefined) ??
        "https://trader-rapv.onrender.com";

      let vapidPublicKey: string;
      try {
        const res = await fetch(`${apiBase}/notifications/vapid-public-key`);
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { detail?: string };
          throw new Error(err.detail ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { public_key: string };
        if (!json.public_key) throw new Error("Réponse vide du backend.");
        vapidPublicKey = json.public_key;
      } catch (e) {
        throw new Error(
          `Impossible de récupérer la clé VAPID: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // 4. Souscrire au PushManager avec la clé VAPID
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      let sub: PushSubscription;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (e) {
        throw new Error(
          `Échec de la souscription push: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // 5. Envoyer au backend — format { endpoint, auth_key, p256dh_key, user_agent }
      const subJSON = sub.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };

      if (!subJSON.keys?.p256dh || !subJSON.keys?.auth) {
        throw new Error(
          "La souscription push ne contient pas les clés de chiffrement (p256dh/auth)."
        );
      }

      await api.subscribePush({
        endpoint:    subJSON.endpoint,
        auth_key:    subJSON.keys.auth,
        p256dh_key:  subJSON.keys.p256dh,
        user_agent:  navigator.userAgent,
      });
    },

    onSuccess: () => {
      toast.success("Notifications push activées ✓");
      qc.invalidateQueries({ queryKey: ["sub-status"] });
    },

    onError: (e: Error) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  // ── Unsubscribe ──────────────────────────────────────────────────────────────

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      // Désabonner côté navigateur
      if (isSupported) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        } catch {
          // Non bloquant — on continue pour désactiver côté backend
        }
      }

      // Désactiver côté backend via DELETE /notifications/unsubscribe
      await api.unsubscribePush();
    },

    onSuccess: () => {
      toast.info("Notifications désactivées.");
      qc.invalidateQueries({ queryKey: ["sub-status"] });
    },

    onError: (e: Error) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  // ── Test ─────────────────────────────────────────────────────────────────────

  const testMutation = useMutation({
    mutationFn: () => api.testNotification(),

    onSuccess: () => {
      toast.success("Notification de test envoyée.");
      qc.invalidateQueries({ queryKey: ["notif-logs"] });
    },

    onError: (e: Error) => {
      setError(e.message);
      toast.error(`Test échoué: ${e.message}`);
    },
  });

  // ── API publique ─────────────────────────────────────────────────────────────

  const subscribe = useCallback(() => {
    subscribeMutation.mutate();
  }, [subscribeMutation]);

  const unsubscribe = useCallback(() => {
    unsubscribeMutation.mutate();
  }, [unsubscribeMutation]);

  const testNotification = useCallback(() => {
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
    status: statusQuery.data,
    isSupported,
  };
}
