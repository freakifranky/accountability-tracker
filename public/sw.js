self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Time to check in!';
  const goalId = data.goalId || null;
  const options = {
    body: data.body || 'How are your goals going today?',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: goalId ? `checkin-${goalId}` : 'checkin-reminder',
    renotify: true,
    data: { url: data.url || '/dashboard', goalId },
    actions: goalId
      ? [
          { action: 'done', title: '✓ Done' },
          { action: 'later', title: 'Later' },
        ]
      : [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, goalId } = event.notification.data || {};

  if (event.action === 'done' && goalId) {
    const today = new Date().toISOString().split('T')[0];
    event.waitUntil(
      fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, date: today, completed: true }),
      })
    );
    return;
  }

  if (event.action === 'later') {
    // Just dismissed — do nothing
    return;
  }

  // Tapping the notification body opens the goal page
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const target = url || '/dashboard';
      const existing = list.find((c) => c.url.includes(target));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
