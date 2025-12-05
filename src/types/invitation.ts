/**
 * Tipos relacionados con invitaciones a restaurantes
 */

import type { Timestamp } from "firebase/firestore"
import type { RestaurantRole } from "./roles"

/**
 * Estado de una invitación
 */
export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired"

/**
 * Documento de invitación en /invitations/{invitationId}
 */
export type InvitationDocument = {
  invitationId: string
  restaurantId: string
  restaurantName: string
  
  // Usuario que envía la invitación
  invitedBy: {
    uid: string
    email: string
    displayName: string | null
  }
  
  // Usuario invitado
  invitedEmail: string
  invitedUserId?: string // Se llena cuando el usuario acepta
  
  // Rol que se asignará al aceptar
  role: RestaurantRole
  
  // Estado y timestamps
  status: InvitationStatus
  createdAt: Timestamp
  expiresAt: Timestamp
  
  acceptedAt?: Timestamp
  rejectedAt?: Timestamp
}

/**
 * Input para crear una invitación
 */
export type CreateInvitationInput = {
  restaurantId: string
  restaurantName: string
  invitedEmail: string
  role: RestaurantRole
  invitedByUid: string
  invitedByEmail: string
  invitedByName: string | null
}
