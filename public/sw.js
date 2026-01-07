const CACHE_NAME = 'main-app-v2';
const urlsToCache = [
  '/lista',
  '/assets/icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Notificación";
  const body = data.body || "Nueva actualización disponible";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || "/assets/icon.png",
      badge: "/assets/icon.png",
      vibrate: [200, 100, 200],
      data: {
        url: data.url || "/lista"
      }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});