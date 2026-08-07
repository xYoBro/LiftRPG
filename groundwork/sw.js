// ── Groundwork tombstone worker ──────────────────────────────────────────────
// The station is decommissioned (D65). This worker's only job is to undo the
// old one on every installed client: clear all caches, unregister, and release
// every window back to the network, where the redirect stub now lives.
// No fetch handler — requests go straight to the network from here on.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) client.navigate(client.url);
  })());
});
