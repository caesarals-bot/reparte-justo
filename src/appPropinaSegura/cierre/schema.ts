import { z } from "zod"

export const staffEntrySchema = z.object({
    id: z.string(),
    nombre: z.string(),
    ponderacion: z.string().optional(),
    presente: z.boolean(),
    penalizacion_pct: z.number().nonnegative(),
    deduccion_valor: z.number().nonnegative(),
    montoIndividual: z.number().nonnegative().optional(),
    porcentajeVenta: z.number().nonnegative().max(100).optional(),
    totalVenta: z.number().nonnegative().optional(),
    email: z.string().email().optional(),
    role: z.enum(["garzon", "cocinero", "ayudante"]).optional(),
})

export const cierreSchema = z
    .object({
        asistenciaServicio: z.array(staffEntrySchema),
        asistenciaCocina: z.array(staffEntrySchema),
        ventaDirecta: z.array(staffEntrySchema),
        pocilloSecundario: z.array(staffEntrySchema),
    })
    .superRefine((values, ctx) => {
        values.ventaDirecta.forEach((item, index) => {
            if (item.montoIndividual === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El monto de venta individual es requerido",
                    path: ["ventaDirecta", index, "montoIndividual"],
                })
            }
            if (item.porcentajeVenta === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El porcentaje de venta es requerido",
                    path: ["ventaDirecta", index, "porcentajeVenta"],
                })
            }
            if (item.totalVenta === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El total de venta es requerido",
                    path: ["ventaDirecta", index, "totalVenta"],
                })
            }
        })
    })

export type StaffEntry = z.infer<typeof staffEntrySchema>
export type CierreFormValues = z.infer<typeof cierreSchema>
