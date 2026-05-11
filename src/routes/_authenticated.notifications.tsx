import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Send, BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { PageHeader } from "../components/common/PageHeader";
import { ChartCard } from "../components/dashboard/ChartCard";
import { StatusPill } from "../components/common/StatusPill";
import { EmptyState } from "../components/common/EmptyState";
import { TableSkeleton } from "../components/common/Skeletons";
import { Button } from "../components/ui/button";
import { fmtDateTime, NOTIF_ICONS } from "../lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const sub = useQuery({ queryKey: ["sub-status"], queryFn: () => api.getSubscriptionStatus() });
  const logs = useQuery({ queryKey: ["notif-logs"], queryFn: () => api.getNotificationLogs(80) });
  const qc = useQueryClient();
  const test = useMutation({
    mutationFn: () => api.testNotification(),
    onSuccess: () => { toast.success("Test notification sent"); qc.invalidateQueries({ queryKey: ["notif-logs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const subscribe = useMutation({
    mutationFn: async () => {
      let endpoint = `preview://device-${Math.random().toString(36).slice(2, 8)}`;
      let auth_key = "preview-auth";
      let p256dh_key = "preview-p256dh";
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") throw new Error("Permission denied");
          if ("serviceWorker" in navigator && "PushManager" in window) {
            // Best-effort real subscription if a SW is present; otherwise fallback.
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.pushManager) {
              try {
                const real = await reg.pushManager.getSubscription();
                if (real) {
                  endpoint = real.endpoint;
                }
              } catch { /* ignore */ }
            }
          }
        } catch (e) {
          throw e instanceof Error ? e : new Error("Notification setup failed");
        }
      }
      return api.subscribePush({
        endpoint,
        auth_key,
        p256dh_key,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "preview",
      });
    },
    onSuccess: () => {
      toast.success("Notifications activated");
      qc.invalidateQueries({ queryKey: ["sub-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Push subscription status and event log."
        actions={
          <div className="flex flex-wrap gap-2">
            {sub.data?.active ? (
              <Button size="sm" variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
                <Send className="mr-2 h-3.5 w-3.5" /> Send test
              </Button>
            ) : (
              <Button size="sm" onClick={() => subscribe.mutate()} disabled={subscribe.isPending}>
                <BellRing className="mr-2 h-3.5 w-3.5" />
                {subscribe.isPending ? "Activating…" : "Activate notifications"}
              </Button>
            )}
          </div>
        }
      />

      <ChartCard title="Push subscription" description="Web push notification endpoint">
        {!sub.data ? <TableSkeleton rows={2} /> : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={"flex h-10 w-10 items-center justify-center rounded-xl " + (sub.data.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                  {sub.data.active ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{sub.data.active ? "Subscribed" : "Inactive"}</div>
                  <div className="text-xs text-muted-foreground">{sub.data.endpoint_prefix ?? sub.data.message ?? "No endpoint registered"}</div>
                </div>
              </div>
              <StatusPill tone={sub.data.active ? "success" : "muted"} dot>{sub.data.active ? "Active" : "Off"}</StatusPill>
            </div>
            {!sub.data.active && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Tap <strong className="text-foreground">Activate notifications</strong> to receive trade alerts, daily reports, and risk warnings on this device.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ChartCard>

      <ChartCard title="Event log" description="Recent system notifications">
        {logs.isLoading ? <TableSkeleton /> : !logs.data?.length ? (
          <EmptyState icon={Bell} title="No notifications yet" description="Trade and risk events will appear here." />
        ) : (
          <div className="divide-y divide-border/60">
            {logs.data.map((n) => (
              <div key={n.id} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 text-lg leading-none">{NOTIF_ICONS[n.type] ?? "🔔"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{n.title}</span>
                    <StatusPill tone={n.sent ? "success" : "destructive"} className="shrink-0">{n.sent ? "Sent" : "Failed"}</StatusPill>
                  </div>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <div className="mt-1 text-[11px] text-muted-foreground">{fmtDateTime(n.sent_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </>
  );
}
