# Sistema de Invitaciones - ReparteJusto

> **Fecha**: 4 de diciembre de 2025  
> **Objetivo**: Permitir a usuarios con rol `closure_editor` invitar a otros usuarios a su restaurante

---

## 🎯 Flujo Completo

### 1. **Registro de Usuario** → Crear restaurante automáticamente

Cuando un usuario se registra en `/auth/register`:

1. **Completa formulario**:
   - Nombre completo
   - Email
   - Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número)
   - Confirmar contraseña
   - **Nombre del restaurante** (nuevo)
   - **Tipo de cuenta**: closure_editor o liquidator (nuevo)

2. **Se crea automáticamente**:
   - Cuenta de usuario en Firebase Auth
   - Documento en `/users/{uid}` con:
     ```typescript
     {
       uid, email, displayName,
       siteRoles: [],
       restaurantRoles: {
         [restaurantId]: ["closure_editor" o "liquidator"]
       },
       primaryRestaurant: restaurantId,
       createdAt, lastLogin, lastActivity,
       emailVerified: false,
       isActive: true
     }
     ```
   - Documento en `/restaurants/{restaurantId}` con:
     ```typescript
     {
       id: restaurantId,
       name: restaurantName,
       ownerId: uid,
       ownerEmail, ownerName,
       createdAt,
       isActive: true,
       settings: { timezone: "America/Santiago", currency: "CLP" }
     }
     ```

3. **Redirige a** `/dashboard` (en vez de `/pending`)

---

### 2. **Invitar Usuarios** → Modal de invitación

**Ubicación**: Componente `<InviteUserModal>`  
**Quién puede usar**: Usuarios con rol `closure_editor`  
**Dónde se muestra**: En dashboard, gestión de staff, etc.

**Proceso**:
1. Usuario abre modal de invitación
2. Ingresa:
   - **Email del invitado**
   - **Rol a asignar**: closure_editor, liquidator, o restaurant_viewer
3. Al enviar:
   - Se crea documento en `/invitations/{invitationId}`:
     ```typescript
     {
       invitationId,
       restaurantId,
       restaurantName,
       invitedBy: { uid, email, displayName },
       invitedEmail,
       role: "closure_editor" | "liquidator" | "restaurant_viewer",
       status: "pending",
       createdAt,
       expiresAt: +7 días
     }
     ```
   - **TODO**: Enviar email con link de invitación (Cloud Function)

---

### 3. **Aceptar Invitación** → Página `/invite/:invitationId`

**Ruta**: `/invite/{invitationId}`  
**Componente**: `AcceptInvitationPage`

**Flujo**:

1. **Usuario recibe email** con link: `https://app.com/invite/inv_rest123_1234567890`

2. **Abre el link**:
   - Si NO está logueado → Mostrar botones "Iniciar sesión" / "Crear cuenta"
   - Si está logueado → Validar que el email coincida

3. **Muestra detalles**:
   - Nombre del restaurante
   - Quién invitó
   - Rol que se asignará
   - Fecha de expiración

4. **Usuario decide**:
   - **Aceptar**:
     - Actualiza `/users/{uid}` agregando el rol en ese restaurante
     - Actualiza `/invitations/{invitationId}` → status: "accepted"
     - Redirige a `/dashboard`
   - **Rechazar**:
     - Actualiza `/invitations/{invitationId}` → status: "rejected"
     - Redirige a `/`

---

## 📁 Archivos Creados

### Tipos
- ✅ `src/types/invitation.ts` - InvitationDocument, CreateInvitationInput, InvitationStatus

### Componentes
- ✅ `src/components/InviteUserModal.tsx` - Modal para invitar usuarios
- ✅ `src/pages/AcceptInvitationPage.tsx` - Página para aceptar/rechazar invitaciones

### Rutas
- ✅ `/invite/:invitationId` - Configurada en `AppRouter.tsx`

### Modificaciones
- ✅ `src/auth/RegisterPage.tsx`:
  - Agregados campos: `restaurantName`, `accountType`
  - Validación de contraseña fuerte (8 chars, 1 mayúscula, 1 número)
  - Crea restaurante automáticamente al registrarse
  - Asigna rol elegido al usuario
  - Redirige a `/dashboard` en vez de `/pending`

---

## 🗂️ Estructura de Datos en Firestore

### Colección `/users/{uid}`
```typescript
{
  uid: string
  email: string
  displayName: string | null
  
  siteRoles: SiteRole[]  // [] para usuarios normales
  restaurantRoles: {
    [restaurantId]: RestaurantRole[]
    // Ejemplo: { "rest_abc123": ["closure_editor"] }
  }
  
  primaryRestaurant: string  // Restaurante que creó al registrarse
  
  createdAt: Timestamp
  lastLogin: Timestamp | null
  lastActivity: Timestamp | null
  
  emailVerified: boolean
  isActive: boolean
  loginAttempts: number
  lockedUntil: Timestamp | null
}
```

### Colección `/restaurants/{restaurantId}`
```typescript
{
  id: string
  name: string
  ownerId: string  // uid del usuario que lo creó
  ownerEmail: string
  ownerName: string
  
  createdAt: Timestamp
  isActive: boolean
  
  settings: {
    timezone: string  // "America/Santiago"
    currency: string  // "CLP"
  }
}
```

### Colección `/invitations/{invitationId}`
```typescript
{
  invitationId: string
  restaurantId: string
  restaurantName: string
  
  invitedBy: {
    uid: string
    email: string
    displayName: string | null
  }
  
  invitedEmail: string
  invitedUserId?: string  // Se llena al aceptar
  
  role: "closure_editor" | "liquidator" | "restaurant_viewer"
  
  status: "pending" | "accepted" | "rejected" | "expired"
  createdAt: Timestamp
  expiresAt: Timestamp  // +7 días
  
  acceptedAt?: Timestamp
  rejectedAt?: Timestamp
}
```

---

## 🚀 Cómo Usar

### 1. Registrar nuevo usuario

```
1. Ir a /auth/register
2. Llenar formulario completo (incluyendo nombre restaurante y tipo cuenta)
3. Hacer clic en "Crear cuenta"
4. → Se crea restaurante automáticamente
5. → Usuario queda con rol asignado
6. → Redirige a /dashboard
```

### 2. Invitar usuario desde el dashboard

```
1. Usuario con closure_editor abre InviteUserModal
2. Ingresa email y rol del invitado
3. Hacer clic en "Enviar invitación"
4. → Se crea documento en /invitations
5. → (TODO) Se envía email al invitado
```

### 3. Aceptar invitación

```
1. Invitado recibe email con link /invite/{invitationId}
2. Abre el link
3. Si no está logueado → Inicia sesión o crea cuenta
4. Ve detalles de la invitación
5. Hace clic en "Aceptar invitación"
6. → Se agrega rol al usuario
7. → Se marca invitación como aceptada
8. → Redirige a /dashboard
```

---

## ⏳ Pendientes (TODO)

### Prioridad Alta
1. **Cloud Function para enviar emails**:
   ```typescript
   // functions/src/sendInvitationEmail.ts
   export const sendInvitationEmail = functions.firestore
     .document('invitations/{invitationId}')
     .onCreate(async (snap, context) => {
       const invitation = snap.data()
       const invitationLink = `https://app.com/invite/${context.params.invitationId}`
       
       // Enviar email usando SendGrid, Resend, etc.
       await sendEmail({
         to: invitation.invitedEmail,
         subject: `Invitación a ${invitation.restaurantName}`,
         html: emailTemplate(invitation, invitationLink)
       })
     })
   ```

2. **Cron para marcar invitaciones expiradas**:
   ```typescript
   // Ejecutar diariamente para marcar status: "expired" si expiresAt < now
   ```

3. **Validar que email no esté ya registrado** antes de invitar

### Prioridad Media
4. **Lista de invitaciones pendientes** en el dashboard:
   - Ver invitaciones enviadas
   - Cancelar invitaciones pendientes
   - Reenviar invitaciones expiradas

5. **Notificaciones en app**:
   - Cuando alguien acepta tu invitación
   - Cuando recibes una invitación nueva

6. **Límite de invitaciones**:
   - Máximo 10 invitaciones pendientes por restaurante
   - Rate limiting (máx. 5 invitaciones por hora)

### Prioridad Baja
7. **Email templates profesionales**:
   - Diseño branded
   - Botones call-to-action
   - Información del restaurante

8. **Gestión de staff en dashboard**:
   - Ver todos los usuarios del restaurante
   - Editar roles de usuarios existentes
   - Eliminar usuarios del restaurante

---

## 🔒 Seguridad

### Validaciones Implementadas
- ✅ Solo `closure_editor` puede invitar usuarios
- ✅ Invitación expira en 7 días
- ✅ Email del usuario debe coincidir con `invitedEmail`
- ✅ Validación de estado de invitación (pending, accepted, rejected)

### Validaciones Pendientes (Firestore Rules)
```javascript
// firestore.rules
match /invitations/{invitationId} {
  // Solo el que invitó puede leer sus invitaciones
  allow read: if request.auth != null &&
    (resource.data.invitedBy.uid == request.auth.uid ||
     resource.data.invitedEmail == request.auth.token.email);
  
  // Solo closure_editor puede crear invitaciones
  allow create: if request.auth != null &&
    hasRole(request.auth.uid, resource.data.restaurantId, 'closure_editor');
  
  // Solo el invitado puede actualizar (aceptar/rechazar)
  allow update: if request.auth != null &&
    resource.data.invitedEmail == request.auth.token.email &&
    request.resource.data.status in ['accepted', 'rejected'];
}
```

---

## 📊 Métricas Sugeridas

### Analytics a implementar
- Invitaciones enviadas por restaurante
- Tasa de aceptación de invitaciones
- Tiempo promedio entre invitación y aceptación
- Invitaciones expiradas vs aceptadas/rechazadas
- Usuarios más activos en invitar

---

## 🎉 Resumen de Cambios

### RegisterPage
- ❌ ~~Redirige a /pending~~ → ✅ Ahora redirige a /dashboard
- ✅ Crea restaurante automáticamente
- ✅ Asigna rol al usuario (closure_editor o liquidator)
- ✅ Validación de contraseña fuerte
- ✅ Campos nuevos: restaurantName, accountType

### Sistema de Invitaciones
- ✅ Tipo `InvitationDocument` definido
- ✅ Modal `InviteUserModal` para invitar usuarios
- ✅ Página `AcceptInvitationPage` para aceptar/rechazar
- ✅ Ruta `/invite/:invitationId` configurada
- ⏳ Falta envío de emails (Cloud Function)

---

**Última actualización**: 4 de diciembre de 2025, 11:00 PM (UTC-03)  
**Desarrollador**: Equipo ReparteJusto  
**Estado**: ✅ Sistema básico implementado, pendiente envío de emails
