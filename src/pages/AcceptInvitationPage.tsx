/**
 * Página para aceptar o rechazar invitaciones a restaurantes
 * Ruta: /invite/:invitationId
 * Usa Cloud Functions para aceptar/rechazar (valida límite de 2 closure_editor)
 */

import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Clock, Building2, UserCheck, Loader2 } from "lucide-react"
import type { InvitationDocument } from "@/types/invitation"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://us-central1-reparte-justo.cloudfunctions.net"

const AcceptInvitationPage = () => {
  const { invitationId } = useParams()
  const { user, isLoading: authLoading, refreshUserRoles } = useAuth()
  const navigate = useNavigate()

  const [invitation, setInvitation] = useState<InvitationDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationId) {
        setError("Invitación no válida")
        setIsLoading(false)
        return
      }

      try {
        const invitationDoc = await getDoc(doc(db, "invitations", invitationId))

        if (!invitationDoc.exists()) {
          setError("Esta invitación no existe")
          setIsLoading(false)
          return
        }

        const data = invitationDoc.data() as InvitationDocument

        // Verificar si ya fue aceptada/rechazada
        if (data.status !== "pending") {
          setError(`Esta invitación ya fue ${data.status === "accepted" ? "aceptada" : "rechazada"}`)
          setIsLoading(false)
          return
        }

        // Verificar si expiró
        const now = new Date()
        const expiresAt = data.expiresAt.toDate()
        if (now > expiresAt) {
          setError("Esta invitación ha expirado")
          setIsLoading(false)
          return
        }

        setInvitation(data)
      } catch (err) {
        console.error("Error al cargar invitación:", err)
        setError("No se pudo cargar la invitación")
      } finally {
        setIsLoading(false)
      }
    }

    loadInvitation()
  }, [invitationId])

  const handleAccept = async () => {
    if (!user || !invitation || !invitationId) return

    // Verificar que el email coincida
    if (user.email?.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      setError("Esta invitación no está dirigida a tu correo")
      return
    }

    setIsProcessing(true)

    try {
      // Obtener ID token para autenticación
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("No hay usuario autenticado")
      }
      const idToken = await currentUser.getIdToken()

      // Llamar a Cloud Function para aceptar invitación
      const response = await fetch(`${API_BASE_URL}/acceptInvitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ invitationId }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Manejar errores específicos
        if (result.code === "LIMIT_REACHED") {
          setError("Este restaurante ya tiene el máximo de editores permitidos (2)")
        } else if (result.code === "ALREADY_HAS_ROLE") {
          setError("Ya tienes permisos de editor en este restaurante")
        } else if (result.code === "EXPIRED") {
          setError("Esta invitación ha expirado")
        } else {
          setError(result.message || "No se pudo aceptar la invitación")
        }
        setIsProcessing(false)
        return
      }

      // Refrescar roles del usuario
      await refreshUserRoles()

      // Redirigir al dashboard
      setTimeout(() => {
        navigate("/cierre")
      }, 1500)
    } catch (err) {
      console.error("Error al aceptar invitación:", err)
      setError("No se pudo aceptar la invitación. Intenta nuevamente.")
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!user || !invitationId) return

    setIsProcessing(true)

    try {
      // Obtener ID token para autenticación
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("No hay usuario autenticado")
      }
      const idToken = await currentUser.getIdToken()

      // Llamar a Cloud Function para rechazar invitación
      const response = await fetch(`${API_BASE_URL}/rejectInvitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ invitationId }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.message || "No se pudo rechazar la invitación")
        setIsProcessing(false)
        return
      }

      setTimeout(() => {
        navigate("/")
      }, 1500)
    } catch (err) {
      console.error("Error al rechazar invitación:", err)
      setError("No se pudo rechazar la invitación. Intenta nuevamente.")
      setIsProcessing(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-linear-to-b from-background to-muted/30">
        <Card className="w-full max-w-md border bg-background/90 shadow-lg backdrop-blur">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <X className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Invitación no válida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link to="/">Volver al inicio</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-linear-to-b from-background to-muted/30">
        <Card className="w-full max-w-md border bg-background/90 shadow-lg backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle>Inicia sesión para continuar</CardTitle>
            <CardDescription>
              Debes iniciar sesión con la cuenta {invitation?.invitedEmail} para aceptar esta invitación.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to={`/auth/login?redirect=/invite/${invitationId}`}>Iniciar sesión</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/auth/register?redirect=/invite/${invitationId}`}>Crear cuenta</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!invitation) return null

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-linear-to-b from-background to-muted/30">
      <Card className="w-full max-w-lg border bg-background/90 shadow-lg backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Invitación a restaurante</CardTitle>
          <CardDescription className="text-base">
            Has sido invitado a unirte a <strong>{invitation.restaurantName}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Invitado por:</p>
                <p className="text-sm text-muted-foreground">
                  {invitation.invitedBy.displayName || invitation.invitedBy.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Rol asignado:</p>
                <p className="text-sm text-muted-foreground">
                  {getRoleDisplayName(invitation.role)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Expira el:</p>
                <p className="text-sm text-muted-foreground">
                  {invitation.expiresAt.toDate().toLocaleDateString("es-CL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Procesando...</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <X className="mr-2 h-4 w-4" />
            Rechazar
          </Button>
          <Button
            className="flex-1"
            onClick={handleAccept}
            disabled={isProcessing}
          >
            <Check className="mr-2 h-4 w-4" />
            Aceptar invitación
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

const getRoleDisplayName = (role: string): string => {
  const displayNames: Record<string, string> = {
    closure_editor: "Gestor Principal (Crear y editar cierres, gestionar staff)",
    liquidator: "Liquidador (Crear liquidaciones)",
    restaurant_viewer: "Visualizador (Solo lectura)",
    owner: "Propietario",
  }

  return displayNames[role] || role
}

export default AcceptInvitationPage
