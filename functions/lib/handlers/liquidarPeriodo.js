"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liquidarPeriodoHandler = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const liquidacion_1 = require("../types/liquidacion");
const pendingTotals_1 = require("../utils/pendingTotals");
const safeNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return 0;
};
const extractDailySummary = (data) => {
    const source = (data?.dailySummary ?? data?.totals ?? {});
    return {
        netAfterDeductions: safeNumber(source.netAfterDeductions),
        deductionsAmount: safeNumber(source.deductionsAmount),
        transbankAmount: safeNumber(source.transbankAmount),
    };
};
const liquidarPeriodoHandler = async (payload) => {
    const input = liquidacion_1.liquidarPeriodoSchema.parse(payload);
    const restaurantRef = firebaseAdmin_1.firestoreAdmin.collection("restaurants").doc(input.restaurantId);
    const closuresCollection = restaurantRef.collection("registros_diarios");
    const now = firestore_1.Timestamp.now();
    const { processedCount, updatedClosureIds, settledReferenceDates } = await firebaseAdmin_1.firestoreAdmin.runTransaction(async (transaction) => {
        let processed = 0;
        const updatedIds = [];
        const settledDates = [];
        let netDelta = 0;
        let deductionsDelta = 0;
        let transbankDelta = 0;
        for (const closureId of input.closureIds) {
            const docRef = closuresCollection.doc(closureId);
            const snapshot = await transaction.get(docRef);
            if (!snapshot.exists) {
                continue;
            }
            const data = snapshot.data();
            if (data.estado === "pagado") {
                continue;
            }
            const summary = extractDailySummary(data);
            netDelta += summary.netAfterDeductions;
            deductionsDelta += summary.deductionsAmount;
            transbankDelta += summary.transbankAmount;
            processed += 1;
            updatedIds.push(closureId);
            const referenceDate = data.metadata?.referenceDate ?? null;
            if (typeof referenceDate === "string" && referenceDate.length) {
                settledDates.push(referenceDate);
            }
            transaction.update(docRef, {
                estado: "pagado",
                liquidatedAt: now,
                liquidatedBy: input.contact ?? null,
                updatedAt: now,
            });
        }
        if (processed > 0) {
            transaction.set(restaurantRef, (0, pendingTotals_1.buildPendingTotalsUpdate)({
                netAfterDeductions: -netDelta,
                deductionsAmount: -deductionsDelta,
                transbankAmount: -transbankDelta,
                pendingCount: -processed,
                pendingDaysDelta: -processed,
            }), { merge: true });
        }
        return { processedCount: processed, updatedClosureIds: updatedIds, settledReferenceDates: settledDates };
    });
    const pendingTotals = await (0, pendingTotals_1.fetchPendingTotals)(input.restaurantId);
    return {
        processedCount,
        updatedClosureIds,
        settledReferenceDates,
        pendingTotals,
    };
};
exports.liquidarPeriodoHandler = liquidarPeriodoHandler;
