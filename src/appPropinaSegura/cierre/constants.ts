import type { CierreFormValues, StaffEntry } from "./schema"
import { kitchenStaffData, serviceStaffData, type BaseStaffMember } from "./data/staff"

export const percentageInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

export const amountInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

const mapToStaffEntry = (member: BaseStaffMember): StaffEntry => ({
    id: member.id,
    nombre: member.nombre,
    ponderacion: member.ponderacion,
    presente: true,
    penalizacion_pct: 0,
    deduccion_valor: 0,
})

export const createDefaultCierreValues = (): CierreFormValues => ({
    asistenciaServicio: serviceStaffData.map(mapToStaffEntry),
    asistenciaCocina: kitchenStaffData.map(mapToStaffEntry),
    ventaDirecta: serviceStaffData.map((member) => ({
        ...mapToStaffEntry(member),
        montoIndividual: 0,
        porcentajeVenta: 0,
        totalVenta: 0,
    })),
    pocilloSecundario: kitchenStaffData.map(mapToStaffEntry),
})
