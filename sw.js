/* Deja la app funcionando sin internet. Sirve lo guardado al toque y, si hay
   conexión, baja la versión nueva por detrás: el cambio se ve al abrir de nuevo.
   Al publicar cambios conviene subir el número de CACHE. */
const CACHE = 'finanzas-5';
const ARCHIVOS = ['./', 'index.html', 'estilo.css', 'logica.js', 'app.js', 'manifest.webmanifest',
  'fuentes/InterTight.woff2', 'iconos/icono-180.png', 'iconos/icono-192.png', 'iconos/icono-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const pedido = e.request;
  const url = new URL(pedido.url);
  if (pedido.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(pedido, { ignoreSearch: true }).then(function (guardado) {
      const deRed = fetch(pedido).then(function (r) {
        // las variantes con "?algo" no se guardan, para no llenar la caché de copias
        if (r && r.ok && !url.search) c.put(pedido, r.clone());
        return r;
      }).catch(function () { return guardado; });
      return guardado || deRed;
    });
  }));
});
