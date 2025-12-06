# 🔧 FIX: Error de Permisos Firestore - 6 de Diciembre 2025

**Estado**: ✅ RESUELTO  
**Fecha**: 6 de diciembre 2025  
**Prioridad**: 🔴 CRÍTICA

---

## 📋 Resumen Ejecutivo

Se corrigió el error `FirebaseError: Missing or insufficient permissions` que bloqueaba el acceso al dashboard y cierres diarios. El problema raíz era que el código frontend usaba `uid` del usuario autenticado como `restaurantId`, cuando debería usar el `restaurantId` real obtenido de `accessibleRestaurants`.

---

## 🐛 El Problema

### Error Reportado
```
FirebaseError: Missing or insufficient permissions
```

### Dónde Ocurría
1. **Dashboard**: No podía cargar cierres (`/restaurants/{restaurantId}/registros_diarios`)
2. **Cierre Diario**: No podía cargar configuración del restaurante
3. **Detalle de Cierre**: No podía acceder a cierres específicos

### Usuario Afectado
- **Email**: brianydanito@gmail.com
- **UID**: `xTbuyXF7C5NqBIPQj6FBYukMBFc2`
- **Rol**: `closure_editor` en restaurante `rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`

---

## 🔍 Causa Raíz

### Desajuste entre UID y RestaurantID

**Estructura de Roles en Firestore:**
```json
{
  "uid": "xTbuyXF7C5NqBIPQj6FBYukMBFc2",
  "restaurantRoles": {
    "rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881": ["closure_editor"]
  }
}
```

**Código Incorrecto (ANTES):**
```typescript
// ❌ Usaba uid del usuario como restaurantId
const { uid } = useAuth()
const closuresRef = collection(db, "restaurants", uid, "registros_diarios")
```

**Firestore Rules Validación:**
```javascript
// Las reglas verifican si el usuario tiene rol en restaurantRoles[restaurantId]
function hasRestaurantRole(restaurantId, role) {
  return restaurantId in getUserData().restaurantRoles &&
         role in getUserData().restaurantRoles[restaurantId];
}

// ❌ FALLA porque:
// - Código busca en: /restaurants/{uid}
// - Rules validan: ¿Tiene rol en restaurantRoles[uid]? → NO
// - Usuario tiene rol en: restaurantRoles["rest_..."]
```

**Código Correcto (DESPUÉS):**
```typescript
// ✅ Usa restaurantId desde accessibleRestaurants
const { accessibleRestaurants } = usePermissions()
const restaurantId = accessibleRestaurants[0]
const closuresRef = collection(db, "restaurants", restaurantId, "registros_diarios")
```

---

## 🛠️ Archivos Modificados

### 1. **DashboardPage.tsx**
**Cambios:**
- Agregado `usePermissions()` hook
- Obtener `restaurantId` desde `accessibleRestaurants[0]`
- Pasar `restaurantId` a `useClosuresDashboard` en lugar de `uid`
- Validación adicional si `restaurantId` es `undefined`

```typescript
// ANTES
const { uid } = useAuth()
const { historicalClosures } = useClosuresDashboard({ uid })
const restaurantReference = doc(db, "restaurants", uid)

// DESPUÉS
const { uid } = useAuth()
const { accessibleRestaurants } = usePermissions()
const restaurantId = accessibleRestaurants[0]
const { historicalClosures } = useClosuresDashboard({ restaurantId })
const restaurantReference = doc(db, "restaurants", restaurantId)
```

---

### 2. **useClosuresDashboard.ts**
**Cambios:**
- Cambiar parámetro de `uid` a `restaurantId`
- Actualizar todas las referencias internas
- Modificar mensajes de error

```typescript
// ANTES
export const useClosuresDashboard = ({ uid }: { uid?: string | null }) => {
  const closuresRef = collection(db, "restaurants", uid, "registros_diarios")
  const adjustments = await fetchClosureAdjustments(uid, docSnapshot.id)
}

// DESPUÉS
export const useClosuresDashboard = ({ restaurantId }: { restaurantId?: string | null }) => {
  const closuresRef = collection(db, "restaurants", restaurantId, "registros_diarios")
  const adjustments = await fetchClosureAdjustments(restaurantId, docSnapshot.id)
}
```

---

### 3. **PaidSettlementsPage.tsx**
**Cambios:**
- Agregado `usePermissions()` hook
- Obtener `restaurantId` desde `accessibleRestaurants[0]`
- Pasar `restaurantId` a `useClosuresDashboard`

```typescript
// ANTES
const { uid } = useAuth()
const { paidSettlementGroups } = useClosuresDashboard({ uid })

// DESPUÉS
const { uid } = useAuth()
const { accessibleRestaurants } = usePermissions()
const restaurantId = accessibleRestaurants[0]
const { paidSettlementGroups } = useClosuresDashboard({ restaurantId })
```

---

### 4. **CierreDiarioPage.tsx**
**Cambios:**
- Agregado `usePermissions()` hook
- Obtener `restaurantId` desde `accessibleRestaurants[0]`
- Pasar `restaurantId` a `useCierreDiario` y `useClosuresDashboard`
- Pasar `uid` dentro de `userInfo` para mantener auditoría

```typescript
// ANTES
const { uid, displayName, email } = useAuth()
const { ... } = useCierreDiario({ uid, userInfo: { name, email } })
const { closures } = useClosuresDashboard({ uid })

// DESPUÉS
const { uid, displayName, email } = useAuth()
const { accessibleRestaurants } = usePermissions()
const restaurantId = accessibleRestaurants[0]
const { ... } = useCierreDiario({ 
  restaurantId, 
  userInfo: { uid, name, email } 
})
const { closures } = useClosuresDashboard({ restaurantId })
```

---

### 5. **useCierreDiario.ts**
**Cambios:**
- Cambiar parámetro de `uid` a `restaurantId`
- Agregar `uid` a `userInfo` para auditoría
- Actualizar todas las referencias internas
- Corregir dependencias de `useEffect` y `useCallback`

```typescript
// ANTES
type UseCierreDiarioArgs = {
  uid?: string | null
  userInfo?: { name?: string | null; email?: string | null }
}

export const useCierreDiario = ({ uid, userInfo }: UseCierreDiarioArgs) => {
  const restaurantReference = doc(db, "restaurants", uid)
  const submittedBy = { uid: uid ?? undefined, ... }
}

// DESPUÉS
type UseCierreDiarioArgs = {
  restaurantId?: string | null
  userInfo?: { 
    uid?: string | null
    name?: string | null
    email?: string | null 
  }
}

export const useCierreDiario = ({ restaurantId, userInfo }: UseCierreDiarioArgs) => {
  const restaurantReference = doc(db, "restaurants", restaurantId)
  const submittedBy = { uid: userInfo?.uid ?? undefined, ... }
}
```

---

### 6. **useClosureDetail.ts**
**Cambios:**
- Cambiar parámetro de `uid` a `restaurantId`
- Actualizar todas las referencias internas
- Modificar `handleDeleteClosure` para recibir `userUid` como parámetro

```typescript
// ANTES
export type UseClosureDetailArgs = {
  uid?: string | null
  closureId?: string
  ...
}

export const useClosureDetail = ({ uid, closureId, ... }: UseClosureDetailArgs) => {
  const reference = doc(db, "restaurants", uid, "registros_diarios", closureId)
  await createClosureAdjustment({ restaurantId: uid, ... })
  await eliminarCierreDiario({ restaurantId: uid, deletedBy: { uid, ... } })
}

// DESPUÉS
export type UseClosureDetailArgs = {
  restaurantId?: string | null
  closureId?: string
  ...
}

export const useClosureDetail = ({ restaurantId, closureId, ... }: UseClosureDetailArgs) => {
  const reference = doc(db, "restaurants", restaurantId, "registros_diarios", closureId)
  await createClosureAdjustment({ restaurantId, ... })
  await eliminarCierreDiario({ 
    restaurantId, 
    deletedBy: { uid: userUid, ... } 
  })
}
```

---

## ✅ Validación de la Solución

### Firestore Rules (Sin Cambios)
Las reglas de Firestore **NO** necesitaron modificación. Ya estaban correctas:

```javascript
match /restaurants/{restaurantId} {
  allow read: if isAuthenticated() && (
    hasAnyRestaurantRole(restaurantId, ['closure_editor', 'liquidator', 'owner', 'restaurant_viewer']) ||
    hasAnySiteRole(['super_admin', 'admin', 'support'])
  );
}

match /restaurants/{restaurantId}/registros_diarios/{closureId} {
  allow read: if hasAnyRestaurantRole(restaurantId, ['closure_editor', 'liquidator', 'owner', 'restaurant_viewer']);
  allow create, update: if hasRestaurantRole(restaurantId, 'closure_editor');
}
```

### Flujo Correcto Ahora
1. Usuario inicia sesión → `AuthContext` carga roles desde `/users/{uid}`
2. `usePermissions` expone `accessibleRestaurants` = `["rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881"]`
3. Componentes obtienen `restaurantId` desde `accessibleRestaurants[0]`
4. Consultas Firestore usan `restaurantId` correcto
5. Firestore Rules validan: ¿Tiene rol en `restaurantRoles[restaurantId]`? → **SÍ** ✅
6. Acceso permitido

---

## 🎯 Testing Recomendado

### Casos a Probar
1. **Dashboard**:
   - ✅ Carga lista de cierres pendientes
   - ✅ Muestra totales acumulados
   - ✅ Permite navegar a detalle de cierre

2. **Cierre Diario**:
   - ✅ Carga configuración del restaurante
   - ✅ Muestra staff configurado
   - ✅ Permite crear nuevo cierre

3. **Detalle de Cierre**:
   - ✅ Carga información del cierre
   - ✅ Permite crear ajustes
   - ✅ Permite eliminar cierre (si tiene permisos)

4. **Liquidaciones Pagadas**:
   - ✅ Carga períodos de liquidación
   - ✅ Muestra cierres agrupados

### Usuarios a Probar
- ✅ Usuario `owner` (solo lectura)
- ✅ Usuario `closure_editor` (lectura + escritura)
- ✅ Usuario `liquidator` (lectura + crear liquidaciones)

---

## 📝 Notas Importantes

### Separación de Conceptos
- **`uid`**: Identificador del usuario autenticado (para auditoría)
- **`restaurantId`**: Identificador del restaurante (para acceso a datos)

### Auditoría Preservada
Aunque cambiamos de `uid` a `restaurantId` para acceso a datos, **mantenemos `uid` en los metadatos** de auditoría:
- `submittedBy.uid` en cierres
- `deletedBy.uid` en eliminaciones
- `createdBy` en ajustes

### Multi-Restaurante Ready
Este fix prepara el código para soportar usuarios con acceso a múltiples restaurantes en el futuro:
```typescript
// Actualmente: accessibleRestaurants[0]
// Futuro: Selector de restaurante activo
const [activeRestaurant, setActiveRestaurant] = useState(accessibleRestaurants[0])
```

---

## 🚀 Próximos Pasos

### Inmediatos
1. ✅ Probar en desarrollo con usuario real
2. ✅ Verificar que no haya regresiones
3. ✅ Deploy a producción

### Futuros
1. Implementar selector de restaurante para usuarios multi-restaurante
2. Agregar `primaryRestaurant` al documento del usuario
3. Persistir restaurante activo en localStorage
4. Agregar tests unitarios para `usePermissions`

---

## 🔗 Referencias

- **Firestore Rules**: `firestore.rules` (sin cambios)
- **Documentación de Roles**: `PLAN-AUTH-ROLES.md`
- **Problema Original**: `PROBLEMA-PERMISOS-PENDIENTE.md`
- **Implementación Auth**: `RESUMEN-IMPLEMENTACION.md`

---

**Última actualización**: 6 de diciembre 2025  
**Autor**: Cascade AI Assistant  
**Revisión**: Pendiente
