// Compatibility update: retire old cache-first workers without caching orders.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(key => key.startsWith('alerta-grafica-')).map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});
// Requests use the network and the browser's revalidated HTTP cache.
