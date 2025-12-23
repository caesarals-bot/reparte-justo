/**
 * Hook reutilizable para integrar Cloudflare Turnstile
 * Maneja la carga del script, renderizado del widget y gestión del token
 */

import { useEffect, useRef, useState, useCallback } from "react"

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement,
                options: {
                    sitekey: string
                    callback: (token: string) => void
                    "expired-callback"?: () => void
                    "error-callback"?: () => void
                    theme?: "light" | "dark" | "auto"
                    size?: "normal" | "compact"
                }
            ) => string
            reset: (widgetId?: string) => void
            remove: (widgetId?: string) => void
        }
    }
}

type UseTurnstileOptions = {
    siteKey?: string
    theme?: "light" | "dark" | "auto"
    size?: "normal" | "compact"
    onVerify?: (token: string) => void
    onExpire?: () => void
    onError?: () => void
}

type UseTurnstileReturn = {
    token: string | null
    isReady: boolean
    isVerified: boolean
    containerRef: React.RefObject<HTMLDivElement | null>
    reset: () => void
}

const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js"

export const useTurnstile = (options: UseTurnstileOptions = {}): UseTurnstileReturn => {
    const {
        siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || "",
        theme = "auto",
        size = "normal",
        onVerify,
        onExpire,
        onError,
    } = options

    const [token, setToken] = useState<string | null>(null)
    const [isReady, setIsReady] = useState(false)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const widgetIdRef = useRef<string | null>(null)

    // Cargar script de Turnstile
    useEffect(() => {
        if (!siteKey) {
            setIsReady(false)
            return
        }

        if (typeof window === "undefined") {
            return
        }

        const existing = document.querySelector(
            `script[src="${TURNSTILE_SCRIPT_URL}"]`
        ) as HTMLScriptElement | null

        const markReadyIfAvailable = () => {
            if (window.turnstile?.render) {
                setIsReady(true)
            }
        }

        if (!existing) {
            const script = document.createElement("script")
            script.src = TURNSTILE_SCRIPT_URL
            script.async = true
            script.defer = true
            script.onload = () => markReadyIfAvailable()
            script.onerror = () => setIsReady(false)
            document.body.appendChild(script)
        } else {
            markReadyIfAvailable()

            const handleLoad = () => markReadyIfAvailable()
            const handleError = () => setIsReady(false)

            existing.addEventListener("load", handleLoad)
            existing.addEventListener("error", handleError)

            return () => {
                existing.removeEventListener("load", handleLoad)
                existing.removeEventListener("error", handleError)
            }
        }
    }, [siteKey])

    // Renderizar widget cuando esté listo
    useEffect(() => {
        if (!isReady || !containerRef.current || !window.turnstile?.render || !siteKey) {
            return
        }

        // Si ya hay un widget, no renderizar otro
        if (widgetIdRef.current) {
            return
        }

        const widgetId = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            size,
            callback: (newToken) => {
                setToken(newToken)
                onVerify?.(newToken)
            },
            "expired-callback": () => {
                setToken(null)
                onExpire?.()
            },
            "error-callback": () => {
                setToken(null)
                onError?.()
            },
        })

        widgetIdRef.current = widgetId

        // Cleanup al desmontar
        return () => {
            if (widgetIdRef.current && window.turnstile?.remove) {
                window.turnstile.remove(widgetIdRef.current)
                widgetIdRef.current = null
            }
        }
    }, [isReady, siteKey, theme, size, onVerify, onExpire, onError])

    const reset = useCallback(() => {
        setToken(null)
        if (widgetIdRef.current && window.turnstile?.reset) {
            window.turnstile.reset(widgetIdRef.current)
        }
    }, [])

    return {
        token,
        isReady,
        isVerified: Boolean(token),
        containerRef,
        reset,
    }
}
