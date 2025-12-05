/**
 * Tipos de roles y permisos del sistema ReparteJusto
 * 
 * Este archivo define la estructura de roles jerárquica que cumple con la Ley 20.549 chilena
 * sobre distribución de propinas.
 */

// ============================================
// ROLES ADMINISTRATIVOS DEL SITIO
// ============================================

/**
 * Roles administrativos que controlan el acceso al panel /admin
 * Jerarquía: super_admin > admin > support > viewer
 */
export type SiteRole = "super_admin" | "admin" | "support" | "viewer"

/**
 * Descripción de cada rol administrativo
 */
export const SITE_ROLE_DESCRIPTIONS: Record<SiteRole, string> = {
  super_admin: "Administrador total con acceso completo al sistema",
  admin: "Administrador con restricciones (no puede crear super_admins)",
  support: "Soporte técnico (puede ver datos y asistir usuarios)",
  viewer: "Solo lectura (dashboard de métricas sin modificaciones)",
}

// ============================================
// ROLES OPERATIVOS POR RESTAURANTE
// ============================================

/**
 * Roles operativos dentro de cada restaurante
 * 
 * ⚖️ IMPORTANTE (Ley 20.549 Chile):
 * - Solo TRABAJADORES (garzones, cocineros) pueden tener roles operativos
 * - Los PROPIETARIOS quedan como observadores (role: "owner")
 * 
 * Jerarquía: closure_editor > liquidator > owner ≈ restaurant_viewer
 */
export type RestaurantRole = "closure_editor" | "liquidator" | "owner" | "restaurant_viewer"

/**
 * Descripción de cada rol operativo
 */
export const RESTAURANT_ROLE_DESCRIPTIONS: Record<RestaurantRole, string> = {
  closure_editor: "Editor de cierres (rol principal): puede crear, editar y eliminar cierres + gestionar staff completo",
  liquidator: "Liquidador: puede crear liquidaciones y generar PDFs, pero NO editar cierres",
  owner: "Propietario (SOLO OBSERVADOR por ley): puede ver dashboard y reportes, NO puede participar en distribución",
  restaurant_viewer: "Invitado con solo lectura: ver dashboard y reportes sin modificar",
}

// ============================================
// PERMISOS GRANULARES
// ============================================

/**
 * Permisos específicos que se derivan de los roles
 * Estos permisos se usan para validaciones en UI y backend
 */
export type RestaurantPermission =
  | "closure:create"
  | "closure:edit"
  | "closure:delete"
  | "closure:view"
  | "liquidation:create"
  | "liquidation:view"
  | "liquidation:download"
  | "staff:create"
  | "staff:edit"
  | "staff:delete"
  | "staff:view"
  | "settings:edit"
  | "settings:view"

/**
 * Permisos del panel administrativo
 */
export type AdminPermission =
  | "admin:view"
  | "admin:edit"
  | "admin:users:create"
  | "admin:users:edit"
  | "admin:users:delete"
  | "admin:restaurants:view"
  | "admin:restaurants:edit"
  | "admin:metrics:view"

/**
 * Mapeo de roles a permisos
 * Define qué puede hacer cada rol
 */
export const ROLE_PERMISSIONS: Record<RestaurantRole, RestaurantPermission[]> = {
  // Closure Editor: ROL PRINCIPAL - gestión completa
  closure_editor: [
    "closure:create",
    "closure:edit",
    "closure:delete",
    "closure:view",
    "liquidation:create",
    "liquidation:view",
    "liquidation:download",
    "staff:create",
    "staff:edit",
    "staff:delete",
    "staff:view",
    "settings:edit",
    "settings:view",
  ],

  // Liquidator: puede liquidar y ver, pero NO editar cierres ni staff
  liquidator: [
    "closure:view",
    "liquidation:create",
    "liquidation:view",
    "liquidation:download",
    "staff:view",
    "settings:view",
  ],

  // Owner: SOLO LECTURA (por Ley 20.549 chilena)
  owner: [
    "closure:view",
    "liquidation:view",
    "staff:view",
    "settings:view",
  ],

  // Viewer: invitados externos
  restaurant_viewer: [
    "closure:view",
    "liquidation:view",
    "staff:view",
    "settings:view",
  ],
}

/**
 * Permisos del sitio según rol administrativo
 */
export const SITE_ROLE_PERMISSIONS: Record<SiteRole, AdminPermission[]> = {
  super_admin: [
    "admin:view",
    "admin:edit",
    "admin:users:create",
    "admin:users:edit",
    "admin:users:delete",
    "admin:restaurants:view",
    "admin:restaurants:edit",
    "admin:metrics:view",
  ],

  admin: [
    "admin:view",
    "admin:restaurants:view",
    "admin:restaurants:edit",
    "admin:metrics:view",
    // No puede crear/editar usuarios admin
  ],

  support: [
    "admin:view",
    "admin:restaurants:view",
    "admin:metrics:view",
    // Solo lectura y soporte
  ],

  viewer: [
    "admin:view",
    "admin:metrics:view",
    // Solo métricas
  ],
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Verifica si un rol tiene un permiso específico
 */
export const hasPermission = (
  role: RestaurantRole,
  permission: RestaurantPermission
): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

/**
 * Verifica si un rol administrativo tiene un permiso
 */
export const hasSitePermission = (
  role: SiteRole,
  permission: AdminPermission
): boolean => {
  return SITE_ROLE_PERMISSIONS[role]?.includes(permission) || false
}

/**
 * Obtiene todos los permisos de un conjunto de roles
 */
export const getPermissionsFromRoles = (
  roles: RestaurantRole[]
): RestaurantPermission[] => {
  const allPermissions = roles.flatMap((role) => ROLE_PERMISSIONS[role] || [])
  // Eliminar duplicados
  return [...new Set(allPermissions)]
}

/**
 * Verifica si un rol es operativo (puede modificar datos)
 * Los roles operativos son solo para TRABAJADORES según Ley 20.549
 */
export const isOperationalRole = (role: RestaurantRole): boolean => {
  return role === "closure_editor" || role === "liquidator"
}

/**
 * Verifica si un rol es de solo lectura
 */
export const isReadOnlyRole = (role: RestaurantRole): boolean => {
  return role === "owner" || role === "restaurant_viewer"
}

/**
 * Obtiene el nivel de jerarquía de un rol (mayor número = más permisos)
 */
export const getRoleHierarchyLevel = (role: RestaurantRole): number => {
  const hierarchy: Record<RestaurantRole, number> = {
    closure_editor: 4,
    liquidator: 3,
    owner: 2,
    restaurant_viewer: 1,
  }
  return hierarchy[role] || 0
}

/**
 * Obtiene el nivel de jerarquía de un rol administrativo
 */
export const getSiteRoleHierarchyLevel = (role: SiteRole): number => {
  const hierarchy: Record<SiteRole, number> = {
    super_admin: 4,
    admin: 3,
    support: 2,
    viewer: 1,
  }
  return hierarchy[role] || 0
}
