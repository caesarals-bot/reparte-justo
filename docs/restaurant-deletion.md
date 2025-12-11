# Funcionalidad: Borrar Restaurante

## Descripción

Permite al usuario borrar su restaurante actual y crear uno nuevo. Esta funcionalidad es útil cuando el usuario cambia de restaurante o quiere empezar de cero.

## Ubicación

- **Página:** `/settings` → `RestaurantSettingsPage.tsx`
- **Acceso:** Menú de navegación → "Configuración"

## Flujo de Borrado

### Paso 1: Confirmación
El usuario debe escribir "BORRAR" para confirmar la acción.

### Paso 2: Proceso de eliminación
1. **Borrar subcolecciones:** Se eliminan todos los cierres (`registros_diarios`) y sus ajustes (`ajustes`)
2. **Borrar restaurante:** Se elimina el documento `/restaurants/{uid}`
3. **Limpiar roles:** Se actualizan `restaurantRoles: {}` y `primaryRestaurant: null` en `/users/{uid}`

### Paso 3: Redirección
El usuario es redirigido a `/setup` para crear un nuevo restaurante.

## Datos que se eliminan

- ✅ Configuración del restaurante
- ✅ Todos los cierres diarios
- ✅ Todos los ajustes de cada cierre
- ❌ **NO se elimina** la cuenta del usuario
- ❌ **NO se elimina** la cuenta de Firebase Auth

## Datos que se mantienen

- Cuenta de Firebase Auth (email/password)
- Documento del usuario en `/users/{uid}` (con roles vacíos)

## Reglas de Firestore requeridas

```javascript
// /users/{userId} - Permitir actualizar restaurantRoles y primaryRestaurant
allow update: if isAuthenticated() && (
  (request.auth.uid == userId && 
   !request.resource.data.diff(resource.data).affectedKeys()
     .hasAny(['siteRoles', 'isActive', 'uid', 'email'])) ||
  isSuperAdmin()
);

// /restaurants/{restaurantId} - Permitir borrar si uid == restaurantId
allow delete: if isAuthenticated() && (
  request.auth.uid == restaurantId ||
  isSuperAdmin()
);

// /restaurants/{restaurantId}/registros_diarios/{closureId} - Permitir borrar
allow delete: if isAuthenticated();

// /restaurants/{restaurantId}/registros_diarios/{closureId}/ajustes/{adjustmentId}
allow delete: if isAuthenticated();
```

## Crear nuevo restaurante después de borrar

Cuando el usuario crea un nuevo restaurante en `/setup`:

1. Se crea el documento `/restaurants/{uid}` con `ownerId: uid`
2. Se actualizan los roles del usuario: `restaurantRoles: { [uid]: ["closure_editor"] }`
3. Se llama `refreshUserRoles()` para actualizar el contexto de autenticación
4. Se redirige a `/cierre`

## Archivos relacionados

- `src/appPropinaSegura/settings/RestaurantSettingsPage.tsx` - Página de configuración
- `src/appPropinaSegura/setup/InitialSetupPage.tsx` - Página de setup (crear restaurante)
- `src/router/AppRouter.tsx` - Rutas
- `src/appPropinaSegura/component/navbar/NavBar.tsx` - Enlace en navegación
- `firestore.rules` - Reglas de seguridad

## Notas técnicas

- Se usa `window.location.href` en lugar de `navigate()` para forzar recarga completa y limpiar el estado de React
- Se usa `writeBatch` para borrar múltiples documentos de forma eficiente
- El `restaurantId` es igual al `uid` del usuario, lo que simplifica las reglas de permisos
