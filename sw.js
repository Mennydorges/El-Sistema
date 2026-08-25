/* ==========================================================
   SISTEMA · service worker
   Solo escucha notificaciones. NO guarda nada en caché:
   la app siempre se carga fresca desde la red.
   ========================================================== */

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Sin interceptar peticiones: nada de caché, nada de versiones congeladas.

self.addEventListener('push', e => {
  let d = { title: 'Sistema', body: '' };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (err) {
    if (e.data) d.body = e.data.text();
  }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: d.icon || './icon.png',
    badge: d.icon || './icon.png',
    tag: d.tag || 'sistema',
    renotify: true,
    requireInteraction: true,   // se queda hasta que la toques
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(lista => {
      for (const c of lista) if ('focus' in c) return c.focus();
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    }));
});
