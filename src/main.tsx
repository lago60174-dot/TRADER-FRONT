import { createFileRoute } from "@tanstack/react-router";
import {
  Bell, Send, BellRing, BellOff,
  ShieldAlert, Sparkles, CheckCircle2, BellMinus,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { ChartCard } from "../components/dashboard/ChartCard";
import { StatusPill } from "../components/common/StatusPill";
import { EmptyState } from "../components/common/EmptyState";
import { TableSkeleton } from "../components/common/Skeletons";
import { Button } from "../components/ui/button";
import { fmtDateTime, NOTIF_ICONS } from "../lib/format";
import { useNotifications } from "../hooks/useNotifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const {
    isSubscribed,
    permission,
    isPending,
    error,
    subscribe,
    unsubscribe,
    testNotification,
    logs,
    status,
    isSupported,
  } = useNotifications();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Real-time alerts, execution reports and risk warnings."
        actions={
          <div className="flex flex-wrap gap-2">
            {isSubscribed ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testNotification}
                  disabled={isPending}
                  className="rounded-xl border-white/10 bg-[#0b1220]/60 text-white hover:bg-[#111827]"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  {isPending ? "Sending…" : "Send test"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={unsubscribe}
                  disabled={isPending}
                  className="rounded-xl border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <BellMinus className="mr-2 h-3.5 w-3.5" />
                  {isPending ? "Disabling…" : "Disable"}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={subscribe}
                disabled={isPending || !isSupported}
                className="rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                <BellRing className="mr-2 h-3.5 w-3.5" />
                {isPending ? "Activating…" : "Activate notifications"}
              </Button>
            )}
          </div>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Browser not supported */}
      {!isSupported && (
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
          ⚠️ Ton navigateur ne supporte pas les push notifications.
          Utilise Chrome, Edge ou Firefox sur desktop.
        </div>
      )}

      {/* Permission denied */}
      {isSupported && permission === "denied" && (
        <div className="rounded-2xl border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          🚫 Permission refusée. Va dans les paramètres de ton navigateur
          pour autoriser les notifications pour ce site.
        </div>
      )}

      {/* STATUS CARD */}
      <ChartCard
        title="Push Subscription"
        description="Device connection to the trading notification engine"
        className="border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
      >
        {!status ? (
          <TableSkeleton rows={2} />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0b1220]/70 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={
                    "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg " +
                    (isSubscribed
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-slate-500/10 text-slate-400")
                  }
                >
                  {isSubscribed ? (
                    <BellRing className="h-7 w-7" />
                  ) : (
                    <BellOff className="h-7 w-7" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {isSubscribed ? "Notifications Active" : "Notifications Disabled"}
                    </h3>
                    {isSubscribed && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="mt-1 max-w-md text-sm text-slate-400">
                    {status.endpoint_prefix ?? status.message ?? "No endpoint registered"}
                  </p>
                  {status.created_at && (
                    <p className="mt-0.5 text-xs text-slate-600">
                      Since {fmtDateTime(status.created_at)}
                    </p>
                  )}
                </div>
              </div>

              <StatusPill tone={isSubscribed ? "success" : "muted"} dot>
                {isSubscribed ? "Connected" : "Offline"}
              </StatusPill>
            </div>

            {!isSubscribed && (
              <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Notifications are disabled
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      Activate push notifications to receive:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      <li>• Trade execution alerts</li>
                      <li>• Stop loss / take profit events</li>
                      <li>• Daily P&amp;L summaries</li>
                      <li>• Risk exposure warnings</li>
                      <li>• Strategy status updates</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ChartCard>

      {/* EVENT LOG */}
      <ChartCard
        title="Event Log"
        description="Recent trading system notifications and alerts"
        className="border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
      >
        {!logs ? (
          <TableSkeleton />
        ) : !logs.length ? (
          <EmptyState
            icon={Sparkles}
            title="No notifications yet"
            description="Trading and system alerts will appear here."
          />
        ) : (
          <div className="space-y-3">
            {logs.map((n) => (
              <div
                key={n.id}
                className="group flex items-start gap-4 rounded-2xl border border-white/5 bg-[#0b1220]/60 p-4 transition-all duration-200 hover:border-white/10 hover:bg-[#0f172a]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.03] text-xl shadow-inner">
                  {NOTIF_ICONS[n.type] ?? "🔔"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-white">
                          {n.title}
                        </h3>
                        <div
                          className={
                            "h-2 w-2 rounded-full " +
                            (n.sent
                              ? "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                              : "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]")
                          }
                        />
                      </div>
                      {n.body && (
                        <p className="mt-1 text-sm text-slate-400">{n.body}</p>
                      )}
                    </div>

                    <StatusPill
                      tone={n.sent ? "success" : "destructive"}
                      className="shrink-0"
                    >
                      {n.sent ? "Delivered" : "Failed"}
                    </StatusPill>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Bell className="h-3 w-3" />
                    {fmtDateTime(n.sent_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
