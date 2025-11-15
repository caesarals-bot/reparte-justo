import { useCallback, useEffect, useMemo, useState } from "react"
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, type Timestamp } from "firebase/firestore"

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

const toNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }

    return 0
}

export type StaffAssignment = {
    staffId?: string
    nombre: string
    role?: "garzon" | "cocinero" | "ayudante" | string | null
    present: boolean
    assignedAmount: number
    penaltyPercentage: number
    penaltyAmount: number
    deductionAmount: number
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

export type ClosureDocument = {
    id: string
    estado: string
    mode: "pool" | "directa" | null
    totals: {
        propinas: number
        netAfterDeductions: number
        transbankAmount: number
        deductionsAmount: number
    }
    metadata: {
        referenceDate?: string | null
        referenceDateKey?: string | null
        daysWithoutSettlement?: number
    }
    assignments: StaffAssignments
    adjustments: ClosureAdjustment[]
    createdAt?: Timestamp | null
    updatedAt?: Timestamp | null
}

export type ClosuresSummary = {
    totalPropinas: number
    totalNetAfterDeductions: number
    totalTransbank: number
    totalDeductions: number
    pendingCount: number
}

const emptySummary: ClosuresSummary = {
    totalPropinas: 0,
    totalNetAfterDeductions: 0,
    totalTransbank: 0,
    totalDeductions: 0,
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

    return {
        staffId: typeof record.staffId === "string" ? record.staffId : undefined,
        nombre: typeof record.nombre === "string" ? record.nombre : "—",
        role: typeof record.role === "string" ? record.role : null,
        present: Boolean(record.present),
        assignedAmount,
        penaltyPercentage,
        penaltyAmount,
        deductionAmount,
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

const buildMemberIdentifier = (staffId?: string, nombre?: string, role?: string | null) =>
    staffId ?? `${nombre ?? ""}|${role ?? ""}`

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

    const buildAssignments = (key: keyof StaffAssignments): StaffAssignment[] =>
        extractArray(assignmentsRecord?.[key]).map((item) => mapAssignment(item))

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
        },
        metadata: {
            referenceDate: metadataFromDoc.referenceDate as string | null | undefined,
            referenceDateKey: metadataFromDoc.referenceDateKey as string | null | undefined,
            daysWithoutSettlement: metadataFromDoc.daysWithoutSettlement as number | undefined,
        },
        assignments: {
            servicio: buildAssignments("servicio"),
            cocina: buildAssignments("cocina"),
            ventaDirecta: buildAssignments("ventaDirecta"),
            pocilloSecundario: buildAssignments("pocilloSecundario"),
        },
        adjustments,
        createdAt: (data.createdAt as Timestamp | undefined) ?? null,
        updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
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

    const historicalClosures = useMemo(() => closures, [closures])

    const summary = useMemo(() => {
        if (!pendingClosures.length) {
            return emptySummary
        }

        return pendingClosures.reduce<ClosuresSummary>(
            (accumulator, closure) => ({
                totalPropinas: accumulator.totalPropinas + closure.totals.propinas,
                totalNetAfterDeductions:
                    accumulator.totalNetAfterDeductions + closure.totals.netAfterDeductions,
                totalTransbank: accumulator.totalTransbank + closure.totals.transbankAmount,
                totalDeductions: accumulator.totalDeductions + closure.totals.deductionsAmount,
                pendingCount: accumulator.pendingCount + 1,
            }),
            emptySummary,
        )
    }, [pendingClosures])

    return {
        closures,
        pendingClosures,
        historicalClosures,
        summary,
        isLoading,
        error,
        refresh: fetchClosures,
        aggregates: aggregatedAssignments,
    }
}
