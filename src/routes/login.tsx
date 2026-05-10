import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { LineChart, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) navigate({ to: "/" });
  }, [auth.isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await auth.login(password);
      toast.success("Welcome back");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4">
      <div className="bg-radial-glow pointer-events-none absolute inset-0 opacity-90" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass relative z-10 w-full max-w-sm rounded-3xl p-7 shadow-[var(--shadow-elegant)]"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-elegant)]">
            <LineChart className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Forex Terminal</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in with your access password to enter the trading dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Access password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoFocus
                required
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Institutional access · Encrypted session token
          </p>
        </form>
      </motion.div>
    </div>
  );
}