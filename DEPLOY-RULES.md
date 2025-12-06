# Guía Rápida: Desplegar Firestore Rules

## ✅ Archivos Creados

1. ✅ `firestore.rules` - Reglas de seguridad de Firestore
2. ✅ `firestore.indexes.json` - Índices de Firestore (vacío por ahora)
3. ✅ `firebase.json` - Configuración de Firebase en raíz
4. ✅ `FIRESTORE-RULES.md` - Documentación de respaldo con explicación detallada

---

## 🚀 Opción 1: Desplegar SOLO las reglas (Recomendado)

```bash
# Desde la raíz del proyecto
firebase deploy --only firestore:rules
```

**Salida esperada**:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/tu-proyecto/overview
```

---

## 🔥 Opción 2: Desplegar todo (rules + functions + hosting)

```bash
# Desplegar todo
firebase deploy
```

**⚠️ Advertencia**: Esto desplegará:
- Firestore Rules
- Cloud Functions (si hay cambios)
- Hosting (si hay cambios en dist/)

---

## 🧪 Probar las reglas ANTES de desplegar

### **1. Firebase Emulator (Local)**

```bash
# Instalar emulators (solo la primera vez)
firebase init emulators

# Iniciar emulator de Firestore
firebase emulators:start --only firestore
```

Luego en tu app, configura para usar el emulator:

```typescript
// src/firebase/config.ts
import { connectFirestoreEmulator } from "firebase/firestore"

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "localhost", 8080)
}
```

### **2. Rules Playground (Firebase Console)**

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Seleccionar tu proyecto
3. **Firestore Database** → **Rules** → **Rules Playground**
4. Configurar test:
   ```
   Simulate: get
   Location: /registros_diarios/testId
   Authenticated: Yes
   
   Custom token payload:
   {
     "uid": "test123",
     "email": "test@example.com"
   }
   ```
5. Click en **Run**

---

## 📝 Verificar Reglas Actuales

### **Ver reglas desplegadas en producción**:
```bash
firebase firestore:rules
```

### **Ver en Firebase Console**:
1. Ir a **Firestore Database** → **Rules**
2. Verás las reglas actuales en el editor

---

## ⚠️ Troubleshooting

### **Error: "Firebase project not found"**

```bash
# Inicializar Firebase (solo la primera vez)
firebase login
firebase use --add

# Selecciona tu proyecto de la lista
```

### **Error: "Permission denied"**

Asegúrate de tener permisos de Owner o Editor en el proyecto Firebase:
1. Ir a [IAM Console](https://console.cloud.google.com/iam-admin/iam)
2. Verificar que tu cuenta tenga rol **Editor** o **Owner**

### **Error: "firestore.rules not found"**

Verifica que estés en la raíz del proyecto:
```bash
pwd  # Debe mostrar: d:\start-up\work\reparte-justo
ls firestore.rules  # Debe existir
```

---

## 🔄 Rollback (Si algo sale mal)

### **Opción 1: Volver a reglas anteriores**
Firebase guarda un historial de reglas:

1. Ir a Firebase Console → Firestore → Rules
2. Click en **History** (arriba a la derecha)
3. Seleccionar versión anterior
4. Click en **Restore**

### **Opción 2: Reglas permisivas temporales**
Solo para debugging (⚠️ NUNCA en producción):

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

---

## 📊 Verificar que las reglas funcionan

Después de desplegar, prueba en tu app:

### **1. Como owner (debe fallar al escribir)**
```typescript
// Esto debe lanzar error: "Missing or insufficient permissions"
await addDoc(collection(db, "registros_diarios"), {
  restaurantId: "rest123",
  fecha: new Date(),
  // ...
})
```

### **2. Como closure_editor (debe funcionar)**
```typescript
// Esto debe funcionar si el usuario tiene rol closure_editor
await addDoc(collection(db, "registros_diarios"), {
  restaurantId: "rest123",
  fecha: new Date(),
  // ...
})
```

---

## 🎯 Comandos Útiles

```bash
# Ver proyecto actual
firebase projects:list

# Cambiar de proyecto
firebase use <project-id>

# Ver reglas desplegadas
firebase firestore:rules

# Desplegar solo reglas
firebase deploy --only firestore:rules

# Desplegar reglas + functions
firebase deploy --only firestore:rules,functions

# Ver logs de Firebase
firebase functions:log
```

---

## 📞 Soporte

Si algo falla:

1. **Revisar logs**: Firebase Console → Firestore → Usage tab
2. **Verificar estructura de datos**: `/users/{uid}` debe tener `siteRoles` y `restaurantRoles`
3. **Verificar autenticación**: Usuario debe estar logueado con Firebase Auth
4. **Consultar documentación**: Ver `FIRESTORE-RULES.md` para detalles de cada regla

---

**Última actualización**: 5 de diciembre 2025  
**Próximo paso**: Ejecutar `firebase deploy --only firestore:rules`
