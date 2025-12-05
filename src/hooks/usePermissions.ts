/**
 * Hook para validar permisos granulares del usuario
 * 
 * Ejemplos de uso:
 * ```tsx
 * const { hasPermission, hasSiteRole } = usePermissions("rest123")
 * 
 * if (hasPermission("closure:create")) {
 *   // Mostrar botón de crear cierre
 * }
 * 
 * if (hasSiteRole("super_admin")) {
 *   // Mostrar panel admin
 * }
 * ```
 */

import { useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  ROLE_PERMISSIONS,
  SITE_ROLE_PERMISSIONS,
  type RestaurantPermission,
  type AdminPermission,
  type SiteRole,
  type RestaurantRole,
} from "@/types/roles"

type Permission = RestaurantPermission | AdminPermission

export const usePermissions = (restaurantId?: string) => {
  const { userRoles } = useAuth()

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!userRoles) return false

      // Super admin tiene TODOS los permisos
      if (userRoles.siteRoles?.includes("super_admin")) {
        return true
      }

      // Verificar permisos de restaurante
      if (restaurantId && userRoles.restaurantRoles?.[restaurantId]) {
        const roles = userRoles.restaurantRoles[restaurantId]

        // Mapear roles a permisos
        const permissions = roles.flatMap(
          (role) => ROLE_PERMISSIONS[role as RestaurantRole] || []
        )

        if (permissions.includes(permission as RestaurantPermission)) {
          return true
        }
      }

      // Verificar permisos del sitio (admin)
      const sitePermissions = userRoles.siteRoles?.flatMap(
        (role) => SITE_ROLE_PERMISSIONS[role] || []
      )

      return sitePermissions?.includes(permission as AdminPermission) || false
    }
  }, [userRoles, restaurantId])

  /**
   * Verifica si el usuario tiene un rol de sitio específico
   */
  const hasSiteRole = useMemo(() => {
    return (role: SiteRole): boolean => {
      return userRoles?.siteRoles?.includes(role) || false
    }
  }, [userRoles])

  /**
   * Verifica si el usuario tiene un rol de restaurante específico
   */
  const hasRestaurantRole = useMemo(() => {
    return (role: RestaurantRole, targetRestaurantId?: string): boolean => {
      const rid = targetRestaurantId || restaurantId
      if (!rid) return false

      return userRoles?.restaurantRoles?.[rid]?.includes(role) || false
    }
  }, [userRoles, restaurantId])

  /**
   * Obtiene todos los roles de restaurante del usuario
   */
  const getRestaurantRoles = useMemo(() => {
    return (targetRestaurantId?: string): RestaurantRole[] => {
      const rid = targetRestaurantId || restaurantId
      if (!rid) return []

      return userRoles?.restaurantRoles?.[rid] || []
    }
  }, [userRoles, restaurantId])

  /**
   * Verifica si el usuario tiene al menos uno de los roles especificados
   */
  const hasAnyRole = useMemo(() => {
    return (roles: RestaurantRole[], targetRestaurantId?: string): boolean => {
      const rid = targetRestaurantId || restaurantId
      if (!rid) return false

      const userRolesInRestaurant = userRoles?.restaurantRoles?.[rid] || []
      return roles.some((role) => userRolesInRestaurant.includes(role))
    }
  }, [userRoles, restaurantId])

  /**
   * Verifica si el usuario es propietario (owner) de algún restaurante
   */
  const isOwner = useMemo(() => {
    if (!userRoles?.restaurantRoles) return false

    return Object.values(userRoles.restaurantRoles).some((roles) =>
      roles.includes("owner")
    )
  }, [userRoles])

  /**
   * Verifica si el usuario tiene roles operativos (closure_editor o liquidator)
   */
  const hasOperationalRoles = useMemo(() => {
    if (!userRoles?.restaurantRoles) return false

    return Object.values(userRoles.restaurantRoles).some(
      (roles) =>
        roles.includes("closure_editor") || roles.includes("liquidator")
    )
  }, [userRoles])

  /**
   * Obtiene el rol más alto del usuario en un restaurante
   * (según jerarquía: closure_editor > liquidator > owner > viewer)
   */
  const getHighestRole = useMemo(() => {
    return (targetRestaurantId?: string): RestaurantRole | null => {
      const rid = targetRestaurantId || restaurantId
      if (!rid) return null

      const roles = userRoles?.restaurantRoles?.[rid]
      if (!roles || roles.length === 0) return null

      // Jerarquía de roles
      if (roles.includes("closure_editor")) return "closure_editor"
      if (roles.includes("liquidator")) return "liquidator"
      if (roles.includes("owner")) return "owner"
      if (roles.includes("restaurant_viewer")) return "restaurant_viewer"

      return null
    }
  }, [userRoles, restaurantId])

  /**
   * Verifica si el usuario puede acceder a un restaurante específico
   */
  const canAccessRestaurant = useMemo(() => {
    return (targetRestaurantId: string): boolean => {
      // Super admin puede acceder a todos los restaurantes
      if (userRoles?.siteRoles?.includes("super_admin")) return true
      if (userRoles?.siteRoles?.includes("admin")) return true

      // Verificar si tiene algún rol en ese restaurante
      return Boolean(
        userRoles?.restaurantRoles?.[targetRestaurantId]?.length
      )
    }
  }, [userRoles])

  /**
   * Lista todos los restaurantes a los que el usuario tiene acceso
   */
  const accessibleRestaurants = useMemo(() => {
    if (!userRoles?.restaurantRoles) return []

    return Object.keys(userRoles.restaurantRoles).filter(
      (restaurantId) =>
        userRoles.restaurantRoles[restaurantId]?.length > 0
    )
  }, [userRoles])

  return {
    hasPermission,
    hasSiteRole,
    hasRestaurantRole,
    getRestaurantRoles,
    hasAnyRole,
    isOwner,
    hasOperationalRoles,
    getHighestRole,
    canAccessRestaurant,
    accessibleRestaurants,
  }
}
