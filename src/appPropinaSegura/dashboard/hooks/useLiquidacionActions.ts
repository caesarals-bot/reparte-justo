import { useCallback } from "react"

import { aggregateMembersFromClosures, summarizeClosures } from "../utils/closureCalculations"
import type { ClosureDocument, SettlementMode } from "./useClosuresDashboard"
import { getApiBaseUrl } from "@/appPropinaSegura/cierre/services/closuresApi"

export type LiquidacionRange = {
    from: Date | undefined
    to: Date | undefined
}

export type LiquidacionPayload = {
    restaurantId: string
    closureIds: string[]
    range: {
        from: string | null
        to: string | null
    }
    totals: {
        netAfterDeductions: number
        propinas: number
        transbank: number
        deductions: number
        generalExpense: number
    }
    members: ReturnType<typeof aggregateMembersFromClosures>
    contact?: {
        email?: string
        responsibleName?: string
    }
    mode: "pool" | "directa"
    settlementFrequency: "daily" | "cycle"
    directSalesAdjustments?: {
        percentageFee?: number
        fixedFee?: number
        notes?: string
    }
}

type BuildLiquidacionPayloadArgs = {
    restaurantId: string
    closures: ClosureDocument[]
    dateRange: LiquidacionRange
    contact?: LiquidacionPayload["contact"]
    directSalesAdjustments?: LiquidacionPayload["directSalesAdjustments"]
    modeOverride?: SettlementMode | null
}

const toIsoString = (value?: Date) => value?.toISOString() ?? null

export type LiquidarPeriodoResponse = {
    processedCount: number
    updatedClosureIds: string[]
    settledReferenceDates: string[]
    pendingTotals: {
        netAfterDeductions: number
        deductionsAmount: number
        transbankAmount: number
        pendingCount: number
    }
}

type LiquidarPeriodoErrorResponse = {
    code?: string
    message?: string
}

const isLiquidarPeriodoResponse = (value: unknown): value is LiquidarPeriodoResponse => {
    if (!value || typeof value !== "object") {
        return false
    }

    const candidate = value as Partial<LiquidarPeriodoResponse>
    return typeof candidate.processedCount === "number" && Array.isArray(candidate.updatedClosureIds)
}

export const useLiquidacionActions = () => {
    const buildLiquidacionPayload = useCallback(
        ({
            restaurantId,
            closures,
            dateRange,
            contact,
            directSalesAdjustments,
            modeOverride,
        }: BuildLiquidacionPayloadArgs): LiquidacionPayload => {
            const totals = summarizeClosures(closures)
            const members = aggregateMembersFromClosures(closures)
            const inferredMode = closures[0]?.mode === "directa" ? "directa" : "pool"
            const mode = modeOverride ?? inferredMode
            const isSingleDay = Boolean(dateRange.from && dateRange.to && dateRange.from.getTime() === dateRange.to.getTime())

            return {
                restaurantId,
                closureIds: closures.map((closure) => closure.id),
                range: {
                    from: toIsoString(dateRange.from),
                    to: toIsoString(dateRange.to),
                },
                totals: {
                    netAfterDeductions: totals.totalNetAfterDeductions,
                    propinas: totals.totalPropinas,
                    transbank: totals.totalTransbank,
                    deductions: totals.totalDeductions,
                    generalExpense: totals.totalGeneralExpense,
                },
                members,
                contact,
                mode,
                settlementFrequency: isSingleDay ? "daily" : "cycle",
                directSalesAdjustments,
            }
        },
        [],
    )

    const liquidarPeriodo = useCallback(async (payload: LiquidacionPayload) => {
        const baseUrl = getApiBaseUrl()
        const url = `${baseUrl}/liquidarPeriodo`

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        let body: LiquidarPeriodoResponse | LiquidarPeriodoErrorResponse | null = null
        try {
            body = (await response.json()) as typeof body
        } catch {
            // ignoramos, se manejará abajo
        }

        if (!response.ok) {
            const errorBody = isLiquidarPeriodoResponse(body) ? null : (body as LiquidarPeriodoErrorResponse | null)
            const detail = errorBody?.message ?? "No pudimos liquidar el periodo. Intenta nuevamente."
            const code = errorBody?.code
            throw new Error(code ? `${detail} (código: ${code})` : detail)
        }

        if (!isLiquidarPeriodoResponse(body)) {
            throw new Error("Respuesta inesperada del backend de liquidación.")
        }

        return body
    }, [])

    return {
        buildLiquidacionPayload,
        liquidarPeriodo,
    }
}
