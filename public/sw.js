// Service worker del Sistema de Administración Comercial (SAC).
// Cachea el "shell" de la app (HTML/CSS/JS/iconos) para que abra rápido e instale como PWA.
// Los datos de negocio (/api/*) NUNCA se cachean: siempre van a la red, para no mostrar
// saldos o movimientos viejos como si fueran los actuales.

const CACHE_VERSION = 'pa-shell-demo-v4';
const APP_SHELL = [
  './',
  './index.html',
  './support.js',
  './demo-api.js',
  './manifest.json',
  './_ds/modernist-c9c68a8d-a1b6-4977-a96b-16c183d6a8e3/_ds_bundle.js',
  './_ds/modernist-c9c68a8d-a1b6-4977-a96b-16c183d6a8e3/styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Datos de negocio: siempre red, nunca cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.method !== 'GET') return;

  // Shell de la app: cache primero, con actualización en segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
