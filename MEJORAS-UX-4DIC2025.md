# Mejoras de UX Implementadas - 4 de Diciembre 2025

> **Sesión**: 4-5 diciembre 2025, 11:00 PM - 12:10 AM  
> **Objetivo**: Mejorar experiencia de usuario en flujo de registro y configuración

---

## 📋 Resumen de Mejoras

| # | Mejora | Estado | Commit | Tiempo |
|---|--------|--------|--------|--------|
| 1 | No pedir nombre restaurante si ya existe | ✅ | 012681f | 15 min |
| 2 | Ocultar "Ajustes" si setup completado | ✅ | ed604c0 | 20 min |
| 3 | Agregar total cocina en PDF | ⏳ | - | Pendiente |
| 4 | Días no pagados desde ingreso | ⏳ | - | Pendiente |

---

## ✅ Mejora #1: No Pedir Nombre de Restaurante en Setup

### Problema
El usuario ingresaba el nombre del restaurante en el **registro** (`/auth/register`) y luego se lo volvían a pedir en **Ajustes** (`/setup`).

### Solución Implementada

#### 1. RegisterPage crea restaurante automáticamente
```typescript
// src/auth/RegisterPage.tsx (líneas 145-160)
const restaurantId = `rest_${credentials.user.uid}_${Date.now()}`
await setDoc(doc(db, "restaurants", restaurantId), {
    id: restaurantId,
    name: trimmedRestaurantName,  // ← Nombre ingresado en registro
    ownerId: credentials.user.uid,
    ownerEmail: trimmedEmail,
    ownerName: trimmedName,
    createdAt: serverTimestamp(),
    isActive: true,
    settings: {
        timezone: "America/Santiago",
        currency: "CLP",
    },
})

// Usuario guarda referencia al restaurante
await setDoc(doc(db, "users", credentials.user.uid), {
    // ...
    primaryRestaurant: restaurantId,  // ← Referencia
})
```

#### 2. InitialSetupPage consulta y pre-llena el nombre
```typescript
// src/appPropinaSegura/setup/InitialSetupPage.tsx (líneas 233-257)
useEffect(() => {
    if (!uid) return

    const handleFetchConfiguration = async () => {
        try {
            // Consultar usuario para obtener primaryRestaurant
            const userDocRef = doc(db, "users", uid)
            const userSnapshot = await getDoc(userDocRef)
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.data()
                if (userData.primaryRestaurant) {
                    const restaurantId = userData.primaryRestaurant
                    
                    // Consultar restaurante para obtener nombre
                    const restaurantDocRef = doc(db, "restaurants", restaurantId)
                    const restaurantSnapshot = await getDoc(restaurantDocRef)
                    
                    if (restaurantSnapshot.exists()) {
                        const restaurantData = restaurantSnapshot.data()
                        if (restaurantData.name) {
                            setRestaurantForm({ 
                                restaurantName: restaurantData.name 
                            })
                            setRestaurantNameExists(true)  // ← Marcar como existente
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error loading config:", error)
        }
    }

    handleFetchConfiguration()
}, [uid])
```

#### 3. Campo deshabilitado si ya existe
```typescript
// src/appPropinaSegura/setup/InitialSetupPage.tsx (líneas 428-444)
<Label htmlFor="restaurant-name">Nombre del Restaurante</Label>
<input
    id="restaurant-name"
    type="text"
    value={restaurantForm.restaurantName}
    onChange={handleRestaurantNameChange}
    disabled={restaurantNameExists}  // ← Deshabilitado
    className={baseInputClass}
/>
{restaurantNameExists && (
    <p className="text-xs text-green-400/80">
        ✓ Nombre ya registrado durante la creación de tu cuenta
    </p>
)}
```

#### 4. Validación actualizada
```typescript
// Solo validar si NO existe previamente
const canContinueToStaff = restaurantNameExists || Boolean(restaurantForm.restaurantName.trim())

if (!restaurantNameExists && !trimmedRestaurantName) {
    setSaveError("Ingresa el nombre del restaurante para continuar.")
    return
}

// Solo actualizar en payload si es nuevo
if (!restaurantNameExists && trimmedRestaurantName) {
    payload.restaurantName = trimmedRestaurantName
}
```

### Resultado
- ✅ Usuario NO repite información ya ingresada
- ✅ Campo aparece pre-llenado y deshabilitado
- ✅ Mensaje informativo verde: "✓ Nombre ya registrado..."
- ✅ Evita inconsistencias entre registro y configuración

---

## ✅ Mejora #2: Ocultar "Ajustes" en NavBar si Setup Completado

### Problema
El link "Ajustes" (`/setup`) siempre estaba visible en la navegación, incluso después de completar la configuración inicial. Causaba confusión porque había dos lugares para gestionar staff y configuración.

### Solución Implementada

#### 1. Marcar setup como completado al guardar
```typescript
// src/appPropinaSegura/setup/InitialSetupPage.tsx (línea 358)
const payload: Record<string, unknown> = {
    responsibleName: responsibleName.trim() || null,
    settlementMode,
    additionalDeductions: additionalDeductions.map(mapAdditionalDeductionForStorage),
    serviceStaff: serviceStaff.map(mapStaffMemberForStorage),
    supportStaff: supportStaff.map(mapStaffMemberForStorage),
    updatedAt: timestamp,
    staffEditors,
    setupCompleted: true,  // ← Marcar como completado
}

await setDoc(restaurantReference, payload, { merge: true })
```

#### 2. NavBar consulta estado de setup
```typescript
// src/appPropinaSegura/component/navbar/NavBar.tsx (líneas 32-60)
const [setupCompleted, setSetupCompleted] = useState(false)
const { user } = useAuth()

useEffect(() => {
    const checkSetupStatus = async () => {
        if (!user?.uid) return
        
        try {
            // Consultar usuario para obtener primaryRestaurant
            const userDocRef = doc(db, "users", user.uid)
            const userSnapshot = await getDoc(userDocRef)
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.data()
                const restaurantId = userData.primaryRestaurant || user.uid
                
                // Consultar restaurante para ver si setupCompleted
                const restaurantDocRef = doc(db, "restaurants", restaurantId)
                const restaurantSnapshot = await getDoc(restaurantDocRef)
                
                if (restaurantSnapshot.exists()) {
                    const restaurantData = restaurantSnapshot.data()
                    setSetupCompleted(restaurantData.setupCompleted === true)
                }
            }
        } catch (error) {
            console.error("Error checking setup status:", error)
        }
    }
    
    checkSetupStatus()
}, [user])
```

#### 3. Filtrar link según estado
```typescript
// src/appPropinaSegura/component/navbar/NavBar.tsx (líneas 63-75)
const visibleNavLinks = useMemo(() => {
    return NAV_LINKS.filter(link => {
        // Ocultar "Admin" si no es admin
        if (link.path === "/admin") {
            return isAdmin
        }
        // Ocultar "Ajustes" si setup completado
        if (link.path === "/setup") {
            return !setupCompleted  // ← Solo mostrar si NO completado
        }
        return true
    })
}, [isAdmin, setupCompleted])
```

### Resultado
- ✅ Link "Ajustes" desaparece después de completar configuración inicial
- ✅ Navegación limpia: solo links relevantes
- ✅ Gestión de staff se hace desde Dashboard (`/staff`)
- ✅ Evita confusión entre `/setup` y `/staff`

---

## ⏳ Mejora #3: Agregar Total Cocina en PDF (Pendiente)

### Análisis Realizado

**Situación Actual:**
El PDF de liquidación muestra:
- ✅ Netos a pagar
- ✅ Propinas generadas
- ✅ Descuentos globales
- ✅ Gasto general
- ✅ Transbank
- ❌ **NO muestra**: Total asignado a cocina

**Cálculo Requerido:**
```typescript
// En modo "pool":
totalCocina = totalPropinas * (kitchenPercentage / 100)

// Ejemplo con datos reales:
// Propinas: $3,551,276
// kitchenPercentage: 30%
// totalCocina = $3,551,276 * 0.30 = $1,065,382.80
```

**Archivos a Modificar:**
1. `src/appPropinaSegura/dashboard/utils/closureCalculations.ts`
   - Agregar `totalKitchen` al tipo `ClosuresTotalsSnapshot`
   - Calcular suma de assignments de cocina

2. `src/appPropinaSegura/dashboard/utils/liquidacionPdf.ts`
   - Recibir `totalKitchen` en parámetros
   - Agregar línea en sección "Totales":
     ```typescript
     drawText(`Total cocina: ${formatCurrency(totals.totalKitchen)}`)
     ```

**Tiempo Estimado:** 25 minutos

---

## ⏳ Mejora #4: Días No Pagados Desde Ingreso (Pendiente)

### Análisis Realizado

**Situación Actual:**
- ✅ Se guarda `startDate` en cada `StaffMember`
- ❌ NO se muestra si hay días sin pagar desde su ingreso

**Lógica Requerida:**
```typescript
// Para cada miembro del staff:
1. Obtener startDate del staff member
2. Consultar TODOS los cierres desde startDate hasta hoy
3. Identificar cierres donde NO estuvo en assignments
4. Mostrar resumen en liquidación

// Ejemplo:
// - Juan García ingresó: 01-09-2025
// - Cierres totales desde ingreso: 50
// - Cierres donde aparece en assignments: 45
// - Cierres sin pago: 5
```

**Función a Crear:**
```typescript
type UnpaidDaysInfo = {
    memberId: string
    memberName: string
    startDate: Date
    totalClosuresSinceStart: number
    closuresWithPayment: number
    closuresWithoutPayment: number
    unpaidClosureIds: string[]
}

const calculateUnpaidDaysForMember = (
    memberId: string,
    startDate: Date,
    allClosures: ClosureDocument[]
): UnpaidDaysInfo => {
    const closuresSinceStart = allClosures.filter(closure => {
        const closureDate = closure.metadata.referenceDate.toDate()
        return closureDate >= startDate
    })
    
    const closuresWithMember = closuresSinceStart.filter(closure => {
        const allAssignments = [
            ...closure.assignments.servicio,
            ...closure.assignments.cocina,
            ...closure.assignments.ventaDirecta,
            ...closure.assignments.pocilloSecundario,
        ]
        return allAssignments.some(a => a.staffId === memberId)
    })
    
    const unpaidClosures = closuresSinceStart.filter(closure => {
        const allAssignments = [
            ...closure.assignments.servicio,
            ...closure.assignments.cocina,
            ...closure.assignments.ventaDirecta,
            ...closure.assignments.pocilloSecundario,
        ]
        return !allAssignments.some(a => a.staffId === memberId)
    })
    
    return {
        memberId,
        memberName: "", // Obtener del staff member
        startDate,
        totalClosuresSinceStart: closuresSinceStart.length,
        closuresWithPayment: closuresWithMember.length,
        closuresWithoutPayment: unpaidClosures.length,
        unpaidClosureIds: unpaidClosures.map(c => c.id),
    }
}
```

**Interfaz en PDF:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Historial de Pagos (desde ingreso)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Juan García
   Fecha ingreso: 01-09-2025
   • Total cierres desde ingreso: 50
   • Cierres con pago: 45
   • Cierres sin pago: 5
   
2. María López
   Fecha ingreso: 15-10-2025
   • Total cierres desde ingreso: 23
   • Cierres con pago: 23
   • Cierres sin pago: 0 ✓
```

**Archivos a Modificar:**
1. `src/appPropinaSegura/dashboard/utils/closureCalculations.ts`
   - Crear función `calculateUnpaidDaysForMember()`
   - Crear función `buildUnpaidDaysReport()`

2. `src/appPropinaSegura/dashboard/utils/liquidacionPdf.ts`
   - Agregar sección "Historial de Pagos"
   - Mostrar info de días no pagados

3. `src/appPropinaSegura/dashboard/LiquidacionPage.tsx`
   - Pasar datos de unpaid days al PDF

**Tiempo Estimado:** 45 minutos

---

## 🎉 Beneficios Logrados

### UX Mejorado
- ✅ Usuario no repite información
- ✅ Navegación limpia y relevante
- ✅ Feedback visual claro (mensajes verdes)
- ✅ Flujo más intuitivo y rápido

### Consistencia de Datos
- ✅ Una sola fuente de verdad para nombre de restaurante
- ✅ Estado claro de configuración (setupCompleted)
- ✅ Previene duplicación de información

### Mantenibilidad
- ✅ Código bien documentado con comentarios
- ✅ Lógica centralizada en InitialSetupPage
- ✅ Validaciones robustas

---

## 📊 Métricas

### Build Status
```bash
✓ 3067 modules transformed
✓ built in 15.24s
Exit code: 0
```

### Commits
```
012681f - ✨ Mejora #1: No pedir nombre de restaurante
ed604c0 - ✨ Mejora #2: Ocultar Ajustes si setup completado
```

### Archivos Modificados
- `src/auth/RegisterPage.tsx` (ya modificado previamente)
- `src/appPropinaSegura/setup/InitialSetupPage.tsx` (+48 líneas)
- `src/appPropinaSegura/component/navbar/NavBar.tsx` (+41 líneas)

---

## 📝 Notas Técnicas

### Estado en Firestore

#### Documento `/restaurants/{restaurantId}`
```typescript
{
    id: string
    name: string  // ← Guardado en registro
    ownerId: string
    ownerEmail: string
    ownerName: string
    
    // Configuración inicial
    setupCompleted: boolean  // ← Nuevo campo
    responsibleName: string
    settlementMode: "pool" | "directa"
    poolConfig: { kitchenPercentage, transbankPercentage }
    serviceStaff: StaffMember[]
    supportStaff: StaffMember[]
    
    createdAt: Timestamp
    updatedAt: Timestamp
}
```

#### Documento `/users/{uid}`
```typescript
{
    uid: string
    email: string
    primaryRestaurant: string  // ← Referencia al restaurante
    restaurantRoles: {
        [restaurantId]: RestaurantRole[]
    }
    // ...
}
```

### Flujo Completo

```
┌─────────────────┐
│  1. REGISTRO    │
│  /auth/register │
└────────┬────────┘
         │
         ├─► Crea restaurante en /restaurants/{id}
         │   └─► { name: "...", setupCompleted: false }
         │
         ├─► Crea usuario en /users/{uid}
         │   └─► { primaryRestaurant: restaurantId }
         │
         └─► Redirige a /dashboard
         
┌─────────────────┐
│  2. SETUP       │
│  /setup         │
└────────┬────────┘
         │
         ├─► Consulta /users/{uid}.primaryRestaurant
         │
         ├─► Consulta /restaurants/{id}.name
         │   └─► Pre-llena campo (deshabilitado)
         │
         ├─► Usuario configura: porcentajes, staff
         │
         ├─► Guarda con setupCompleted: true
         │
         └─► Redirige a /dashboard
         
┌─────────────────┐
│  3. NAVEGACIÓN  │
│  NavBar         │
└────────┬────────┘
         │
         ├─► Consulta setupCompleted
         │
         ├─► Si true → oculta "Ajustes"
         │
         └─► Links visibles:
             • Inicio
             • Cierres
             • Dashboard
             • Admin (solo si es admin)
```

---

**Última actualización**: 5 de diciembre 2025, 12:10 AM
