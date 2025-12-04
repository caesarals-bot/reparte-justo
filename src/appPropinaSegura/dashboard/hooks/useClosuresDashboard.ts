import { useCallback, useEffect, useMemo, useState } from "react"
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, type Timestamp } from "firebase/firestore"

import { buildDailyClosureSummaries, summarizeClosures } from "../utils/closureCalculations"

import { db } from "@/firebase/config"

export type ClosureAdjustmentVariant = "monto" | "porcentaje"

export type ClosureAdjustment = {
    id: string
    staffId?: string
    staffName?: string
    amount: number
    type: "incremento" | "descuento"
    variant: ClosureAdjustmentVariant
    percentage?: number
    motivo?: string
    createdAt?: Timestamp | null
    createdBy?: string
}

const mapDirectSalesAdjustmentsSnapshot = (value: unknown): DirectSalesAdjustmentsSnapshot | null => {
    const record = extractRecord(value)

    if (!record) {
        return null
    }

    const percentageFee = typeof record.percentageFee === "number" && Number.isFinite(record.percentageFee)
        ? record.percentageFee
        : undefined
    const fixedFee = typeof record.fixedFee === "number" && Number.isFinite(record.fixedFee) ? record.fixedFee : undefined
    const notes = typeof record.notes === "string" && record.notes.trim().length ? record.notes.trim() : undefined

    if (typeof percentageFee === "undefined" && typeof fixedFee === "undefined" && typeof notes === "undefined") {
        return null
    }

    return {
        percentageFee,
        fixedFee,
        notes,
    }
}

const mapConfigurationSnapshot = (value: unknown): ClosureConfigurationSnapshot | undefined => {
    const record = extractRecord(value)
    if (!record) {
        return undefined
    }

    const rawSettlementMode = record.settlementMode
    const settlementMode = rawSettlementMode === "pool" || rawSettlementMode === "directa" ? rawSettlementMode : null

    const poolPercentagesRecord = extractRecord(record.poolPercentages)
    const poolPercentages = poolPercentagesRecord
        ? {
            kitchen: typeof poolPercentagesRecord.kitchen !== "undefined" ? toNumber(poolPercentagesRecord.kitchen) : undefined,
            transbank:
                typeof poolPercentagesRecord.transbank !== "undefined"
                    ? toNumber(poolPercentagesRecord.transbank)
                    : undefined,
        }
        : undefined

    const directConfigRecord = extractRecord(record.directConfig)
    const directConfig = directConfigRecord
        ? {
            directWaiterPercentage:
                typeof directConfigRecord.directWaiterPercentage !== "undefined"
                    ? toNumber(directConfigRecord.directWaiterPercentage)
                    : undefined,
        }
        : undefined

    return {
        settlementMode,
        poolPercentages,
        directConfig,
    }
}

const mapRestaurantContact = (value: unknown): RestaurantContact | undefined => {
    const record = extractRecord(value)

    if (!record) {
        return undefined
    }

    const email = typeof record.email === "string" ? record.email : undefined
    const responsibleName = typeof record.responsibleName === "string" ? record.responsibleName : undefined

    if (!email && !responsibleName) {
        return undefined
    }

    return { email, responsibleName }
}

const toNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }

    return 0
}

const sanitizeAssignmentText = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined
    }

    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
}

export type StaffAssignment = {
    staffId?: string
    nombre: string
    role?: "garzon" | "cocinero" | "ayudante" | string | null
    email?: string
    present: boolean
    assignedAmount: number
    penaltyPercentage: number
    penaltyAmount: number
    deductionAmount: number
    deductionName?: string
    deductionDescription?: string
    netAmount: number
    netAmountAdjusted?: number
    adjustmentSummary?: {
        totalAmount: number
        totalPercentage: number
        redistributedDelta: number
    }
}

export type StaffAssignments = {
    servicio: StaffAssignment[]
    cocina: StaffAssignment[]
    ventaDirecta: StaffAssignment[]
    pocilloSecundario: StaffAssignment[]
}

export type ClosureConfigurationSnapshot = {
    settlementMode?: "pool" | "directa" | null
    poolPercentages?: {
        kitchen?: number
        transbank?: number
    }
    directConfig?: {
        directWaiterPercentage?: number
    }
}

export type DirectSalesAdjustmentsSnapshot = {
    percentageFee?: number
    fixedFee?: number
    notes?: string
}

type RestaurantContact = {
    email?: string
    responsibleName?: string
}

export type GeneralExpenseEntry = {
    entryId: string
    nombre: string
    tipo?: "part-time" | "anfitriona" | string
    monto: number
}

export type SettlementMode = "pool" | "directa"

export type ClosureDocument = {
    id: string
    estado: string
    mode: SettlementMode | null
    totals: {
        propinas: number
        netAfterDeductions: number
        transbankAmount: number
        deductionsAmount: number
        generalExpense: number
    }
    metadata: {
        referenceDate?: string | null
        referenceDateKey?: string | null
        daysWithoutSettlement?: number
    }
    liquidacionRange?: {
        from?: string | null
        to?: string | null
    } | null
    liquidacionId?: string | null
    liquidacionMode?: SettlementMode | null
    assignments: StaffAssignments
    generalExpenses: GeneralExpenseEntry[]
    adjustments: ClosureAdjustment[]
    directSalesAdjustmentsSnapshot?: DirectSalesAdjustmentsSnapshot | null
    directSalesAdjustmentApplied?: number
    createdAt?: Timestamp | null
    updatedAt?: Timestamp | null
    liquidatedAt?: Timestamp | null
    restaurantContact?: RestaurantContact
    configurationSnapshot?: ClosureConfigurationSnapshot | null
}

export const resolveClosureMode = (closure: ClosureDocument): SettlementMode | null =>
    closure.mode ?? closure.configurationSnapshot?.settlementMode ?? null

export type PendingClosuresByMode = {
    pool: ClosureDocument[]
    directa: ClosureDocument[]
    unknown: ClosureDocument[]
}

export type PaidSettlementPeriod = {
    id: string
    label: string
    rangeLabel: string
    from?: string | null
    to?: string | null
    closures: ClosureDocument[]
    totals: {
        netAfterDeductions: number
        deductionsAmount: number
        generalExpense: number
        propinas: number
    }
    dailySummaries: ReturnType<typeof buildDailyClosureSummaries>
}

export type ClosuresSummary = {
    totalPropinas: number
    totalNetAfterDeductions: number
    totalTransbank: number
    totalDeductions: number
    totalGeneralExpense: number
    pendingCount: number
}

const emptySummary: ClosuresSummary = {
    totalPropinas: 0,
    totalNetAfterDeductions: 0,
    totalTransbank: 0,
    totalDeductions: 0,
    totalGeneralExpense: 0,
    pendingCount: 0,
}

export type StaffAggregate = {
    staffId?: string
    nombre: string
    role?: "garzon" | "cocinero" | "ayudante" | string | null
    totalAsignado: number
    totalPenalizaciones: number
    totalDeducciones: number
    totalNeto: number
    totalAjustes: number
    totalNetoAjustado: number
}

const extractRecord = (value: unknown): Record<string, unknown> | undefined => {
    if (typeof value === "object" && value !== null) {
        return value as Record<string, unknown>
    }

    return undefined
}

const extractArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
        return value
    }

    return []
}

const extractGeneralExpensesSource = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
        return value
    }

    const record = extractRecord(value)
    if (!record) {
        return []
    }

    return Object.entries(record).map(([entryId, payload]) => {
        if (typeof payload === "object" && payload !== null) {
            return { entryId, ...(payload as Record<string, unknown>) }
        }

        return { entryId, nombre: payload }
    })
}

const generateExpenseId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const mapAssignment = (value: unknown): StaffAssignment => {
    const record = extractRecord(value)

    if (!record) {
        return {
            staffId: undefined,
            nombre: "—",
            role: null,
            present: false,
            assignedAmount: 0,
            penaltyPercentage: 0,
            penaltyAmount: 0,
            deductionAmount: 0,
            netAmount: 0,
        }
    }

    const penaltyPercentage = toNumber(record.penaltyPercentage)
    const assignedAmount = toNumber(record.assignedAmount)
    const penaltyAmount = toNumber(record.penaltyAmount)
    const deductionAmount = toNumber(record.deductionAmount)
    const netAmount = toNumber(record.netAmount)
    const deductionName = sanitizeAssignmentText(record.deductionName)
    const deductionDescription = sanitizeAssignmentText(record.deductionDescription)

    return {
        staffId: typeof record.staffId === "string" ? record.staffId : undefined,
        nombre: typeof record.nombre === "string" ? record.nombre : "—",
        role: typeof record.role === "string" ? record.role : null,
        email: typeof record.email === "string" ? record.email : undefined,
        present: Boolean(record.present),
        assignedAmount,
        penaltyPercentage,
        penaltyAmount,
        deductionAmount,
        deductionName,
        deductionDescription,
        netAmount,
    }
}

const mapAdjustment = (value: Record<string, unknown> & { id: string }): ClosureAdjustment => {
    const amount = toNumber(value.amount)
    const percentage = toNumber(value.percentage)
    const variantValue = value.variant === "porcentaje" ? "porcentaje" : "monto"

    return {
        id: value.id,
        staffId: typeof value.staffId === "string" ? value.staffId : undefined,
        staffName: typeof value.staffName === "string" ? value.staffName : undefined,
        amount,
        type: value.type === "descuento" ? "descuento" : "incremento",
        variant: variantValue,
        percentage: variantValue === "porcentaje" ? percentage : undefined,
        motivo: typeof value.motivo === "string" ? value.motivo : undefined,
        createdAt: (value.createdAt as Timestamp | undefined) ?? null,
        createdBy: typeof value.createdBy === "string" ? value.createdBy : undefined,
    }
}

const mapGeneralExpense = (value: unknown): GeneralExpenseEntry | null => {
    const record = extractRecord(value)

    if (!record) {
        return null
    }

    const nombre = typeof record.nombre === "string" ? record.nombre : undefined
    const monto = toNumber(record.monto)

    if (!nombre || monto < 0) {
        return null
    }

    return {
        entryId: typeof record.entryId === "string" ? record.entryId : generateExpenseId(),
        nombre,
        tipo: typeof record.tipo === "string" ? record.tipo : undefined,
        monto,
    }
}

const buildMemberIdentifier = (staffId?: string, name?: string, role?: string | null) =>
    staffId ?? `${name ?? ""}|${role ?? ""}`

const applyPercentageAdjustmentsToClosure = (closure: ClosureDocument): ClosureDocument => {
    if (!closure.adjustments.length) {
        return closure
    }

    const percentageByMember = new Map<string, number>()

    closure.adjustments.forEach((adjustment) => {
        if (adjustment.variant !== "porcentaje") {
            return
        }

        const key = buildMemberIdentifier(adjustment.staffId, adjustment.staffName)

        if (!key) {
            return
        }

        const signedPercentage = (adjustment.type === "descuento" ? -1 : 1) * (adjustment.percentage ?? 0)
        const previous = percentageByMember.get(key) ?? 0
        percentageByMember.set(key, previous + signedPercentage)
    })

    if (!percentageByMember.size) {
        return closure
    }

    const applyToGroup = (assignments: StaffAssignment[]): StaffAssignment[] => {
        if (!assignments.length) {
            return assignments
        }

        type LocalInfo = {
            assignment: StaffAssignment
            key: string
            baseNet: number
            ownPercentage: number
            ownDelta: number
        }

        const locals: LocalInfo[] = assignments.map((assignment) => {
            const key = buildMemberIdentifier(assignment.staffId, assignment.nombre, assignment.role)
            const ownPercentage = assignment.present ? percentageByMember.get(key) ?? 0 : 0
            const baseNet = assignment.netAmount
            const ownDelta = assignment.present ? baseNet * (ownPercentage / 100) : 0

            return {
                assignment,
                key,
                baseNet,
                ownPercentage,
                ownDelta,
            }
        })

        const totalOwnDelta = locals.reduce((sum, item) => sum + item.ownDelta, 0)

        if (totalOwnDelta === 0) {
            return assignments.map((assignment) => ({
                ...assignment,
                netAmountAdjusted: assignment.netAmountAdjusted ?? assignment.netAmount,
                adjustmentSummary: assignment.adjustmentSummary ?? {
                    totalAmount: 0,
                    totalPercentage: 0,
                    redistributedDelta: 0,
                },
            }))
        }

        const redistributionPool = -totalOwnDelta

        const eligibleForRedistribution = locals.filter((item) => {
            if (!item.assignment.present) {
                return false
            }

            const hasOwnPercentage = (percentageByMember.get(item.key) ?? 0) !== 0
            const hasPenalty = item.assignment.penaltyPercentage > 0

            return !hasOwnPercentage && !hasPenalty
        })

        const totalBaseNetEligible = eligibleForRedistribution.reduce(
            (sum, item) => sum + item.baseNet,
            0,
        )

        const computeRedistributedDelta = (item: LocalInfo): number => {
            if (!item.assignment.present) {
                return 0
            }

            if (totalBaseNetEligible <= 0) {
                return 0
            }

            const isEligible = eligibleForRedistribution.includes(item)

            if (!isEligible) {
                return 0
            }

            const weight = item.baseNet / totalBaseNetEligible
            return redistributionPool * weight
        }

        return locals.map((item) => {
            const redistributedDelta = computeRedistributedDelta(item)
            const baseNet = item.baseNet
            const ownDelta = item.ownDelta
            const totalDelta = ownDelta + redistributedDelta
            const adjustedNet = Math.max(baseNet + totalDelta, 0)

            const previousSummary = item.assignment.adjustmentSummary ?? {
                totalAmount: 0,
                totalPercentage: 0,
                redistributedDelta: 0,
            }

            return {
                ...item.assignment,
                netAmountAdjusted: adjustedNet,
                adjustmentSummary: {
                    totalAmount: previousSummary.totalAmount + ownDelta,
                    totalPercentage:
                        previousSummary.totalPercentage + (percentageByMember.get(item.key) ?? 0),
                    redistributedDelta: previousSummary.redistributedDelta + redistributedDelta,
                },
            }
        })
    }

    return {
        ...closure,
        assignments: {
            servicio: applyToGroup(closure.assignments.servicio),
            cocina: applyToGroup(closure.assignments.cocina),
            ventaDirecta: applyToGroup(closure.assignments.ventaDirecta),
            pocilloSecundario: applyToGroup(closure.assignments.pocilloSecundario),
        },
    }
}

export const mapSnapshotToClosure = (
    snapshot: { id: string; data: () => Record<string, unknown> },
    adjustments: ClosureAdjustment[] = [],
): ClosureDocument => {
    const data = snapshot.data()
    const snapshotRecord = extractRecord(data["snapshot"])
    const totalsFromDoc = extractRecord(data["totals"]) ?? extractRecord(snapshotRecord?.["totals"]) ?? {}
    const metadataFromDoc =
        extractRecord(data["metadata"]) ?? extractRecord(snapshotRecord?.["metadata"]) ?? {}
    const assignmentsRecord =
        extractRecord(data["assignments"]) ?? extractRecord(snapshotRecord?.["assignments"]) ?? {}
    const restaurantContact =
        mapRestaurantContact(data["restaurantContact"]) ??
        mapRestaurantContact(snapshotRecord?.["restaurantContact"]) ??
        undefined
    const configurationSnapshot =
        mapConfigurationSnapshot(data["configurationSnapshot"]) ??
        mapConfigurationSnapshot(snapshotRecord?.["configurationSnapshot"]) ??
        null
    const directSalesAdjustmentsSnapshot =
        mapDirectSalesAdjustmentsSnapshot(data["directSalesAdjustmentsSnapshot"]) ??
        mapDirectSalesAdjustmentsSnapshot(snapshotRecord?.["directSalesAdjustmentsSnapshot"]) ??
        null

    const rawDirectSalesAdjustmentApplied = data["directSalesAdjustmentApplied"]
    const directSalesAdjustmentApplied =
        typeof rawDirectSalesAdjustmentApplied === "number" && Number.isFinite(rawDirectSalesAdjustmentApplied)
            ? rawDirectSalesAdjustmentApplied
            : undefined

    const buildAssignments = (key: keyof StaffAssignments): StaffAssignment[] =>
        extractArray(assignmentsRecord?.[key]).map((item) => mapAssignment(item))

    const generalExpensesFromDoc = extractGeneralExpensesSource(data["generalExpenses"])
    const generalExpensesFromSnapshot = extractGeneralExpensesSource(snapshotRecord?.["generalExpenses"])
    const mappedGeneralExpenses = generalExpensesFromDoc.length
        ? generalExpensesFromDoc.map(mapGeneralExpense).filter(Boolean)
        : generalExpensesFromSnapshot.map(mapGeneralExpense).filter(Boolean)

    const totalGeneralExpenseValue = toNumber(totalsFromDoc.generalExpense)

    const safeGeneralExpenses = mappedGeneralExpenses.length
        ? (mappedGeneralExpenses as GeneralExpenseEntry[])
        : totalGeneralExpenseValue > 0
            ? [
                {
                    entryId: "general-expense-fallback",
                    nombre: "Gasto general",
                    tipo: "part-time",
                    monto: totalGeneralExpenseValue,
                },
            ]
            : []

    return {
        id: snapshot.id,
        estado: (data.estado as string) ?? "pendiente",
        mode: (data.mode as "pool" | "directa" | null | undefined) ??
            (snapshotRecord?.["mode"] as "pool" | "directa" | null | undefined) ??
            null,
        totals: {
            propinas: toNumber(totalsFromDoc.propinas),
            netAfterDeductions: toNumber(totalsFromDoc.netAfterDeductions),
            transbankAmount: toNumber(totalsFromDoc.transbankAmount),
            deductionsAmount: toNumber(totalsFromDoc.deductionsAmount),
            generalExpense: toNumber(totalsFromDoc.generalExpense),
        },
        metadata: {
            referenceDate: metadataFromDoc.referenceDate as string | null | undefined,
            referenceDateKey: metadataFromDoc.referenceDateKey as string | null | undefined,
            daysWithoutSettlement: metadataFromDoc.daysWithoutSettlement as number | undefined,
        },
        generalExpenses: safeGeneralExpenses,
        assignments: {
            servicio: buildAssignments("servicio"),
            cocina: buildAssignments("cocina"),
            ventaDirecta: buildAssignments("ventaDirecta"),
            pocilloSecundario: buildAssignments("pocilloSecundario"),
        },
        adjustments,
        directSalesAdjustmentsSnapshot,
        directSalesAdjustmentApplied,
        createdAt: (data.createdAt as Timestamp | undefined) ?? null,
        updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
        liquidatedAt: (data.liquidatedAt as Timestamp | undefined) ?? null,
        liquidacionRange: (data.liquidacionRange as { from?: string | null; to?: string | null } | undefined) ?? null,
        liquidacionId: typeof data.liquidacionId === "string" ? data.liquidacionId : null,
        restaurantContact,
        configurationSnapshot,
    }
}

export const fetchClosureAdjustments = async (restaurantId: string, closureId: string): Promise<ClosureAdjustment[]> => {
    const adjustmentsRef = collection(db, "restaurants", restaurantId, "registros_diarios", closureId, "ajustes")
    const adjustmentsSnapshot = await getDocs(query(adjustmentsRef, orderBy("createdAt", "desc")))
    return adjustmentsSnapshot.docs.map((docSnapshot) => {
        const payload = docSnapshot.data() as Record<string, unknown>
        return mapAdjustment({ ...payload, id: docSnapshot.id })
    })
}

export const createClosureAdjustment = async (params: {
    restaurantId: string
    closureId: string
    adjustment: Omit<ClosureAdjustment, "id" | "createdAt">
}) => {
    const { restaurantId, closureId, adjustment } = params
    const adjustmentsRef = collection(db, "restaurants", restaurantId, "registros_diarios", closureId, "ajustes")
    await addDoc(adjustmentsRef, {
        staffId: adjustment.staffId ?? null,
        staffName: adjustment.staffName ?? null,
        amount: adjustment.amount,
        type: adjustment.type,
        variant: adjustment.variant,
        percentage: adjustment.percentage ?? null,
        motivo: adjustment.motivo ?? null,
        createdBy: adjustment.createdBy ?? null,
        createdAt: serverTimestamp(),
    })
}

export const useClosuresDashboard = ({ uid }: { uid?: string | null }) => {
    const [closures, setClosures] = useState<ClosureDocument[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [aggregatedAssignments, setAggregatedAssignments] = useState<StaffAggregate[]>([])

    const fetchClosures = useCallback(async () => {
        if (!uid) {
            setError("No se encontró una sesión activa. Inicia sesión para ver el dashboard.")
            setClosures([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const closuresRef = collection(db, "restaurants", uid, "registros_diarios")
            const closuresQuery = query(closuresRef, orderBy("createdAt", "desc"))
            const snapshots = await getDocs(closuresQuery)

            const nextClosures = await Promise.all(
                snapshots.docs.map(async (docSnapshot) => {
                    const adjustments = await fetchClosureAdjustments(uid, docSnapshot.id)
                    const baseClosure = mapSnapshotToClosure(docSnapshot, adjustments)
                    return applyPercentageAdjustmentsToClosure(baseClosure)
                }),
            )

            const aggregatesMap = new Map<string, StaffAggregate>()

            const getIdentifier = (staffId?: string, nombre?: string, role?: string | null) =>
                buildMemberIdentifier(staffId, nombre, role)

            const mergeAssignment = (assignment: StaffAssignment) => {
                if (!assignment.present) {
                    return
                }

                const identifier = getIdentifier(assignment.staffId, assignment.nombre, assignment.role)
                const existing = aggregatesMap.get(identifier)

                if (existing) {
                    existing.totalAsignado += assignment.assignedAmount
                    existing.totalPenalizaciones += assignment.penaltyAmount
                    existing.totalDeducciones += assignment.deductionAmount
                    existing.totalNeto += assignment.netAmount
                    existing.totalNetoAjustado += assignment.netAmountAdjusted ?? assignment.netAmount
                    existing.totalAjustes += assignment.adjustmentSummary?.totalAmount ?? 0
                } else {
                    aggregatesMap.set(identifier, {
                        staffId: assignment.staffId,
                        nombre: assignment.nombre,
                        role: assignment.role,
                        totalAsignado: assignment.assignedAmount,
                        totalPenalizaciones: assignment.penaltyAmount,
                        totalDeducciones: assignment.deductionAmount,
                        totalNeto: assignment.netAmount,
                        totalAjustes: assignment.adjustmentSummary?.totalAmount ?? 0,
                        totalNetoAjustado: assignment.netAmountAdjusted ?? assignment.netAmount,
                    })
                }
            }

            nextClosures.forEach((closure) => {
                const pools = [
                    ...closure.assignments.servicio,
                    ...closure.assignments.cocina,
                    ...closure.assignments.ventaDirecta,
                    ...closure.assignments.pocilloSecundario,
                ]

                pools.forEach(mergeAssignment)

                closure.adjustments.forEach((adjustment) => {
                    if (adjustment.variant === "porcentaje") {
                        return
                    }

                    const signedAmount = adjustment.type === "descuento" ? -adjustment.amount : adjustment.amount
                    const identifier = getIdentifier(adjustment.staffId, adjustment.staffName)
                    const existing = aggregatesMap.get(identifier)

                    if (existing) {
                        existing.totalAjustes += signedAmount
                        existing.totalNetoAjustado += signedAmount
                    } else {
                        aggregatesMap.set(identifier, {
                            staffId: adjustment.staffId,
                            nombre: adjustment.staffName ?? "—",
                            role: undefined,
                            totalAsignado: 0,
                            totalPenalizaciones: 0,
                            totalDeducciones: 0,
                            totalNeto: 0,
                            totalAjustes: signedAmount,
                            totalNetoAjustado: signedAmount,
                        })
                    }
                })
            })

            setAggregatedAssignments(Array.from(aggregatesMap.values()))
            setClosures(nextClosures)
            setError(null)
        } catch (fetchError) {
            console.error("Error al cargar los cierres para el dashboard", fetchError)
            setError("No pudimos cargar los cierres guardados. Intenta nuevamente en unos segundos.")
            setClosures([])
            setAggregatedAssignments([])
        } finally {
            setIsLoading(false)
        }
    }, [uid])

    useEffect(() => {
        void fetchClosures()
    }, [fetchClosures])

    const pendingClosures = useMemo(
        () => closures.filter((closure) => closure.estado === "pendiente"),
        [closures],
    )

    const pendingClosuresByMode = useMemo<PendingClosuresByMode>(() => {
        const groups: PendingClosuresByMode = {
            pool: [],
            directa: [],
            unknown: [],
        }

        pendingClosures.forEach((closure) => {
            const mode = resolveClosureMode(closure)
            if (mode === "pool") {
                groups.pool.push(closure)
            } else if (mode === "directa") {
                groups.directa.push(closure)
            } else {
                groups.unknown.push(closure)
            }
        })

        return groups
    }, [pendingClosures])

    const historicalClosures = useMemo(() => closures, [closures])

    const summary = useMemo(() => {
        if (!pendingClosures.length) {
            return emptySummary
        }

        return summarizeClosures(pendingClosures)
    }, [pendingClosures])

    const paidSettlementGroups = useMemo(() => {
        const paidClosures = closures.filter((closure) => closure.estado === "pagado")

        if (!paidClosures.length) {
            return [] as PaidSettlementPeriod[]
        }

        const groups = new Map<
            string,
            {
                id: string
                from?: string | null
                to?: string | null
                closures: ClosureDocument[]
            }
        >()

        const resolveGroupId = (closure: ClosureDocument) => {
            if (closure.liquidacionId) {
                return closure.liquidacionId
            }

            if (closure.liquidacionRange) {
                return `${closure.liquidacionRange.from ?? ""}|${closure.liquidacionRange.to ?? ""}`
            }

            if (closure.liquidatedAt) {
                return `timestamp|${closure.liquidatedAt.toMillis()}`
            }

            return `closure|${closure.id}`
        }

        paidClosures.forEach((closure) => {
            const groupId = resolveGroupId(closure)
            if (!groups.has(groupId)) {
                groups.set(groupId, {
                    id: groupId,
                    from: closure.liquidacionRange?.from ?? closure.metadata.referenceDate ?? null,
                    to: closure.liquidacionRange?.to ?? closure.metadata.referenceDate ?? null,
                    closures: [closure],
                })
                return
            }

            const bucket = groups.get(groupId)!
            bucket.closures.push(closure)

            if (!bucket.from) {
                bucket.from = closure.liquidacionRange?.from ?? closure.metadata.referenceDate ?? null
            } else if (closure.liquidacionRange?.from) {
                bucket.from = bucket.from ?? closure.liquidacionRange.from
            }

            if (!bucket.to) {
                bucket.to = closure.liquidacionRange?.to ?? closure.metadata.referenceDate ?? null
            } else if (closure.liquidacionRange?.to) {
                bucket.to = bucket.to ?? closure.liquidacionRange.to
            }
        })

        const dateFormatter = new Intl.DateTimeFormat("es-CL", {
            year: "numeric",
            month: "long",
            day: "2-digit",
        })

        const parseDate = (value?: string | null) => {
            if (!value) {
                return null
            }

            const parsed = new Date(value)
            return Number.isNaN(parsed.getTime()) ? null : parsed
        }

        const formatRangeLabel = (from?: string | null, to?: string | null, fallback?: string | null) => {
            const fromDate = parseDate(from) ?? parseDate(fallback)
            const toDate = parseDate(to)

            if (fromDate && toDate) {
                if (fromDate.getTime() === toDate.getTime()) {
                    return dateFormatter.format(fromDate)
                }

                return `${dateFormatter.format(fromDate)} – ${dateFormatter.format(toDate)}`
            }

            if (fromDate) {
                return dateFormatter.format(fromDate)
            }

            return fallback ?? "Sin rango registrado"
        }

        const computeRangeFromClosures = (closuresInGroup: ClosureDocument[]) => {
            const sortedIsoDates = closuresInGroup
                .map((closure) => closure.metadata.referenceDate)
                .filter((value): value is string => Boolean(value))
                .sort()

            if (!sortedIsoDates.length) {
                return { from: null, to: null }
            }

            return {
                from: sortedIsoDates[0] ?? null,
                to: sortedIsoDates[sortedIsoDates.length - 1] ?? sortedIsoDates[0] ?? null,
            }
        }

        const resolveSortDate = (value?: string | null, closuresInGroup: ClosureDocument[] = []) => {
            const parsed = parseDate(value)
            if (parsed) {
                return parsed.getTime()
            }

            const dates = closuresInGroup
                .map((closure) => parseDate(closure.metadata.referenceDate))
                .filter((date): date is Date => Boolean(date))

            if (!dates.length) {
                return 0
            }

            return dates[dates.length - 1]!.getTime()
        }

        return Array.from(groups.values())
            .map((group) => {
                const totalSnapshot = summarizeClosures(group.closures)
                const dailySummaries = buildDailyClosureSummaries(group.closures)
                const computedRange = computeRangeFromClosures(group.closures)
                const displayFrom = group.from ?? computedRange.from
                const displayTo = group.to ?? computedRange.to ?? computedRange.from

                const primaryLabel = formatRangeLabel(displayFrom, displayTo, group.closures[0]?.metadata.referenceDate)

                return {
                    id: group.id,
                    label:
                        group.closures.length > 1
                            ? `Liquidación de ${group.closures.length} días`
                            : "Liquidación de 1 día",
                    rangeLabel: primaryLabel,
                    from: group.from,
                    to: group.to,
                    closures: group.closures,
                    totals: {
                        netAfterDeductions: totalSnapshot.totalNetAfterDeductions,
                        deductionsAmount: totalSnapshot.totalDeductions,
                        generalExpense: totalSnapshot.totalGeneralExpense,
                        propinas: totalSnapshot.totalPropinas,
                    },
                    dailySummaries,
                }
            })
            .sort((a, b) => resolveSortDate(b.to, b.closures) - resolveSortDate(a.to, a.closures))
    }, [closures])

    return {
        closures,
        pendingClosures,
        pendingClosuresByMode,
        historicalClosures,
        summary,
        paidSettlementGroups,
        isLoading,
        error,
        refresh: fetchClosures,
        aggregates: aggregatedAssignments,
    }
}
