/* Fênix Cofrinho — service worker.
   Arquivo de infraestrutura PWA: nome fixo, sem versão (regra de nomenclatura Fênix).
   - Páginas do app: rede primeiro (as atualizações chegam logo), cache como reserva offline.
   - Fênix Core e Firebase SDK (módulos): cache com atualização em segundo plano.
   - Dados do Firestore/Auth não passam por aqui: o Firebase cuida do próprio cache. */
const CACHE = "fenix-cofrinho-v1";
const CASA = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
const EXTERNOS = ["fenicris-dev.github.io", "www.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CASA.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith("fenix-cofrinho-")).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function redePrimeiro(req) {
  try {
    const r = await fetch(req);
    if (r && r.ok) { const c = await caches.open(CACHE); c.put(req, r.clone()); }
    return r;
  } catch (e) {
    return (await caches.match(req)) || (await caches.match("./index.html")) || Response.error();
  }
}
async function cacheEAtualiza(req) {
  const c = await caches.open(CACHE);
  const guardado = await c.match(req);
  const rede = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
  return guardado || (await rede) || Response.error();
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(req.mode === "navigate" ? redePrimeiro(req) : cacheEAtualiza(req));
  } else if (EXTERNOS.includes(url.hostname)) {
    e.respondWith(cacheEAtualiza(req));
  }
});
