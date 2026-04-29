'use strict';

const CACHE_NAME = '5s-assessment-v3.0.5';
const ASSETS = [
  './',
  './index.html',
  './Index.html',
  './manifest.json',
  './audit5s-config-upgrade.js',
  './audit5s-history-dashboard.js',
  './audit5s-area-evolution.js',
  './audit5s-whatsapp-share-fix.js',
  './audit5s-pwa-update.js'
];

function injectScripts(html){
  const scripts = '\n<script src="audit5s-config-upgrade.js" defer></script>\n<script src="audit5s-history-dashboard.js" defer></script>\n<script src="audit5s-area-evolution.js" defer></script>\n<script src="audit5s-whatsapp-share-fix.js" defer></script>\n<script src="audit5s-pwa-update.js" defer></script>\n';
  if(html.includes('audit5s-area-evolution.js')) return html;
  if(html.includes('</body>')) return html.replace('</body>', scripts + '</body>');
  return html + scripts;
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => response.text())
        .then(html => new Response(injectScripts(html), {
          headers: {'Content-Type':'text/html; charset=UTF-8'}
        }))
        .catch(() => caches.match('./index.html').then(cached => cached ? cached.text() : '')
          .then(html => new Response(injectScripts(html), {
            headers: {'Content-Type':'text/html; charset=UTF-8'}
          })))
    );
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
