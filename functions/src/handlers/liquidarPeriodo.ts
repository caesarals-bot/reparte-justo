import { Timestamp } from "firebase-admin/firestore"

import { firestoreAdmin } from "../config/firebaseAdmin"
import { liquidarPeriodoSchema, type LiquidarPeriodoResult } from "../types/liquidacion"
import { buildPendingTotalsUpdate, fetchPendingTotals } from "../utils/pendingTotals"

type ClosureDocumentData = {
    estado?: string
    dailySummary?: Record<string, unknown>
    totals?: Record<string, unknown>
    metadata?: {
        referenceDate?: string | null
    }
}

const safeNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }

    return 0
}

const extractDailySummary = (data: ClosureDocumentData | undefined) => {
    const source = (data?.dailySummary ?? data?.totals ?? {}) as Record<string, unknown>

    return {
        netAfterDeductions: safeNumber(source.netAfterDeductions),
        deductionsAmount: safeNumber(source.deductionsAmount),
        transbankAmount: safeNumber(source.transbankAmount),
    }
}

export const liquidarPeriodoHandler = async (payload: unknown): Promise<LiquidarPeriodoResult> => {
    const input = liquidarPeriodoSchema.parse(payload)
    const restaurantRef = firestoreAdmin.collection("restaurants").doc(input.restaurantId)
    const closuresCollection = restaurantRef.collection("registros_diarios")
    const now = Timestamp.now()

    const settlementRange = input.range ?? { from: null, to: null }
    const settlementId = (() => {
        if (settlementRange.from || settlementRange.to) {
            return `${settlementRange.from ?? ""}|${settlementRange.to ?? ""}`
        }

        return `${now.toMillis()}`
    })()

    const { processedCount, updatedClosureIds, settledReferenceDates } = await firestoreAdmin.runTransaction(
        async (transaction) => {
            // Fase 1: TODAS las lecturas primero (requisito de Firestore)
            const closureReads = await Promise.all(
                input.closureIds.map(async (closureId) => {
                    const docRef = closuresCollection.doc(closureId)
                    const snapshot = await transaction.get(docRef)
                    return { closureId, docRef, snapshot }
                })
            )

            // Fase 2: Procesar datos de las lecturas
            const closuresToUpdate: Array<{
                closureId: string
                docRef: FirebaseFirestore.DocumentReference
                summary: { netAfterDeductions: number; deductionsAmount: number; transbankAmount: number }
                referenceDate: string | null
            }> = []

            let netDelta = 0
            let deductionsDelta = 0
            let transbankDelta = 0

            for (const { closureId, docRef, snapshot } of closureReads) {
                if (!snapshot.exists) {
                    continue
                }

                const data = snapshot.data() as ClosureDocumentData
                if (data.estado === "pagado") {
                    continue
                }

                const summary = extractDailySummary(data)
                netDelta += summary.netAfterDeductions
                deductionsDelta += summary.deductionsAmount
                transbankDelta += summary.transbankAmount

                const referenceDate = data.metadata?.referenceDate ?? null

                closuresToUpdate.push({
                    closureId,
                    docRef,
                    summary,
                    referenceDate: typeof referenceDate === "string" && referenceDate.length ? referenceDate : null,
                })
            }

            // Fase 3: TODAS las escrituras (después de todas las lecturas)
            for (const { docRef, referenceDate } of closuresToUpdate) {
                transaction.update(docRef, {
                    estado: "pagado",
                    liquidatedAt: now,
                    liquidatedBy: input.contact ?? null,
                    liquidacionRange: settlementRange,
                    liquidacionId: settlementId,
                    updatedAt: now,
                })
            }

            if (closuresToUpdate.length > 0) {
                transaction.set(
                    restaurantRef,
                    buildPendingTotalsUpdate({
                        netAfterDeductions: -netDelta,
                        deductionsAmount: -deductionsDelta,
                        transbankAmount: -transbankDelta,
                        pendingCount: -closuresToUpdate.length,
                        pendingDaysDelta: -closuresToUpdate.length,
                    }),
                    { merge: true },
                )
            }

            return {
                processedCount: closuresToUpdate.length,
                updatedClosureIds: closuresToUpdate.map((c) => c.closureId),
                settledReferenceDates: closuresToUpdate
                    .map((c) => c.referenceDate)
                    .filter((date): date is string => date !== null),
            }
        },
    )

    const pendingTotals = await fetchPendingTotals(input.restaurantId)

    return {
        processedCount,
        updatedClosureIds,
        settledReferenceDates,
        pendingTotals,
    }
}
