/**
 * Modal para invitar usuarios a un restaurante
 * Solo disponible para closure_editor
 * Solo permite invitar rol closure_editor (máximo 2 por restaurante)
 */

import { useState, useEffect, type FormEvent } from "react"
import { doc, setDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, type FieldValue } from "firebase/firestore"
import { db } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Mail, UserPlus, AlertTriangle } from "lucide-react"
import type { CreateInvitationInput } from "@/types/invitation"

const MAX_CLOSURE_EDITORS = 2

type InviteUserModalProps = {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  restaurantName: string
  currentClosureEditorCount?: number
}

export const InviteUserModal = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  currentClosureEditorCount = 1,
}: InviteUserModalProps) => {
  const { user } = useAuth()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0)
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)

  const totalEditors = currentClosureEditorCount + pendingInvitationsCount
  const canInvite = totalEditors < MAX_CLOSURE_EDITORS

  useEffect(() => {
    if (isOpen && restaurantId) {
      loadPendingInvitations()
    }
  }, [isOpen, restaurantId])

  const loadPendingInvitations = async () => {
    setIsLoadingInvitations(true)
    try {
      const invitationsQuery = query(
        collection(db, "invitations"),
        where("restaurantId", "==", restaurantId),
        where("status", "==", "pending"),
        where("role", "==", "closure_editor")
      )
      const snapshot = await getDocs(invitationsQuery)
      setPendingInvitationsCount(snapshot.size)
    } catch (err) {
      console.error("Error al cargar invitaciones pendientes:", err)
    } finally {
      setIsLoadingInvitations(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError("Ingresa un correo electrónico")
      return
    }

    if (!email.includes("@")) {
      setError("Ingresa un correo válido")
      return
    }

    if (!user) {
      setError("Debes estar autenticado")
      return
    }

    if (!canInvite) {
      setError("Ya se alcanzó el límite de editores para este restaurante")
      return
    }

    setIsSubmitting(true)

    try {
      // Crear invitación en Firestore
      const invitationId = `inv_${restaurantId}_${Date.now()}`
      const invitationData: CreateInvitationInput & {
        status: "pending"
        createdAt: FieldValue
        expiresAt: Timestamp
        invitationId: string
      } = {
        invitationId,
        restaurantId,
        restaurantName,
        invitedEmail: email.trim().toLowerCase(),
        role: "closure_editor",
        invitedByUid: user.uid,
        invitedByEmail: user.email || "",
        invitedByName: user.displayName,
        status: "pending",
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      }

      await setDoc(doc(db, "invitations", invitationId), invitationData)

      setSuccess(true)
      setEmail("")

      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err) {
      console.error("Error al enviar invitación:", err)
      setError("No se pudo enviar la invitación. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail("")
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invitar editor
          </DialogTitle>
          <DialogDescription>
            Invita a otro usuario para que pueda gestionar cierres y staff en{" "}
            <strong>{restaurantName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {!canInvite && !isLoadingInvitations ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Límite alcanzado
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                    Este restaurante ya tiene el máximo de 2 editores permitidos
                    {pendingInvitationsCount > 0 && ` (${pendingInvitationsCount} invitación pendiente)`}.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : success ? (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Invitación enviada exitosamente
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
              El usuario recibirá un enlace para aceptar la invitación.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Rol:</strong> Gestor Principal (closure_editor)
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Podrá crear/editar cierres, gestionar staff y configuración.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteEmail">
                Correo electrónico del usuario
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="inviteEmail"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || isLoadingInvitations}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar invitación"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
