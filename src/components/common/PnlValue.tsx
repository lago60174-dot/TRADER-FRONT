import { cn } from "../../lib/utils";
import { fmtPnl, fmtPct } from "../../lib/format";

export function PnlValue({
  value,
  variant = "currency",
  className,
}: {
  value: number | null | undefined;
  variant?: "currency" | "percent";
  className?: string;
}) {
  const tone =
    value == null || value === 0
      ? "text-muted-foreground"
      : value > 0
        ? "text-success"
        : "text-destructive";
  return (
    <span className={cn("tabular font-medium", tone, className)}>
      {variant === "currency" ? fmtPnl(value) : fmtPct(value)}
    </span>
  );
}