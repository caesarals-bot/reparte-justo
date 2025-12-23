/**
 * Cloud Function Handler: bootstrapOnboarding
 * 
 * Crea el restaurante y asigna el rol closure_editor al usuario en una sola operación.
 * Esto elimina race conditions y problemas de timing con el trigger onUserCreate.
 * 
 * Se llama desde /setup cuando el usuario completa la configuración inicial.
 */

import { FieldValue } from "firebase-admin/firestore"
import { firestoreAdmin } from "../config/firebaseAdmin"

/**
 * Tipos para el payload de entrada
 */
type PoolConfig = {
    kitchenPercentage: number
    transbankPercentage: number
}

type DirectConfig = {
    directWaiterPercentage: number
}

type AdditionalDeduction = {
    name: string
    percentage: number
}

type StaffMember = {
    id: string
    name: string
    email: string | null
    role: string
    isActive: boolean
    startDate: string | null
    inactiveDate: string | null
}

export type BootstrapOnboardingInput = {
    // Auth
    uid: string
    
    // Restaurant config
    restaurantId: string
    restaurantName: string
    responsibleName: string | null
    settlementMode: "pool" | "directa"
    poolConfig?: PoolConfig
    directConfig?: DirectConfig
    additionalDeductions: AdditionalDeduction[]
    serviceStaff: StaffMember[]
    supportStaff: StaffMember[]
    staffEditors: string[]
}

export type BootstrapOnboardingResult = {
    success: boolean
    restaurantId: string
    message: string
}

/**
 * Handler principal
 */
export const bootstrapOnboardingHandler = async (
    input: BootstrapOnboardingInput,
    callerUid: string
): Promise<BootstrapOnboardingResult> => {
    const {
        uid,
        restaurantId,
        restaurantName,
        responsibleName,
        settlementMode,
        poolConfig,
        directConfig,
        additionalDeductions,
        serviceStaff,
        supportStaff,
        staffEditors,
    } = input

    // Validación: el caller debe ser el mismo usuario
    if (callerUid !== uid) {
        throw new Error("UNAUTHORIZED: Solo puedes hacer bootstrap de tu propia cuenta")
    }

    // Validación básica
    if (!restaurantId || !restaurantName?.trim()) {
        throw new Error("INVALID_INPUT: restaurantId y restaurantName son requeridos")
    }

    if (!serviceStaff || serviceStaff.length === 0) {
        throw new Error("INVALID_INPUT: Se requiere al menos un integrante del staff de servicio")
    }

    const timestamp = FieldValue.serverTimestamp()

    // Referencias
    const restaurantRef = firestoreAdmin.collection("restaurants").doc(restaurantId)
    const userRef = firestoreAdmin.collection("users").doc(uid)

    // Ejecutar en transacción para garantizar atomicidad
    await firestoreAdmin.runTransaction(async (transaction) => {
        // 1. Leer estado actual
        const [restaurantSnap, userSnap] = await Promise.all([
            transaction.get(restaurantRef),
            transaction.get(userRef),
        ])

        // 2. Preparar datos del restaurante
        const restaurantExists = restaurantSnap.exists
        const restaurantData: Record<string, unknown> = {
            restaurantName: restaurantName.trim(),
            responsibleName: responsibleName?.trim() || null,
            settlementMode,
            additionalDeductions,
            serviceStaff,
            supportStaff,
            staffEditors,
            setupCompleted: true,
            updatedAt: timestamp,
        }

        // Configuración según modo
        if (settlementMode === "pool" && poolConfig) {
            restaurantData.poolConfig = poolConfig
            // Solo usar delete() en update, no en set
            if (restaurantExists) {
                restaurantData.directConfig = FieldValue.delete()
            }
        } else if (settlementMode === "directa" && directConfig) {
            restaurantData.directConfig = directConfig
            // Solo usar delete() en update, no en set
            if (restaurantExists) {
                restaurantData.poolConfig = FieldValue.delete()
            }
        }

        // Solo agregar campos de creación si es nuevo
        if (!restaurantExists) {
            restaurantData.createdAt = timestamp
            restaurantData.ownerId = uid
        }

        // 3. Preparar datos del usuario
        const userData = userSnap.data() || {}
        const currentRestaurantRoles = userData.restaurantRoles || {}
        const currentRolesForRestaurant = currentRestaurantRoles[restaurantId] || []
        const hasClosure = currentRolesForRestaurant.includes("closure_editor")

        // Solo asignar si no tiene el rol
        const userUpdate: Record<string, unknown> = {
            updatedAt: timestamp,
        }

        if (!hasClosure) {
            userUpdate[`restaurantRoles.${restaurantId}`] = ["closure_editor"]
        }

        // Solo setear primaryRestaurant si no tiene uno
        if (!userData.primaryRestaurant) {
            userUpdate.primaryRestaurant = restaurantId
        }

        // 4. Escribir
        if (restaurantExists) {
            transaction.update(restaurantRef, restaurantData)
        } else {
            transaction.set(restaurantRef, restaurantData)
        }

        // Si el usuario no existe (raro, pero posible), crearlo con estructura base
        if (!userSnap.exists) {
            transaction.set(userRef, {
                uid,
                email: null,
                displayName: null,
                photoURL: null,
                siteRoles: [],
                restaurantRoles: { [restaurantId]: ["closure_editor"] },
                primaryRestaurant: restaurantId,
                createdAt: timestamp,
                updatedAt: timestamp,
                isActive: true,
                metadata: {
                    createdVia: "bootstrap_onboarding",
                },
            })
        } else {
            transaction.update(userRef, userUpdate)
        }
    })

    // Log de auditoría
    await firestoreAdmin.collection("security_logs").add({
        action: "bootstrap_onboarding",
        uid,
        restaurantId,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
            restaurantName: restaurantName.trim(),
            settlementMode,
        },
    })

    return {
        success: true,
        restaurantId,
        message: "Restaurante creado y permisos asignados correctamente",
    }
}
