// Service Worker para ReparteJusto - Cache Strategy Implementation
const CACHE_NAME = 'reparte-justo-v1'
const STATIC_CACHE_NAME = 'reparte-justo-static-v1'
const DYNAMIC_CACHE_NAME = 'reparte-justo-dynamic-v1'

// Assets estáticos que siempre deben estar cacheados
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/src/main.tsx',
    '/src/index.css',
    '/vite.svg',
    // Chunks críticos del bundle
    '/assets/index-9oJ9BLAR.js',
    '/assets/index-N00228rG.css',
]

// Assets dinámicos con estrategia diferente
const DYNAMIC_ASSETS_PATTERNS = [
    /^\/assets\/.*\.(js|css|png|jpg|jpeg|svg|webp|avif)$/,
    /^\/api\//,
    /^\/firebase\/.*/,
]

// Cache First Strategy para assets estáticos
const cacheFirst = async (request) => {
    try {
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
            return cachedResponse
        }

        const networkResponse = await fetch(request)
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME)
            await cache.put(request, networkResponse.clone())
        }
        return networkResponse
    } catch (error) {
        return caches.match(request)
    }
}

// Network First Strategy para datos dinámicos
const networkFirst = async (request) => {
    try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME)
            await cache.put(request, networkResponse.clone())
        }
        return networkResponse
    } catch (error) {
        const cachedResponse = await caches.match(request)
        return cachedResponse || new Response('Offline', { status: 503 })
    }
}

// Stale While Revalidate para contenido mixto
const staleWhileRevalidate = async (request) => {
    const cachedResponse = await caches.match(request)
    const networkPromise = fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME)
            await cache.put(request, networkResponse.clone())
        }
        return networkResponse
    })

    return cachedResponse || networkPromise
}

// Determinar estrategia basada en el request
const getStrategy = (request) => {
    const url = new URL(request.url)

    // HTML principal - Stale While Revalidate
    if (request.destination === 'document') {
        return staleWhileRevalidate(request)
    }

    // Assets estáticos - Cache First
    if (STATIC_ASSETS.includes(url.pathname) ||
        url.pathname.startsWith('/assets/') ||
        request.destination === 'script' ||
        request.destination === 'style') {
        return cacheFirst(request)
    }

    // API y datos dinámicos - Network First
    if (url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/firebase/')) {
        return networkFirst(request)
    }

    // Default - Network First
    return networkFirst(request)
}

// Evento de instalación - Precache crítico
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS)
            })
            .then(() => {
                return self.skipWaiting()
            })
    )
})

// Evento de activación - Limpieza de caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys()
            await Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE_NAME &&
                        cacheName !== DYNAMIC_CACHE_NAME &&
                        cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName)
                    }
                })
            )
            return self.clients.claim()
        })()
    )
})

// Evento de fetch - Estrategias de cache
self.addEventListener('fetch', (event) => {
    const { request } = event

    // Solo manejar requests GET
    if (request.method !== 'GET') {
        return
    }

    // Ignorar chrome-extension y otros no-http
    if (!request.url.startsWith('http')) {
        return
    }

    event.respondWith(getStrategy(request))
})

// Background Sync para datos offline
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Implementar lógica de sync cuando sea necesario
            Promise.resolve()
        )
    }
})

// Push notifications (futuro)
self.addEventListener('push', (event) => {
    // Implementar notificaciones push cuando sea necesario
    const options = {
        body: event.data.text(),
        icon: '/vite.svg',
        badge: '/vite.svg'
    }

    event.waitUntil(
        self.registration.showNotification('ReparteJusto', options)
    )
})
