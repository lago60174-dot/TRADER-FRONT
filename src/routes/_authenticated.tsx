import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../lib/auth";
import { RefreshCw, WifiOff } from "lucide-react";
import { api } from "../api/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function BackendBanner() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");
  const [retryIn, setRetryIn] = useState(0);

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      await api.health();
      setStatus("ok");
    } catch {
      setStatus("down");
      // Auto-retry every 15 seconds
      let t = 15;
      setRetryIn(t);
      const interval = setInterval(() => {
        t -= 1;
        setRetryIn(t);
        if (t <= 0) {
          clearInterval(interval);
          check();
        }
      }, 1000);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  if (status === "ok") return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-xs font-medium ${
      status === "down" ? "bg-red-500/10 border-b border-red-500/20 text-red-400" : "bg-amber-500/10 border-b border-amber-500/20 text-amber-400"
    }`}>
      {status === "checking" ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Connexion au backend en cours (Render démarre, ~30s)...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Backend indisponible — Render est peut-être en veille.</span>
          <button onClick={check} className="ml-2 underline hover:no-underline">
            Réessayer {retryIn > 0 ? `(${retryIn}s)` : ""}
          </button>
        </>
      )}
    </div>
  );
}

function AuthenticatedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !auth.isAuthenticated) navigate({ to: "/login" });
  }, [hydrated, auth.isAuthenticated, navigate]);

  if (!hydrated || !auth.isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  return (
    <div className="flex flex-col min-h-svh">
      <BackendBanner />
      <AppShell />
    </div>
  );
}
