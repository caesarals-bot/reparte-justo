/**
 * Cloud Function Handler: acceptInvitation
 * 
 * Permite a un usuario invitado aceptar una invitación y recibir el rol closure_editor.
 * Valida el límite de 2 closure_editor por restaurante.
 */

import { FieldValue } from "firebase-admin/firestore"
import { firestoreAdmin } from "../config/firebaseAdmin"

const MAX_CLOSURE_EDITORS = 2

export type AcceptInvitationInput = {
    invitationId: string
}

export type AcceptInvitationResult = {
    success: boolean
    message: string
    restaurantId?: string
    restaurantName?: string
}

/**
 * Handler principal
 */
export const acceptInvitationHandler = async (
    input: AcceptInvitationInput,
    callerUid: string,
    callerEmail: string | undefined
): Promise<AcceptInvitationResult> => {
    const { invitationId } = input

    if (!invitationId) {
        throw new Error("INVALID_INPUT: invitationId es requerido")
    }

    if (!callerEmail) {
        throw new Error("UNAUTHORIZED: Se requiere un email verificado para aceptar invitaciones")
    }

    const normalizedCallerEmail = callerEmail.toLowerCase()
    const timestamp = FieldValue.serverTimestamp()

    // Referencias
    const invitationRef = firestoreAdmin.collection("invitations").doc(invitationId)

    // Ejecutar en transacción
    const result = await firestoreAdmin.runTransaction(async (transaction) => {
        // 1. Leer invitación
        const invitationSnap = await transaction.get(invitationRef)

        if (!invitationSnap.exists) {
            throw new Error("NOT_FOUND: La invitación no existe")
        }

        const invitation = invitationSnap.data()!
        const {
            invitedEmail,
            restaurantId,
            restaurantName,
            role,
            status,
            expiresAt,
        } = invitation

        // 2. Validar que el email coincide
        if (invitedEmail.toLowerCase() !== normalizedCallerEmail) {
            throw new Error("UNAUTHORIZED: Esta invitación no es para tu cuenta")
        }

        // 3. Validar estado
        if (status !== "pending") {
            throw new Error(`INVALID_STATE: La invitación ya fue ${status === "accepted" ? "aceptada" : status === "rejected" ? "rechazada" : "procesada"}`)
        }

        // 4. Validar expiración
        const expiresAtDate = expiresAt?.toDate?.() || new Date(expiresAt)
        if (expiresAtDate < new Date()) {
            // Marcar como expirada
            transaction.update(invitationRef, {
                status: "expired",
                updatedAt: timestamp,
            })
            throw new Error("EXPIRED: La invitación ha expirado")
        }

        // 5. Validar que el rol es closure_editor (por ahora solo soportamos este)
        if (role !== "closure_editor") {
            throw new Error("INVALID_ROLE: Solo se pueden aceptar invitaciones para closure_editor")
        }

        // 6. Contar closure_editors actuales para el restaurante
        const usersSnapshot = await firestoreAdmin
            .collection("users")
            .where(`restaurantRoles.${restaurantId}`, "array-contains", "closure_editor")
            .get()

        if (usersSnapshot.size >= MAX_CLOSURE_EDITORS) {
            throw new Error("LIMIT_REACHED: Este restaurante ya tiene el máximo de editores permitidos (2)")
        }

        // 7. Verificar que el usuario no tenga ya el rol
        const userRef = firestoreAdmin.collection("users").doc(callerUid)
        const userSnap = await transaction.get(userRef)

        if (userSnap.exists) {
            const userData = userSnap.data()!
            const currentRoles = userData.restaurantRoles?.[restaurantId] || []
            if (currentRoles.includes("closure_editor")) {
                throw new Error("ALREADY_HAS_ROLE: Ya tienes permisos de editor en este restaurante")
            }
        }

        // 8. Asignar rol al usuario
        const userUpdate: Record<string, unknown> = {
            [`restaurantRoles.${restaurantId}`]: FieldValue.arrayUnion("closure_editor"),
            updatedAt: timestamp,
        }

        // Si el usuario no tiene primaryRestaurant, asignar este
        if (!userSnap.exists || !userSnap.data()?.primaryRestaurant) {
            userUpdate.primaryRestaurant = restaurantId
        }

        if (!userSnap.exists) {
            // Crear documento de usuario si no existe
            transaction.set(userRef, {
                uid: callerUid,
                email: callerEmail,
                displayName: null,
                photoURL: null,
                siteRoles: [],
                restaurantRoles: { [restaurantId]: ["closure_editor"] },
                primaryRestaurant: restaurantId,
                createdAt: timestamp,
                updatedAt: timestamp,
                isActive: true,
                metadata: {
                    createdVia: "invitation_accept",
                    invitationId,
                },
            })
        } else {
            transaction.update(userRef, userUpdate)
        }

        // 9. Marcar invitación como aceptada
        transaction.update(invitationRef, {
            status: "accepted",
            acceptedAt: timestamp,
            acceptedByUid: callerUid,
            updatedAt: timestamp,
        })

        return {
            restaurantId,
            restaurantName,
        }
    })

    // Log de auditoría
    await firestoreAdmin.collection("security_logs").add({
        action: "invitation_accepted",
        uid: callerUid,
        email: callerEmail,
        invitationId,
        restaurantId: result.restaurantId,
        timestamp: FieldValue.serverTimestamp(),
    })

    return {
        success: true,
        message: "Invitación aceptada correctamente. Ya tienes acceso al restaurante.",
        restaurantId: result.restaurantId,
        restaurantName: result.restaurantName,
    }
}

/**
 * Handler para rechazar invitación
 */
export const rejectInvitationHandler = async (
    input: AcceptInvitationInput,
    callerUid: string,
    callerEmail: string | undefined
): Promise<AcceptInvitationResult> => {
    const { invitationId } = input

    if (!invitationId) {
        throw new Error("INVALID_INPUT: invitationId es requerido")
    }

    if (!callerEmail) {
        throw new Error("UNAUTHORIZED: Se requiere un email verificado")
    }

    const normalizedCallerEmail = callerEmail.toLowerCase()
    const timestamp = FieldValue.serverTimestamp()

    const invitationRef = firestoreAdmin.collection("invitations").doc(invitationId)
    const invitationSnap = await invitationRef.get()

    if (!invitationSnap.exists) {
        throw new Error("NOT_FOUND: La invitación no existe")
    }

    const invitation = invitationSnap.data()!

    if (invitation.invitedEmail.toLowerCase() !== normalizedCallerEmail) {
        throw new Error("UNAUTHORIZED: Esta invitación no es para tu cuenta")
    }

    if (invitation.status !== "pending") {
        throw new Error("INVALID_STATE: La invitación ya fue procesada")
    }

    await invitationRef.update({
        status: "rejected",
        rejectedAt: timestamp,
        rejectedByUid: callerUid,
        updatedAt: timestamp,
    })

    // Log de auditoría
    await firestoreAdmin.collection("security_logs").add({
        action: "invitation_rejected",
        uid: callerUid,
        email: callerEmail,
        invitationId,
        restaurantId: invitation.restaurantId,
        timestamp: FieldValue.serverTimestamp(),
    })

    return {
        success: true,
        message: "Invitación rechazada.",
    }
}
