/* ==========================================================
   SISTEMA · service worker
   Dos trabajos:
   1. Guardar una copia de la app para que funcione sin internet.
   2. Recibir las notificaciones.

   La copia NUNCA se sirve si hay red: primero se pide la versión
   nueva y solo si falla se usa la guardada. Así nunca te quedas
   con una versión vieja, pero tampoco te quedas sin app.
   ========================================================== */

const CACHE = 'sistema-v1';

self.addEventListener('install', e => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(ns => Promise.all(ns.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // solo lo nuestro

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then(g => g || caches.match('./')))
  );
});

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
    requireInteraction: true,
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
