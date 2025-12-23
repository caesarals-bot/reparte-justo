/**
 * Componente reutilizable para Cloudflare Turnstile
 * Wrapper visual del hook useTurnstile
 */

import { useTurnstile } from "@/hooks/useTurnstile"
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react"

type TurnstileWidgetProps = {
    onVerify?: (token: string) => void
    onExpire?: () => void
    onError?: () => void
    theme?: "light" | "dark" | "auto"
    size?: "normal" | "compact"
    className?: string
    showStatus?: boolean
}

export const TurnstileWidget = ({
    onVerify,
    onExpire,
    onError,
    theme = "auto",
    size = "normal",
    className = "",
    showStatus = false,
}: TurnstileWidgetProps) => {
    const { containerRef, isReady, isVerified } = useTurnstile({
        theme,
        size,
        onVerify,
        onExpire,
        onError,
    })

    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || ""

    if (!siteKey) {
        return null
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {!isReady && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando verificación...</span>
                </div>
            )}
            
            <div ref={containerRef} />
            
            {showStatus && isReady && (
                <div className="flex items-center gap-2 text-sm">
                    {isVerified ? (
                        <>
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Verificado</span>
                        </>
                    ) : (
                        <>
                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-600">Completa la verificación</span>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export { useTurnstile }
