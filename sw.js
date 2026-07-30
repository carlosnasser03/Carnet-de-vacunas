/**
 * Service worker: la app tiene que abrir sin red.
 *
 * Estrategia: red primero, caché como respaldo, para todo lo del propio origen.
 * Es un puñado de archivos pequeños, así que el costo de ir a la red es mínimo,
 * y a cambio nunca se sirve una versión vieja del código — el fallo clásico de
 * cachear primero y quedarse con una app desactualizada hasta vaciar la caché.
 */

const CACHE = 'carnet-v1';

const PRECARGA = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/vistas.js',
  './js/hojas.js',
  './js/ui.js',
  './js/store.js',
  './js/persistencia.js',
  './js/imagen.js',
  './js/instalar.js',
  './js/calendario.js',
  './js/fecha.js',
  './js/ics.js',
  './js/protocolos.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECARGA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const esNavegacion = req.mode === 'navigate';

  evento.respondWith(
    (async () => {
      try {
        const red = await fetch(req);
        if (red.ok) {
          const cache = await caches.open(CACHE);
          cache.put(esNavegacion ? './index.html' : req, red.clone());
        }
        return red;
      } catch {
        const enCache = await caches.match(esNavegacion ? './index.html' : req);
        return enCache ?? Response.error();
      }
    })(),
  );
});
