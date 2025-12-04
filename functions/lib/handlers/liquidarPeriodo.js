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
const applyDirectSalesAdjustments = (summary, adjustments) => {
    if (!adjustments) {
        return { summary, adjustmentAmount: 0 };
    }
    const percentageFee = typeof adjustments.percentageFee === "number" ? adjustments.percentageFee : undefined;
    const fixedFee = typeof adjustments.fixedFee === "number" ? adjustments.fixedFee : undefined;
    if (!percentageFee && !fixedFee) {
        return { summary, adjustmentAmount: 0 };
    }
    let updatedNet = summary.netAfterDeductions;
    let totalAdjustment = 0;
    if (percentageFee) {
        const percentageDiscount = Math.max(0, percentageFee) / 100;
        const percentageAmount = Math.min(updatedNet, updatedNet * percentageDiscount);
        updatedNet -= percentageAmount;
        totalAdjustment += percentageAmount;
    }
    if (fixedFee) {
        const fixedAmount = Math.min(updatedNet, Math.max(0, fixedFee));
        updatedNet -= fixedAmount;
        totalAdjustment += fixedAmount;
    }
    return {
        summary: {
            ...summary,
            netAfterDeductions: Math.max(0, updatedNet),
        },
        adjustmentAmount: totalAdjustment,
    };
};
const liquidarPeriodoHandler = async (payload) => {
    const input = liquidacion_1.liquidarPeriodoSchema.parse(payload);
    const restaurantRef = firebaseAdmin_1.firestoreAdmin.collection("restaurants").doc(input.restaurantId);
    const closuresCollection = restaurantRef.collection("registros_diarios");
    const now = firestore_1.Timestamp.now();
    const settlementRange = input.range ?? { from: null, to: null };
    const settlementId = (() => {
        if (settlementRange.from || settlementRange.to) {
            return `${settlementRange.from ?? ""}|${settlementRange.to ?? ""}`;
        }
        return `${now.toMillis()}`;
    })();
    const { processedCount, updatedClosureIds, settledReferenceDates } = await firebaseAdmin_1.firestoreAdmin.runTransaction(async (transaction) => {
        // Fase 1: TODAS las lecturas primero (requisito de Firestore)
        const closureReads = await Promise.all(input.closureIds.map(async (closureId) => {
            const docRef = closuresCollection.doc(closureId);
            const snapshot = await transaction.get(docRef);
            return { closureId, docRef, snapshot };
        }));
        // Fase 2: Procesar datos de las lecturas
        const closuresToUpdate = [];
        let netDelta = 0;
        let deductionsDelta = 0;
        let transbankDelta = 0;
        let detectedMode = null;
        for (const { closureId, docRef, snapshot } of closureReads) {
            if (!snapshot.exists) {
                continue;
            }
            const data = snapshot.data();
            if (data.estado === "pagado") {
                continue;
            }
            const closureMode = data.mode ?? data.configurationSnapshot?.settlementMode ?? input.mode ?? null;
            if (!detectedMode) {
                detectedMode = closureMode;
            }
            else if (closureMode && detectedMode && closureMode !== detectedMode) {
                throw new Error("MIXED_CLOSURE_MODES_NOT_ALLOWED");
            }
            const summary = extractDailySummary(data);
            const { summary: adjustedSummary, adjustmentAmount } = applyDirectSalesAdjustments(summary, detectedMode === "directa" ? input.directSalesAdjustments : undefined);
            netDelta += adjustedSummary.netAfterDeductions;
            deductionsDelta += summary.deductionsAmount;
            transbankDelta += summary.transbankAmount;
            const referenceDate = data.metadata?.referenceDate ?? null;
            closuresToUpdate.push({
                closureId,
                docRef,
                summary: adjustedSummary,
                referenceDate: typeof referenceDate === "string" && referenceDate.length ? referenceDate : null,
                mode: closureMode,
                directSalesAdjustmentApplied: adjustmentAmount,
            });
        }
        if (detectedMode && detectedMode !== input.mode) {
            throw new Error("PAYLOAD_MODE_MISMATCH");
        }
        // Fase 3: TODAS las escrituras (después de todas las lecturas)
        for (const { docRef, referenceDate, mode, directSalesAdjustmentApplied } of closuresToUpdate) {
            transaction.update(docRef, {
                estado: "pagado",
                liquidatedAt: now,
                liquidatedBy: input.contact ?? null,
                liquidacionRange: settlementRange,
                liquidacionId: settlementId,
                liquidacionMode: mode ?? null,
                directSalesAdjustmentsSnapshot: input.directSalesAdjustments ?? null,
                directSalesAdjustmentApplied,
                updatedAt: now,
            });
        }
        if (closuresToUpdate.length > 0) {
            transaction.set(restaurantRef, (0, pendingTotals_1.buildPendingTotalsUpdate)({
                netAfterDeductions: -netDelta,
                deductionsAmount: -deductionsDelta,
                transbankAmount: -transbankDelta,
                pendingCount: -closuresToUpdate.length,
                pendingDaysDelta: -closuresToUpdate.length,
            }), { merge: true });
        }
        return {
            processedCount: closuresToUpdate.length,
            updatedClosureIds: closuresToUpdate.map((c) => c.closureId),
            settledReferenceDates: closuresToUpdate
                .map((c) => c.referenceDate)
                .filter((date) => date !== null),
        };
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
