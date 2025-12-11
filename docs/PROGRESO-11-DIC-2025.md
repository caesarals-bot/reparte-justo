# Progreso 11 de Diciembre 2025

## ✅ Completado esta sesión

### 1. Página de Contacto
- **Archivo:** `src/appPropinaSegura/contact/ContactPage.tsx`
- **Ruta:** `/contact`
- **Funcionalidad:** Formulario de contacto que guarda mensajes en Firestore (`contact_messages`)
- **Agregado al NavBar:** Link "Contacto" visible para todos los usuarios

### 2. Autenticación con Google
- **Archivos modificados:**
  - `src/firebase/config.ts` - Agregado `GoogleAuthProvider`
  - `src/auth/RegisterPage.tsx` - Botón "Continuar con Google"
  - `src/auth/LoginPage.tsx` - Botón "Continuar con Google"
  
- **Comportamiento:**
  - Al registrarse con Google, se crea automáticamente:
    - Documento de usuario en `/users/{uid}`
    - Documento de restaurante en `/restaurants/{uid}` con `name: ""` (vacío para configurar en setup)
  - El usuario es asignado como `closure_editor` de su restaurante
  - Redirige a `/setup` para completar configuración

### 3. Corrección de Firestore Rules para Admin
- **Problema:** El dashboard admin no podía leer todos los restaurantes
- **Solución:** Reordenar las condiciones en `/restaurants` para verificar primero si es admin del sitio
- **Reglas desplegadas:** `firebase deploy --only firestore:rules`

---

## 🔧 Configuración requerida en Firebase Console

### Para que Google Sign-In funcione:
1. Ir a Firebase Console → Authentication → Sign-in method
2. Habilitar "Google" como proveedor
3. Configurar dominios autorizados si es necesario

---

## 📋 Pendientes para continuar

### Alta prioridad
1. **Probar flujo completo de Google Sign-In** - Verificar que crea usuario y restaurante correctamente
2. **Agregar reglas para `contact_messages`** - Actualmente no hay reglas para esta colección

### Media prioridad
3. **Propagar campo `gastoGeneral`** al dashboard/liquidator
4. **Dashboard pendientes** - Mostrar totales separados para cocina y servicio + descuentos Transbank

### Baja prioridad
5. **Code splitting** - El bundle es >500KB, considerar lazy loading

---

## 📁 Archivos modificados (para commit)

```
src/firebase/config.ts
src/auth/RegisterPage.tsx
src/auth/LoginPage.tsx
src/appPropinaSegura/contact/ContactPage.tsx
src/appPropinaSegura/component/navbar/NavBar.tsx
src/router/AppRouter.tsx
src/components/ui/textarea.tsx (nuevo)
firestore.rules
```

---

## 🔐 Estado de roles del usuario de prueba

El usuario `d728mi0XcibHhwLtFszoQsHBm9x1` debe tener:
```json
{
  "siteRoles": ["super_admin"],
  "restaurantRoles": {}
}
```

**NO** así:
```json
{
  "siteRoles": [],
  "restaurantRoles": { "xxx": ["super_admin"] }
}
```

`super_admin` es un **rol de sitio**, no de restaurante.

---

## Comandos útiles

```bash
# Build
npm run build

# Deploy solo reglas de Firestore
firebase deploy --only firestore:rules

# Deploy todo
firebase deploy
```
