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

export const getApiBaseUrl = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api"
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

export const guardarCierreDiario = async (params: {
    restaurantId: string
    payload: ClosureSnapshotPayload
}): Promise<GuardarCierreDiarioResponse> => {
    const { restaurantId, payload } = params
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/guardarCierreDiario`

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurantId, ...payload }),
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
