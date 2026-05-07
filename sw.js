const CACHE = 'wf-prod-v1';
const ASSETS = ['/', './index.html', './logo-wf.png', './icon-192.png'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Laisser passer les requêtes Supabase sans interception
    if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
        return;
    }

    // Cache-first pour les assets de l'app
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                if (response.ok && e.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return response;
            }).catch(() => {
                // Fallback vers index.html pour les navigations
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
