import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export function KpiCard({
  label, value, hint, icon: Icon, tone = "default", index = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "default" | "success" | "destructive" | "primary";
  index?: number;
}) {
  const ring =
    tone === "success" ? "ring-success/30"
    : tone === "destructive" ? "ring-destructive/30"
    : tone === "primary" ? "ring-primary/30"
    : "ring-border";
  const iconBg =
    tone === "success" ? "bg-success/15 text-success"
    : tone === "destructive" ? "bg-destructive/15 text-destructive"
    : tone === "primary" ? "bg-primary/15 text-primary"
    : "bg-muted text-foreground";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 ring-1 ring-inset transition-all hover:-translate-y-0.5",
        ring,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-radial-glow opacity-50 transition-opacity group-hover:opacity-80" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="text-2xl font-semibold tabular text-foreground sm:text-3xl">{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}