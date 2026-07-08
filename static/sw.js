/* SIUU FITNESS — Push Notification Service Worker */

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

/* ── Push event → show notification ──────────────────────────────────── */
self.addEventListener('push', function(event) {
  let data = { title: 'SIUU FITNESS', body: 'Time to drink water! 💧' };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon   || '/icons/Icon-192.png',
      badge:   '/icons/Icon-192.png',
      tag:     'siuu-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
      data:    { url: '/' },
    })
  );
});

/* ── Notification tap → open the app ─────────────────────────────────── */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
