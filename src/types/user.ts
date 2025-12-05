/**
 * Tipos relacionados con usuarios y autenticación
 */

import type { Timestamp } from "firebase/firestore"
import type { SiteRole, RestaurantRole } from "./roles"

// ============================================
// DOCUMENTO DE USUARIO EN FIRESTORE
// ============================================

/**
 * Estructura del documento en /users/{uid}
 */
export type UserDocument = {
  uid: string
  email: string
  displayName: string | null
  photoURL?: string | null

  // Roles administrativos del sitio
  siteRoles: SiteRole[]

  // Roles operativos por restaurante
  // Ejemplo: { "rest123": ["closure_editor"], "rest456": ["liquidator"] }
  restaurantRoles: Record<string, RestaurantRole[]>

  // Timestamps
  createdAt: Timestamp | null
  lastLogin: Timestamp | null
  lastActivity: Timestamp | null

  // Estado de cuenta
  isActive: boolean
  emailVerified: boolean

  // Seguridad
  loginAttempts: number
  lockedUntil: Timestamp | null
  
  // MFA (opcional, para futuro)
  mfaEnabled?: boolean
  mfaSecret?: string

  // Preferencias de sesión (opcional)
  sessionSettings?: {
    maxDevices?: number
    notifyOnNewDevice?: boolean
  }
}

/**
 * Versión simplificada para el contexto (sin campos de Firestore)
 */
export type UserRoles = {
  siteRoles: SiteRole[]
  restaurantRoles: Record<string, RestaurantRole[]>
}

// ============================================
// INFORMACIÓN DE SESIÓN
// ============================================

/**
 * Información del dispositivo para sesiones
 */
export type DeviceInfo = {
  userAgent: string
  platform: string
  browser: string
  ip?: string
}

/**
 * Documento de sesión en /users/{uid}/sessions/{sessionId}
 */
export type SessionDocument = {
  sessionId: string
  userId: string

  deviceInfo: DeviceInfo

  location?: {
    country?: string
    city?: string
  }

  createdAt: Timestamp
  lastActivity: Timestamp
  expiresAt: Timestamp

  status: "active" | "expired" | "revoked"
  revokedAt?: Timestamp
  revokedBy?: "user" | "admin" | "system"
  revokedReason?: string
}

// ============================================
// LOGS DE SEGURIDAD
// ============================================

/**
 * Acciones registradas en logs de seguridad
 */
export type SecurityAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "session_revoked"
  | "session_expired"
  | "captcha_required"
  | "captcha_failed"
  | "account_locked"
  | "password_reset_requested"
  | "password_reset_completed"
  | "email_verified"

/**
 * Documento de log de seguridad en /security_logs/{logId}
 */
export type SecurityLog = {
  logId: string
  userId: string
  action: SecurityAction

  sessionId?: string
  deviceInfo?: DeviceInfo
  ip?: string
  timestamp: Timestamp

  metadata?: {
    reason?: string
    previousAttempts?: number
    [key: string]: unknown
  }
}

// ============================================
// UTILIDADES DE TIPOS
// ============================================

/**
 * Tipo helper para crear un documento de usuario sin timestamps
 * (útil al crear usuarios nuevos)
 */
export type CreateUserInput = Omit<
  UserDocument,
  "createdAt" | "lastLogin" | "lastActivity" | "uid"
> & {
  uid: string
}

/**
 * Tipo helper para actualizar usuario
 */
export type UpdateUserInput = Partial<
  Omit<UserDocument, "uid" | "email" | "createdAt">
>

/**
 * Tipo para la respuesta del contexto de autenticación
 */
export type AuthContextValue = {
  user: { uid: string; email: string | null; displayName: string | null } | null
  userRoles: UserRoles | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string | null
  email: string | null
  uid: string | null
  signOutUser: () => Promise<void>
  refreshUserRoles: () => Promise<void>
}
