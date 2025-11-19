"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardarCierreDiarioHandler = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const closure_1 = require("../types/closure");
const guardarCierreDiarioHandler = async (payload) => {
    const input = closure_1.guardarCierreDiarioSchema.parse(payload);
    await ensureReferenceDateIsUnique(input);
    const closureSnapshot = buildClosureSnapshot(input);
    const closureRef = firebaseAdmin_1.firestoreAdmin
        .collection(`restaurants/${input.restaurantId}/registros_diarios`)
        .doc();
    await closureRef.set(closureSnapshot);
    const pendingTotals = await updateRestaurantAggregates({
        restaurantId: input.restaurantId,
        closureId: closureRef.id,
        dailySummary: input.dailySummary,
        referenceDate: input.metadata.referenceDate,
    });
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
    };
};
exports.guardarCierreDiarioHandler = guardarCierreDiarioHandler;
const ensureReferenceDateIsUnique = async (input) => {
    if (!input.metadata.referenceDateKey) {
        throw new Error("INVALID_REFERENCE_DATE");
    }
    const snapshot = await firebaseAdmin_1.firestoreAdmin
        .collection(`restaurants/${input.restaurantId}/registros_diarios`)
        .where("metadata.referenceDateKey", "==", input.metadata.referenceDateKey)
        .limit(1)
        .get();
    if (!snapshot.empty) {
        throw new Error("DUPLICATED_CLOSURE");
    }
};
const buildClosureSnapshot = (input) => {
    const now = firestore_1.Timestamp.now();
    return {
        estado: "pendiente",
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
    };
};
const updateRestaurantAggregates = async (params) => {
    const { restaurantId, dailySummary, referenceDate } = params;
    const restaurantRef = firebaseAdmin_1.firestoreAdmin.collection("restaurants").doc(restaurantId);
    const incrementUpdates = {
        "pendingTotals.netAfterDeductions": firestore_1.FieldValue.increment(dailySummary.netAfterDeductions),
        "pendingTotals.deductionsAmount": firestore_1.FieldValue.increment(dailySummary.deductionsAmount),
        "pendingTotals.transbankAmount": firestore_1.FieldValue.increment(dailySummary.transbankAmount),
        "pendingTotals.pendingCount": firestore_1.FieldValue.increment(1),
    };
    await restaurantRef.set({
        ...incrementUpdates,
        pendingDays: firestore_1.FieldValue.increment(1),
        lastClosureReferenceDate: referenceDate ?? null,
    }, { merge: true });
    const updatedRestaurant = await restaurantRef.get();
    const pendingTotalsData = updatedRestaurant.get("pendingTotals") ?? {};
    return {
        netAfterDeductions: Number(pendingTotalsData.netAfterDeductions) || 0,
        deductionsAmount: Number(pendingTotalsData.deductionsAmount) || 0,
        transbankAmount: Number(pendingTotalsData.transbankAmount) || 0,
        pendingCount: Number(pendingTotalsData.pendingCount) || 0,
    };
};
