self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};

  event.waitUntil(
    (() => {
      const options = {
        body: data.message || 'Nueva notificación',
        icon: data.icon || '/assets/icon.png',
        badge: '/assets/icon.png',
        vibrate: [200, 100, 200],
        data: {
          url: data.url || '/'
        }
      };
      
      if (data.image) {
        options.image = data.image;
      }
      
      return self.registration.showNotification(
        data.title || 'MJ FOOD',
        options
      );
    })()
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});