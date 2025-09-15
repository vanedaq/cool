const CACHE_NAME = 'organizador-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.app.css',
  '/app.app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  // network-first fallback to cache
  event.respondWith(
    fetch(event.request).then(resp=>{
      if(event.request.method === 'GET' && resp && resp.status === 200){
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c=>c.put(event.request, copy));
      }
      return resp;
    }).catch(()=>caches.match(event.request).then(r=>r||new Response('',{status:404})))
  );
});