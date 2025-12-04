# Plan de Autenticación, Roles y Seguridad

> **Fecha de creación**: 3 de diciembre de 2025  
> **Objetivo**: Definir arquitectura de autenticación, sistema de roles jerárquico, seguridad y testing para ReparteJusto.

> **⚖️ MARCO LEGAL**: Este sistema cumple con la **Ley 20.549** de Chile que regula la distribución de propinas, donde se establece que los **propietarios y personal administrativo NO pueden participar** en el reparto de propinas. Solo los trabajadores del establecimiento (garzones, cocineros, personal de apoyo) tienen derecho a recibir y gestionar propinas.

---

## Índice
1. [Arquitectura de Autenticación](#arquitectura-de-autenticación)
2. [Sistema de Roles](#sistema-de-roles)
3. [Flujos de Login y Register](#flujos-de-login-y-register)
4. [Seguridad](#seguridad)
5. [Rate Limiting](#rate-limiting)
6. [Testing](#testing)
7. [Implementación por Fases](#implementación-por-fases)

---

## Arquitectura de Autenticación

### Stack actual
- **Firebase Authentication**: gestión de usuarios, tokens JWT
- **Firestore**: persistencia de datos de usuario y roles
- **React Context**: `AuthContext` para estado global de sesión

### Flujo de autenticación propuesto

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ├─► Login/Register (Firebase Auth)
       │   └─► JWT Token
       │
       ├─► Firestore: /users/{uid}
       │   └─► { roles, restaurantId, permissions }
       │
       └─► AuthContext
           └─► Protected Routes + Role Guards
```

### Estructura de datos en Firestore

#### Colección `/users/{uid}`
```typescript
type UserDocument = {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  
  // Roles administrativos del sitio
  siteRoles: SiteRole[]  // ["super_admin", "support", "viewer"]
  
  // Roles operativos por restaurante
  restaurantRoles: {
    [restaurantId: string]: RestaurantRole[]
  }
  // Ejemplo: { "rest123": ["owner", "liquidator"] }
  
  // Metadata
  createdAt: Timestamp
  lastLogin: Timestamp
  isActive: boolean
  emailVerified: boolean
  
  // Seguridad
  loginAttempts?: number
  lockedUntil?: Timestamp
  mfaEnabled?: boolean
}
```

#### Colección `/restaurants/{restaurantId}`
```typescript
type RestaurantDocument = {
  id: string
  name: string
  
  // Información del propietario (solo metadata, SIN permisos operativos)
  owner: {
    uid: string
    name: string
    email: string
  }
  
  // Usuarios con roles operativos (trabajadores del restaurante)
  closureEditors: string[]  // UIDs que pueden hacer TODO (rol principal)
  liquidators: string[]     // UIDs que pueden liquidar propinas
  viewers: string[]         // UIDs invitados con solo lectura
  
  // Config adicional...
}
```

---

## Sistema de Roles

### 1. Roles Administrativos del Sitio (Site Roles)

Estos roles controlan el acceso al **panel administrativo** (`/admin`) y son independientes de los restaurantes.

| Rol | Código | Descripción | Permisos |
|-----|--------|-------------|----------|
| **Super Admin** | `super_admin` | Administrador total (tú) | Acceso completo: crear admins, ver todos los restaurantes, métricas globales, eliminar usuarios |
| **Admin** | `admin` | Administrador con restricciones | Ver restaurantes, métricas, no puede crear super_admins |
| **Support** | `support` | Soporte técnico | Ver datos, asistir usuarios, no modificar configuraciones críticas |
| **Viewer** | `viewer` | Solo lectura | Dashboard de métricas, sin modificaciones |

#### Jerarquía de Site Roles
```
super_admin > admin > support > viewer
```

**Reglas**:
- Solo `super_admin` puede crear otros `super_admin` o `admin`
- `super_admin` puede degradar cualquier rol
- Los roles se asignan mediante un panel exclusivo en `/admin/users`

---

### 2. Roles Operativos por Restaurante (Restaurant Roles)

Estos roles controlan **operaciones diarias** dentro de cada restaurante. Un usuario puede tener diferentes roles en diferentes restaurantes.

> **⚖️ NOTA LEGAL (Chile)**: Según la Ley 20.549 sobre propinas, los dueños y personal administrativo del restaurante **NO pueden participar** en la distribución de propinas. Por lo tanto, el rol `owner` es solo observador.

| Rol | Código | Descripción | Permisos |
|-----|--------|-------------|----------|
| **Closure Editor** | `closure_editor` | Editor de cierres (rol principal) | Crear, editar y eliminar cierres diarios + gestión completa de staff + configuración del restaurante |
| **Liquidator** | `liquidator` | Liquidador de propinas | Crear liquidaciones, generar PDFs, marcar cierres como pagados, ver cierres |
| **Owner** | `owner` | Propietario del restaurante (SOLO OBSERVADOR) | Ver dashboard, cierres y liquidaciones. NO puede participar en distribución por ley chilena |
| **Viewer** | `restaurant_viewer` | Solo lectura (invitados) | Ver dashboard, cierres y liquidaciones (sin modificar) |

#### Permisos granulares

```typescript
type RestaurantPermission = 
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

const rolePermissions: Record<RestaurantRole, RestaurantPermission[]> = {
  // Closure Editor: ROL PRINCIPAL - puede hacer TODO (gestión completa)
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
    "settings:view"
  ],
  
  // Liquidator: puede liquidar + ver, pero NO editar cierres ni staff
  liquidator: [
    "closure:view",
    "liquidation:create",
    "liquidation:view",
    "liquidation:download",
    "staff:view",
    "settings:view"
  ],
  
  // Owner: SOLO LECTURA por ley chilena (no participa en distribución)
  owner: [
    "closure:view",
    "liquidation:view",
    "staff:view",
    "settings:view"
  ],
  
  // Viewer: invitados externos
  restaurant_viewer: [
    "closure:view",
    "liquidation:view",
    "staff:view",
    "settings:view"
  ]
}
```

#### Jerarquía de permisos (de mayor a menor)
```
closure_editor > liquidator > owner ≈ restaurant_viewer
```

**Regla de oro**: Solo los **trabajadores del restaurante** (garzones, cocineros) pueden tener roles operativos (`closure_editor`, `liquidator`). Los propietarios/administrativos quedan como observadores.

---

### 3. Separación de Roles

**Clave**: Un mismo usuario puede tener **ambos tipos de roles**:

```typescript
// Ejemplo 1: Usuario "Juan" es super admin del sitio Y propietario observador de su restaurante
{
  uid: "juan123",
  email: "juan@reparte.com",
  siteRoles: ["super_admin"],
  restaurantRoles: {
    "restaurante_juan": ["owner"],      // Solo puede ver (por ley)
    "restaurante_amigo": ["owner"]      // También es inversionista en otro
  }
}

// Ejemplo 2: Usuario "María" es garzón con permisos de closure_editor en su restaurante
{
  uid: "maria456",
  email: "maria@garzona.com",
  siteRoles: [],                        // No es admin del sitio
  restaurantRoles: {
    "restaurante_1": ["closure_editor"], // Rol principal: gestiona todo
    "restaurante_2": ["liquidator"]      // Ayuda a liquidar en otro local
  }
}

// Ejemplo 3: Usuario "Pedro" solo liquida propinas (no edita cierres)
{
  uid: "pedro789",
  email: "pedro@liquida.com",
  siteRoles: [],
  restaurantRoles: {
    "restaurante_3": ["liquidator"]      // Solo genera liquidaciones
  }
}
```

---

## Flujos de Login y Register

### Login (`/auth/login`)

#### UI/UX
```
┌────────────────────────────────┐
│      ReparteJusto Login        │
├────────────────────────────────┤
│ Email: [___________________]   │
│ Password: [________________]   │
│ □ Recordarme                   │
│                                │
│ [   Iniciar Sesión   ]        │
│                                │
│ ¿Olvidaste tu contraseña?      │
│ ¿No tienes cuenta? Regístrate  │
└────────────────────────────────┘
```

#### Flujo técnico
1. **Validación frontend**: email formato válido, password ≥ 8 caracteres
2. **Firebase Auth**: `signInWithEmailAndPassword(email, password)`
3. **Manejo de errores**:
   - `auth/user-not-found` → "Usuario no existe"
   - `auth/wrong-password` → "Contraseña incorrecta"
   - `auth/too-many-requests` → "Demasiados intentos, espera X minutos"
   - `auth/user-disabled` → "Cuenta deshabilitada, contacta soporte"
4. **Post-login**:
   - Verificar `emailVerified` → si no, mostrar banner "Verifica tu correo"
   - Consultar `/users/{uid}` para roles
   - Actualizar `lastLogin` timestamp
   - Redirigir según roles:
     - Si tiene `siteRoles` → `/admin`
     - Si tiene `restaurantRoles` → `/dashboard` (del primer restaurante)
     - Si no tiene roles → `/setup` (onboarding)

#### Seguridad adicional
- Rate limiting: máximo 5 intentos por IP en 15 minutos
- Bloqueo de cuenta: después de 10 intentos fallidos, bloquear por 1 hora
- Log de intentos sospechosos en Firestore `/security_logs/{uid}`

---

### Register (`/auth/register`)

#### UI/UX
```
┌────────────────────────────────┐
│    Registro ReparteJusto       │
├────────────────────────────────┤
│ Nombre completo: [__________]  │
│ Email: [____________________]  │
│ Password: [_________________]  │
│ Confirmar password: [_______]  │
│                                │
│ Tipo de cuenta:                │
│ ○ Propietario de restaurante   │
│ ○ Administrador/Staff          │
│                                │
│ □ Acepto términos y condiciones│
│                                │
│ [     Crear Cuenta     ]       │
│                                │
│ ¿Ya tienes cuenta? Inicia sesión│
└────────────────────────────────┘
```

#### Flujo técnico
1. **Validación frontend**:
   - Nombre ≥ 3 caracteres
   - Email válido y no en lista negra de dominios temporales
   - Password ≥ 8 caracteres, 1 mayúscula, 1 número
   - Passwords coinciden
   - Aceptó términos
2. **Firebase Auth**: `createUserWithEmailAndPassword(email, password)`
3. **Post-registro**:
   - Crear documento en `/users/{uid}` con estructura base
   - Enviar correo de verificación: `sendEmailVerification()`
   - Asignar rol por defecto según tipo:
     - **"Propietario"** → Se crea el documento del restaurante con `owner` como metadata. El propietario NO recibe roles operativos (solo puede observar por ley). Durante el `/setup` puede invitar a trabajadores y asignarles `closure_editor` o `liquidator`.
     - **"Trabajador/Staff"** → Quedará pendiente de invitación. Un `closure_editor` existente lo debe agregar al restaurante con el rol apropiado.
4. **Redirigir** según tipo:
   - Propietario → `/setup` (configurar restaurante e invitar staff)
   - Trabajador → `/pending` (esperar invitación de closure_editor)

#### Validaciones backend (Cloud Function `onUserCreate`)
```typescript
// functions/src/triggers/onUserCreate.ts
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const userDoc = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "Usuario",
    siteRoles: [],
    restaurantRoles: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: null,
    isActive: true,
    emailVerified: user.emailVerified || false,
  }
  
  await admin.firestore().collection("users").doc(user.uid).set(userDoc)
  
  // Log de auditoría
  await admin.firestore().collection("audit_logs").add({
    action: "user_created",
    uid: user.uid,
    email: user.email,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  })
})
```

---

### Recuperación de contraseña

#### Flujo
1. Usuario clickea "¿Olvidaste tu contraseña?"
2. Ingresa email → `sendPasswordResetEmail(email)`
3. Firebase envía correo con link temporal
4. Usuario clickea link → redirección a página de reset
5. Ingresa nueva contraseña → actualización en Firebase Auth

#### Seguridad
- Rate limit: 3 solicitudes por email cada 24 horas
- El link expira en 1 hora
- Requiere confirmación de contraseña nueva

---

## Seguridad

### 1. Protección contra ataques comunes

#### CSRF (Cross-Site Request Forgery)
- **Firebase tokens son inmunes** (no se envían automáticamente como cookies)
- Para operaciones críticas, validar `idToken` en cada request a Cloud Functions

#### XSS (Cross-Site Scripting)
- **React escapa automáticamente** las variables en JSX
- **Evitar** `dangerouslySetInnerHTML` salvo con sanitización estricta
- Validar inputs en backend con Zod antes de persistir

#### SQL Injection
- **No aplica** (usamos Firestore, no SQL)
- Firestore valida tipos automáticamente

#### Rate Limiting (ver sección siguiente)

---

### 2. Firestore Security Rules

#### Usuarios (`/users/{uid}`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Solo el usuario puede leer su propia data
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      
      // Solo super_admins pueden escribir/editar otros usuarios
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.siteRoles.hasAny(['super_admin']);
      
      // Usuarios pueden actualizar su propio lastLogin
      allow update: if request.auth != null && 
        request.auth.uid == uid &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastLogin']);
    }
    
    // Restaurantes
    match /restaurants/{restaurantId} {
      // Leer: owner (metadata), usuarios con roles, o super_admin
      allow read: if request.auth != null && (
        resource.data.owner.uid == request.auth.uid ||
        request.auth.uid in resource.data.closureEditors ||
        request.auth.uid in resource.data.liquidators ||
        request.auth.uid in resource.data.viewers ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.siteRoles.hasAny(['super_admin', 'admin'])
      );
      
      // Escribir configuración: solo closure_editors o super_admin
      // IMPORTANTE: owner NO puede escribir (solo metadata)
      allow write: if request.auth != null && (
        request.auth.uid in resource.data.closureEditors ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.siteRoles.hasAny(['super_admin'])
      );
      
      // Cierres diarios
      match /registros_diarios/{closureId} {
        // Leer: owner (observador), closure_editors, liquidators, viewers, o admins
        allow read: if request.auth != null && (
          get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.owner.uid == request.auth.uid ||
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.closureEditors ||
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.liquidators ||
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.viewers ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.siteRoles.hasAny(['super_admin', 'admin'])
        );
        
        // Crear/editar/eliminar: SOLO closure_editors (owner NO puede)
        allow create: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.closureEditors;
        
        allow update: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.closureEditors;
        
        allow delete: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.closureEditors;
      }
      
      // Liquidaciones (marcado de cierres como pagados)
      match /liquidaciones/{liquidacionId} {
        allow read: if request.auth != null && (
          get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.owner.uid == request.auth.uid ||
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.closureEditors ||
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.liquidators
        );
        
        // Crear liquidaciones: closure_editors O liquidators (owner NO puede)
        allow create: if request.auth != null && (
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.closureEditors ||
          request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.liquidators
        );
      }
    }
    
    // Helper function para validar permisos por rol
    function isClosureEditor(restaurantId) {
      return request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.closureEditors;
    }
    
    function isLiquidator(restaurantId) {
      return request.auth.uid in get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.liquidators;
    }
  }
}
```

---

### 3. Validación de permisos en frontend

#### Hook personalizado: `usePermissions`
```typescript
// src/hooks/usePermissions.ts
import { useAuth } from "@/context/AuthContext"
import { useMemo } from "react"

type Permission = RestaurantPermission | "admin:view" | "admin:edit"

export const usePermissions = (restaurantId?: string) => {
  const { user, userRoles } = useAuth()
  
  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      // Super admin tiene todos los permisos
      if (userRoles?.siteRoles?.includes("super_admin")) return true
      
      // Verificar permisos de restaurante
      if (restaurantId && userRoles?.restaurantRoles?.[restaurantId]) {
        const roles = userRoles.restaurantRoles[restaurantId]
        
        // Mapear roles a permisos
        const permissions = roles.flatMap(role => rolePermissions[role] || [])
        return permissions.includes(permission)
      }
      
      return false
    }
  }, [user, userRoles, restaurantId])
  
  const hasSiteRole = useMemo(() => {
    return (role: SiteRole): boolean => {
      return userRoles?.siteRoles?.includes(role) || false
    }
  }, [userRoles])
  
  return { hasPermission, hasSiteRole }
}
```

#### Uso en componentes
```typescript
// Ejemplo: botón de liquidar solo visible si tiene permiso
const { hasPermission } = usePermissions(restaurantId)

{hasPermission("liquidation:create") && (
  <Button onClick={handleLiquidate}>
    Liquidar Periodo
  </Button>
)}
```

---

### 4. Protected Routes

#### Componente `ProtectedRoute`
```typescript
// src/router/ProtectedRoute.tsx
import { Navigate } from "react-router"
import { useAuth } from "@/context/AuthContext"

type Props = {
  children: React.ReactNode
  requireSiteRole?: SiteRole[]
  requireRestaurantRole?: RestaurantRole[]
  restaurantId?: string
}

export const ProtectedRoute = ({ 
  children, 
  requireSiteRole, 
  requireRestaurantRole,
  restaurantId 
}: Props) => {
  const { user, userRoles, loading } = useAuth()
  
  if (loading) return <div>Cargando...</div>
  
  if (!user) return <Navigate to="/auth/login" replace />
  
  // Validar rol de sitio
  if (requireSiteRole && !requireSiteRole.some(r => userRoles?.siteRoles?.includes(r))) {
    return <Navigate to="/unauthorized" replace />
  }
  
  // Validar rol de restaurante
  if (requireRestaurantRole && restaurantId) {
    const hasRole = requireRestaurantRole.some(r => 
      userRoles?.restaurantRoles?.[restaurantId]?.includes(r)
    )
    if (!hasRole) return <Navigate to="/unauthorized" replace />
  }
  
  return <>{children}</>
}
```

#### Uso en rutas
```typescript
// src/router/AppRouter.tsx
{
  path: "/admin",
  element: (
    <ProtectedRoute requireSiteRole={["super_admin", "admin"]}>
      <AdminLayout />
    </ProtectedRoute>
  ),
  children: [...]
}

{
  path: "/dashboard/liquidacion",
  element: (
    <ProtectedRoute 
      requireRestaurantRole={["closure_editor", "liquidator"]}
      restaurantId={currentRestaurantId}
    >
      <LiquidacionPage />
    </ProtectedRoute>
  )
}

{
  path: "/cierre",
  element: (
    <ProtectedRoute 
      requireRestaurantRole={["closure_editor"]}  // Solo closure_editor puede crear cierres
      restaurantId={currentRestaurantId}
    >
      <CierreDiarioPage />
    </ProtectedRoute>
  )
}
```

---

## Rate Limiting

### 1. Estrategia por capas

#### Capa 1: Firebase Auth (built-in)
- Firebase ya incluye rate limiting automático en:
  - Login: 10 intentos/hora por IP
  - Registro: 100 cuentas/día por IP
  - Password reset: 5 solicitudes/hora por email

#### Capa 2: Cloud Functions (custom)
Implementar rate limiting en funciones críticas:

```typescript
// functions/src/middleware/rateLimit.ts
import { functions } from "firebase-functions"
import * as admin from "firebase-admin"

type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

export const rateLimit = (config: RateLimitConfig) => {
  return async (req: functions.Request, res: functions.Response, next: () => void) => {
    const identifier = req.ip || req.headers["x-forwarded-for"] || "unknown"
    const now = Date.now()
    
    const cached = rateLimitCache.get(identifier)
    
    if (cached && cached.resetAt > now) {
      if (cached.count >= config.maxRequests) {
        res.status(429).json({
          code: "RATE_LIMIT_EXCEEDED",
          message: `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil((cached.resetAt - now) / 1000)}s`,
          retryAfter: Math.ceil((cached.resetAt - now) / 1000),
        })
        return
      }
      cached.count++
    } else {
      rateLimitCache.set(identifier, {
        count: 1,
        resetAt: now + config.windowMs,
      })
    }
    
    next()
  }
}

// Limpiar cache cada 10 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitCache.entries()) {
    if (value.resetAt <= now) {
      rateLimitCache.delete(key)
    }
  }
}, 600000)
```

#### Aplicar a endpoints críticos
```typescript
// functions/src/index.ts
import { rateLimit } from "./middleware/rateLimit"

export const guardarCierreDiario = functions
  .region("us-central1")
  .runWith({ memory: "256MB" })
  .https.onRequest(async (req, res) => {
    // Rate limit: 30 cierres por hora
    await rateLimit({ maxRequests: 30, windowMs: 3600000 })(req, res, async () => {
      // Lógica del handler...
    })
  })

export const liquidarPeriodo = functions
  .region("us-central1")
  .https.onRequest(async (req, res) => {
    // Rate limit: 10 liquidaciones por hora
    await rateLimit({ maxRequests: 10, windowMs: 3600000 })(req, res, async () => {
      // Lógica del handler...
    })
  })
```

#### Capa 3: Firestore Rules (lectura/escritura)
```javascript
// Limitar escrituras por usuario
match /restaurants/{restaurantId}/registros_diarios/{closureId} {
  allow create: if request.auth != null && 
    request.time > resource.data.lastCreatedAt + duration.value(1, 'm'); // 1 cierre por minuto máximo
}
```

---

### 2. Monitoreo y alertas

#### Log de rate limit excedido
```typescript
// Cada vez que se excede el límite, registrar en Firestore
await admin.firestore().collection("rate_limit_logs").add({
  ip: req.ip,
  endpoint: req.path,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  userAgent: req.headers["user-agent"],
})
```

#### Dashboard de métricas (en `/admin`)
- Total de rate limits excedidos por día
- IPs con más intentos bloqueados
- Endpoints más atacados

---

## Testing

### 1. Tests Unitarios (Vitest + React Testing Library)

#### Setup
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

#### Configuración `vitest.config.ts`
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

#### Setup file `src/test/setup.ts`
```typescript
import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(() => {
  cleanup()
})
```

---

### 2. Tests de Login

#### `src/auth/__tests__/LoginPage.test.tsx`
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BrowserRouter } from "react-router"
import LoginPage from "../LoginPage"
import { signInWithEmailAndPassword } from "firebase/auth"

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  getAuth: vi.fn(() => ({})),
}))

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it("renderiza el formulario correctamente", () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })
  
  it("muestra error si el email está vacío", async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const submitButton = screen.getByRole("button", { name: /iniciar sesión/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email es requerido/i)).toBeInTheDocument()
    })
  })
  
  it("muestra error si el password es muy corto", async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole("button", { name: /iniciar sesión/i })
    
    fireEvent.change(emailInput, { target: { value: "test@test.com" } })
    fireEvent.change(passwordInput, { target: { value: "123" } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password debe tener al menos 8 caracteres/i)).toBeInTheDocument()
    })
  })
  
  it("llama a signInWithEmailAndPassword con credenciales correctas", async () => {
    const mockSignIn = vi.mocked(signInWithEmailAndPassword)
    mockSignIn.mockResolvedValue({
      user: { uid: "test123", email: "test@test.com" },
    } as any)
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole("button", { name: /iniciar sesión/i })
    
    fireEvent.change(emailInput, { target: { value: "test@test.com" } })
    fireEvent.change(passwordInput, { target: { value: "Password123" } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        expect.anything(),
        "test@test.com",
        "Password123"
      )
    })
  })
  
  it("muestra error si las credenciales son incorrectas", async () => {
    const mockSignIn = vi.mocked(signInWithEmailAndPassword)
    mockSignIn.mockRejectedValue({
      code: "auth/wrong-password",
      message: "Wrong password",
    })
    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole("button", { name: /iniciar sesión/i })
    
    fireEvent.change(emailInput, { target: { value: "test@test.com" } })
    fireEvent.change(passwordInput, { target: { value: "WrongPass123" } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/contraseña incorrecta/i)).toBeInTheDocument()
    })
  })
})
```

---

### 3. Tests de Register

#### `src/auth/__tests__/RegisterPage.test.tsx`
```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BrowserRouter } from "react-router"
import RegisterPage from "../RegisterPage"
import { createUserWithEmailAndPassword } from "firebase/auth"

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  getAuth: vi.fn(() => ({})),
}))

describe("RegisterPage", () => {
  it("valida que las contraseñas coincidan", async () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    )
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmInput = screen.getByLabelText(/confirmar password/i)
    const submitButton = screen.getByRole("button", { name: /crear cuenta/i })
    
    fireEvent.change(passwordInput, { target: { value: "Password123" } })
    fireEvent.change(confirmInput, { target: { value: "Password456" } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument()
    })
  })
  
  it("requiere aceptar términos y condiciones", async () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    )
    
    const submitButton = screen.getByRole("button", { name: /crear cuenta/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/debes aceptar los términos/i)).toBeInTheDocument()
    })
  })
  
  it("crea usuario correctamente", async () => {
    const mockCreate = vi.mocked(createUserWithEmailAndPassword)
    mockCreate.mockResolvedValue({
      user: { uid: "newUser123", email: "new@test.com" },
    } as any)
    
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    )
    
    // Rellenar formulario completo y enviar...
    // Verificar que mockCreate fue llamado
  })
})
```

---

### 4. Tests de Permisos

#### `src/hooks/__tests__/usePermissions.test.tsx`
```typescript
import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { usePermissions } from "../usePermissions"
import { AuthContext } from "@/context/AuthContext"

const mockAuthContext = (roles: any) => ({
  user: { uid: "test123" },
  userRoles: roles,
  loading: false,
})

describe("usePermissions", () => {
  it("super_admin tiene todos los permisos", () => {
    const wrapper = ({ children }: any) => (
      <AuthContext.Provider value={mockAuthContext({ siteRoles: ["super_admin"] })}>
        {children}
      </AuthContext.Provider>
    )
    
    const { result } = renderHook(() => usePermissions("rest123"), { wrapper })
    
    expect(result.current.hasPermission("closure:create")).toBe(true)
    expect(result.current.hasPermission("liquidation:create")).toBe(true)
    expect(result.current.hasSiteRole("super_admin")).toBe(true)
  })
  
  it("liquidator solo tiene permisos de liquidación", () => {
    const wrapper = ({ children }: any) => (
      <AuthContext.Provider value={mockAuthContext({
        siteRoles: [],
        restaurantRoles: { rest123: ["liquidator"] }
      })}>
        {children}
      </AuthContext.Provider>
    )
    
    const { result } = renderHook(() => usePermissions("rest123"), { wrapper })
    
    expect(result.current.hasPermission("liquidation:create")).toBe(true)
    expect(result.current.hasPermission("closure:delete")).toBe(false)
  })
})
```

---

### 5. Tests de Integración (Cloud Functions)

#### `functions/src/__tests__/integration/auth.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import * as admin from "firebase-admin"
import { testEnv } from "./testSetup"

describe("Autenticación - Integración", () => {
  let testUser: admin.auth.UserRecord
  
  beforeAll(async () => {
    // Crear usuario de prueba
    testUser = await admin.auth().createUser({
      email: "test@integration.com",
      password: "TestPass123",
      displayName: "Test User",
    })
  })
  
  afterAll(async () => {
    // Limpiar
    await admin.auth().deleteUser(testUser.uid)
  })
  
  it("crea documento de usuario en Firestore al registrarse", async () => {
    const userDoc = await admin.firestore().collection("users").doc(testUser.uid).get()
    
    expect(userDoc.exists).toBe(true)
    expect(userDoc.data()?.email).toBe("test@integration.com")
    expect(userDoc.data()?.siteRoles).toEqual([])
  })
  
  it("bloquea usuario después de 10 intentos fallidos", async () => {
    // Simular 10 intentos fallidos...
    // Verificar que loginAttempts = 10 y lockedUntil está establecido
  })
})
```

---

### 6. Tests E2E (Playwright)

#### Setup Playwright
```bash
npm install -D @playwright/test
npx playwright install
```

#### `tests/e2e/auth.spec.ts`
```typescript
import { test, expect } from "@playwright/test"

test.describe("Flujo de autenticación completo", () => {
  test("usuario puede registrarse, verificar email y hacer login", async ({ page }) => {
    // 1. Ir a página de registro
    await page.goto("http://localhost:5173/auth/register")
    
    // 2. Rellenar formulario
    await page.fill('input[name="email"]', "e2e@test.com")
    await page.fill('input[name="password"]', "E2ePass123")
    await page.fill('input[name="confirmPassword"]', "E2ePass123")
    await page.check('input[type="checkbox"]')
    
    // 3. Enviar
    await page.click('button[type="submit"]')
    
    // 4. Verificar redirección a setup
    await expect(page).toHaveURL(/\/setup/)
    
    // 5. Logout
    await page.click('[aria-label="Cerrar sesión"]')
    
    // 6. Login de nuevo
    await page.goto("http://localhost:5173/auth/login")
    await page.fill('input[name="email"]', "e2e@test.com")
    await page.fill('input[name="password"]', "E2ePass123")
    await page.click('button[type="submit"]')
    
    // 7. Verificar dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })
  
  test("muestra error con credenciales incorrectas", async ({ page }) => {
    await page.goto("http://localhost:5173/auth/login")
    await page.fill('input[name="email"]', "wrong@test.com")
    await page.fill('input[name="password"]', "WrongPass")
    await page.click('button[type="submit"]')
    
    await expect(page.locator("text=/usuario no existe|contraseña incorrecta/i")).toBeVisible()
  })
})
```

---

---

## Estado Actual de la Implementación

### ✅ Componentes ya implementados

#### 1. **LoginPage** (`src/auth/LoginPage.tsx`)

**Estado**: ✅ Implementado y funcional

**Características actuales**:
- Formulario con validación de email y password
- Integración con Firebase Auth (`signInWithEmailAndPassword`)
- Manejo de errores de Firebase:
  - `auth/invalid-credential` → "Credenciales inválidas"
  - `auth/user-not-found` → "No existe cuenta"
  - `auth/wrong-password` → "Contraseña incorrecta"
- Redirección automática a `/admin/overview` después del login
- UI con Shadcn/UI (Card, Button, Label)
- Estados de carga y validación
- Accesibilidad (aria-labels, roles, ids únicos)

**Código clave**:
```typescript
// Líneas 86-112: Login con Firebase
await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
navigate("/admin/overview", { replace: true })

// Validaciones frontend (líneas 66-74)
if (!trimmedEmail.includes("@")) {
  nextErrors.email = "El correo debe ser válido."
}
```

**Pendiente de actualizar**:
- ❌ No consulta roles de Firestore después del login
- ❌ No implementa rate limiting (solo el de Firebase Auth)
- ❌ Redirección fija a `/admin/overview` (debería ser condicional según roles)
- ❌ No verifica `emailVerified`
- ❌ No registra `lastLogin` en Firestore

---

#### 2. **RegisterPage** (`src/auth/RegisterPage.tsx`)

**Estado**: ✅ Implementado y funcional (pero necesita refactorización)

**Características actuales**:
- Formulario completo: nombre, email, password, confirmPassword
- Validaciones:
  - Nombre no vacío
  - Email válido
  - Password ≥ 6 caracteres
  - Passwords coinciden
- Crea usuario en Firebase Auth
- Actualiza `displayName` con `updateProfile`
- **Crea documento en `adminUsers` collection** (líneas 116-124)
- Redirección a `/admin/overview`

**Código clave**:
```typescript
// Líneas 110-127: Registro
const credentials = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
await updateProfile(credentials.user, { displayName: trimmedName })

// IMPORTANTE: Actualmente crea en "adminUsers" (debe cambiar a "users")
const userDocument = doc(db, "adminUsers", credentials.user.uid)
await setDoc(userDocument, {
  uid: credentials.user.uid,
  name: trimmedName || null,
  email: trimmedEmail,
  status: "activo",
  role: "operador",  // ← ROL HARDCODEADO (debe cambiar)
  createdAt: serverTimestamp(),
})
```

**Pendiente de actualizar**:
- ❌ Collection `adminUsers` debe cambiar a `users`
- ❌ Rol hardcodeado como `"operador"` (debe usar `siteRoles` y `restaurantRoles`)
- ❌ No envía email de verificación (`sendEmailVerification`)
- ❌ No pregunta tipo de cuenta (Propietario vs Trabajador)
- ❌ No implementa validación de password fuerte (mínimo 8 caracteres, 1 mayúscula, 1 número)
- ❌ Redirección no diferencia entre propietario (`/setup`) y trabajador (`/pending`)

---

#### 3. **AuthContext** (`src/context/AuthContext.tsx`)

**Estado**: ✅ Implementado pero **incompleto**

**Características actuales**:
- React Context con `onAuthStateChanged`
- Estado `user`, `isLoading`, `isAuthenticated`
- Extrae `displayName`, `email`, `uid`
- Función `signOutUser()`

**Estructura actual**:
```typescript
type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string | null
  email: string | null
  uid: string | null
  signOutUser: () => Promise<void>
}
```

**Pendiente de actualizar**:
- ❌ No consulta `/users/{uid}` de Firestore para roles
- ❌ No expone `userRoles` (siteRoles, restaurantRoles)
- ❌ No actualiza `lastLogin` en Firestore

**Debe actualizarse a**:
```typescript
type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string | null
  email: string | null
  uid: string | null
  userRoles: UserRoles | null  // ← NUEVO
  signOutUser: () => Promise<void>
}

type UserRoles = {
  siteRoles: SiteRole[]
  restaurantRoles: Record<string, RestaurantRole[]>
}
```

---

#### 4. **Firebase Config** (`src/firebase/config.ts`)

**Estado**: ✅ Correctamente configurado

**Configuración**:
```typescript
export const auth = getAuth(app)
export const db = getFirestore(app)
```

- Variables de entorno con Vite (`VITE_FIREBASE_*`)
- Auth y Firestore inicializados
- Singleton pattern (`getApps().length > 0`)

---

#### 5. **Rutas** (`src/router/AppRouter.tsx`)

**Estado**: ✅ Implementado pero **sin protección de roles**

**Rutas actuales**:
```typescript
{
  path: "/auth",
  children: [
    { path: "login", element: <LoginPage /> },
    { path: "register", element: <RegisterPage /> }
  ]
}
```

**Pendiente**:
- ❌ No hay `ProtectedRoute` component
- ❌ Rutas como `/cierre`, `/dashboard/liquidacion` no tienen guards
- ❌ `/admin/*` no valida `siteRoles`

---

### ❌ Componentes faltantes

1. **ProtectedRoute component**
   - Guard para validar autenticación y roles
   - Redireccionar si no tiene permisos

2. **usePermissions hook**
   - Validar permisos granulares (`closure:create`, etc.)
   - Exponer `hasPermission()` y `hasSiteRole()`

3. **Recovery/Reset Password page**
   - Formulario de recuperación
   - Integración con `sendPasswordResetEmail`

4. **Email Verification page**
   - Recordatorio para verificar email
   - Botón para reenviar verificación

5. **Setup/Onboarding pages**
   - `/setup` para propietarios (crear restaurante)
   - `/pending` para trabajadores (esperar invitación)

6. **Admin User Management**
   - Panel `/admin/users` para asignar roles
   - Solo accesible por `super_admin`

---

## Implementación por Fases

### Fase 1: Fundamentos (Semana 1)
- [x] Firebase Auth ya configurado
- [x] LoginPage implementado (necesita actualización)
- [x] RegisterPage implementado (necesita actualización)
- [x] AuthContext implementado (necesita actualización)
- [ ] Actualizar `AuthContext` para incluir `userRoles` desde Firestore
- [ ] Cambiar collection de `adminUsers` a `users` en RegisterPage
- [ ] Implementar `onUserCreate` trigger en Cloud Functions
- [ ] Agregar `sendEmailVerification` en RegisterPage
- [ ] Tests unitarios de LoginPage y RegisterPage

### Fase 2: Sistema de Roles (Semana 2)
- [ ] Definir tipos `SiteRole` y `RestaurantRole` en TypeScript
- [ ] Implementar hook `usePermissions`
- [ ] Crear componente `ProtectedRoute`
- [ ] Actualizar rutas con guards
- [ ] Panel básico en `/admin/users` para asignar roles (solo super_admin)

### Fase 3: Seguridad y Rate Limiting (Semana 3)
- [ ] Implementar middleware de rate limiting en Cloud Functions
- [ ] Firestore Security Rules completas
- [ ] Logs de seguridad y auditoría
- [ ] Dashboard de métricas de seguridad en `/admin`

### Fase 4: Testing Completo (Semana 4)
- [ ] Tests unitarios al 80% de cobertura (auth, permisos, hooks)
- [ ] Tests de integración de Cloud Functions
- [ ] Tests E2E con Playwright (flujos críticos)
- [ ] CI/CD con GitHub Actions para ejecutar tests

### Fase 5: Mejoras Avanzadas (Opcional)
- [ ] MFA (Multi-Factor Authentication) con Firebase
- [ ] OAuth providers (Google, Microsoft)
- [ ] Rate limiting avanzado con Redis (si escala)
- [ ] Webhooks de auditoría para Slack/Discord

---

## Estructura de archivos propuesta

```
src/
├── auth/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── __tests__/
│   │   ├── LoginPage.test.tsx
│   │   └── RegisterPage.test.tsx
│   └── components/
│       ├── AuthLayout.tsx
│       └── SocialLoginButtons.tsx
├── context/
│   └── AuthContext.tsx  # Actualizar para roles
├── hooks/
│   ├── usePermissions.ts
│   └── __tests__/
│       └── usePermissions.test.tsx
├── router/
│   ├── ProtectedRoute.tsx
│   └── AppRouter.tsx  # Actualizar con guards
└── types/
    ├── roles.ts  # SiteRole, RestaurantRole, permissions
    └── user.ts   # UserDocument, etc.

functions/
├── src/
│   ├── triggers/
│   │   └── onUserCreate.ts
│   ├── middleware/
│   │   └── rateLimit.ts
│   ├── __tests__/
│   │   └── integration/
│   │       └── auth.test.ts
│   └── index.ts
└── firestore.rules  # Security rules

tests/
└── e2e/
    └── auth.spec.ts
```

---

## Checklist de Seguridad Final

Antes de desplegar a producción:

- [ ] Todos los endpoints críticos tienen rate limiting
- [ ] Firestore Security Rules revisadas y probadas
- [ ] Email verification obligatoria para acciones sensibles
- [ ] Logs de auditoría funcionando
- [ ] Tests de seguridad pasando (intentos de bypass de permisos)
- [ ] HTTPS configurado en producción
- [ ] Variables de entorno seguras (no hardcodeadas)
- [ ] Backup automático de Firestore configurado
- [ ] Monitoring de Firebase configurado (alertas de errores)
- [ ] Documentación de roles y permisos actualizada

---

## Notas adicionales

### Diferencia clave: Site Roles vs Restaurant Roles

**Analogía**: 
- **Site Roles** son como "administrador de un edificio completo"
- **Restaurant Roles** son como "gerente de un apartamento específico"

Un usuario puede ser administrador del edificio (site) y también tener un apartamento propio (restaurant).

### Escalabilidad futura
Si el proyecto crece:
1. Migrar rate limiting a **Redis** para sincronización entre múltiples instancias
2. Implementar **RBAC (Role-Based Access Control)** más granular con Firestore collections dedicadas
3. Agregar **audit logs** centralizados con BigQuery
4. Considerar **Auth0** o **Supabase** si Firebase Auth se queda corto

---

## Resumen Ejecutivo: Roles y Ley Chilena

### Diferencias clave entre Propietario y Trabajadores

| Aspecto | Propietario (`owner`) | Trabajador (`closure_editor` / `liquidator`) |
|---------|----------------------|---------------------------------------------|
| **Marco legal** | NO puede participar en distribución (Ley 20.549) | Puede gestionar y recibir propinas |
| **Permisos operativos** | ❌ Solo lectura (observador) | ✅ Crear cierres, liquidar, gestionar staff |
| **Acceso a datos** | ✅ Ver dashboard, cierres, liquidaciones | ✅ Ver y modificar según rol |
| **Crear cierres** | ❌ Bloqueado por Firestore Rules | ✅ Solo `closure_editor` |
| **Liquidar propinas** | ❌ Bloqueado por Firestore Rules | ✅ `closure_editor` y `liquidator` |
| **Gestionar personal** | ❌ No puede | ✅ Solo `closure_editor` |
| **Onboarding** | `/setup` → crear restaurante e invitar staff | `/pending` → esperar invitación |

### Flujo típico de un restaurante

1. **Propietario se registra** → Crea cuenta como "Propietario"
2. **Setup inicial** → Define nombre del restaurante, configuración básica
3. **Invita a trabajadores** → Envía invitación por email a garzones/cocineros
4. **Trabajador acepta invitación** → Se registra y se le asigna rol `closure_editor` o `liquidator`
5. **Closure Editor opera el sistema** → Crea cierres, gestiona staff, configura porcentajes
6. **Liquidator genera reportes** → Crea liquidaciones y descarga PDFs
7. **Propietario monitorea** → Solo observa desde su dashboard (no participa)

### Jerarquía final de roles de restaurante

```
┌─────────────────────────────────────┐
│      CLOSURE EDITOR                 │  ← Rol principal (gestión completa)
│  - Crear/editar/eliminar cierres   │
│  - Liquidar propinas                │
│  - Gestionar staff                  │
│  - Configurar restaurante           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         LIQUIDATOR                  │  ← Liquidar y ver
│  - Crear liquidaciones              │
│  - Generar PDFs                     │
│  - Ver cierres y staff              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│     OWNER (Propietario)             │  ← Solo observador (por ley)
│  - Ver dashboard                    │
│  - Ver cierres y liquidaciones      │
│  - NO puede modificar nada          │
└─────────────────────────────────────┘
```

### Validaciones de seguridad críticas

1. ✅ Firestore Rules bloquean que `owner` escriba en `registros_diarios`
2. ✅ Firestore Rules bloquean que `owner` cree `liquidaciones`
3. ✅ Hook `usePermissions` no otorga permisos de escritura a `owner`
4. ✅ `ProtectedRoute` impide acceso a `/cierre` si no eres `closure_editor`
5. ✅ Rate limiting evita abuso de endpoints críticos

### Cumplimiento legal

Este sistema garantiza el cumplimiento de la **Ley 20.549** mediante:

- **Separación estricta de roles**: propietarios NO tienen permisos operativos
- **Trazabilidad completa**: cada acción queda registrada con autor y timestamp
- **Firestore Rules**: reglas de seguridad a nivel de base de datos
- **Auditoría**: logs de todas las acciones sensibles

---

**Última actualización**: 3 de diciembre de 2025  
**Responsable**: Equipo ReparteJusto
