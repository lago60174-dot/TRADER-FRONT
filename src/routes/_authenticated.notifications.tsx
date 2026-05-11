import { createFileRoute } from "@tanstack/react-router";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Bell,
  Send,
  BellRing,
  BellOff,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import { toast } from "sonner";

import { api } from "../api/client";

import { PageHeader } from "../components/common/PageHeader";

import { ChartCard } from "../components/dashboard/ChartCard";

import { StatusPill } from "../components/common/StatusPill";

import { EmptyState } from "../components/common/EmptyState";

import { TableSkeleton } from "../components/common/Skeletons";

import { Button } from "../components/ui/button";

import {
  fmtDateTime,
  NOTIF_ICONS,
} from "../lib/format";

export const Route =
  createFileRoute(
    "/_authenticated/notifications"
  )({
    component:
      NotificationsPage,
  });

function NotificationsPage() {
  const sub = useQuery({
    queryKey: [
      "sub-status",
    ],

    queryFn: () =>
      api.getSubscriptionStatus(),
  });

  const logs = useQuery({
    queryKey: [
      "notif-logs",
    ],

    queryFn: () =>
      api.getNotificationLogs(
        80
      ),
  });

  const qc =
    useQueryClient();

  const test =
    useMutation({
      mutationFn: () =>
        api.testNotification(),

      onSuccess: () => {
        toast.success(
          "Test notification sent"
        );

        qc.invalidateQueries({
          queryKey: [
            "notif-logs",
          ],
        });
      },

      onError: (
        e: Error
      ) =>
        toast.error(
          e.message
        ),
    });

  const subscribe =
    useMutation({
      mutationFn:
        async () => {
          let endpoint = `preview://device-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

          let auth_key =
            "preview-auth";

          let p256dh_key =
            "preview-p256dh";

          if (
            typeof window !==
              "undefined" &&
            "Notification" in
              window
          ) {
            try {
              const perm =
                await Notification.requestPermission();

              if (
                perm !==
                "granted"
              ) {
                throw new Error(
                  "Permission denied"
                );
              }

              if (
                "serviceWorker" in
                  navigator &&
                "PushManager" in
                  window
              ) {
                const reg =
                  await navigator.serviceWorker.getRegistration();

                if (
                  reg &&
                  reg.pushManager
                ) {
                  try {
                    const real =
                      await reg.pushManager.getSubscription();

                    if (
                      real
                    ) {
                      endpoint =
                        real.endpoint;
                    }
                  } catch {
                    //
                  }
                }
              }
            } catch (e) {
              throw e instanceof
                Error
                ? e
                : new Error(
                    "Notification setup failed"
                  );
            }
          }

          return api.subscribePush(
            {
              endpoint,
              auth_key,
              p256dh_key,
              user_agent:
                typeof navigator !==
                "undefined"
                  ? navigator.userAgent
                  : "preview",
            }
          );
        },

      onSuccess: () => {
        toast.success(
          "Notifications activated"
        );

        qc.invalidateQueries({
          queryKey: [
            "sub-status",
          ],
        });
      },

      onError: (
        e: Error
      ) =>
        toast.error(
          e.message
        ),
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Real-time alerts, execution reports and risk warnings."
        actions={
          <div className="flex flex-wrap gap-2">
            {sub.data
              ?.active ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  test.mutate()
                }
                disabled={
                  test.isPending
                }
                className="rounded-xl border-white/10 bg-[#0b1220]/60 text-white hover:bg-[#111827]"
              >
                <Send className="mr-2 h-3.5 w-3.5" />

                {test.isPending
                  ? "Sending..."
                  : "Send test"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() =>
                  subscribe.mutate()
                }
                disabled={
                  subscribe.isPending
                }
                className="rounded-xl bg-emerald-500 text-black hover:bg-emerald-400"
              >
                <BellRing className="mr-2 h-3.5 w-3.5" />

                {subscribe.isPending
                  ? "Activating..."
                  : "Activate notifications"}
              </Button>
            )}
          </div>
        }
      />

      {/* STATUS */}
      <ChartCard
        title="Push Subscription"
        description="Device connection to the trading notification engine"
        className="border border-white/10 bg-[#07101d]/70 shadow-[0_0_50px_rgba(0,0,0,0.35)]"
      >
        {!sub.data ? (
          <TableSkeleton
            rows={2}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0b1220]/70 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={
                    "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg " +
                    (sub.data
                      .active
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-slate-500/10 text-slate-400")
                  }
                >
                  {sub.data
                    .active ? (
                    <BellRing className="h-7 w-7" />
                  ) : (
                    <BellOff className="h-7 w-7" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {sub.data
                        .active
                        ? "Notifications Active"
                        : "Notifications Disabled"}
                    </h3>

                    {sub.data
                      .active && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>

                  <p className="mt-1 max-w-md text-sm text-slate-400">
                    {sub.data
                      .endpoint_prefix ??
                      sub.data
                        .message ??
                      "No endpoint registered"}
                  </p>
                </div>
              </div>

              <StatusPill
                tone={
                  sub.data
                    .active
                    ? "success"
                    : "muted"
                }
                dot
              >
                {sub.data
                  .active
                  ? "Connected"
                  : "Offline"}
              </StatusPill>
            </div>

            {!sub.data
              .active && (
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
                      <li>
                        • Trade execution alerts
                      </li>

                      <li>
                        • Stop loss / take profit events
                      </li>

                      <li>
                        • Daily P&L summaries
                      </li>

                      <li>
                        • Risk exposure warnings
                      </li>

                      <li>
                        • Strategy status updates
                      </li>
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
        {logs.isLoading ? (
          <TableSkeleton />
        ) : !logs.data
            ?.length ? (
          <EmptyState
            icon={
              Sparkles
            }
            title="No notifications yet"
            description="Trading and system alerts will appear here."
          />
        ) : (
          <div className="space-y-3">
            {logs.data.map(
              (n) => (
                <div
                  key={n.id}
                  className="group flex items-start gap-4 rounded-2xl border border-white/5 bg-[#0b1220]/60 p-4 transition-all duration-200 hover:border-white/10 hover:bg-[#0f172a]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.03] text-xl shadow-inner">
                    {NOTIF_ICONS[
                      n.type
                    ] ??
                      "🔔"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-white">
                            {
                              n.title
                            }
                          </h3>

                          {n.sent ? (
                            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                          )}
                        </div>

                        {n.body && (
                          <p className="mt-1 text-sm text-slate-400">
                            {
                              n.body
                            }
                          </p>
                        )}
                      </div>

                      <StatusPill
                        tone={
                          n.sent
                            ? "success"
                            : "destructive"
                        }
                        className="shrink-0"
                      >
                        {n.sent
                          ? "Delivered"
                          : "Failed"}
                      </StatusPill>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Bell className="h-3 w-3" />

                      {fmtDateTime(
                        n.sent_at
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
