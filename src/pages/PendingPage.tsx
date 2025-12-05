/**
 * Página para usuarios que han creado cuenta pero aún no tienen roles asignados
 * 
 * Casos de uso:
 * - Usuario se registra pero espera que un admin le asigne roles
 * - Trabajador espera invitación de un closure_editor
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Clock, Mail, RefreshCw } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

const PendingPage = () => {
  const { user, signOutUser, refreshUserRoles, userRoles } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshUserRoles()
      
      // Si después de refrescar tiene roles, redirigir
      if (userRoles && (userRoles.siteRoles.length > 0 || Object.keys(userRoles.restaurantRoles).length > 0)) {
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Error al refrescar roles:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogout = async () => {
    await signOutUser()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-linear-to-b from-background to-muted/30">
      <Card className="w-full max-w-lg border bg-background/90 shadow-lg backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Cuenta Pendiente de Activación
          </CardTitle>
          <CardDescription className="text-base">
            Tu cuenta ha sido creada exitosamente, pero aún no tiene roles asignados.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información del usuario */}
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Usuario registrado:</p>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="space-y-3 text-sm">
            <p className="font-medium">¿Qué sigue ahora?</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Si eres <strong>propietario de un restaurante</strong>, espera a que un administrador te asigne el rol correspondiente.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Si eres <strong>trabajador/staff</strong>, espera a que el responsable de tu restaurante te invite y asigne permisos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  Verifica tu <strong>correo electrónico</strong> para confirmar tu cuenta si aún no lo has hecho.
                </span>
              </li>
            </ul>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="default"
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar permisos
                </>
              )}
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              Cerrar sesión
            </Button>
          </div>

          {/* Soporte */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              ¿Necesitas ayuda?{" "}
              <Link
                to="/support"
                className="text-primary hover:underline font-medium"
              >
                Contacta soporte
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PendingPage
