import { z } from "zod"

export const liquidacionRangeSchema = z.object({
    from: z.string().nullable(),
    to: z.string().nullable(),
})

export const liquidacionTotalsSchema = z.object({
    netAfterDeductions: z.number().finite(),
    propinas: z.number().finite(),
    transbank: z.number().finite(),
    deductions: z.number().finite(),
    generalExpense: z.number().finite(),
})

export const liquidacionMemberSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    role: z.string().nullable().optional(),
    email: z.string().email().optional(),
    totalNeto: z.number().finite(),
    totalPenalizaciones: z.number().finite(),
    totalDeducciones: z.number().finite(),
    totalAjustes: z.number().finite(),
})

export const liquidacionContactSchema = z
    .object({
        email: z.string().email().optional(),
        responsibleName: z.string().optional(),
    })
    .optional()

export const liquidarPeriodoSchema = z.object({
    restaurantId: z.string().min(1),
    closureIds: z.array(z.string().min(1)).min(1),
    range: liquidacionRangeSchema,
    totals: liquidacionTotalsSchema,
    members: z.array(liquidacionMemberSchema),
    contact: liquidacionContactSchema,
})

export type LiquidarPeriodoInput = z.infer<typeof liquidarPeriodoSchema>

export type LiquidarPeriodoResult = {
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
