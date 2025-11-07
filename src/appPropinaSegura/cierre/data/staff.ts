import type { StaffEntry } from "../schema"

export type BaseStaffMember = Pick<StaffEntry, "id" | "nombre" | "ponderacion">

export const serviceStaffData: BaseStaffMember[] = [
    { id: "1", nombre: "María Rojas", ponderacion: "1.0 pt" },
    { id: "2", nombre: "Jorge Sáez", ponderacion: "0.75 pt" },
    { id: "3", nombre: "Camila Díaz", ponderacion: "0.5 pt" },
]

export const kitchenStaffData: BaseStaffMember[] = [
    { id: "a", nombre: "Lucas González", ponderacion: "1.0 pt" },
    { id: "b", nombre: "Valentina Ortiz", ponderacion: "0.9 pt" },
]
