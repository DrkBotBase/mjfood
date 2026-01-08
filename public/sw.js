self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'MJ FOOD',
      {
        body: data.message || 'Nueva notificación',
        icon: data.icon || '/assets/icon.png',
        badge: '/assets/icon.png',
        image: data.image || '/assets/banner.png',
        vibrate: [200, 100, 200],
        data: {
          url: data.url || '/'
        }
      }
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});