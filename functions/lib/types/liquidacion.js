"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liquidarPeriodoSchema = exports.liquidacionContactSchema = exports.liquidacionMemberSchema = exports.liquidacionTotalsSchema = exports.liquidacionRangeSchema = void 0;
const zod_1 = require("zod");
exports.liquidacionRangeSchema = zod_1.z.object({
    from: zod_1.z.string().nullable(),
    to: zod_1.z.string().nullable(),
});
exports.liquidacionTotalsSchema = zod_1.z.object({
    netAfterDeductions: zod_1.z.number().finite(),
    propinas: zod_1.z.number().finite(),
    transbank: zod_1.z.number().finite(),
    deductions: zod_1.z.number().finite(),
    generalExpense: zod_1.z.number().finite(),
});
exports.liquidacionMemberSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nombre: zod_1.z.string(),
    role: zod_1.z.string().nullable().optional(),
    email: zod_1.z.string().email().optional(),
    totalNeto: zod_1.z.number().finite(),
    totalPenalizaciones: zod_1.z.number().finite(),
    totalDeducciones: zod_1.z.number().finite(),
    totalAjustes: zod_1.z.number().finite(),
});
exports.liquidacionContactSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().optional(),
    responsibleName: zod_1.z.string().optional(),
})
    .optional();
exports.liquidarPeriodoSchema = zod_1.z.object({
    restaurantId: zod_1.z.string().min(1),
    closureIds: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    range: exports.liquidacionRangeSchema,
    totals: exports.liquidacionTotalsSchema,
    members: zod_1.z.array(exports.liquidacionMemberSchema),
    contact: exports.liquidacionContactSchema,
});
