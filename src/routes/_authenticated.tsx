import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

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
  return <AppShell />;
}