import { Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore"

import { firestoreAdmin } from "../config/firebaseAdmin"
import { eliminarCierreDiarioSchema, type GuardarCierreDiarioInput } from "../types/closure"
import { buildPendingTotalsUpdate, fetchPendingTotals, type PendingTotalsSnapshot } from "../utils/pendingTotals"

type EliminarCierreDiarioInput = {
    restaurantId: string
    closureId: string
    reason?: string
    deletedBy?: {
        uid?: string
        name?: string
        email?: string
    }
}

type ClosureSnapshot = {
    estado?: string
    dailySummary?: GuardarCierreDiarioInput["dailySummary"]
}

export type EliminarCierreDiarioResult = {
    closureId: string
    status: "deleted"
    pendingTotals: PendingTotalsSnapshot
}

/**
 * Elimina un cierre diario pendiente garantizando consistencia:
 * 1. Valida que el cierre exista y no esté liquidado.
 * 2. Revierte los acumulados (pendingTotals, pendingDays) dentro de la misma transacción.
 * 3. Registra un evento de auditoría para trazabilidad futura.
 */
export const eliminarCierreDiarioHandler = async (payload: unknown): Promise<EliminarCierreDiarioResult> => {
    const input = parseInput(payload)
    const closureRef = firestoreAdmin
        .collection(`restaurants/${input.restaurantId}/registros_diarios`)
        .doc(input.closureId)

    const summary = await firestoreAdmin.runTransaction(async (transaction) => {
        const closureSnapshot = await fetchClosureSnapshot(transaction, closureRef)
        ensureClosureCanBeDeleted(closureSnapshot)
        const dailySummary = resolveDailySummary(closureSnapshot)

        transaction.delete(closureRef)
        await rollbackPendingTotals(transaction, input.restaurantId, dailySummary)
        await registerAuditLog(transaction, input)

        return dailySummary
    })

    const pendingTotals = await fetchPendingTotals(input.restaurantId)

    return {
        closureId: input.closureId,
        status: "deleted",
        pendingTotals,
    }
}

const parseInput = (payload: unknown): EliminarCierreDiarioInput => {
    return eliminarCierreDiarioSchema.parse(payload)
}

const fetchClosureSnapshot = async (
    transaction: Transaction,
    closureRef: DocumentReference,
): Promise<ClosureSnapshot> => {
    const snapshot = await transaction.get(closureRef)

    if (!snapshot.exists) {
        throw new Error("CLOSURE_NOT_FOUND")
    }

    return snapshot.data() as ClosureSnapshot
}

const ensureClosureCanBeDeleted = (closure: ClosureSnapshot) => {
    if (closure?.estado !== "pendiente") {
        throw new Error("ALREADY_SETTLED")
    }
}

const resolveDailySummary = (closure: ClosureSnapshot): GuardarCierreDiarioInput["dailySummary"] => {
    if (!closure.dailySummary) {
        throw new Error("INVALID_CLOSURE_SNAPSHOT")
    }

    return closure.dailySummary
}

const rollbackPendingTotals = async (
    transaction: Transaction,
    restaurantId: string,
    summary: GuardarCierreDiarioInput["dailySummary"],
) => {
    const restaurantRef = firestoreAdmin.collection("restaurants").doc(restaurantId)

    transaction.set(
        restaurantRef,
        buildPendingTotalsUpdate({
            netAfterDeductions: -summary.netAfterDeductions,
            deductionsAmount: -summary.deductionsAmount,
            transbankAmount: -summary.transbankAmount,
            pendingCount: -1,
            pendingDaysDelta: -1,
        }),
        { merge: true },
    )
}

const registerAuditLog = async (
    transaction: Transaction,
    input: EliminarCierreDiarioInput,
) => {
    const auditRef = firestoreAdmin.collection(`restaurants/${input.restaurantId}/audits`).doc()

    transaction.set(auditRef, {
        type: "closure_deleted",
        closureId: input.closureId,
        reason: input.reason ?? null,
        deletedBy: input.deletedBy ?? null,
        createdAt: Timestamp.now(),
    })
}
