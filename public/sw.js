/**
 * Service Worker — TRADER Push Notifications
 * Requis pour que PushManager.subscribe() fonctionne.
 * Ce SW gère uniquement les push events — aucun cache.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Push event — déclenché par le backend via Supabase Edge Function.
 * Le payload JSON attendu : { title, body, data? }
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "TRAEX", body: event.data.text() };
  }

  const title = payload.title ?? "TRAEX Trading Alert";
  const options = {
    body:    payload.body ?? "",
    icon:    "/favicon.svg",
    badge:   "/favicon.svg",
    tag:     payload.tag ?? "traex-notif",
    renotify: true,
    data:    payload.data ?? {},
    actions: payload.actions ?? [],
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Notification click — ouvre l'app ou focus si déjà ouverte.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(url);
        } else {
          self.clients.openWindow(url);
        }
      })
  );
});
