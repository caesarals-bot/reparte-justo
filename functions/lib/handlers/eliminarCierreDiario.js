"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarCierreDiarioHandler = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const closure_1 = require("../types/closure");
const pendingTotals_1 = require("../utils/pendingTotals");
/**
 * Elimina un cierre diario pendiente garantizando consistencia:
 * 1. Valida que el cierre exista y no esté liquidado.
 * 2. Revierte los acumulados (pendingTotals, pendingDays) dentro de la misma transacción.
 * 3. Registra un evento de auditoría para trazabilidad futura.
 */
const eliminarCierreDiarioHandler = async (payload) => {
    const input = parseInput(payload);
    const closureRef = firebaseAdmin_1.firestoreAdmin
        .collection(`restaurants/${input.restaurantId}/registros_diarios`)
        .doc(input.closureId);
    const summary = await firebaseAdmin_1.firestoreAdmin.runTransaction(async (transaction) => {
        const closureSnapshot = await fetchClosureSnapshot(transaction, closureRef);
        ensureClosureCanBeDeleted(closureSnapshot);
        const dailySummary = resolveDailySummary(closureSnapshot);
        transaction.delete(closureRef);
        await rollbackPendingTotals(transaction, input.restaurantId, dailySummary);
        await registerAuditLog(transaction, input);
        return dailySummary;
    });
    const pendingTotals = await (0, pendingTotals_1.fetchPendingTotals)(input.restaurantId);
    return {
        closureId: input.closureId,
        status: "deleted",
        pendingTotals,
    };
};
exports.eliminarCierreDiarioHandler = eliminarCierreDiarioHandler;
const parseInput = (payload) => {
    return closure_1.eliminarCierreDiarioSchema.parse(payload);
};
const fetchClosureSnapshot = async (transaction, closureRef) => {
    const snapshot = await transaction.get(closureRef);
    if (!snapshot.exists) {
        throw new Error("CLOSURE_NOT_FOUND");
    }
    return snapshot.data();
};
const ensureClosureCanBeDeleted = (closure) => {
    if (closure?.estado !== "pendiente") {
        throw new Error("ALREADY_SETTLED");
    }
};
const resolveDailySummary = (closure) => {
    if (!closure.dailySummary) {
        throw new Error("INVALID_CLOSURE_SNAPSHOT");
    }
    return closure.dailySummary;
};
const rollbackPendingTotals = async (transaction, restaurantId, summary) => {
    const restaurantRef = firebaseAdmin_1.firestoreAdmin.collection("restaurants").doc(restaurantId);
    transaction.set(restaurantRef, (0, pendingTotals_1.buildPendingTotalsUpdate)({
        netAfterDeductions: -summary.netAfterDeductions,
        deductionsAmount: -summary.deductionsAmount,
        transbankAmount: -summary.transbankAmount,
        pendingCount: -1,
        pendingDaysDelta: -1,
    }), { merge: true });
};
const registerAuditLog = async (transaction, input) => {
    const auditRef = firebaseAdmin_1.firestoreAdmin.collection(`restaurants/${input.restaurantId}/audits`).doc();
    transaction.set(auditRef, {
        type: "closure_deleted",
        closureId: input.closureId,
        reason: input.reason ?? null,
        deletedBy: input.deletedBy ?? null,
        createdAt: firestore_1.Timestamp.now(),
    });
};
