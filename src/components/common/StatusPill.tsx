import { cn } from "../../lib/utils";

type Tone = "success" | "destructive" | "warning" | "muted" | "primary";

const toneStyles: Record<Tone, string> = {
  success: "bg-success/15 text-success ring-1 ring-inset ring-success/30",
  destructive: "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/30",
  warning: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30",
  muted: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  primary: "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
};

export function StatusPill({
  tone = "muted",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}