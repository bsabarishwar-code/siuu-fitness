self.addEventListener('push', function(event) {
  let data = { title: 'Siuu Fitness', body: 'Stay on track!' };
  try { data = event.data ? JSON.parse(event.data.text()) : data; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/Icon-192.png',
      badge: '/icons/Icon-192.png',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
