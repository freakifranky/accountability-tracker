self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Time to check in!';
  const options = {
    body: data.body || 'How are your goals going today?',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'checkin-reminder',
    renotify: true,
    data: { url: data.url || '/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes('/dashboard'));
      if (existing) return existing.focus();
      return clients.openWindow(event.notification.data ? event.notification.data.url : '/dashboard');
    })
  );
});
