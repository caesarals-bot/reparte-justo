"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardarCierreDiarioSchema = exports.eliminarCierreDiarioSchema = exports.submittedBySchema = exports.configurationSnapshotSchema = exports.restaurantContactSchema = exports.metadataSchema = exports.totalsSchema = exports.adjustmentEntrySchema = exports.penaltyEntrySchema = exports.staffAssignmentsSchema = exports.staffAssignmentSnapshotSchema = void 0;
const zod_1 = require("zod");
exports.staffAssignmentSnapshotSchema = zod_1.z.object({
    staffId: zod_1.z.string().min(1),
    nombre: zod_1.z.string().min(1),
    role: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    present: zod_1.z.boolean(),
    assignedAmount: zod_1.z.number().finite(),
    penaltyPercentage: zod_1.z.number().finite(),
    penaltyAmount: zod_1.z.number().finite(),
    deductionAmount: zod_1.z.number().finite(),
    netAmount: zod_1.z.number().finite(),
});
exports.staffAssignmentsSchema = zod_1.z.object({
    servicio: zod_1.z.array(exports.staffAssignmentSnapshotSchema),
    cocina: zod_1.z.array(exports.staffAssignmentSnapshotSchema),
    ventaDirecta: zod_1.z.array(exports.staffAssignmentSnapshotSchema),
    pocilloSecundario: zod_1.z.array(exports.staffAssignmentSnapshotSchema),
});
exports.penaltyEntrySchema = zod_1.z.object({
    staffId: zod_1.z.string().optional(),
    nombre: zod_1.z.string().min(1),
    role: zod_1.z.string().optional(),
    referenceDate: zod_1.z.string().nullable(),
    percentage: zod_1.z.number().finite(),
    amount: zod_1.z.number().finite(),
});
exports.adjustmentEntrySchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    staffId: zod_1.z.string().optional(),
    staffName: zod_1.z.string().optional(),
    variant: zod_1.z.enum(["monto", "porcentaje"]),
    type: zod_1.z.enum(["incremento", "descuento"]),
    amount: zod_1.z.number().finite().optional(),
    percentage: zod_1.z.number().finite().optional(),
    motivo: zod_1.z.string().optional(),
});
exports.totalsSchema = zod_1.z.object({
    pool: zod_1.z.number().finite(),
    directSales: zod_1.z.number().finite(),
    propinas: zod_1.z.number().finite(),
    transbankPercentage: zod_1.z.number().finite(),
    transbankAmount: zod_1.z.number().finite(),
    deductionsPercentage: zod_1.z.number().finite(),
    deductionsAmount: zod_1.z.number().finite(),
    netAfterDeductions: zod_1.z.number().finite(),
    kitchenShare: zod_1.z.number().finite(),
    garzonShare: zod_1.z.number().finite(),
    generalExpense: zod_1.z.number().finite(),
});
exports.metadataSchema = zod_1.z.object({
    referenceDate: zod_1.z.string().nullable(),
    referenceDateKey: zod_1.z.string().nullable(),
    daysWithoutSettlement: zod_1.z.number().int(),
});
exports.restaurantContactSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().optional(),
    responsibleName: zod_1.z.string().optional(),
})
    .optional();
exports.configurationSnapshotSchema = zod_1.z
    .object({
    settlementMode: zod_1.z.enum(["pool", "directa"]).nullable().optional(),
    poolPercentages: zod_1.z.object({ kitchen: zod_1.z.number().finite(), transbank: zod_1.z.number().finite() }),
    additionalDeductions: zod_1.z.array(zod_1.z.number().finite()),
    serviceStaff: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        role: zod_1.z.string().optional(),
        weight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
        email: zod_1.z.string().email().optional(),
        isActive: zod_1.z.boolean().optional(),
        entryDate: zod_1.z.string().optional(),
        inactiveSince: zod_1.z.string().optional(),
    })),
    supportStaff: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        role: zod_1.z.string().optional(),
        weight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
        email: zod_1.z.string().email().optional(),
        isActive: zod_1.z.boolean().optional(),
        entryDate: zod_1.z.string().optional(),
        inactiveSince: zod_1.z.string().optional(),
    })),
    contact: exports.restaurantContactSchema,
})
    .optional();
exports.submittedBySchema = zod_1.z
    .object({
    uid: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
})
    .optional();
exports.eliminarCierreDiarioSchema = zod_1.z.object({
    restaurantId: zod_1.z.string().min(1),
    closureId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(3).max(500).optional(),
    deletedBy: exports.submittedBySchema,
});
exports.guardarCierreDiarioSchema = zod_1.z.object({
    restaurantId: zod_1.z.string().min(1),
    mode: zod_1.z.enum(["pool", "directa"]),
    totals: exports.totalsSchema,
    deductions: zod_1.z.object({
        additionalPercentages: zod_1.z.array(zod_1.z.number().finite()),
        transbankPercentage: zod_1.z.number().finite(),
        transbankAmount: zod_1.z.number().finite(),
    }),
    staff: zod_1.z.object({
        asistenciaServicio: zod_1.z.array(zod_1.z.any()),
        asistenciaCocina: zod_1.z.array(zod_1.z.any()),
        ventaDirecta: zod_1.z.array(zod_1.z.any()),
        pocilloSecundario: zod_1.z.array(zod_1.z.any()),
    }),
    assignments: exports.staffAssignmentsSchema,
    metadata: exports.metadataSchema,
    penalties: zod_1.z.array(exports.penaltyEntrySchema),
    adjustments: zod_1.z.array(exports.adjustmentEntrySchema),
    dailySummary: zod_1.z.object({
        netAfterDeductions: zod_1.z.number().finite(),
        propinas: zod_1.z.number().finite(),
        transbankAmount: zod_1.z.number().finite(),
        deductionsAmount: zod_1.z.number().finite(),
        generalExpense: zod_1.z.number().finite(),
    }),
    restaurantContact: exports.restaurantContactSchema,
    configurationSnapshot: exports.configurationSnapshotSchema,
    submittedBy: exports.submittedBySchema,
    submittedAt: zod_1.z.string().optional(),
});
