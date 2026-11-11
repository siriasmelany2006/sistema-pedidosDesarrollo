//--------- SERVICE WORKER ---------
// No se requiere funcionamiento sin conexión: solo se necesita
// un service worker con fetch para que la app sea instalable.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});

// Al tocar la notificación se abre (o se enfoca) la app
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function (ventanas) {
      if (ventanas.length > 0) return ventanas[0].focus();
      return self.clients.openWindow("/");
    })
  );
});