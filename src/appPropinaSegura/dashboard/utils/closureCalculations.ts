import type { ClosureDocument, StaffAssignment } from "../hooks/useClosuresDashboard"

export type ClosuresTotalsSnapshot = {
    totalNetAfterDeductions: number
    totalDeductions: number
    totalPropinas: number
    totalTransbank: number
    totalGeneralExpense: number
    memberCount: number
}

export type LiquidacionMemberSummary = {
    id: string
    nombre: string
    role?: string | null
    email?: string
    totalNeto: number
    totalPenalizaciones: number
    totalDeducciones: number
    totalAjustes: number
}

export type LiquidacionGeneralExpenseSummary = {
    id: string
    nombre: string
    tipo?: string
    total: number
}

export const aggregateGeneralExpensesFromClosures = (
    closures: ClosureDocument[],
): LiquidacionGeneralExpenseSummary[] => {
    if (!closures.length) {
        return []
    }

    const map = new Map<string, LiquidacionGeneralExpenseSummary>()

    closures.forEach((closure) => {
        closure.generalExpenses.forEach((expense) => {
            const key = `${expense.nombre}|${expense.tipo ?? "general"}`
            const existing = map.get(key)

            if (existing) {
                existing.total += expense.monto
            } else {
                map.set(key, {
                    id: key,
                    nombre: expense.nombre,
                    tipo: expense.tipo,
                    total: expense.monto,
                })
            }
        })
    })

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

export const buildPenaltyAndAdjustmentEntries = (
    closures: ClosureDocument[],
): PenaltyAdjustmentEntry[] => {
    if (!closures.length) {
        return []
    }

    const entries: PenaltyAdjustmentEntry[] = []

    closures.forEach((closure) => {
        const referenceDate = normalizeReferenceDate(closure.metadata.referenceDate)
        const rawReferenceDate = closure.metadata.referenceDate ?? null

        collectAssignments(closure).forEach((assignment) => {
            if (!assignment.present || assignment.penaltyAmount <= 0) {
                return
            }

            const identifier = buildMemberIdentifier(assignment.staffId, assignment.nombre, assignment.role)
            entries.push({
                id: `${closure.id}-penalty-${identifier}`,
                referenceDate,
                rawReferenceDate,
                kind: "penalizacion",
                description: `Penalización para ${assignment.nombre}${assignment.role ? ` (${assignment.role})` : ""}`,
                amount: -Math.abs(assignment.penaltyAmount),
            })
        })

        closure.adjustments.forEach((adjustment) => {
            const isPercentage = adjustment.variant === "porcentaje"
            const signedAmount = !isPercentage
                ? (adjustment.type === "descuento" ? -Math.abs(adjustment.amount) : Math.abs(adjustment.amount))
                : undefined
            const amountLabel = isPercentage
                ? `${adjustment.type === "descuento" ? "-" : "+"}${(adjustment.percentage ?? 0).toFixed(2)}%`
                : undefined

            const targetLabel = adjustment.staffName ? ` para ${adjustment.staffName}` : " general"
            const motiveLabel = adjustment.motivo ? ` — ${adjustment.motivo}` : ""
            const variantLabel = isPercentage ? "porcentaje" : "monto"

            entries.push({
                id: `${closure.id}-adjustment-${adjustment.id}`,
                referenceDate,
                rawReferenceDate,
                kind: "ajuste",
                description: `Ajuste por ${variantLabel}${targetLabel}${motiveLabel}`.trim(),
                amount: signedAmount,
                amountLabel,
            })
        })
    })

    return entries.sort((a, b) => {
        const dateA = a.referenceDate?.getTime() ?? 0
        const dateB = b.referenceDate?.getTime() ?? 0

        if (dateA !== dateB) {
            return dateA - dateB
        }

        return a.description.localeCompare(b.description)
    })
}

export type DailyClosureSummary = {
    id: string
    referenceDate: Date | null
    rawReferenceDate?: string | null
    netAfterDeductions: number
    deductionsAmount: number
    propinas: number
    transbankAmount: number
    generalExpense: number
}

export type PenaltyAdjustmentEntry = {
    id: string
    referenceDate: Date | null
    rawReferenceDate?: string | null
    kind: "penalizacion" | "ajuste"
    description: string
    amount?: number
    amountLabel?: string
}

export const normalizeReferenceDate = (value?: string | null): Date | null => {
    if (!value) {
        return null
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return null
    }

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

const buildMemberIdentifier = (staffId?: string, name?: string, role?: string | null) =>
    staffId ?? `${name ?? ""}|${role ?? ""}`

const collectAssignments = (closure: ClosureDocument): StaffAssignment[] => [
    ...closure.assignments.servicio,
    ...closure.assignments.cocina,
    ...closure.assignments.ventaDirecta,
    ...closure.assignments.pocilloSecundario,
]

export const buildClosureHighlights = (closures: ClosureDocument[]) => {
    if (!closures.length) {
        return {
            pendingDates: [] as Date[],
            settledDates: [] as Date[],
            latestDates: [] as Date[],
        }
    }

    const pending = new Set<number>()
    const settled = new Set<number>()
    let latestDate: Date | null = null

    closures.forEach((closure) => {
        const normalized = normalizeReferenceDate(closure.metadata.referenceDate)
        if (!normalized) {
            return
        }

        const timestamp = normalized.getTime()

        if (closure.estado === "pendiente") {
            pending.add(timestamp)
        } else {
            settled.add(timestamp)
        }

        if (!latestDate || normalized > latestDate) {
            latestDate = normalized
        }
    })

    return {
        pendingDates: Array.from(pending).map((value) => new Date(value)),
        settledDates: Array.from(settled).map((value) => new Date(value)),
        latestDates: latestDate ? [latestDate] : [],
    }
}

export const summarizeClosures = (closures: ClosureDocument[]): ClosuresTotalsSnapshot => {
    if (!closures.length) {
        return {
            totalNetAfterDeductions: 0,
            totalDeductions: 0,
            totalPropinas: 0,
            totalTransbank: 0,
            totalGeneralExpense: 0,
            memberCount: 0,
        }
    }

    let totalNetAfterDeductions = 0
    let totalDeductions = 0
    let totalPropinas = 0
    let totalTransbank = 0
    let totalGeneralExpense = 0
    const memberIds = new Set<string>()

    closures.forEach((closure) => {
        totalNetAfterDeductions += closure.totals.netAfterDeductions
        totalDeductions += closure.totals.deductionsAmount
        totalPropinas += closure.totals.propinas
        totalTransbank += closure.totals.transbankAmount
        totalGeneralExpense += closure.totals.generalExpense

        collectAssignments(closure).forEach((assignment) => {
            if (!assignment.present) {
                return
            }

            const identifier = buildMemberIdentifier(assignment.staffId, assignment.nombre, assignment.role)
            if (identifier) {
                memberIds.add(identifier)
            }
        })
    })

    return {
        totalNetAfterDeductions,
        totalDeductions,
        totalPropinas,
        totalTransbank,
        totalGeneralExpense,
        memberCount: memberIds.size,
    }
}

export const buildDailyClosureSummaries = (closures: ClosureDocument[]): DailyClosureSummary[] => {
    if (!closures.length) {
        return []
    }

    const summary = closures.map((closure) => ({
        id: closure.id,
        referenceDate: normalizeReferenceDate(closure.metadata.referenceDate),
        rawReferenceDate: closure.metadata.referenceDate ?? null,
        netAfterDeductions: closure.totals.netAfterDeductions,
        deductionsAmount: closure.totals.deductionsAmount,
        propinas: closure.totals.propinas,
        transbankAmount: closure.totals.transbankAmount,
        generalExpense: closure.totals.generalExpense,
    }))

    return summary.sort((a, b) => {
        const dateA = a.referenceDate?.getTime()
        const dateB = b.referenceDate?.getTime()

        if (dateA === undefined && dateB === undefined) {
            return 0
        }

        if (dateA === undefined || dateA === null) {
            return 1
        }

        if (dateB === undefined || dateB === null) {
            return -1
        }

        return dateA - dateB
    })
}

export const aggregateMembersFromClosures = (closures: ClosureDocument[]): LiquidacionMemberSummary[] => {
    if (!closures.length) {
        return []
    }

    const map = new Map<string, LiquidacionMemberSummary>()

    closures.forEach((closure) => {
        const assignments = collectAssignments(closure)

        assignments.forEach((assignment) => {
            if (!assignment.present) {
                return
            }

            const id = buildMemberIdentifier(assignment.staffId, assignment.nombre, assignment.role)
            if (!id) {
                return
            }

            const neto = assignment.netAmountAdjusted ?? assignment.netAmount
            const ajustesPorcentaje = assignment.adjustmentSummary?.totalAmount ?? 0

            const existing = map.get(id)

            if (existing) {
                existing.totalNeto += neto
                existing.totalPenalizaciones += assignment.penaltyAmount
                existing.totalDeducciones += assignment.deductionAmount
                existing.totalAjustes += ajustesPorcentaje
                if (!existing.email && assignment.email) {
                    existing.email = assignment.email
                }
            } else {
                map.set(id, {
                    id,
                    nombre: assignment.nombre,
                    role: assignment.role,
                    email: assignment.email,
                    totalNeto: neto,
                    totalPenalizaciones: assignment.penaltyAmount,
                    totalDeducciones: assignment.deductionAmount,
                    totalAjustes: ajustesPorcentaje,
                })
            }
        })

        closure.adjustments.forEach((adjustment) => {
            if (adjustment.variant === "porcentaje") {
                return
            }

            const signedAmount = adjustment.type === "descuento" ? -adjustment.amount : adjustment.amount
            if (!signedAmount) {
                return
            }

            const id = buildMemberIdentifier(adjustment.staffId, adjustment.staffName)
            if (!id) {
                return
            }

            const existing = map.get(id)
            if (existing) {
                existing.totalNeto += signedAmount
                existing.totalAjustes += signedAmount
            } else {
                map.set(id, {
                    id,
                    nombre: adjustment.staffName ?? "—",
                    role: undefined,
                    totalNeto: signedAmount,
                    totalPenalizaciones: 0,
                    totalDeducciones: 0,
                    totalAjustes: signedAmount,
                })
            }
        })
    })

    return Array.from(map.values()).sort((a, b) => b.totalNeto - a.totalNeto)
}
