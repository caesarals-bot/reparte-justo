import { z } from "zod"

export const staffAssignmentSnapshotSchema = z.object({
    staffId: z.string().min(1),
    nombre: z.string().min(1),
    role: z.string().optional(),
    email: z.string().email().optional(),
    present: z.boolean(),
    assignedAmount: z.number().finite(),
    penaltyPercentage: z.number().finite(),
    penaltyAmount: z.number().finite(),
    deductionAmount: z.number().finite(),
    netAmount: z.number().finite(),
})

export const staffAssignmentsSchema = z.object({
    servicio: z.array(staffAssignmentSnapshotSchema),
    cocina: z.array(staffAssignmentSnapshotSchema),
    ventaDirecta: z.array(staffAssignmentSnapshotSchema),
    pocilloSecundario: z.array(staffAssignmentSnapshotSchema),
})

export const penaltyEntrySchema = z.object({
    staffId: z.string().optional(),
    nombre: z.string().min(1),
    role: z.string().optional(),
    referenceDate: z.string().nullable(),
    percentage: z.number().finite(),
    amount: z.number().finite(),
})

export const adjustmentEntrySchema = z.object({
    id: z.string().min(1),
    staffId: z.string().optional(),
    staffName: z.string().optional(),
    variant: z.enum(["monto", "porcentaje"]),
    type: z.enum(["incremento", "descuento"]),
    amount: z.number().finite().optional(),
    percentage: z.number().finite().optional(),
    motivo: z.string().optional(),
})

export const totalsSchema = z.object({
    pool: z.number().finite(),
    directSales: z.number().finite(),
    propinas: z.number().finite(),
    transbankPercentage: z.number().finite(),
    transbankAmount: z.number().finite(),
    deductionsPercentage: z.number().finite(),
    deductionsAmount: z.number().finite(),
    netAfterDeductions: z.number().finite(),
    kitchenShare: z.number().finite(),
    garzonShare: z.number().finite(),
})

export const metadataSchema = z.object({
    referenceDate: z.string().nullable(),
    referenceDateKey: z.string().nullable(),
    daysWithoutSettlement: z.number().int(),
})

export const restaurantContactSchema = z
    .object({
        email: z.string().email().optional(),
        responsibleName: z.string().optional(),
    })
    .optional()

export const configurationSnapshotSchema = z
    .object({
        settlementMode: z.enum(["pool", "directa"]).nullable().optional(),
        poolPercentages: z.object({ kitchen: z.number().finite(), transbank: z.number().finite() }),
        additionalDeductions: z.array(z.number().finite()),
        serviceStaff: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                role: z.string().optional(),
                weight: z.union([z.number(), z.string()]).optional(),
                email: z.string().email().optional(),
                isActive: z.boolean().optional(),
                entryDate: z.string().optional(),
                inactiveSince: z.string().optional(),
            }),
        ),
        supportStaff: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                role: z.string().optional(),
                weight: z.union([z.number(), z.string()]).optional(),
                email: z.string().email().optional(),
                isActive: z.boolean().optional(),
                entryDate: z.string().optional(),
                inactiveSince: z.string().optional(),
            }),
        ),
        contact: restaurantContactSchema,
    })
    .optional()

export const submittedBySchema = z
    .object({
        uid: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
    })
    .optional()

export const guardarCierreDiarioSchema = z.object({
    restaurantId: z.string().min(1),
    mode: z.enum(["pool", "directa"]),
    totals: totalsSchema,
    deductions: z.object({
        additionalPercentages: z.array(z.number().finite()),
        transbankPercentage: z.number().finite(),
        transbankAmount: z.number().finite(),
    }),
    staff: z.object({
        asistenciaServicio: z.array(z.any()),
        asistenciaCocina: z.array(z.any()),
        ventaDirecta: z.array(z.any()),
        pocilloSecundario: z.array(z.any()),
    }),
    assignments: staffAssignmentsSchema,
    metadata: metadataSchema,
    penalties: z.array(penaltyEntrySchema),
    adjustments: z.array(adjustmentEntrySchema),
    dailySummary: z.object({
        netAfterDeductions: z.number().finite(),
        propinas: z.number().finite(),
        transbankAmount: z.number().finite(),
        deductionsAmount: z.number().finite(),
    }),
    restaurantContact: restaurantContactSchema,
    configurationSnapshot: configurationSnapshotSchema,
    submittedBy: submittedBySchema,
    submittedAt: z.string().optional(),
})

export type GuardarCierreDiarioInput = z.infer<typeof guardarCierreDiarioSchema>
export type StaffAssignmentsSnapshot = z.infer<typeof staffAssignmentsSchema>
export type StaffAssignmentSnapshot = z.infer<typeof staffAssignmentSnapshotSchema>
