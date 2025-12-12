import type { ClosureSnapshotPayload } from "../hooks/useCierreDiario"

export type GuardarCierreDiarioResponse = {
    closureId: string
    estado: "pendiente" | "pagado"
    totals: {
        netAfterDeductions: number
        deductionsAmount: number
        transbankAmount: number
    }
    pendingTotals?: {
        netAfterDeductions: number
        deductionsAmount: number
        transbankAmount: number
        pendingCount: number
    }
    contactEmailStatus?: "pending" | "skipped"
}

export type GuardarCierreDiarioError = {
    code: string
    message: string
    fields?: Record<string, string>
}

export type EliminarCierreDiarioResponse = {
    closureId: string
    status: "deleted"
    pendingTotals: {
        netAfterDeductions: number
        deductionsAmount: number
        transbankAmount: number
        pendingCount: number
    }
}

export const eliminarCierreDiario = async (params: {
    restaurantId: string
    closureId: string
    reason?: string
    deletedBy?: {
        uid?: string
        name?: string
        email?: string
    }
}): Promise<EliminarCierreDiarioResponse> => {
    const { restaurantId, closureId, reason, deletedBy } = params
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/eliminarCierreDiario`

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurantId, closureId, reason, deletedBy }),
    })

    const body = await response.json().catch(() => null)

    if (!response.ok || !body) {
        const message = body?.message ?? "No pudimos eliminar el cierre. Intenta nuevamente en unos segundos."
        throw new Error(message)
    }

    return body as EliminarCierreDiarioResponse
}


export const getApiBaseUrl = () => {
    const fallbackBaseUrl = typeof window === "undefined" ? "/api" : `${window.location.origin}/api`
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || fallbackBaseUrl
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

export const guardarCierreDiario = async (params: {
    restaurantId: string
    payload: ClosureSnapshotPayload
}): Promise<GuardarCierreDiarioResponse> => {
    const { restaurantId, payload } = params
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/guardarCierreDiario`
    const requestBody = { restaurantId, ...payload }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    })

    const parseBody = async () => {
        try {
            return (await response.json()) as GuardarCierreDiarioResponse | GuardarCierreDiarioError
        } catch {
            return null
        }
    }

    const body = await parseBody()

    if (!response.ok) {
        const error = (body as GuardarCierreDiarioError) ?? {
            code: "INTERNAL_ERROR",
            message: "No pudimos guardar el cierre. Intenta nuevamente en unos segundos.",
        }
        const errorMessage = error.message ?? "No pudimos guardar el cierre."
        const errorDetail = error.code ? `${errorMessage} (código: ${error.code})` : errorMessage
        throw new Error(errorDetail)
    }

    return body as GuardarCierreDiarioResponse
}
