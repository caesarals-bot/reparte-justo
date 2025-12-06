# 🚨 PROBLEMA CRÍTICO: Firestore Security Rules Bloquean Acceso

**Fecha**: 5-6 de Diciembre 2025  
**Estado**: ❌ NO RESUELTO - Rollback realizado  
**Prioridad**: 🔴 ALTA - Bloquea funcionalidad completa del sistema

---

## 📋 Resumen Ejecutivo

Al implementar Firestore Security Rules para proteger los datos, el sistema quedó completamente inaccesible para usuarios con roles operativos (`closure_editor`, `liquidator`). 

**Resultado**: Después de múltiples intentos de corrección, se hizo rollback al commit `b643e18` (antes de implementar las reglas).

---

## 🐛 El Problema

### Error en Consola
```
FirebaseError: Missing or insufficient permissions
```

### Dónde Ocurre
1. **Dashboard**: No puede cargar cierres (`/restaurants/{restaurantId}/registros_diarios`)
2. **Personal**: No puede leer configuración del restaurante (`/restaurants/{restaurantId}`)
3. **Configuración de Cierre**: No puede cargar datos del restaurante

### Usuario Afectado
- **Nombre**: Daniel García
- **Email**: brianydanito@gmail.com
- **UID**: `xTbuyXF7C5NqBIPQj6FBYukMBFc2`
- **Rol**: `closure_editor` en restaurante `rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`

---

## 🔍 Análisis Técnico del Problema

### 1. Estructura de Datos en Firestore

#### Documento del Usuario (`/users/{uid}`)
```json
{
  "uid": "xTbuyXF7C5NqBIPQj6FBYukMBFc2",
  "email": "brianydanito@gmail.com",
  "displayName": "daniel garcia",
  "siteRoles": [],
  "restaurantRoles": {
    "rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881": ["closure_editor"]
  },
  "primaryRestaurant": "rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881"
}
```

#### Documentos del Restaurante
Existen **DOS documentos** con información duplicada:

**A. Documento Antiguo** (`/restaurants/xTbuyXF7C5NqBIPQj6FBYukMBFc2`):
- Contiene: `poolConfig`, `additionalDeductions`, `serviceStaff`, `supportStaff`
- Problema: Usa el UID del usuario como ID del documento
- Estado: Datos completos pero en ubicación incorrecta

**B. Documento Nuevo** (`/restaurants/rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`):
- Contiene: `id`, `name`, `ownerEmail`, `ownerId`, `settings` básicos
- Problema: Falta `poolConfig`, `serviceStaff`, `supportStaff`
- Estado: Documento correcto pero incompleto

### 2. El Problema de las Firestore Rules

#### Regla Implementada
```javascript
match /restaurants/{restaurantId} {
  allow read: if isAuthenticated() && (
    hasAnyRestaurantRole(restaurantId, ['closure_editor', 'liquidator', 'owner', 'restaurant_viewer']) ||
    hasAnySiteRole(['super_admin', 'admin', 'support'])
  );
}
```

#### Función Helper (Intentos)
```javascript
// ❌ INTENTO 1: No funciona - hasAny() no existe en arrays de usuario
function hasAnyRestaurantRole(restaurantId, roles) {
  return userData.restaurantRoles[restaurantId].hasAny(roles);
}

// ❌ INTENTO 2: Sintaxis incorrecta - if/let no permitidos
function hasAnyRestaurantRole(restaurantId, roles) {
  if (!isAuthenticated()) return false;
  let userRoles = userData.restaurantRoles[restaurantId];
  return roles.hasAny(userRoles);
}

// ✅ INTENTO 3: Sintaxis correcta pero aún falla
function hasAnyRestaurantRole(restaurantId, roles) {
  return isAuthenticated() && 
         restaurantId in getUserData().restaurantRoles &&
         roles.hasAny(getUserData().restaurantRoles[restaurantId]);
}
```

#### Por Qué Falla
Aunque la sintaxis es correcta, la validación falla porque:
1. El método `hasAny()` en Firestore Rules v2 puede tener comportamiento inesperado con arrays dinámicos.
2. La llamada a `getUserData()` múltiples veces puede causar problemas de rendimiento o timeout.
3. Posible problema con la estructura del array en `restaurantRoles[restaurantId]`.

---

## 🔄 Problema Secundario: Datos Duplicados

### El Conflicto UID vs RestaurantId

**Antes del fix**:
- El código usaba `uid` del usuario como ID del restaurante
- Ejemplo: `/restaurants/xTbuyXF7C5NqBIPQj6FBYukMBFc2`
- Funcionaba para el owner (creador) porque su `uid` = `restaurantId`

**Después del fix**:
- El código usa el `restaurantId` real del restaurante
- Ejemplo: `/restaurants/rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`
- Falla para usuarios invitados porque `uid` ≠ `restaurantId`

### Hooks Afectados
1. ✅ `useClosuresDashboard` - Corregido para usar `restaurantId`
2. ✅ `DashboardPage` - Corregido para usar `restaurantId`
3. ✅ `useCierreDiario` - Corregido para usar `restaurantId`
4. ✅ `useStaffManagement` - Corregido para usar `restaurantId` + migración automática
5. ❌ `InitialSetupPage` - Aún usa `uid` (pero es correcto para setup inicial)

### Migración Automática Implementada
Se implementó lógica en `useStaffManagement` para:
1. Detectar si el documento nuevo está vacío
2. Buscar datos en el documento antiguo (uid)
3. Copiar automáticamente al documento nuevo
4. Incluye: `serviceStaff`, `supportStaff`, `poolConfig`, `additionalDeductions`

**Estado**: ✅ Implementado pero no probado (bloqueado por error de permisos)

---

## 🛠️ Intentos de Solución Realizados

### 1. Corrección de Estructura de Subcolecciones
- **Commit**: `67befdc`
- **Cambio**: `/registros_diarios` → `/restaurants/{restaurantId}/registros_diarios`
- **Resultado**: ✅ Estructura correcta, pero generó el problema de permisos

### 2. Corrección de restaurantId en Frontend
- **Commits**: `72e2039`, `a09b324`, `921c90c`, `8ed5639`
- **Cambio**: Usar `accessibleRestaurants[0]` en lugar de `uid`
- **Resultado**: ✅ Lógica correcta, pero bloqueado por reglas

### 3. Optimización de Firestore Rules
- **Commit**: `802c4c5`
- **Cambio**: Evitar múltiples llamadas a `getUserData()`
- **Resultado**: ⚠️ Mejora de rendimiento, pero no resuelve el problema

### 4. Corrección de hasAnyRestaurantRole
- **Commit**: `fb7f480`
- **Cambio**: `roles.hasAny(getUserData().restaurantRoles[restaurantId])`
- **Resultado**: ❌ Sintaxis correcta pero aún falla la validación

### 5. Migración Automática de Datos
- **Commit**: `4ba7594`
- **Cambio**: Copiar datos de documento antiguo a nuevo automáticamente
- **Resultado**: ✅ Implementado pero no probado

### 6. Rollback
- **Commit**: `b643e18` (estado actual)
- **Acción**: Revertir TODO al estado antes de las reglas
- **Resultado**: ✅ Sistema funcional de nuevo (sin seguridad)

---

## 📊 Estado Actual (Post-Rollback)

### ✅ Funciona
- Login/Registro
- Dashboard (sin validación de permisos)
- Cierres (sin validación de permisos)
- Personal (sin validación de permisos)
- Reset Password

### ❌ No Implementado
- Firestore Security Rules
- Validación de permisos en backend
- Protección de datos sensibles
- Cumplimiento de Ley 20.549 (owners no pueden escribir)

### ⚠️ Riesgos Actuales
- Cualquier usuario autenticado puede leer/escribir cualquier dato
- No hay separación entre roles
- Datos sensibles expuestos

---

## 🎯 Estrategia Propuesta para Mañana

### Opción A: Simplificar las Reglas (Recomendada)
En lugar de usar funciones complejas, usar reglas inline más simples:

```javascript
match /restaurants/{restaurantId} {
  allow read: if isAuthenticated() && (
    // Verificar directamente sin función helper
    request.auth.uid in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.restaurantRoles.keys() ||
    'super_admin' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.siteRoles
  );
}
```

**Pros**: Más directo, menos puntos de fallo  
**Contras**: Menos reutilizable, más verboso

### Opción B: Usar Custom Claims en JWT
Mover los roles a Custom Claims del token JWT en lugar de Firestore:

```javascript
match /restaurants/{restaurantId} {
  allow read: if request.auth.token.restaurantRoles[restaurantId] != null;
}
```

**Pros**: Más rápido (no consulta Firestore), más seguro  
**Contras**: Requiere Cloud Function para actualizar claims

### Opción C: Reglas Permisivas Temporales
Mantener reglas básicas mientras se desarrolla:

```javascript
match /restaurants/{restaurantId} {
  allow read, write: if isAuthenticated();
}
```

**Pros**: Permite desarrollo sin bloqueos  
**Contras**: Inseguro para producción

---

## 📝 Checklist para Mañana

### Antes de Empezar
- [ ] Decidir estrategia (A, B o C)
- [ ] Crear rama `fix/firestore-permissions-v2`
- [ ] Backup de estado actual

### Durante Implementación
- [ ] Implementar reglas paso a paso
- [ ] Probar CADA regla individualmente antes de continuar
- [ ] Usar Firebase Emulator para testing local
- [ ] Documentar cada cambio

### Testing
- [ ] Probar con usuario `owner`
- [ ] Probar con usuario `closure_editor`
- [ ] Probar con usuario `liquidator`
- [ ] Probar lectura de `/restaurants/{id}`
- [ ] Probar lectura de `/restaurants/{id}/registros_diarios`
- [ ] Probar escritura (solo roles permitidos)

### Rollback Plan
- [ ] Tener commit de respaldo identificado
- [ ] Comando de rollback preparado
- [ ] Reglas permisivas de emergencia listas

---

## 🔗 Referencias

- **Firestore Rules v2 Docs**: https://firebase.google.com/docs/firestore/security/rules-structure
- **hasAny() Method**: https://firebase.google.com/docs/reference/rules/rules.List#hasAny
- **Custom Claims**: https://firebase.google.com/docs/auth/admin/custom-claims
- **Commit Actual**: `b643e18`
- **Última Regla Intentada**: Ver `firestore.rules` en commit `fb7f480`

---

## 💡 Lecciones Aprendidas

1. **Probar reglas en emulator ANTES de desplegar a producción**
2. **Implementar reglas incrementalmente, no todas a la vez**
3. **Tener plan de rollback ANTES de hacer cambios críticos**
4. **Documentar CADA intento de solución**
5. **No asumir que sintaxis correcta = funcionamiento correcto**
6. **Considerar Custom Claims desde el inicio para roles**

---

## 🚀 Próximos Pasos (Mañana)

1. ☕ Café y mente fresca
2. 📖 Revisar este documento completo
3. 🎯 Decidir estrategia (A, B o C)
4. 🌿 Crear rama nueva
5. 🧪 Setup Firebase Emulator
6. 🔨 Implementar solución paso a paso
7. ✅ Testing exhaustivo
8. 🚀 Deploy solo si TODO funciona

---

**Nota Final**: Este problema es complejo pero solucionable. La clave es ir despacio, probar cada paso, y no desplegar hasta estar 100% seguros. Mañana lo resolveremos con calma.
