import { useCallback, useEffect, useState } from "react"
import { collection, getDocs, type Timestamp } from "firebase/firestore"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { db } from "@/firebase/config"

export type AdminUserStatus = "activo" | "suspendido" | "invitado"

export type AdminUserData = {
    id: string
    name: string
    email: string
    role: string
    status: AdminUserStatus
    lastAccess: string
    siteRoles: string[]
    restaurantRoles: Record<string, string[]>
}

export type AdminUserGroups = {
    administrators: AdminUserData[]
    operators: AdminUserData[]
}

const toDateOrNull = (value: unknown): Date | null => {
    if (!value) return null
    if (value instanceof Date) return value
    if (typeof value === "string") {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    if (typeof value === "object" && value !== null && typeof (value as Timestamp).toDate === "function") {
        return (value as Timestamp).toDate()
    }
    return null
}

const formatLastAccess = (date: Date | null): string => {
    if (!date) return "Sin acceso"
    try {
        return format(date, "dd MMM, HH:mm", { locale: es })
    } catch {
        return "Sin acceso"
    }
}

const getRoleLabel = (siteRoles: string[], restaurantRoles: Record<string, string[]>): string => {
    if (siteRoles.includes("super_admin")) return "Súper admin"
    if (siteRoles.includes("admin")) return "Administrador"
    if (siteRoles.includes("support")) return "Soporte"

    const allRestaurantRoles = Object.values(restaurantRoles).flat()
    if (allRestaurantRoles.includes("owner")) return "Propietario"
    if (allRestaurantRoles.includes("closure_editor")) return "Editor de cierres"
    if (allRestaurantRoles.includes("staff_member")) return "Staff"

    return "Sin rol"
}

const getStatus = (isActive: boolean | undefined, lastLogin: Date | null): AdminUserStatus => {
    if (isActive === false) return "suspendido"
    if (!lastLogin) return "invitado"
    return "activo"
}

export const useAdminUsers = () => {
    const [users, setUsers] = useState<AdminUserGroups>({ administrators: [], operators: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const usersSnapshot = await getDocs(collection(db, "users"))

            const administrators: AdminUserData[] = []
            const operators: AdminUserData[] = []

            usersSnapshot.docs.forEach((doc) => {
                const data = doc.data()

                const siteRoles: string[] = Array.isArray(data.siteRoles) ? data.siteRoles : []
                const restaurantRoles: Record<string, string[]> = 
                    typeof data.restaurantRoles === "object" && data.restaurantRoles !== null
                        ? data.restaurantRoles
                        : {}

                const lastLogin = toDateOrNull(data.lastLogin)
                const isActive = typeof data.isActive === "boolean" ? data.isActive : true

                const user: AdminUserData = {
                    id: doc.id,
                    name: typeof data.displayName === "string" && data.displayName.trim() 
                        ? data.displayName 
                        : (typeof data.email === "string" ? data.email.split("@")[0] : "Usuario"),
                    email: typeof data.email === "string" ? data.email : "Sin correo",
                    role: getRoleLabel(siteRoles, restaurantRoles),
                    status: getStatus(isActive, lastLogin),
                    lastAccess: formatLastAccess(lastLogin),
                    siteRoles,
                    restaurantRoles,
                }

                if (siteRoles.length > 0) {
                    administrators.push(user)
                } else {
                    operators.push(user)
                }
            })

            // Ordenar por último acceso (más reciente primero)
            const sortByLastAccess = (a: AdminUserData, b: AdminUserData) => {
                if (a.lastAccess === "Sin acceso") return 1
                if (b.lastAccess === "Sin acceso") return -1
                return 0
            }

            administrators.sort(sortByLastAccess)
            operators.sort(sortByLastAccess)

            setUsers({ administrators, operators })
        } catch (caughtError) {
            console.error("[useAdminUsers] Error al cargar usuarios", caughtError)
            setError("No pudimos cargar los usuarios. Intenta nuevamente.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchUsers()
    }, [fetchUsers])

    return {
        users,
        isLoading,
        error,
        refresh: fetchUsers,
        totalUsers: users.administrators.length + users.operators.length,
    }
}
