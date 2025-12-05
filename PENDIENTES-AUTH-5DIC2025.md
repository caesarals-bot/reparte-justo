# Pendientes de Autenticación - 5 de Diciembre 2025

> **Última actualización**: 5 diciembre 2025, 12:15 AM  
> **Estado**: Sistema de autenticación base completado, pendientes avanzados

---

## ✅ Lo que YA ESTÁ Implementado

### Sistema de Roles Completo
- ✅ Tipos `SiteRole` y `RestaurantRole` definidos
- ✅ Hook `usePermissions` funcional
- ✅ Componente `ProtectedRoute` creado
- ✅ Sistema de invitaciones completo

### Autenticación Base
- ✅ `LoginPage` con redirección inteligente
- ✅ `RegisterPage` con creación automática de restaurante
- ✅ `AuthContext` con consulta de roles desde Firestore
- ✅ Email verification (`sendEmailVerification`)
- ✅ Validación de contraseña fuerte (8 chars, mayúscula, número)

### Navegación
- ✅ NavBar con permisos (oculta Admin según roles)
- ✅ NavBar oculta Ajustes si setup completado
- ✅ Redirección correcta según tipo de usuario:
  - Admin → `/admin/overview`
  - Usuario normal → `/dashboard`
  - Sin roles → `/pending`

### Sistema de Invitaciones
- ✅ `InviteUserModal` para invitar por email
- ✅ `AcceptInvitationPage` para aceptar/rechazar
- ✅ Tipos `InvitationDocument` definidos
- ✅ Flujo completo de invitaciones

---

## 🔴 Pendientes Prioritarios (Para Mañana)

### 1. **Aplicar ProtectedRoute a Rutas Existentes** (20 min) 🔒

**Archivos**: `src/router/AppRouter.tsx`

**Rutas a proteger:**
```typescript
// Cierre Diario - Solo closure_editor
<Route path="/cierre" element={
  <ProtectedRoute requireRestaurantRole={["closure_editor"]}>
    <CierreDiarioPage />
  </ProtectedRoute>
} />

// Dashboard - closure_editor o liquidator
<Route path="/dashboard" element={
  <ProtectedRoute requireRestaurantRole={["closure_editor", "liquidator"]}>
    <DashboardPage />
  </ProtectedRoute>
} />

// Liquidación - Solo liquidator o closure_editor
<Route path="/dashboard/liquidacion" element={
  <ProtectedRoute requireRestaurantRole={["liquidator", "closure_editor"]}>
    <LiquidacionPage />
  </ProtectedRoute>
} />

// Staff Management - Solo closure_editor
<Route path="/staff" element={
  <ProtectedRoute requireRestaurantRole={["closure_editor"]}>
    <StaffManagementPage />
  </ProtectedRoute>
} />

// Setup - Cualquier usuario autenticado
<Route path="/setup" element={
  <ProtectedRoute>
    <InitialSetupPage />
  </ProtectedRoute>
} />

// Admin Panel - Solo site admins
<Route path="/admin/*" element={
  <ProtectedRoute requireSiteRole={["super_admin", "admin", "support", "viewer"]}>
    <AdminLayout />
  </ProtectedRoute>
} />
```

**Ejemplo:**
```typescript
// AppRouter.tsx (actual)
{
    path: "/cierre",
    element: <CierreDiarioPage />,  // ❌ SIN PROTECCIÓN
},

// AppRouter.tsx (correcto)
{
    path: "/cierre",
    element: (
        <ProtectedRoute 
            requireRestaurantRole={["closure_editor"]}
            restaurantId={currentRestaurantId}  // Obtener del contexto
        >
            <CierreDiarioPage />
        </ProtectedRoute>
    ),
},
```

**Desafío**: Necesitamos obtener `restaurantId` para pasar a `ProtectedRoute`. Opciones:
1. Agregar `currentRestaurant` al `AuthContext`
2. Leer `primaryRestaurant` de Firestore en cada ruta
3. Crear un `RestaurantProvider` wrapper

---

### 2. **Firestore Security Rules** (30 min) 🛡️

**Archivos**: `firestore.rules` (crear en raíz)

**Rules necesarias:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: Verificar si usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper: Obtener documento del usuario
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Helper: Verificar si tiene site role
    function hasSiteRole(role) {
      return isAuthenticated() && 
             role in getUserData().siteRoles;
    }
    
    // Helper: Verificar si tiene restaurant role
    function hasRestaurantRole(restaurantId, role) {
      return isAuthenticated() && 
             getUserData().restaurantRoles[restaurantId] != null &&
             role in getUserData().restaurantRoles[restaurantId];
    }
    
    // ═══════════════════════════════════════════════════════════
    // COLECCIÓN: /users
    // ═══════════════════════════════════════════════════════════
    match /users/{userId} {
      // Leer: Solo el propio usuario o admins
      allow read: if request.auth.uid == userId || 
                     hasSiteRole('super_admin') || 
                     hasSiteRole('admin');
      
      // Escribir: Solo el propio usuario (campos limitados) o admins
      allow update: if (request.auth.uid == userId && 
                       !request.resource.data.diff(resource.data).affectedKeys()
                         .hasAny(['siteRoles', 'restaurantRoles'])) ||
                       hasSiteRole('super_admin');
      
      // Crear: Solo durante registro (Cloud Function)
      allow create: if false;  // Solo via Cloud Function
    }
    
    // ═══════════════════════════════════════════════════════════
    // COLECCIÓN: /restaurants
    // ═══════════════════════════════════════════════════════════
    match /restaurants/{restaurantId} {
      // Leer: Solo miembros del restaurante o admins
      allow read: if hasRestaurantRole(restaurantId, 'closure_editor') ||
                     hasRestaurantRole(restaurantId, 'liquidator') ||
                     hasRestaurantRole(restaurantId, 'owner') ||
                     hasRestaurantRole(restaurantId, 'restaurant_viewer') ||
                     hasSiteRole('super_admin') ||
                     hasSiteRole('admin');
      
      // Escribir configuración: Solo closure_editor o admins
      allow update: if hasRestaurantRole(restaurantId, 'closure_editor') ||
                       hasSiteRole('super_admin');
      
      // Crear: Durante registro (permitir al usuario que crea)
      allow create: if isAuthenticated() && 
                       request.resource.data.ownerId == request.auth.uid;
    }
    
    // ═══════════════════════════════════════════════════════════
    // COLECCIÓN: /registros_diarios (cierres)
    // ═══════════════════════════════════════════════════════════
    match /registros_diarios/{closureId} {
      // Leer: Miembros del restaurante
      allow read: if hasRestaurantRole(resource.data.restaurantId, 'closure_editor') ||
                     hasRestaurantRole(resource.data.restaurantId, 'liquidator') ||
                     hasRestaurantRole(resource.data.restaurantId, 'restaurant_viewer') ||
                     hasSiteRole('admin');
      
      // Crear/Actualizar: Solo closure_editor
      allow create, update: if hasRestaurantRole(request.resource.data.restaurantId, 'closure_editor');
      
      // Eliminar: Solo closure_editor o super_admin
      allow delete: if hasRestaurantRole(resource.data.restaurantId, 'closure_editor') ||
                       hasSiteRole('super_admin');
    }
    
    // ═══════════════════════════════════════════════════════════
    // COLECCIÓN: /liquidaciones
    // ═══════════════════════════════════════════════════════════
    match /liquidaciones/{liquidacionId} {
      // Leer: Miembros del restaurante
      allow read: if hasRestaurantRole(resource.data.restaurantId, 'closure_editor') ||
                     hasRestaurantRole(resource.data.restaurantId, 'liquidator') ||
                     hasRestaurantRole(resource.data.restaurantId, 'restaurant_viewer') ||
                     hasSiteRole('admin');
      
      // Crear: liquidator o closure_editor
      allow create: if hasRestaurantRole(request.resource.data.restaurantId, 'liquidator') ||
                       hasRestaurantRole(request.resource.data.restaurantId, 'closure_editor');
      
      // Actualizar: Solo si es draft o no está pagada
      allow update: if (hasRestaurantRole(resource.data.restaurantId, 'liquidator') ||
                        hasRestaurantRole(resource.data.restaurantId, 'closure_editor')) &&
                       (resource.data.status == 'draft' || resource.data.status == 'pending');
      
      // Eliminar: Solo super_admin
      allow delete: if hasSiteRole('super_admin');
    }
    
    // ═══════════════════════════════════════════════════════════
    // COLECCIÓN: /invitations
    // ═══════════════════════════════════════════════════════════
    match /invitations/{invitationId} {
      // Leer: El que invitó o el invitado
      allow read: if isAuthenticated() && 
                     (resource.data.invitedBy.uid == request.auth.uid ||
                      resource.data.invitedEmail == request.auth.token.email);
      
      // Crear: Solo closure_editor del restaurante
      allow create: if isAuthenticated() &&
                       hasRestaurantRole(request.resource.data.restaurantId, 'closure_editor') &&
                       request.resource.data.invitedBy.uid == request.auth.uid;
      
      // Actualizar: Solo el invitado puede aceptar/rechazar
      allow update: if isAuthenticated() &&
                       resource.data.invitedEmail == request.auth.token.email &&
                       request.resource.data.status in ['accepted', 'rejected'];
    }
  }
}
```

**Deployment:**
```bash
firebase deploy --only firestore:rules
```

---

### 3. **Reset Password Page** (20 min) 📧

**Archivo a crear**: `src/auth/ResetPasswordPage.tsx`

```typescript
import { useState, type FormEvent } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/firebase/config"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const ResetPasswordPage = () => {
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        
        if (!email || !email.includes("@")) {
            setError("Ingresa un correo válido")
            return
        }

        setIsSubmitting(true)
        setError(null)
        setMessage(null)

        try {
            await sendPasswordResetEmail(auth, email)
            setMessage("✓ Correo enviado. Revisa tu bandeja de entrada.")
            setEmail("")
        } catch (err: any) {
            if (err.code === "auth/user-not-found") {
                setError("No existe una cuenta con este correo")
            } else {
                setError("No se pudo enviar el correo. Intenta nuevamente.")
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-10">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Recuperar Contraseña</CardTitle>
                    <CardDescription>
                        Ingresa tu correo y te enviaremos un link para restablecer tu contraseña.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-md border px-4 py-2"
                                placeholder="tu@correo.com"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        {message && (
                            <p className="text-sm text-green-600">{message}</p>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Enviando..." : "Enviar correo"}
                        </Button>

                        <div className="text-center text-sm">
                            <Link to="/auth/login" className="text-primary hover:underline">
                                ← Volver a iniciar sesión
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}

export default ResetPasswordPage
```

**Agregar ruta**:
```typescript
// AppRouter.tsx
{
    path: "/auth/reset-password",
    element: <ResetPasswordPage />,
},
```

**Agregar link en LoginPage**:
```typescript
// LoginPage.tsx - después del botón "Ingresar"
<Link 
    to="/auth/reset-password" 
    className="text-sm text-primary hover:underline"
>
    ¿Olvidaste tu contraseña?
</Link>
```

---

### 4. **Email Verification Obligatoria** (15 min) ✉️

**Objetivo**: Bloquear acciones sensibles si el usuario no ha verificado su email.

**Opción 1: Banner de Advertencia** (Más suave)

```typescript
// src/components/EmailVerificationBanner.tsx
import { useState } from "react"
import { sendEmailVerification } from "firebase/auth"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { X, Mail } from "lucide-react"

export const EmailVerificationBanner = () => {
    const { user } = useAuth()
    const [isSending, setIsSending] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    if (!user || user.emailVerified || isDismissed) return null

    const handleResendEmail = async () => {
        if (!user) return
        setIsSending(true)
        try {
            await sendEmailVerification(user)
            alert("✓ Correo enviado nuevamente")
        } catch (error) {
            console.error("Error sending email:", error)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-amber-500" />
                    <p className="text-sm">
                        <strong>Verifica tu email:</strong> Revisa tu correo {user.email} y haz clic en el enlace.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResendEmail}
                        disabled={isSending}
                    >
                        {isSending ? "Enviando..." : "Reenviar"}
                    </Button>
                    <button
                        onClick={() => setIsDismissed(true)}
                        className="p-1 hover:bg-white/10 rounded"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
```

**Usar en App.tsx**:
```typescript
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner"

function App() {
    return (
        <>
            <EmailVerificationBanner />
            <RouterProvider router={AppRouter} />
        </>
    )
}
```

**Opción 2: Bloqueo Completo** (Más estricto)

```typescript
// En CierreDiarioPage, LiquidacionPage, etc.
const { user } = useAuth()

useEffect(() => {
    if (user && !user.emailVerified) {
        navigate("/verify-email", { replace: true })
    }
}, [user, navigate])
```

---

### 5. **Cloud Function: onUserCreate** (20 min) ⚡

**Archivo**: `functions/src/triggers/onUserCreate.ts` (crear)

```typescript
import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName } = user

    try {
        // Crear documento en /users si no existe
        const userDocRef = admin.firestore().collection("users").doc(uid)
        const userDoc = await userDocRef.get()

        if (!userDoc.exists) {
            await userDocRef.set({
                uid,
                email: email || null,
                displayName: displayName || null,
                
                siteRoles: [],
                restaurantRoles: {},
                
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: null,
                lastActivity: null,
                
                emailVerified: user.emailVerified,
                isActive: true,
                loginAttempts: 0,
                lockedUntil: null,
            })

            functions.logger.info(`User document created for ${uid}`)
        }
    } catch (error) {
        functions.logger.error(`Error creating user document for ${uid}:`, error)
        throw error
    }
})
```

**Deployment:**
```bash
firebase deploy --only functions:onUserCreate
```

---

## 🟡 Pendientes Medios (Siguiente Semana)

### 6. **Testing Automatizado** (2-3 horas)

**Tests Unitarios (Vitest)**:
```typescript
// src/__tests__/auth/LoginPage.test.tsx
describe("LoginPage", () => {
    it("should render login form", () => {
        // ...
    })
    
    it("should show error on invalid credentials", () => {
        // ...
    })
    
    it("should redirect admin to /admin/overview", () => {
        // ...
    })
    
    it("should redirect normal user to /dashboard", () => {
        // ...
    })
})

// src/__tests__/hooks/usePermissions.test.tsx
describe("usePermissions", () => {
    it("should return true for hasSiteRole with admin", () => {
        // ...
    })
    
    it("should return false for hasRestaurantRole without role", () => {
        // ...
    })
})
```

**Tests E2E (Playwright)**:
```typescript
// tests/e2e/auth.spec.ts
test("complete registration flow", async ({ page }) => {
    await page.goto("/auth/register")
    
    await page.fill("#name", "Test User")
    await page.fill("#email", "test@example.com")
    await page.fill("#password", "Test1234")
    await page.fill("#confirmPassword", "Test1234")
    await page.fill("#restaurantName", "Test Restaurant")
    await page.selectOption("#accountType", "closure_editor")
    
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL("/dashboard")
})
```

---

### 7. **Rate Limiting** (1 hora)

**Implementar con Cloud Functions**:
```typescript
// functions/src/middleware/rateLimit.ts
import * as admin from "firebase-admin"

export const checkRateLimit = async (
    userId: string,
    action: string,
    maxAttempts: number,
    windowMs: number
): Promise<boolean> => {
    const now = Date.now()
    const windowStart = now - windowMs
    
    const rateLimitRef = admin.firestore()
        .collection("rate_limits")
        .doc(`${userId}_${action}`)
    
    const doc = await rateLimitRef.get()
    
    if (!doc.exists) {
        await rateLimitRef.set({
            attempts: 1,
            firstAttempt: now,
            lastAttempt: now,
        })
        return true
    }
    
    const data = doc.data()!
    
    // Si la ventana expiró, reiniciar
    if (data.firstAttempt < windowStart) {
        await rateLimitRef.set({
            attempts: 1,
            firstAttempt: now,
            lastAttempt: now,
        })
        return true
    }
    
    // Verificar límite
    if (data.attempts >= maxAttempts) {
        return false
    }
    
    // Incrementar
    await rateLimitRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
        lastAttempt: now,
    })
    
    return true
}
```

---

### 8. **MFA (Multi-Factor Authentication)** (2 horas)

**Implementar con Firebase**:
```typescript
// src/auth/MFASetupPage.tsx
import { PhoneMultiFactorGenerator, multiFactor } from "firebase/auth"

const enableMFA = async (phoneNumber: string) => {
    const user = auth.currentUser
    if (!user) return
    
    const session = await multiFactor(user).getSession()
    const phoneInfoOptions = {
        phoneNumber,
        session,
    }
    
    const phoneAuthProvider = new PhoneAuthProvider(auth)
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        recaptchaVerifier
    )
    
    // Usuario ingresa código SMS
    const verificationCode = prompt("Ingresa el código SMS")
    const cred = PhoneAuthProvider.credential(verificationId, verificationCode)
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred)
    
    await multiFactor(user).enroll(multiFactorAssertion, "Phone Number")
}
```

---

## 🟢 Pendientes Opcionales (Futuro)

### 9. **OAuth Providers** (Google, Microsoft)
```typescript
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"

const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
}
```

### 10. **Session Management Avanzado**
- Timeout por inactividad
- Límite de dispositivos concurrentes
- Logs de auditoría en `/users/{uid}/sessions`

### 11. **Webhooks de Auditoría**
- Notificar a Slack/Discord cuando:
  - Usuario admin se crea
  - Cambios en roles
  - Múltiples intentos fallidos de login

---

## 📊 Estado Actual del Auth

| Componente | Estado | Prioridad | Tiempo Est. |
|------------|--------|-----------|-------------|
| LoginPage | ✅ Completo | - | - |
| RegisterPage | ✅ Completo | - | - |
| AuthContext | ✅ Completo | - | - |
| Sistema de Roles | ✅ Completo | - | - |
| Invitaciones | ✅ Completo | - | - |
| ProtectedRoute | ⚠️ Crear | 🔴 Alta | 20 min |
| Firestore Rules | ⏳ Pendiente | 🔴 Alta | 30 min |
| Reset Password | ⏳ Pendiente | 🔴 Alta | 20 min |
| Email Verification | ⏳ Pendiente | 🔴 Alta | 15 min |
| Cloud Function | ⏳ Pendiente | 🔴 Alta | 20 min |
| Testing | ⏳ Pendiente | 🟡 Media | 2-3 hrs |
| Rate Limiting | ⏳ Pendiente | 🟡 Media | 1 hr |
| MFA | ⏳ Pendiente | 🟢 Baja | 2 hrs |

**Total tiempo estimado para prioridades altas**: ~2 horas

---

## 🎯 Plan para Mañana (5 diciembre 2025)

### Sesión Mañana (9:00 AM - 11:00 AM)
1. ✅ Aplicar ProtectedRoute a todas las rutas (20 min)
2. ✅ Implementar Firestore Security Rules (30 min)
3. ✅ Crear ResetPasswordPage (20 min)
4. ✅ Agregar EmailVerificationBanner (15 min)
5. ✅ Cloud Function onUserCreate (20 min)
6. ✅ Testing básico (30 min)

**Total**: ~2 horas 15 minutos

### Sesión Tarde (3:00 PM - 5:00 PM)
7. ✅ Mejora #3: Total cocina en PDF (25 min)
8. ✅ Mejora #4: Días no pagados (45 min)
9. ✅ Documentar todo (30 min)
10. ✅ Deploy a producción (20 min)

**Total**: ~2 horas

---

**Última actualización**: 5 de diciembre 2025, 12:20 AM
