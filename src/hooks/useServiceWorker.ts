// Service Worker Registration Hook
import { useEffect } from 'react'

const isServiceWorkerSupported = 'serviceWorker' in navigator

export const useServiceWorker = () => {
    useEffect(() => {
        if (!isServiceWorkerSupported) {
            console.warn('Service Worker no es soportado en este navegador')
            return
        }

        // Registrar el Service Worker
        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                })

                console.log('Service Worker registrado:', registration.scope)

                // Escuchar actualizaciones
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing

                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Nuevo SW disponible, mostrar notificación de actualización
                                if (confirm('Nueva versión disponible. ¿Recargar la página?')) {
                                    window.location.reload()
                                }
                            }
                        })
                    }
                })

                // Forzar actualización del SW en desarrollo
                if (import.meta.env.DEV) {
                    registration.update()
                }

            } catch (error) {
                console.error('Error registrando Service Worker:', error)
            }
        }

        // Registrar cuando la página cargue
        window.addEventListener('load', registerSW)

        // Cleanup
        return () => {
            window.removeEventListener('load', registerSW)
        }
    }, [])

    return {
        isSupported: isServiceWorkerSupported,
        // Exponer funciones útiles para el SW
        triggerUpdate: () => {
            if (isServiceWorkerSupported) {
                navigator.serviceWorker.controller?.postMessage({ type: 'TRIGGER_UPDATE' })
            }
        },
        clearCache: async () => {
            if (isServiceWorkerSupported) {
                const cacheNames = await caches.keys()
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                )
                window.location.reload()
            }
        }
    }
}
