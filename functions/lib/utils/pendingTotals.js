"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPendingTotalsDelta = exports.fetchPendingTotals = exports.buildPendingTotalsUpdate = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const normalizeNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return 0;
};
const normalizeSnapshot = (data) => ({
    netAfterDeductions: normalizeNumber(data?.netAfterDeductions),
    deductionsAmount: normalizeNumber(data?.deductionsAmount),
    transbankAmount: normalizeNumber(data?.transbankAmount),
    pendingCount: Math.max(0, Math.trunc(normalizeNumber(data?.pendingCount))),
});
const buildPendingTotalsUpdate = (delta) => {
    const updates = {
        "pendingTotals.netAfterDeductions": firestore_1.FieldValue.increment(delta.netAfterDeductions),
        "pendingTotals.deductionsAmount": firestore_1.FieldValue.increment(delta.deductionsAmount),
        "pendingTotals.transbankAmount": firestore_1.FieldValue.increment(delta.transbankAmount),
        "pendingTotals.pendingCount": firestore_1.FieldValue.increment(delta.pendingCount),
    };
    if (delta.pendingDaysDelta && delta.pendingDaysDelta !== 0) {
        updates["pendingDays"] = firestore_1.FieldValue.increment(delta.pendingDaysDelta);
    }
    return updates;
};
exports.buildPendingTotalsUpdate = buildPendingTotalsUpdate;
const fetchPendingTotals = async (restaurantId) => {
    const restaurantRef = firebaseAdmin_1.firestoreAdmin.collection("restaurants").doc(restaurantId);
    const snapshot = await restaurantRef.get();
    const pendingTotalsData = snapshot.get("pendingTotals");
    return normalizeSnapshot(pendingTotalsData);
};
exports.fetchPendingTotals = fetchPendingTotals;
const applyPendingTotalsDelta = async (restaurantId, delta) => {
    const restaurantRef = firebaseAdmin_1.firestoreAdmin.collection("restaurants").doc(restaurantId);
    await restaurantRef.set((0, exports.buildPendingTotalsUpdate)(delta), { merge: true });
    return (0, exports.fetchPendingTotals)(restaurantId);
};
exports.applyPendingTotalsDelta = applyPendingTotalsDelta;
