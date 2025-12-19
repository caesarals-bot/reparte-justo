/**
 * Modal para invitar usuarios a un restaurante
 * Solo disponible para closure_editor
 */

import { useState, type FormEvent } from "react"
import { doc, setDoc, serverTimestamp, Timestamp, type FieldValue } from "firebase/firestore"
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
import { Mail, UserPlus } from "lucide-react"
import type { RestaurantRole } from "@/types/roles"
import type { CreateInvitationInput } from "@/types/invitation"

type InviteUserModalProps = {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  restaurantName: string
}

export const InviteUserModal = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
}: InviteUserModalProps) => {
  const { user } = useAuth()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<RestaurantRole | "">("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !role) {
      setError("Completa todos los campos")
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
        role: role as RestaurantRole,
        invitedByUid: user.uid,
        invitedByEmail: user.email || "",
        invitedByName: user.displayName,
        status: "pending",
        createdAt: serverTimestamp(),
        // Expira en 7 días
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      }

      await setDoc(doc(db, "invitations", invitationId), invitationData)

      // TODO: Enviar email de invitación usando Cloud Function
      // await sendInvitationEmail(email, invitationId, restaurantName)

      setSuccess(true)
      setEmail("")
      setRole("")

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
      setRole("")
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
            Invitar usuario
          </DialogTitle>
          <DialogDescription>
            Envía una invitación por correo para que otro usuario se una a{" "}
            <strong>{restaurantName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Invitación enviada exitosamente
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteRole">Rol a asignar</Label>
              <select
                id="inviteRole"
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary"
                value={role}
                onChange={(e) => setRole(e.target.value as RestaurantRole | "")}
                disabled={isSubmitting}
                required
              >
                <option value="">Selecciona un rol</option>
                <option value="closure_editor">
                  Gestor Principal (Crear/editar cierres, gestionar staff)
                </option>
                <option value="liquidator">
                  Liquidador (Crear liquidaciones)
                </option>
                <option value="restaurant_viewer">
                  Visualizador (Solo lectura)
                </option>
              </select>
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
