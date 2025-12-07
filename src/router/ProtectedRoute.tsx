/**
 * Componente para proteger rutas con validación de autenticación y roles
 * 
 * Ejemplos de uso:
 * 
 * 1. Solo usuarios autenticados:
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 * 
 * 2. Requiere rol de sitio específico:
 * ```tsx
 * <ProtectedRoute requireSiteRole={["super_admin", "admin"]}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 * 
 * 3. Requiere rol de restaurante específico:
 * ```tsx
 * <ProtectedRoute 
 *   requireRestaurantRole={["closure_editor"]}
 *   restaurantId={currentRestaurantId}
 * >
 *   <CierreDiarioPage />
 * </ProtectedRoute>
 * ```
 */

import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Lock, Loader2 } from "lucide-react"
import type { SiteRole, RestaurantRole } from "@/types/roles"

type ProtectedRouteProps = {
  children: ReactNode
  requireSiteRole?: SiteRole[]
  requireRestaurantRole?: RestaurantRole[]
  restaurantId?: string
  redirectTo?: string
}

export const ProtectedRoute = ({
  children,
  requireSiteRole,
  requireRestaurantRole,
  restaurantId,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) => {
  const { user, userRoles, isLoading } = useAuth()
  const location = useLocation()

  // Mostrar loader mientras carga
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, redirigir a login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // super_admin tiene acceso a TODO - bypass de verificaciones
  const isSuperAdmin = userRoles?.siteRoles?.includes('super_admin')
  
  if (isSuperAdmin) {
    return <>{children}</>
  }

  // Si requiere rol de sitio
  if (requireSiteRole && requireSiteRole.length > 0) {
    const hasRequiredSiteRole = requireSiteRole.some((role) =>
      userRoles?.siteRoles?.includes(role)
    )

    if (!hasRequiredSiteRole) {
      return <UnauthorizedUI requiredRoles={requireSiteRole} />
    }
  }

  // Si requiere rol de restaurante
  if (requireRestaurantRole && requireRestaurantRole.length > 0) {
    const restaurantRolesMap = userRoles?.restaurantRoles || {}

    // Si NO se pasa restaurantId, se considera que cualquier restaurante
    // donde el usuario tenga alguno de los roles requeridos es válido.
    // Esto cubre el caso del creador de la cuenta (closure_editor) sin
    // necesidad de pasar explícitamente el id del restaurante.
    const restaurantIdsToCheck = restaurantId
      ? [restaurantId]
      : Object.keys(restaurantRolesMap)

    const hasRequiredRestaurantRole = restaurantIdsToCheck.some((restId) =>
      requireRestaurantRole.some((role) =>
        restaurantRolesMap[restId]?.includes(role)
      )
    )

    if (!hasRequiredRestaurantRole) {
      return <UnauthorizedUI requiredRoles={requireRestaurantRole} />
    }
  }

  // Usuario autorizado
  return <>{children}</>
}

/**
 * UI para mostrar cuando el usuario no tiene permisos
 */
const UnauthorizedUI = ({
  requiredRoles,
}: {
  requiredRoles: string[]
}) => {
  const { user, signOutUser } = useAuth()

  const handleGoBack = () => {
    window.history.back()
  }

  const handleLogout = async () => {
    await signOutUser()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-linear-to-b from-background to-muted/30">
      <Card className="w-full max-w-md border bg-background/90 shadow-lg backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Acceso Restringido
          </CardTitle>
          <CardDescription>
            No tienes los permisos necesarios para acceder a esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Roles requeridos:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {requiredRoles.map((role) => (
                    <li key={role}>{getRoleDisplayName(role)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-2 text-sm text-muted-foreground text-center">
            Usuario actual: <span className="font-medium">{user?.email}</span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleGoBack} variant="default" className="w-full">
              Volver atrás
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              Cerrar sesión
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Helper para mostrar nombres legibles de roles
 */
const getRoleDisplayName = (role: string): string => {
  const displayNames: Record<string, string> = {
    // Site roles
    super_admin: "Super Administrador",
    admin: "Administrador",
    support: "Soporte",
    viewer: "Visualizador",

    // Restaurant roles
    closure_editor: "Editor de Cierres",
    liquidator: "Liquidador",
    owner: "Propietario",
    restaurant_viewer: "Visualizador de Restaurante",
  }

  return displayNames[role] || role
}
