# 🏗️ SISTEMA DE ROLES Y PERMISOS - ReparteJusto

**Fecha:** 10 de diciembre de 2025  
**Estado:** ✅ Definición final actualizada

---

## 📋 ROLES FINALES (3 + 1 admin)

### **1. `closure_editor` (restaurantRole) - MÁXIMO 2**
**Quién es:** Administrador de confianza, encargado operativo del restaurante

**Permisos:**
- ✅ Ver, crear, editar, eliminar **cierres diarios**
- ✅ Ver, crear, editar, eliminar **liquidaciones**
- ✅ Ver, crear, editar, eliminar **staff** (miembros del personal)
- ✅ Ver, editar **configuración del restaurante**
- ✅ **Invitar** otros usuarios (closure_editor, owner, restaurant_viewer)
- ✅ Ver dashboard completo
- ✅ Ver estadísticas

**Límite:** **MÁXIMO 2 personas por restaurante**

---

### **2. `owner` (restaurantRole) - 1 por restaurante**
**Quién es:** Propietario legal del restaurante

**Permisos:**
- ✅ Ver dashboard completo (solo informativo)
- ✅ Ver todos los cierres (como testigo)
- ✅ Ver todas las estadísticas
- ✅ Ver liquidaciones pasadas
- ✅ Ver distribución de propinas
- ❌ **NO puede editar** nada
- ❌ **NO puede crear** cierres
- ❌ **NO puede liquidar** (Ley 20.549)
- ❌ **NO puede gestionar** staff

**Límite:** 1 por restaurante  
**Razón:** Acceso informativo y testigo legal, NO operativo (Ley 20.549 chilena)

---

### **3. `restaurant_viewer` (restaurantRole) - SIN LÍMITE**
**Quién es:** Miembros del staff que pueden ver liquidaciones

**Permisos:**
- ✅ Ver **liquidaciones** (solo las que les corresponden)
- ✅ Ver dashboard básico
- ❌ **NO puede ver** cierres diarios
- ❌ **NO puede ver** configuración
- ❌ **NO puede editar** nada
- ❌ **NO puede crear** nada

**Límite:** Sin límite  
**Razón:** Staff puede ver sus liquidaciones para transparencia

---

### **4. `super_admin` (siteRole) - Administrador de plataforma**
**Quién es:** Tú - Administrador master de la plataforma

**Permisos:**
- ✅ Ver todos los restaurantes
- ✅ Eliminar usuarios
- ✅ Eliminar restaurantes
- ✅ Acceso total a datos (solo para administración)
- ❌ **NO es para operaciones diarias** (crear cierres, liquidar, etc.)

**Límite:** 1 (tú)  
**Razón:** Administración de la plataforma, NO operaciones de restaurantes

---

## 📊 TABLA DE PERMISOS

| Permiso | closure_editor | owner | restaurant_viewer | super_admin |
|---------|---------------|-------|-------------------|-------------|
| **Ver dashboard** | ✅ Completo | ✅ Completo | ✅ Básico | ✅ Todos |
| **Ver cierres** | ✅ | ✅ | ❌ | ✅ |
| **Ver liquidaciones** | ✅ Todas | ✅ Todas | ✅ Solo suyas | ✅ Todas |
| **Ver configuración** | ✅ | ✅ | ❌ | ✅ |
| **Crear cierres** | ✅ | ❌ | ❌ | ❌ |
| **Editar cierres** | ✅ | ❌ | ❌ | ❌ |
| **Eliminar cierres** | ✅ | ❌ | ❌ | ❌ |
| **Crear liquidaciones** | ✅ | ❌ | ❌ | ❌ |
| **Editar liquidaciones** | ✅ | ❌ | ❌ | ❌ |
| **Eliminar liquidaciones** | ✅ | ❌ | ❌ | ❌ |
| **Gestionar staff** | ✅ | ❌ | ❌ | ❌ |
| **Editar configuración** | ✅ | ❌ | ❌ | ❌ |
| **Invitar usuarios** | ✅ | ❌ | ❌ | ❌ |
| **Eliminar restaurantes** | ❌ | ❌ | ❌ | ✅ |
| **Eliminar usuarios** | ❌ | ❌ | ❌ | ✅ |

---

## 🗄️ ESTRUCTURA DE FIRESTORE

### `/users/{uid}`
```javascript
{
  uid: "user_abc123",
  email: "juan@example.com",
  displayName: "Juan Pérez",
  
  // Roles por restaurante
  restaurantRoles: {
    "restaurantId1": ["closure_editor"],
    "restaurantId2": ["restaurant_viewer"]
  },
  
  // Restaurante principal
  primaryRestaurant: "restaurantId1",
  
  // Roles de sitio (admin global)
  siteRoles: [],  // ["super_admin"] solo para ti
  
  // Seguridad
  emailVerified: false,
  isActive: true,
  createdAt: Timestamp,
  lastLogin: Timestamp
}
```

### `/restaurants/{restaurantId}`
```javascript
{
  id: "restaurantId1",
  restaurantName: "Mi Restaurante",
  ownerId: "user_owner_uid",
  
  // Configuración
  settlementMode: "pool",
  poolConfig: {
    kitchenPercentage: 20,
    transbankPercentage: 5
  },
  
  // Staff (NO son usuarios del sistema)
  serviceStaff: [
    {
      staffId: "staff_001",
      name: "María López",
      role: "garzon",
      isActive: true
    }
  ],
  supportStaff: [...],
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `/restaurants/{restaurantId}/registros_diarios/{closureId}`
```javascript
{
  closureId: "closure_20251210",
  referenceDate: "2025-12-10",
  estado: "pendiente",
  
  // Totales
  totals: {
    totalTips: 150000,
    totalSales: 500000
  },
  
  // Asignaciones
  assignments: [...],
  
  // Auditoría
  createdBy: "user_closure_editor_uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `/liquidaciones/{liquidacionId}`
```javascript
{
  liquidacionId: "liq_20251210",
  restaurantId: "restaurantId1",
  
  // Cierres incluidos
  closureIds: ["closure_001", "closure_002"],
  
  // Pagos por trabajador
  members: [
    {
      staffId: "staff_001",
      name: "María López",
      totalAmount: 125000
    }
  ],
  
  status: "paid",
  createdBy: "user_closure_editor_uid",
  createdAt: Timestamp
}
```

---

## 🔒 FIRESTORE RULES (PENDIENTE DE IMPLEMENTAR)

**Estado actual:** Reglas permisivas (TODO a usuarios autenticados)  
**Pendiente:** Validar roles específicos según esta documentación

**TODOs en las reglas:**
- ✅ `super_admin` usando Custom Claims
- ⏳ Validar `closure_editor` para crear/editar cierres
- ⏳ Validar `closure_editor` para gestionar staff
- ⏳ Validar `closure_editor` para crear liquidaciones
- ⏳ Permitir lectura a `owner` y `restaurant_viewer`
- ⏳ Restringir `restaurant_viewer` solo a liquidaciones

---

## ✅ RESUMEN

### **Roles eliminados:**
- ❌ `liquidator` (redundante con `closure_editor`)
- ❌ `staff_member` (reemplazado por `restaurant_viewer`)

### **Roles finales:**
1. **`closure_editor`** (MAX 2) - Gestión completa del restaurante
2. **`owner`** (1) - Solo observador (Ley 20.549)
3. **`restaurant_viewer`** (∞) - Staff que ve solo liquidaciones
4. **`super_admin`** (1) - Tú - Administrador de plataforma

### **Próximos pasos:**
1. ⏳ Implementar validación de roles en Firestore Rules
2. ⏳ Actualizar `src/types/roles.ts` con los 3 roles finales
3. ⏳ Eliminar código de `liquidator` y `staff_member`
4. ⏳ Probar flujo completo

---

**Última actualización:** 10 de diciembre 2025, 5:58 PM (UTC-03)  
**Estado:** 🟢 **DEFINICIÓN APROBADA**
