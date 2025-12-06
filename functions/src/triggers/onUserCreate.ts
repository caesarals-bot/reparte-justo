/**
 * Cloud Function Trigger: onUserCreate
 * 
 * Se ejecuta automáticamente cuando se crea un nuevo usuario en Firebase Auth.
 * Crea el documento del usuario en Firestore con la estructura base.
 * 
 * ⚠️ IMPORTANTE: Esta función garantiza que todos los usuarios tengan
 * un documento en /users/{uid} con roles iniciales vacíos.
 */

import * as functions from "firebase-functions/v1"
import { FieldValue } from "firebase-admin/firestore"
import { firestoreAdmin } from "../config/firebaseAdmin"

/**
 * Trigger que se ejecuta al crear un usuario en Firebase Auth
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL, emailVerified } = user

    functions.logger.info("onUserCreate triggered", {
        uid,
        email,
        displayName,
    })

    try {
        // Verificar si ya existe el documento (por si acaso)
        const userDocRef = firestoreAdmin.collection("users").doc(uid)
        const existingDoc = await userDocRef.get()

        if (existingDoc.exists) {
            functions.logger.warn("User document already exists, skipping creation", {
                uid,
                email,
            })
            return
        }

        // Crear documento del usuario con estructura base
        const userDocument = {
            // Identificación
            uid,
            email: email || null,
            displayName: displayName || null,
            photoURL: photoURL || null,

            // Roles (vacíos inicialmente)
            siteRoles: [],
            restaurantRoles: {},

            // Timestamps
            createdAt: FieldValue.serverTimestamp(),
            lastLogin: null,
            lastActivity: null,

            // Estado y seguridad
            emailVerified: emailVerified || false,
            isActive: true,
            loginAttempts: 0,
            lockedUntil: null,

            // Metadatos opcionales
            metadata: {
                createdVia: "auth_trigger",
                provider: user.providerData[0]?.providerId || "email",
            },
        }

        await userDocRef.set(userDocument)

        functions.logger.info("User document created successfully", {
            uid,
            email,
        })

        // Opcional: Crear log de auditoría
        await firestoreAdmin.collection("security_logs").add({
            action: "user_created",
            uid,
            email,
            displayName,
            timestamp: FieldValue.serverTimestamp(),
            metadata: {
                provider: user.providerData[0]?.providerId,
                emailVerified,
            },
        })

        functions.logger.info("Audit log created", { uid })

    } catch (error) {
        functions.logger.error("Error creating user document", {
            uid,
            email,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        })

        // Re-lanzar el error para que Firebase lo registre como fallido
        throw error
    }
})
