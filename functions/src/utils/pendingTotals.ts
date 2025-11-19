import { FieldValue } from "firebase-admin/firestore"

import { firestoreAdmin } from "../config/firebaseAdmin"

export type PendingTotalsDelta = {
    netAfterDeductions: number
    deductionsAmount: number
    transbankAmount: number
    pendingCount: number
    pendingDaysDelta?: number
}

export type PendingTotalsSnapshot = {
    netAfterDeductions: number
    deductionsAmount: number
    transbankAmount: number
    pendingCount: number
}

const normalizeNumber = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }

    return 0
}

const normalizeSnapshot = (data: FirebaseFirestore.DocumentData | undefined): PendingTotalsSnapshot => ({
    netAfterDeductions: normalizeNumber(data?.netAfterDeductions),
    deductionsAmount: normalizeNumber(data?.deductionsAmount),
    transbankAmount: normalizeNumber(data?.transbankAmount),
    pendingCount: Math.max(0, Math.trunc(normalizeNumber(data?.pendingCount))),
})

export const buildPendingTotalsUpdate = (
    delta: PendingTotalsDelta,
): FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> => {
    const updates: Record<string, FirebaseFirestore.FieldValue> = {
        "pendingTotals.netAfterDeductions": FieldValue.increment(delta.netAfterDeductions),
        "pendingTotals.deductionsAmount": FieldValue.increment(delta.deductionsAmount),
        "pendingTotals.transbankAmount": FieldValue.increment(delta.transbankAmount),
        "pendingTotals.pendingCount": FieldValue.increment(delta.pendingCount),
    }

    if (delta.pendingDaysDelta && delta.pendingDaysDelta !== 0) {
        updates["pendingDays"] = FieldValue.increment(delta.pendingDaysDelta)
    }

    return updates
}

export const fetchPendingTotals = async (restaurantId: string): Promise<PendingTotalsSnapshot> => {
    const restaurantRef = firestoreAdmin.collection("restaurants").doc(restaurantId)
    const snapshot = await restaurantRef.get()
    const pendingTotalsData = snapshot.get("pendingTotals") as FirebaseFirestore.DocumentData | undefined
    return normalizeSnapshot(pendingTotalsData)
}

export const applyPendingTotalsDelta = async (
    restaurantId: string,
    delta: PendingTotalsDelta,
): Promise<PendingTotalsSnapshot> => {
    const restaurantRef = firestoreAdmin.collection("restaurants").doc(restaurantId)
    await restaurantRef.set(buildPendingTotalsUpdate(delta), { merge: true })
    return fetchPendingTotals(restaurantId)
}
