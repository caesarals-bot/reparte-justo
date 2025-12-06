# Firestore Security Rules - ReparteJusto

> **Fecha de creación**: 5 de diciembre de 2025  
> **Versión**: 1.0  
> **Estado**: ✅ Implementadas y desplegadas

---

## 📋 Resumen

Este documento mantiene una copia de respaldo de las reglas de seguridad de Firestore actualmente desplegadas en producción. Sirve como referencia rápida en caso de contratiempos o necesidad de rollback.

---

## 🔒 Principios de Seguridad

### 1. **Cumplimiento Legal (Ley 20.549 Chile)**
- ❌ Los `owner` (propietarios) **NO pueden escribir** en `registros_diarios` ni `liquidaciones`
- ✅ Solo `closure_editor` y `liquidator` (trabajadores) tienen permisos operativos
- ✅ Los propietarios son **solo observadores**

### 2. **Principio de Mínimo Privilegio**
- Los usuarios solo tienen acceso a datos de sus restaurantes
- Los roles se validan en cada operación de lectura/escritura
- Super_admin tiene acceso total (para soporte y administración)

### 3. **Defensa en Profundidad**
- Validación en frontend (UI) con `ProtectedRoute`
- Validación en Firestore Rules (server-side)
- Validación adicional en Cloud Functions para operaciones críticas

---

## 📊 Matriz de Permisos por Colección

| Colección | Lectura | Crear | Actualizar | Eliminar |
|-----------|---------|-------|------------|----------|
| **users** | Propio usuario o admins | ❌ Bloqueado (Cloud Function) | Propio usuario (campos limitados) o super_admin | Solo super_admin |
| **restaurants** | Miembros del restaurante o admins | Usuario autenticado (al registrarse) | Solo closure_editor o super_admin | Solo super_admin |
| **registros_diarios** | Miembros del restaurante o admins | Solo closure_editor | Solo closure_editor | closure_editor o super_admin |
| **liquidaciones** | Miembros del restaurante o admins | liquidator o closure_editor | liquidator o closure_editor (si draft/pending) | Solo super_admin |
| **staff** | Miembros del restaurante o admins | Solo closure_editor | Solo closure_editor | Solo closure_editor |
| **invitations** | Invitador o invitado | Solo closure_editor | Solo invitado (aceptar/rechazar) | Invitador o super_admin |

---

## 🛡️ Reglas por Colección

### **1. Colección `/users`**

**Propósito**: Almacena usuarios, roles y permisos.

```javascript
// LEER: Solo el propio usuario o administradores
allow read: if isAuthenticated() && (
  request.auth.uid == userId ||
  hasAnySiteRole(['super_admin', 'admin', 'support'])
);

// ACTUALIZAR: Usuario puede modificar campos NO sensibles
allow update: if isAuthenticated() && request.auth.uid == userId && 
  !request.resource.data.diff(resource.data).affectedKeys()
    .hasAny(['siteRoles', 'restaurantRoles', 'isActive', 'uid', 'email']);

// ACTUALIZAR (Admin): Super_admin puede modificar cualquier campo
allow update: if isSuperAdmin();

// CREAR: Bloqueado (solo Cloud Function)
allow create: if false;

// ELIMINAR: Solo super_admin
allow delete: if isSuperAdmin();
```

**Campos protegidos** (usuario NO puede modificar):
- `siteRoles` - Roles administrativos
- `restaurantRoles` - Roles de restaurante
- `isActive` - Estado de la cuenta
- `uid` - ID del usuario
- `email` - Email del usuario

**Campos modificables por usuario**:
- `displayName`
- `photoURL`
- `lastActivity`
- `lastLogin`

---

### **2. Colección `/restaurants`**

**Propósito**: Configuración de restaurantes.

```javascript
// LEER: Miembros del restaurante o admins
allow read: if isAuthenticated() && (
  hasAnyRestaurantRole(restaurantId, ['closure_editor', 'liquidator', 'owner', 'restaurant_viewer']) ||
  hasAnySiteRole(['super_admin', 'admin', 'support'])
);

// CREAR: Usuario autenticado durante registro (debe ser owner)
allow create: if isAuthenticated() && 
  request.resource.data.ownerId == request.auth.uid;

// ACTUALIZAR: Solo closure_editor o super_admin
// ⚠️ owner NO puede modificar (Ley 20.549)
allow update: if isAuthenticated() && (
  hasRestaurantRole(restaurantId, 'closure_editor') ||
  isSuperAdmin()
);

// ELIMINAR: Solo super_admin
allow delete: if isSuperAdmin();
```

**Regla de oro**: Los `owner` pueden **leer** pero **NO escribir**.

---

### **3. Colección `/registros_diarios`**

**Propósito**: Cierres diarios de propinas (operación crítica).

```javascript
// LEER: Cualquier miembro del restaurante o admins
allow read: if isAuthenticated() && (
  hasAnyRestaurantRole(resource.data.restaurantId, ['closure_editor', 'liquidator', 'owner', 'restaurant_viewer']) ||
  hasAnySiteRole(['super_admin', 'admin'])
);

// CREAR: Solo closure_editor
// ⚠️ owner NO puede (Ley 20.549)
allow create: if isAuthenticated() && 
  hasRestaurantRole(request.resource.data.restaurantId, 'closure_editor');

// ACTUALIZAR: Solo closure_editor
allow update: if isAuthenticated() && 
  hasRestaurantRole(resource.data.restaurantId, 'closure_editor');

// ELIMINAR: closure_editor o super_admin
allow delete: if isAuthenticated() && (
  hasRestaurantRole(resource.data.restaurantId, 'closure_editor') ||
  isSuperAdmin()
);
```

**⚖️ Cumplimiento Legal**:
- Solo los **trabajadores** (`closure_editor`) pueden crear/editar cierres
- Los **propietarios** (`owner`) solo pueden **leer** (observar)

---

### **4. Colección `/liquidaciones`**

**Propósito**: Liquidaciones de períodos (pago de propinas).

```javascript
// LEER: Miembros del restaurante
allow read: if isAuthenticated() && (
  hasAnyRestaurantRole(resource.data.restaurantId, ['closure_editor', 'liquidator', 'owner', 'restaurant_viewer']) ||
  hasAnySiteRole(['super_admin', 'admin'])
);

// CREAR: liquidator o closure_editor
allow create: if isAuthenticated() && 
  hasAnyRestaurantRole(request.resource.data.restaurantId, ['liquidator', 'closure_editor']);

// ACTUALIZAR: liquidator o closure_editor
// Solo si está en estado 'draft' o 'pending'
allow update: if isAuthenticated() && 
  hasAnyRestaurantRole(resource.data.restaurantId, ['liquidator', 'closure_editor']) &&
  resource.data.status in ['draft', 'pending'];

// ELIMINAR: Solo super_admin
allow delete: if isSuperAdmin();
```

**Restricción de estado**: Solo se pueden modificar liquidaciones en estado `draft` o `pending`. Una vez `paid`, no se puede editar.

---

### **5. Colección `/staff`**

**Propósito**: Personal del restaurante (garzones, cocineros).

```javascript
// LEER: Cualquier miembro del restaurante
allow read: if isAuthenticated() && (
  hasAnyRestaurantRole(resource.data.restaurantId, ['closure_editor', 'liquidator', 'owner', 'restaurant_viewer']) ||
  hasAnySiteRole(['super_admin', 'admin'])
);

// CREAR, ACTUALIZAR, ELIMINAR: Solo closure_editor
allow create, update, delete: if isAuthenticated() && 
  hasRestaurantRole(resource.data.restaurantId, 'closure_editor');
```

**Gestión de personal**: Solo `closure_editor` tiene control total sobre el staff.

---

### **6. Colección `/invitations`**

**Propósito**: Invitaciones para unirse a restaurantes.

```javascript
// LEER: El invitador, el invitado, o super_admin
allow read: if isAuthenticated() && (
  resource.data.invitedBy.uid == request.auth.uid ||
  resource.data.invitedEmail == request.auth.token.email ||
  isSuperAdmin()
);

// CREAR: Solo closure_editor puede invitar
allow create: if isAuthenticated() && 
  hasRestaurantRole(request.resource.data.restaurantId, 'closure_editor') &&
  request.resource.data.invitedBy.uid == request.auth.uid;

// ACTUALIZAR: Solo el invitado puede aceptar/rechazar
allow update: if isAuthenticated() && 
  resource.data.invitedEmail == request.auth.token.email &&
  request.resource.data.status in ['accepted', 'rejected'];

// ELIMINAR: Invitador o super_admin
allow delete: if isAuthenticated() && (
  resource.data.invitedBy.uid == request.auth.uid ||
  isSuperAdmin()
);
```

**Flujo de invitación**:
1. `closure_editor` **crea** invitación
2. Invitado **lee** y **acepta/rechaza**
3. Invitador puede **cancelar** (eliminar)

---

## 🔧 Funciones Helper

### `isAuthenticated()`
Verifica si hay un usuario autenticado.

```javascript
function isAuthenticated() {
  return request.auth != null;
}
```

### `getUserData()`
Obtiene el documento del usuario desde Firestore.

```javascript
function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}
```

### `hasSiteRole(role)`
Verifica si el usuario tiene un rol de sitio específico.

```javascript
function hasSiteRole(role) {
  return isAuthenticated() && 
         role in getUserData().siteRoles;
}
```

### `hasRestaurantRole(restaurantId, role)`
Verifica si el usuario tiene un rol específico en un restaurante.

```javascript
function hasRestaurantRole(restaurantId, role) {
  return isAuthenticated() && 
         restaurantId in getUserData().restaurantRoles &&
         role in getUserData().restaurantRoles[restaurantId];
}
```

### `isSuperAdmin()`
Verifica si el usuario es super_admin (acceso total).

```javascript
function isSuperAdmin() {
  return hasSiteRole('super_admin');
}
```

---

## 🚀 Desplegar Reglas

### **Opción 1: Firebase CLI**
```bash
# Desde la raíz del proyecto
firebase deploy --only firestore:rules
```

### **Opción 2: Firebase Console**
1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Seleccionar proyecto
3. Ir a **Firestore Database** → **Rules**
4. Copiar contenido de `firestore.rules`
5. Click en **Publish**

---

## 🧪 Testing de Reglas

### **En Firebase Console**
1. Ir a **Firestore Database** → **Rules**
2. Click en **Rules Playground**
3. Configurar:
   - **Simulate**: `get`, `create`, `update`, `delete`
   - **Location**: `/registros_diarios/testId`
   - **Authenticated**: `Yes`
   - **Provider**: `Custom token` con payload:
     ```json
     {
       "uid": "test123",
       "email": "test@example.com"
     }
     ```

### **Con Firebase Emulator**
```bash
# Iniciar emulator
firebase emulators:start --only firestore

# En otro terminal, correr tests
npm run test:firestore
```

---

## 📝 Historial de Cambios

### **Versión 1.0** (5 diciembre 2025)
- ✅ Reglas iniciales implementadas
- ✅ Cumplimiento con Ley 20.549 (owner solo observador)
- ✅ Validación de roles granular por colección
- ✅ Helpers reutilizables
- ✅ Bloqueo de colecciones de auditoría (security_logs, rate_limits)

---

## ⚠️ Consideraciones Importantes

### **1. Performance**
Las funciones helper como `getUserData()` hacen un `get()` a Firestore en cada validación. Esto cuenta como **1 lectura adicional** por operación.

**Mitigación**: Firebase cachea los resultados durante la misma validación, así que múltiples llamadas a `getUserData()` en la misma regla solo cuentan como 1 lectura.

### **2. Límites de Firebase**
- Máximo **100 `get()` calls** por validación
- Timeout de **10 segundos** por validación
- Máximo **20 niveles de anidación** de funciones

Nuestras reglas están **muy por debajo** de estos límites.

### **3. Debugging**
Si una regla falla, el error en el frontend será genérico:
```
FirebaseError: Missing or insufficient permissions
```

Para debugging:
1. Revisar logs en Firebase Console → Firestore → Usage
2. Usar Rules Playground
3. Verificar estructura de datos en Firestore

---

## 🔄 Rollback de Emergencia

Si necesitas volver a reglas permisivas temporalmente (solo para debugging):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **NUNCA usar en producción** - permite que cualquier usuario autenticado acceda a todo.

---

## 📞 Soporte

Si tienes problemas con las reglas:

1. **Verificar estructura de datos**: El documento `/users/{uid}` debe tener:
   ```typescript
   {
     siteRoles: string[],
     restaurantRoles: { [restaurantId: string]: string[] }
   }
   ```

2. **Verificar autenticación**: El usuario debe estar autenticado con Firebase Auth.

3. **Verificar roles asignados**: Usar Firebase Console para ver el documento del usuario.

4. **Probar en Rules Playground**: Simular operaciones antes de desplegar.

---

**Última actualización**: 5 de diciembre de 2025, 8:40 PM (UTC-03)  
**Mantenedor**: Equipo ReparteJusto  
**Archivo de producción**: `firestore.rules` en raíz del proyecto
