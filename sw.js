const CACHE = 'wf-prod-v2';
const STATIC_ASSETS = ['./logo-wf.png', './icon-192.png'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
        .then(() => self.clients.matchAll({ type: 'window' }).then(clients =>
            clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
        ))
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Laisser passer les requêtes Supabase sans interception
    if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
        return;
    }

    // Network-first pour index.html : toujours la version la plus récente, cache en fallback offline
    if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('index.html')) {
        e.respondWith(
            fetch(e.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return response;
            }).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Cache-first pour les assets statiques (images, icônes)
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                if (response.ok && e.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return response;
            });
        })
    );
});
