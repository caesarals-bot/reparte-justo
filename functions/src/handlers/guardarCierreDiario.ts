import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { firestoreAdmin } from "../config/firebaseAdmin"
import { guardarCierreDiarioSchema, type GuardarCierreDiarioInput } from "../types/closure"

export type GuardarCierreDiarioResult = {
    closureId: string
    estado: "pendiente"
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

export const guardarCierreDiarioHandler = async (payload: unknown): Promise<GuardarCierreDiarioResult> => {
    const input = guardarCierreDiarioSchema.parse(payload)
    await ensureReferenceDateIsUnique(input)
    const closureSnapshot = buildClosureSnapshot(input)
    const closureRef = firestoreAdmin
        .collection(`restaurants/${input.restaurantId}/registros_diarios`)
        .doc()

    await closureRef.set(closureSnapshot)
    const pendingTotals = await updateRestaurantAggregates({
        restaurantId: input.restaurantId,
        closureId: closureRef.id,
        dailySummary: input.dailySummary,
        referenceDate: input.metadata.referenceDate,
    })

    return {
        closureId: closureRef.id,
        estado: "pendiente",
        totals: {
            netAfterDeductions: input.dailySummary.netAfterDeductions,
            deductionsAmount: input.dailySummary.deductionsAmount,
            transbankAmount: input.dailySummary.transbankAmount,
        },
        pendingTotals,
        contactEmailStatus: input.restaurantContact?.email ? "pending" : "skipped",
    }
}

const ensureReferenceDateIsUnique = async (input: GuardarCierreDiarioInput) => {
    if (!input.metadata.referenceDateKey) {
        throw new Error("INVALID_REFERENCE_DATE")
    }
    const snapshot = await firestoreAdmin
        .collection(`restaurants/${input.restaurantId}/registros_diarios`)
        .where("metadata.referenceDateKey", "==", input.metadata.referenceDateKey)
        .limit(1)
        .get()

    if (!snapshot.empty) {
        throw new Error("DUPLICATED_CLOSURE")
    }
}

const buildClosureSnapshot = (input: GuardarCierreDiarioInput) => {
    const now = Timestamp.now()

    return {
        estado: "pendiente" as const,
        metadata: input.metadata,
        totals: input.totals,
        deductions: input.deductions,
        assignments: input.assignments,
        penalties: input.penalties,
        adjustments: input.adjustments,
        staffSnapshot: input.staff,
        dailySummary: input.dailySummary,
        restaurantContact: input.restaurantContact ?? null,
        configurationSnapshot: input.configurationSnapshot ?? null,
        submittedBy: input.submittedBy ?? null,
        submittedAt: input.submittedAt ?? new Date().toISOString(),
        createdAt: now,
        updatedAt: now,
    }
}

const updateRestaurantAggregates = async (params: {
    restaurantId: string
    closureId: string
    dailySummary: GuardarCierreDiarioInput["dailySummary"]
    referenceDate: string | null
}) => {
    const { restaurantId, dailySummary, referenceDate } = params
    const restaurantRef = firestoreAdmin.collection("restaurants").doc(restaurantId)
    const incrementUpdates = {
        "pendingTotals.netAfterDeductions": FieldValue.increment(dailySummary.netAfterDeductions),
        "pendingTotals.deductionsAmount": FieldValue.increment(dailySummary.deductionsAmount),
        "pendingTotals.transbankAmount": FieldValue.increment(dailySummary.transbankAmount),
        "pendingTotals.pendingCount": FieldValue.increment(1),
    }

    await restaurantRef.set(
        {
            ...incrementUpdates,
            pendingDays: FieldValue.increment(1),
            lastClosureReferenceDate: referenceDate ?? null,
        },
        { merge: true },
    )

    const updatedRestaurant = await restaurantRef.get()
    const pendingTotalsData = updatedRestaurant.get("pendingTotals") ?? {}

    return {
        netAfterDeductions: Number(pendingTotalsData.netAfterDeductions) || 0,
        deductionsAmount: Number(pendingTotalsData.deductionsAmount) || 0,
        transbankAmount: Number(pendingTotalsData.transbankAmount) || 0,
        pendingCount: Number(pendingTotalsData.pendingCount) || 0,
    }
}
