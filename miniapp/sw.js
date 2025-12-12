// Service Worker for AIAccounter Mini App
// Provides offline caching and PWA capabilities

const CACHE_NAME = 'aiaccounter-v7';
const RUNTIME_CACHE = 'aiaccounter-runtime-v2';

// Critical assets to cache on install
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './styles/variables.css',
    './styles/theme.css',
    './styles/base.css',
    './styles/layout.css',
    './styles/utilities.css',
    './styles/components.css',
    './styles/budget.css',
    './styles/charts.css',
    './styles/history.css',
    './styles/settings.css',
    './styles/ai.css',
    './styles/recurring.css',
    './styles/debts.css',
    './styles/reports.css',
    './styles/goals.css',
    './styles/categories.css',
    './styles/gamification.css',
    './styles/responsive.css',
    './styles/desktop.css',
    './styles/premium.css',
    './styles/onboarding.css',
    './styles/admin.css',
    './styles/modal.css',
    './app.js',
    './admin.js',
    './onboarding.js',
    './api-helper.js',
    './cache.js',
    './i18n.js',
    './miniapp-config.js',
    './websocket.js'
];

// Install: Cache critical assets and skip waiting
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching critical assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[SW] Skip waiting - activate immediately');
                return self.skipWaiting();
            })
    );
});

// Activate: Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Claiming all clients');
                return self.clients.claim();
            })
    );
});

// Fetch: Network-first for everything to get latest version
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Always try network first for app files
    if (url.origin === location.origin && 
        (url.pathname.endsWith('.html') || 
         url.pathname.endsWith('.js') || 
         url.pathname.endsWith('.css') ||
         url.pathname === '/')) {
        
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .then(response => {
                    // Update cache with latest version
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(request, responseClone));
                    return response;
                })
                .catch(() => {
                    // Fallback to cache only if network fails
                    return caches.match(request);
                })
        );
        return;
    }
    
    // API requests: Network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE)
                            .then(cache => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache on network error
                    return caches.match(request)
                        .then(cached => cached || new Response(
                            JSON.stringify({ error: 'Offline' }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        ));
                })
        );
        return;
    }
    
    // Static assets: Cache-first with network fallback
    if (url.origin === location.origin || 
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('cdnjs.cloudflare.com')) {
        
        event.respondWith(
            caches.match(request)
                .then(cached => {
                    if (cached) return cached;
                    
                    return fetch(request)
                        .then(response => {
                            if (response.ok) {
                                const responseClone = response.clone();
                                caches.open(RUNTIME_CACHE)
                                    .then(cache => cache.put(request, responseClone));
                            }
                            return response;
                        });
                })
                .catch(() => {
                    // Return offline page for navigation requests
                    if (request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                })
        );
    }
});

// Background sync for pending operations (future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // Placeholder for future sync logic
    console.log('[SW] Background sync triggered');
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'У вас новое уведомление',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: data
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'AIAccounter', options)
    );
});

console.log('[SW] Service Worker loaded');
