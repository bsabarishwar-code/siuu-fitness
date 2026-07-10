self.addEventListener('install', function (event) {
  // Force immediate activation — no waiting for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Take control of all open pages immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
  var data = { title: 'Siuu Fitness', body: 'Stay on track!' };
  try {
    if (event.data) data = JSON.parse(event.data.text());
  } catch (_) {}

  // iOS Safari: only title + body + icon are supported; omit unsupported fields
  var options = {
    body: data.body || '',
    icon: data.icon || '/icons/Icon-192.png',
    badge: '/icons/Icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Siuu Fitness', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var c = clientList[i];
          if ('focus' in c) return c.focus();
        }
        if (clients.openWindow) return clients.openWindow('/');
      })
  );
});
