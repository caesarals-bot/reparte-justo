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

    const { processedCount, updatedClosureIds, settledReferenceDates } = await firestoreAdmin.runTransaction(
        async (transaction) => {
            let processed = 0
            const updatedIds: string[] = []
            const settledDates: string[] = []
            let netDelta = 0
            let deductionsDelta = 0
            let transbankDelta = 0

            for (const closureId of input.closureIds) {
                const docRef = closuresCollection.doc(closureId)
                const snapshot = await transaction.get(docRef)

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

                processed += 1
                updatedIds.push(closureId)

                const referenceDate = data.metadata?.referenceDate ?? null
                if (typeof referenceDate === "string" && referenceDate.length) {
                    settledDates.push(referenceDate)
                }

                transaction.update(docRef, {
                    estado: "pagado",
                    liquidatedAt: now,
                    liquidatedBy: input.contact ?? null,
                    updatedAt: now,
                })
            }

            if (processed > 0) {
                transaction.set(
                    restaurantRef,
                    buildPendingTotalsUpdate({
                        netAfterDeductions: -netDelta,
                        deductionsAmount: -deductionsDelta,
                        transbankAmount: -transbankDelta,
                        pendingCount: -processed,
                        pendingDaysDelta: -processed,
                    }),
                    { merge: true },
                )
            }

            return { processedCount: processed, updatedClosureIds: updatedIds, settledReferenceDates: settledDates }
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
