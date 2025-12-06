"use strict";
/**
 * Cloud Function Trigger: onUserCreate
 *
 * Se ejecuta automáticamente cuando se crea un nuevo usuario en Firebase Auth.
 * Crea el documento del usuario en Firestore con la estructura base.
 *
 * ⚠️ IMPORTANTE: Esta función garantiza que todos los usuarios tengan
 * un documento en /users/{uid} con roles iniciales vacíos.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
/**
 * Trigger que se ejecuta al crear un usuario en Firebase Auth
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL, emailVerified } = user;
    functions.logger.info("onUserCreate triggered", {
        uid,
        email,
        displayName,
    });
    try {
        // Verificar si ya existe el documento (por si acaso)
        const userDocRef = firebaseAdmin_1.firestoreAdmin.collection("users").doc(uid);
        const existingDoc = await userDocRef.get();
        if (existingDoc.exists) {
            functions.logger.warn("User document already exists, skipping creation", {
                uid,
                email,
            });
            return;
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
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
        };
        await userDocRef.set(userDocument);
        functions.logger.info("User document created successfully", {
            uid,
            email,
        });
        // Opcional: Crear log de auditoría
        await firebaseAdmin_1.firestoreAdmin.collection("security_logs").add({
            action: "user_created",
            uid,
            email,
            displayName,
            timestamp: firestore_1.FieldValue.serverTimestamp(),
            metadata: {
                provider: user.providerData[0]?.providerId,
                emailVerified,
            },
        });
        functions.logger.info("Audit log created", { uid });
    }
    catch (error) {
        functions.logger.error("Error creating user document", {
            uid,
            email,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Re-lanzar el error para que Firebase lo registre como fallido
        throw error;
    }
});
