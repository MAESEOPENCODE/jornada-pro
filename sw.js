const CACHE_NAME = 'jornada-cache-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Deja pasar directo las peticiones a Firebase/Google/mapas (necesitan red real siempre)
  const url = event.request.url;
  if (url.includes('firebaseio') || url.includes('googleapis') || url.includes('gstatic') ||
      url.includes('firestore') || url.includes('openstreetmap') || url.includes('cdnjs') ||
      url.includes('fonts.g')) {
    return;
  }
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    // Páginas HTML: intenta red primero para no quedarte con una versión vieja pegada.
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  // Resto de recursos propios (iconos, manifest): caché primero, con refresco en segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
