# Plan de Gestión de Sesiones y Seguridad Avanzada

> **Fecha de creación**: 4 de diciembre de 2025  
> **Objetivo**: Implementar gestión avanzada de sesiones con timeout por inactividad, control de sesiones múltiples, límite de dispositivos concurrentes y CAPTCHA.

---

## Índice
1. [Timeout de Sesión por Inactividad](#timeout-de-sesión-por-inactividad)
2. [Gestión de Sesiones Múltiples](#gestión-de-sesiones-múltiples)
3. [Límite de Dispositivos Concurrentes](#límite-de-dispositivos-concurrentes)
4. [Integración de CAPTCHA](#integración-de-captcha)
5. [Arquitectura de Implementación](#arquitectura-de-implementación)
6. [Casos de Uso y Flujos](#casos-de-uso-y-flujos)
7. [Modelo de Datos](#modelo-de-datos)

---

## Timeout de Sesión por Inactividad

### Objetivo
Cerrar sesión automáticamente después de un período de inactividad para proteger cuentas en dispositivos compartidos.

### Configuración propuesta

| Tipo de usuario | Timeout de inactividad | Justificación |
|----------------|------------------------|---------------|
| **closure_editor / liquidator** | **20 minutos** | Manejan datos financieros sensibles, posible uso en tablets compartidas |
| **owner** | **30 minutos** | Solo lectura, menor riesgo |
| **super_admin / admin** | **15 minutos** | Acceso crítico a datos de múltiples restaurantes |
| **viewer** | **45 minutos** | Solo lectura, bajo riesgo |

### Implementación técnica

#### 1. Hook `useSessionTimeout`

```typescript
// src/hooks/useSessionTimeout.ts
import { useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router"

type SessionTimeoutConfig = {
  timeoutMinutes: number
  warningMinutes?: number  // Mostrar advertencia antes de cerrar
  onTimeout?: () => void
}

export const useSessionTimeout = (config: SessionTimeoutConfig) => {
  const { signOutUser, userRoles } = useAuth()
  const navigate = useNavigate()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Limpiar timers existentes
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)

    // Timer de advertencia (2 minutos antes del timeout)
    if (config.warningMinutes) {
      const warningMs = (config.timeoutMinutes - config.warningMinutes) * 60 * 1000
      warningTimeoutRef.current = setTimeout(() => {
        // Mostrar diálogo de advertencia
        const userWantsToStay = window.confirm(
          `Tu sesión expirará en ${config.warningMinutes} minutos por inactividad. ¿Deseas continuar?`
        )
        if (userWantsToStay) {
          resetTimer()
        }
      }, warningMs)
    }

    // Timer de logout automático
    const timeoutMs = config.timeoutMinutes * 60 * 1000
    timeoutRef.current = setTimeout(async () => {
      await signOutUser()
      config.onTimeout?.()
      navigate("/auth/login?reason=timeout", { replace: true })
    }, timeoutMs)
  }, [config, signOutUser, navigate])

  useEffect(() => {
    // Eventos que indican actividad del usuario
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"]

    const handleActivity = () => {
      resetTimer()
    }

    // Registrar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Iniciar timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    }
  }, [resetTimer])

  return { lastActivity: lastActivityRef.current }
}
```

#### 2. Integrar en Layout principal

```typescript
// src/layout/DashboardLayout.tsx
import { useSessionTimeout } from "@/hooks/useSessionTimeout"
import { useAuth } from "@/context/AuthContext"

export const DashboardLayout = () => {
  const { userRoles } = useAuth()
  
  // Determinar timeout según rol más restrictivo
  const timeoutMinutes = useMemo(() => {
    if (userRoles?.siteRoles?.includes("super_admin")) return 15
    if (userRoles?.restaurantRoles && 
        Object.values(userRoles.restaurantRoles).some(roles => 
          roles.includes("closure_editor") || roles.includes("liquidator")
        )) {
      return 20
    }
    return 30  // owner / viewer
  }, [userRoles])

  useSessionTimeout({
    timeoutMinutes,
    warningMinutes: 2,
    onTimeout: () => {
      // Log de auditoría
      console.log("Sesión cerrada por inactividad")
    }
  })

  return (
    // Layout JSX...
  )
}
```

#### 3. Registrar último acceso en Firestore

```typescript
// src/context/AuthContext.tsx
useEffect(() => {
  if (user?.uid) {
    // Actualizar lastActivity cada 5 minutos
    const interval = setInterval(async () => {
      await updateDoc(doc(db, "users", user.uid), {
        lastActivity: serverTimestamp()
      })
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }
}, [user])
```

---

## Gestión de Sesiones Múltiples

### Objetivo
Detectar cuando un usuario inicia sesión en otro dispositivo y ofrecer opciones de manejo.

### Estrategias propuestas

#### Opción 1: **Notificación sin bloqueo** (Recomendada para ReparteJusto)
- El usuario puede estar logueado en múltiples dispositivos
- Se notifica sobre nuevas sesiones pero no se fuerza cierre
- Útil para garzones que usan tablet del restaurante + celular personal

#### Opción 2: **Límite flexible**
- Máximo 3 dispositivos activos simultáneamente
- Al iniciar sesión en un 4to dispositivo, se muestra lista de sesiones activas
- Usuario elige cuál cerrar

#### Opción 3: **Sesión única estricta** (Solo para super_admin)
- Solo 1 sesión activa por usuario
- Al iniciar sesión en otro dispositivo, se cierra la sesión anterior automáticamente
- Seguridad máxima para administradores

### Implementación técnica

#### 1. Modelo de datos de sesión

```typescript
// Firestore: /users/{uid}/sessions/{sessionId}
type SessionDocument = {
  sessionId: string           // Generado con crypto.randomUUID()
  userId: string
  deviceInfo: {
    userAgent: string
    platform: string          // "Windows", "Android", "iOS", etc.
    browser: string           // "Chrome", "Firefox", etc.
    ip?: string               // Opcional, desde Cloud Function
  }
  location?: {
    country?: string
    city?: string
  }
  createdAt: Timestamp
  lastActivity: Timestamp
  expiresAt: Timestamp        // createdAt + 7 días (renovable)
  status: "active" | "expired" | "revoked"
}
```

#### 2. Generar sessionId al hacer login

```typescript
// src/auth/LoginPage.tsx
const handleLogin = async () => {
  try {
    // 1. Login con Firebase Auth
    const credentials = await signInWithEmailAndPassword(auth, email, password)
    
    // 2. Generar sessionId único
    const sessionId = crypto.randomUUID()
    
    // 3. Guardar en localStorage
    localStorage.setItem("rj_session_id", sessionId)
    
    // 4. Registrar sesión en Firestore
    await setDoc(doc(db, `users/${credentials.user.uid}/sessions/${sessionId}`), {
      sessionId,
      userId: credentials.user.uid,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        browser: getBrowserName(),  // Helper function
      },
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 días
      status: "active"
    })
    
    // 5. Verificar límite de sesiones activas
    const sessionsSnapshot = await getDocs(
      query(
        collection(db, `users/${credentials.user.uid}/sessions`),
        where("status", "==", "active")
      )
    )
    
    const activeSessions = sessionsSnapshot.docs.filter(
      doc => doc.id !== sessionId
    )
    
    // Si supera el límite, mostrar modal de gestión
    if (activeSessions.length >= 3) {  // Límite: 3 sesiones
      setShowSessionsModal(true)
      setActiveSessions(activeSessions)
    } else {
      navigate("/dashboard")
    }
    
  } catch (error) {
    handleError(error)
  }
}
```

#### 3. Componente de gestión de sesiones

```typescript
// src/components/SessionsManagerModal.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Smartphone, Monitor, Laptop } from "lucide-react"

type Props = {
  sessions: SessionDocument[]
  currentSessionId: string
  onRevokeSession: (sessionId: string) => Promise<void>
  onClose: () => void
}

export const SessionsManagerModal = ({ sessions, currentSessionId, onRevokeSession, onClose }: Props) => {
  const getDeviceIcon = (platform: string) => {
    if (platform.includes("Android") || platform.includes("iOS")) return Smartphone
    if (platform.includes("Mac")) return Laptop
    return Monitor
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <h2 className="text-2xl font-bold">Sesiones Activas</h2>
        <p className="text-muted-foreground">
          Has alcanzado el límite de dispositivos. Cierra una sesión para continuar.
        </p>
        
        <div className="space-y-3 mt-4">
          {sessions.map(session => {
            const DeviceIcon = getDeviceIcon(session.deviceInfo.platform)
            const isCurrent = session.sessionId === currentSessionId
            
            return (
              <div 
                key={session.sessionId}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {session.deviceInfo.browser} en {session.deviceInfo.platform}
                      {isCurrent && <span className="ml-2 text-xs text-green-600">(Actual)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Última actividad: {formatDistanceToNow(session.lastActivity.toDate(), { 
                        addSuffix: true,
                        locale: es 
                      })}
                    </p>
                  </div>
                </div>
                
                {!isCurrent && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onRevokeSession(session.sessionId)}
                  >
                    Cerrar sesión
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

#### 4. Validar sesión activa en cada carga

```typescript
// src/context/AuthContext.tsx
useEffect(() => {
  if (!user) return

  const sessionId = localStorage.getItem("rj_session_id")
  if (!sessionId) {
    // No hay sessionId local, cerrar sesión
    signOutUser()
    return
  }

  // Verificar que la sesión sigue activa en Firestore
  const checkSession = async () => {
    const sessionDoc = await getDoc(doc(db, `users/${user.uid}/sessions/${sessionId}`))
    
    if (!sessionDoc.exists() || sessionDoc.data()?.status !== "active") {
      // Sesión revocada o expirada
      await signOutUser()
      navigate("/auth/login?reason=session_revoked")
    }
  }

  // Verificar al montar y cada 2 minutos
  checkSession()
  const interval = setInterval(checkSession, 2 * 60 * 1000)

  return () => clearInterval(interval)
}, [user])
```

#### 5. Revocar sesión remota

```typescript
// src/hooks/useSessions.ts
export const useSessions = () => {
  const { user } = useAuth()

  const revokeSession = async (sessionId: string) => {
    if (!user) return

    await updateDoc(doc(db, `users/${user.uid}/sessions/${sessionId}`), {
      status: "revoked",
      revokedAt: serverTimestamp()
    })
  }

  const listActiveSessions = async () => {
    if (!user) return []

    const snapshot = await getDocs(
      query(
        collection(db, `users/${user.uid}/sessions`),
        where("status", "==", "active"),
        orderBy("lastActivity", "desc")
      )
    )

    return snapshot.docs.map(doc => doc.data() as SessionDocument)
  }

  return { revokeSession, listActiveSessions }
}
```

---

## Límite de Dispositivos Concurrentes

### Política recomendada

| Tipo de usuario | Límite de dispositivos | Razón |
|----------------|------------------------|-------|
| **closure_editor / liquidator** | **3 dispositivos** | Tablet del restaurante + celular + laptop personal |
| **owner** | **5 dispositivos** | Puede revisar desde múltiples ubicaciones |
| **super_admin** | **2 dispositivos** | Máxima seguridad, uso controlado |
| **viewer** | **3 dispositivos** | Balance entre conveniencia y seguridad |

### Implementación

```typescript
// src/utils/sessionLimits.ts
export const getSessionLimit = (userRoles: UserRoles | null): number => {
  if (userRoles?.siteRoles?.includes("super_admin")) return 2
  
  if (userRoles?.restaurantRoles) {
    const allRoles = Object.values(userRoles.restaurantRoles).flat()
    if (allRoles.includes("closure_editor") || allRoles.includes("liquidator")) {
      return 3
    }
    if (allRoles.includes("owner")) {
      return 5
    }
  }
  
  return 3  // Default
}

// Uso al hacer login
const sessionLimit = getSessionLimit(userRoles)
if (activeSessions.length >= sessionLimit) {
  setShowSessionsModal(true)
}
```

---

## Integración de CAPTCHA

### Objetivo
Prevenir ataques automatizados (bots) en login y registro.

### Proveedor recomendado: **hCaptcha**

**¿Por qué hCaptcha y no Google reCAPTCHA?**
- ✅ Cumplimiento con GDPR y privacidad
- ✅ No requiere cuenta de Google
- ✅ Plan gratuito generoso (1M verificaciones/mes)
- ✅ Menos invasivo que reCAPTCHA v2
- ✅ Soporte para modo invisible

**Alternativa**: Cloudflare Turnstile (más moderno, sin CAPTCHAs visuales)

### Implementación con hCaptcha

#### 1. Instalación

```bash
npm install @hcaptcha/react-hcaptcha
```

#### 2. Variables de entorno

```env
# .env
VITE_HCAPTCHA_SITE_KEY=your_site_key_here
```

#### 3. Componente wrapper

```typescript
// src/components/HCaptcha.tsx
import HCaptcha from "@hcaptcha/react-hcaptcha"
import { forwardRef } from "react"

type Props = {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

export const CaptchaVerification = forwardRef<HCaptcha, Props>(
  ({ onVerify, onError, onExpire }, ref) => {
    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY

    if (!siteKey) {
      console.error("VITE_HCAPTCHA_SITE_KEY no está configurada")
      return null
    }

    return (
      <HCaptcha
        ref={ref}
        sitekey={siteKey}
        onVerify={onVerify}
        onError={onError}
        onExpire={onExpire}
        theme="dark"  // Consistente con Dark Serenity
        size="normal"
      />
    )
  }
)
```

#### 4. Integrar en LoginPage

```typescript
// src/auth/LoginPage.tsx
import { CaptchaVerification } from "@/components/HCaptcha"
import { useRef, useState } from "react"
import HCaptcha from "@hcaptcha/react-hcaptcha"

export const LoginPage = () => {
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()

    // Validaciones básicas...

    // Si tiene 3+ intentos fallidos, requerir CAPTCHA
    if (loginAttempts >= 3 && !captchaToken) {
      setShowCaptcha(true)
      return
    }

    try {
      // Login con Firebase
      await signInWithEmailAndPassword(auth, email, password)
      
      // Si llegó aquí, login exitoso → resetear intentos
      setLoginAttempts(0)
      setShowCaptcha(false)
      
      navigate("/dashboard")
      
    } catch (error: any) {
      // Incrementar intentos fallidos
      setLoginAttempts(prev => prev + 1)
      
      // Mostrar CAPTCHA después de 3 intentos
      if (loginAttempts + 1 >= 3) {
        setShowCaptcha(true)
      }
      
      // Reset CAPTCHA token
      setCaptchaToken(null)
      captchaRef.current?.resetCaptcha()
      
      handleError(error)
    }
  }

  return (
    <Card>
      <form onSubmit={handleLogin}>
        {/* Inputs de email y password */}
        
        {showCaptcha && (
          <div className="mt-4">
            <CaptchaVerification
              ref={captchaRef}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
        )}
        
        <Button 
          type="submit" 
          disabled={showCaptcha && !captchaToken}
        >
          Iniciar Sesión
        </Button>
      </form>
    </Card>
  )
}
```

#### 5. Integrar en RegisterPage

```typescript
// src/auth/RegisterPage.tsx
export const RegisterPage = () => {
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()

    // Validaciones...

    if (!captchaToken) {
      setErrors({ ...errors, captcha: "Por favor completa la verificación" })
      return
    }

    try {
      // Crear usuario
      const credentials = await createUserWithEmailAndPassword(auth, email, password)
      
      // Crear documento en Firestore con el captchaToken (opcional, para auditoría)
      await setDoc(doc(db, "users", credentials.user.uid), {
        uid: credentials.user.uid,
        email,
        displayName: name,
        siteRoles: [],
        restaurantRoles: {},
        createdAt: serverTimestamp(),
        registrationCaptchaToken: captchaToken,  // Auditoría
        emailVerified: false
      })

      // Enviar email de verificación
      await sendEmailVerification(credentials.user)

      navigate("/pending")
      
    } catch (error) {
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      handleError(error)
    }
  }

  return (
    <Card>
      <form onSubmit={handleRegister}>
        {/* Inputs */}
        
        <div className="mt-4">
          <CaptchaVerification
            ref={captchaRef}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
        </div>
        
        <Button type="submit" disabled={!captchaToken}>
          Crear Cuenta
        </Button>
      </form>
    </Card>
  )
}
```

#### 6. Validar CAPTCHA en backend (opcional)

Si decides validar el token en Cloud Functions para mayor seguridad:

```typescript
// functions/src/utils/verifyCaptcha.ts
import fetch from "node-fetch"

export const verifyCaptcha = async (token: string): Promise<boolean> => {
  const secretKey = process.env.HCAPTCHA_SECRET_KEY

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `response=${token}&secret=${secretKey}`
  })

  const data = await response.json() as { success: boolean }
  return data.success
}

// Uso en guardarCierreDiario u otros endpoints críticos
export const guardarCierreDiario = functions.https.onRequest(async (req, res) => {
  const { captchaToken } = req.body

  if (captchaToken) {
    const isValid = await verifyCaptcha(captchaToken)
    if (!isValid) {
      res.status(400).json({ error: "CAPTCHA inválido" })
      return
    }
  }

  // Continuar con la lógica...
})
```

---

## Arquitectura de Implementación

### Diagrama de flujo completo

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO HACE LOGIN                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ ¿Tiene 3+ intentos   │
              │ fallidos previos?    │
              └──────┬───────────────┘
                     │
         ┌───────────┴───────────┐
         │ NO                    │ SÍ
         ▼                       ▼
  ┌─────────────┐       ┌──────────────────┐
  │ Login       │       │ Mostrar CAPTCHA  │
  │ normal      │       │ antes de login   │
  └──────┬──────┘       └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌─────────────────────┐
            │ signInWith...()     │
            └──────┬──────────────┘
                   │
         ┌─────────┴─────────┐
         │ ÉXITO            │ ERROR
         ▼                   ▼
┌────────────────────┐  ┌──────────────────┐
│ Generar sessionId  │  │ Incrementar      │
│ Guardar en         │  │ loginAttempts    │
│ localStorage       │  └──────────────────┘
└─────────┬──────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Crear doc en                     │
│ /users/{uid}/sessions/{sid}     │
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Contar sesiones activas          │
└─────────┬────────────────────────┘
          │
    ┌─────┴──────┐
    │ ≥ límite?  │
    └─────┬──────┘
          │
    ┌─────┴─────┐
    │ NO       │ SÍ
    ▼           ▼
┌────────┐  ┌──────────────────────┐
│ Redir. │  │ Mostrar modal        │
│ /dash  │  │ "Sesiones activas"   │
└────────┘  │ Usuario elige cuál   │
            │ cerrar               │
            └──────────────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Revocar sesión   │
            │ seleccionada     │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Redir. /dashboard│
            └──────────────────┘


┌─────────────────────────────────────────────────────────────┐
│          EN SESIÓN ACTIVA - BACKGROUND CHECKS                │
└─────────────────────────────────────────────────────────────┘

Cada 2 minutos:
  ├─► Verificar que sessionId sigue activo en Firestore
  └─► Si fue revocado → Logout automático

Cada 5 minutos:
  └─► Actualizar lastActivity en Firestore

En cada interacción del usuario (click, scroll, tecla):
  └─► Resetear timer de inactividad

Después de {timeoutMinutes} sin actividad:
  ├─► Mostrar advertencia (2 min antes)
  └─► Logout automático y redir. /auth/login?reason=timeout
```

---

## Casos de Uso y Flujos

### Caso 1: Usuario se loguea desde tablet del restaurante

**Contexto**: Garzón "María" usa tablet compartida en el restaurante.

**Flujo**:
1. María ingresa email y password
2. **Problema**: La tablet es compartida → alta probabilidad de que alguien más acceda si María olvida cerrar sesión
3. **Solución**: Timeout de inactividad de 20 minutos
4. Si María deja la tablet sin usar por 20 minutos, sesión se cierra automáticamente
5. Cuando María regresa, debe volver a autenticarse

**Implementación**:
```typescript
// En DashboardLayout para closure_editor
useSessionTimeout({
  timeoutMinutes: 20,
  warningMinutes: 2
})
```

---

### Caso 2: Usuario inicia sesión en celular mientras tiene sesión en laptop

**Contexto**: Propietario "Juan" revisa dashboard desde laptop en oficina, luego lo revisa desde celular al salir.

**Flujo**:
1. Juan ya tiene sesión activa en laptop (sessionId: `abc-123`)
2. Juan hace login desde celular → se crea nueva sesión (sessionId: `def-456`)
3. Sistema detecta 2 sesiones activas para Juan
4. Como Juan es `owner`, su límite es 5 dispositivos → **Ambas sesiones coexisten sin problema**
5. Juan puede usar ambas simultáneamente

**Implementación**:
```typescript
// Al hacer login, verificar límite
const sessionLimit = getSessionLimit(userRoles)  // owner → 5
if (activeSessions.length >= sessionLimit) {
  setShowSessionsModal(true)
} else {
  navigate("/dashboard")  // Continuar sin restricción
}
```

---

### Caso 3: Super admin intenta loguear desde 3er dispositivo

**Contexto**: Admin "Carlos" tiene sesiones en laptop personal y laptop de oficina. Intenta entrar desde tablet.

**Flujo**:
1. Carlos hace login desde tablet
2. Sistema detecta 2 sesiones activas (laptop personal + laptop oficina)
3. Límite de super_admin = 2 → **Se excede el límite**
4. Modal muestra lista de sesiones:
   ```
   - Chrome en Windows (Laptop personal)
     Última actividad: hace 3 horas
     [Cerrar sesión]
   
   - Firefox en Mac (Laptop oficina)
     Última actividad: hace 10 minutos
     [Cerrar sesión]
   ```
5. Carlos cierra la sesión de laptop personal (hace 3 horas sin usar)
6. Ahora puede continuar en tablet

**Implementación**:
```typescript
<SessionsManagerModal
  sessions={activeSessions}
  currentSessionId={newSessionId}
  onRevokeSession={async (sid) => {
    await updateDoc(doc(db, `users/${uid}/sessions/${sid}`), {
      status: "revoked"
    })
    navigate("/dashboard")
  }}
/>
```

---

### Caso 4: Intento de login con bot (sin CAPTCHA)

**Contexto**: Atacante intenta fuerza bruta con script automatizado.

**Flujo**:
1. Bot hace primer intento de login → Falla (password incorrecto)
2. Bot hace segundo intento → Falla
3. Bot hace tercer intento → Falla
4. **Sistema activa CAPTCHA** → Bot no puede resolverlo
5. Bot hace 4to intento sin CAPTCHA → **Rechazado** (se requiere CAPTCHA)
6. Ataque bloqueado efectivamente

**Además**: Firebase Auth tiene rate limiting nativo (10 intentos/hora por IP)

**Implementación**:
```typescript
const [loginAttempts, setLoginAttempts] = useState(0)
const [showCaptcha, setShowCaptcha] = useState(false)

if (loginAttempts >= 3 && !captchaToken) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Por seguridad, debes completar la verificación antes de continuar.
      </AlertDescription>
      <CaptchaVerification onVerify={setCaptchaToken} />
    </Alert>
  )
}
```

---

### Caso 5: Usuario revoca sesión remota desde panel

**Contexto**: María nota en su celular que hay una sesión activa en un dispositivo desconocido.

**Flujo**:
1. María va a "Mi cuenta" → "Sesiones activas"
2. Ve lista:
   ```
   - Chrome en Android (Mi celular) [ACTUAL]
   - Safari en iPad (Desconocido)  ← SOSPECHOSO
     Última actividad: hace 1 hora
     [Cerrar sesión]
   ```
3. María cierra la sesión del iPad
4. Si alguien estaba usando esa sesión, es deslogueado inmediatamente
5. María cambia su contraseña por precaución

**Implementación**:
```typescript
// Componente SessionsListPage
const { listActiveSessions, revokeSession } = useSessions()

const handleRevoke = async (sessionId: string) => {
  await revokeSession(sessionId)
  toast.success("Sesión cerrada exitosamente")
  // Refrescar lista
  setSessions(await listActiveSessions())
}
```

---

## Modelo de Datos

### Colección `/users/{uid}`

```typescript
type UserDocument = {
  uid: string
  email: string
  displayName: string
  
  // Roles
  siteRoles: SiteRole[]
  restaurantRoles: Record<string, RestaurantRole[]>
  
  // Timestamps
  createdAt: Timestamp
  lastLogin: Timestamp
  lastActivity: Timestamp  // ← NUEVO (para timeout)
  
  // Seguridad
  emailVerified: boolean
  loginAttempts: number  // ← NUEVO (resetear a 0 en login exitoso)
  lockedUntil: Timestamp | null  // ← NUEVO (bloqueo temporal)
  
  // Preferencias de seguridad (opcional)
  sessionSettings?: {
    maxDevices: number  // Override del límite por defecto
    notifyOnNewDevice: boolean  // Email al detectar nuevo dispositivo
  }
}
```

### Subcolección `/users/{uid}/sessions/{sessionId}`

```typescript
type SessionDocument = {
  sessionId: string
  userId: string
  
  deviceInfo: {
    userAgent: string
    platform: string
    browser: string
    ip?: string
  }
  
  location?: {
    country?: string
    city?: string
  }
  
  createdAt: Timestamp
  lastActivity: Timestamp
  expiresAt: Timestamp  // 7 días desde creación
  
  status: "active" | "expired" | "revoked"
  revokedAt?: Timestamp
  revokedBy?: "user" | "admin" | "system"  // Quién cerró la sesión
  revokedReason?: string
}
```

### Colección `/security_logs/{logId}` (Auditoría)

```typescript
type SecurityLog = {
  logId: string
  userId: string
  action: 
    | "login_success"
    | "login_failed"
    | "logout"
    | "session_revoked"
    | "session_expired"
    | "captcha_required"
    | "captcha_failed"
    | "account_locked"
  
  sessionId?: string
  deviceInfo?: DeviceInfo
  ip?: string
  timestamp: Timestamp
  
  metadata?: {
    reason?: string
    previousAttempts?: number
  }
}
```

---

## Resumen de Configuraciones

### Tabla de Timeouts

| Rol | Timeout | Warning | Límite dispositivos | CAPTCHA después de |
|-----|---------|---------|-------------------|-------------------|
| **super_admin** | 15 min | 2 min | 2 | 2 intentos |
| **closure_editor** | 20 min | 2 min | 3 | 3 intentos |
| **liquidator** | 20 min | 2 min | 3 | 3 intentos |
| **owner** | 30 min | 2 min | 5 | 3 intentos |
| **viewer** | 45 min | 2 min | 3 | 3 intentos |

### Eventos que resetean timeout
- Click del mouse
- Tecla presionada
- Scroll
- Touch (móviles)
- Focus en input

### Eventos que NO resetean timeout
- Movimiento del mouse sin click
- Reproducción de video/audio
- Timers internos de la app

---

## Checklist de Implementación

### Fase 1: Timeout de sesión (1-2 días)
- [ ] Crear hook `useSessionTimeout`
- [ ] Integrar en `DashboardLayout`
- [ ] Agregar campo `lastActivity` en `/users/{uid}`
- [ ] Testing manual con diferentes roles
- [ ] Agregar query param `?reason=timeout` en redirect

### Fase 2: Gestión de sesiones (2-3 días)
- [ ] Crear subcolección `/sessions` en Firestore
- [ ] Generar `sessionId` al hacer login
- [ ] Guardar en localStorage
- [ ] Validar sesión activa en `AuthContext`
- [ ] Crear hook `useSessions` con `listActiveSessions` y `revokeSession`
- [ ] Componente `SessionsManagerModal`
- [ ] Integrar límite de dispositivos en login

### Fase 3: CAPTCHA (1 día)
- [ ] Registrar cuenta en hCaptcha (o Cloudflare Turnstile)
- [ ] Instalar `@hcaptcha/react-hcaptcha`
- [ ] Crear componente `CaptchaVerification`
- [ ] Integrar en `LoginPage` (mostrar después de 3 intentos)
- [ ] Integrar en `RegisterPage` (mostrar siempre)
- [ ] Testing con intentos fallidos

### Fase 4: Panel de gestión (1 día)
- [ ] Crear página `/account/sessions`
- [ ] Listar sesiones activas con detalles
- [ ] Botón "Cerrar todas las demás sesiones"
- [ ] Indicador visual de sesión actual
- [ ] Toast de confirmación al revocar

### Fase 5: Auditoría (1 día)
- [ ] Crear colección `/security_logs`
- [ ] Registrar login exitoso/fallido
- [ ] Registrar sesiones revocadas
- [ ] Registrar timeouts
- [ ] Dashboard admin con métricas de seguridad

### Fase 6: Testing (1 día)
- [ ] Tests unitarios de `useSessionTimeout`
- [ ] Tests unitarios de `useSessions`
- [ ] Tests E2E de login con CAPTCHA
- [ ] Tests E2E de revocación de sesión
- [ ] Tests de timeout automático

---

## Notas Finales

### Mejoras futuras
1. **Notificaciones por email** al detectar login desde nuevo dispositivo
2. **Geolocalización** de sesiones con IP lookup (ipapi.co o similar)
3. **Biometría** en móviles (Touch ID, Face ID) con WebAuthn
4. **Tokens de refresh** personalizados (Firebase maneja esto automáticamente)
5. **Dashboard de seguridad** en `/admin` con intentos fallidos por IP

### Consideraciones de UX
- No ser demasiado restrictivo con timeouts → usuarios reales se frustran
- Permitir "Confiar en este dispositivo" para extender timeout a 7 días
- Mostrar advertencia clara antes de cerrar sesión por inactividad
- No cerrar sesión si hay un formulario sin guardar

### Cumplimiento legal
- GDPR: Informar sobre recolección de IP y userAgent en Privacy Policy
- Chile: No hay regulación específica sobre timeouts de sesión
- Auditoría: Logs de seguridad deben ser inmutables (Firestore no permite editar logs)

---

**Última actualización**: 4 de diciembre de 2025  
**Responsable**: Equipo ReparteJusto
