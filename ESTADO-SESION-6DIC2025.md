# Estado de la Sesión - 6 de Diciembre 2025

## 🎯 Objetivo Principal
Migrar datos de staff del documento incorrecto al documento correcto del restaurante.

## 📊 Situación Actual

### Problema Identificado
Los datos del staff (garzones y cocineros) se guardaron en el documento incorrecto de Firestore:
- **Ubicación incorrecta**: `restaurants/xTbuyXF7C5NqBIPQj6FBYukMBFc2` (UID del usuario)
- **Ubicación correcta**: `restaurants/rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881` (ID del restaurante)

### Datos a Migrar
Del documento `xTbuyXF7C5NqBIPQj6FBYukMBFc2`:
- **serviceStaff**: Jimmy cieza, Dayana (garzones)
- **supportStaff**: Personal de cocina
- **settlementMode**: "pool"
- **poolConfig**: { kitchenPercentage: 20, transbankPercentage: 2 }
- **directConfig**: Configuración de venta directa
- **contactEmail**: brianydanito@gmail.com
- **responsibleName**: daniel garcia

## ✅ Trabajo Completado

### 1. Corrección de Permisos de Firestore
- ✅ Corregido `useStaffManagement` para usar `restaurantId` en lugar de `uid`
- ✅ Agregado `isLoadingAuth` en todos los componentes para evitar race conditions
- ✅ Corregidas reglas de Firestore para subcollection `registros_diarios`
- ✅ Desplegadas reglas actualizadas a Firebase

### 2. Sistema de Roles
- ✅ Agregado bypass de `super_admin` en `ProtectedRoute`
- ✅ Usuario `brianydanito@gmail.com` configurado como `super_admin`
- ✅ Agregada regla de `collectionGroup` para `registros_diarios`

### 3. Herramientas de Migración
- ✅ Creado `MigrateStaffButton` component (botón flotante en UI)
- ✅ Creado script `migrate-staff-data.js` (no funciona por permisos)
- ✅ Agregados logs de debug en `AuthContext` y `MigrateStaffButton`

### 4. Documentación
- ✅ `INSTRUCCIONES-MIGRACION-STAFF.md` - Instrucciones detalladas de migración manual
- ✅ `SOLUCION-RAPIDA-MIGRACION.md` - Guía rápida para migración

## 🔴 Problemas Pendientes

### Error Actual en Consola
```
DEBUG CierreDiarioPage - restaurantId seleccionado: undefined
accessibleRestaurants: []
```

**Causa**: El usuario `super_admin` no tiene `restaurantRoles` configurados, por lo que `accessibleRestaurants` está vacío.

### Pantalla de Error
La aplicación muestra "No se encontró un restaurante. Verifica tus permisos" y sugiere "Ir a configuración inicial".

## 🎯 Próximos Pasos (Para Mañana)

### Opción 1: Agregar restaurantId a super_admin (Recomendado)
1. En Firebase Console, editar documento `users/xTbuyXF7C5NqBIPQj6FBYukMBFc2`
2. Agregar campo `restaurantRoles`:
   ```json
   {
     "rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881": ["closure_editor"]
   }
   ```
3. Cerrar sesión y volver a entrar
4. Hacer clic en botón "🔧 Migrar Staff"
5. Verificar que aparezcan los garzones

### Opción 2: Migración Manual en Firebase Console
1. Ir a Firebase Console
2. Copiar campos del documento `xTbuyXF7C5NqBIPQj6FBYukMBFc2`
3. Pegarlos en documento `rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`
4. Recargar aplicación

### Opción 3: Modificar código para super_admin
Modificar componentes para que `super_admin` pueda seleccionar restaurante manualmente si `accessibleRestaurants` está vacío.

## 📝 Archivos Modificados Hoy

### Código
- `src/router/ProtectedRoute.tsx` - Bypass para super_admin
- `src/context/AuthContext.tsx` - Logs de debug
- `src/appPropinaSegura/utils/MigrateStaffButton.tsx` - Botón de migración
- `src/appPropinaSegura/cierre/CierreDiarioPage.tsx` - Logs de debug
- `src/appPropinaSegura/cierre/hooks/useCierreDiario.ts` - Logs de debug
- `firestore.rules` - Regla de collectionGroup

### Documentación
- `INSTRUCCIONES-MIGRACION-STAFF.md`
- `SOLUCION-RAPIDA-MIGRACION.md`
- `FIX-PERMISOS-6DIC2025.md` (creado anteriormente)

## 🔧 Configuración de Firebase

### Usuario de Prueba
- **Email**: brianydanito@gmail.com
- **UID**: xTbuyXF7C5NqBIPQj6FBYukMBFc2
- **Rol de sitio**: super_admin
- **Roles de restaurante**: Pendiente de configurar

### Restaurante
- **ID**: rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881
- **Nombre**: hijo del sol
- **Owner**: xTbuyXF7C5NqBIPQj6FBYukMBFc2

## 💡 Lecciones Aprendidas

1. **Race Conditions**: Es crucial esperar a que `AuthContext` cargue completamente antes de hacer queries a Firestore
2. **super_admin**: Necesita bypass especial en `ProtectedRoute` para acceso total
3. **collectionGroup**: Requiere reglas especiales en Firestore
4. **Migración de datos**: Mejor hacerla manualmente en Firebase Console cuando hay problemas de permisos

## 🚀 Estado del Proyecto

### Funcionalidades Operativas
- ✅ Sistema de autenticación
- ✅ Sistema de roles (site y restaurant)
- ✅ ProtectedRoute con bypass de super_admin
- ✅ Dashboard administrativo (con super_admin)
- ✅ Firestore Security Rules correctas

### Funcionalidades Bloqueadas
- ❌ Página de Cierre Diario (falta migración de staff)
- ❌ Gestión de Personal (falta migración de staff)

## 📌 Notas Importantes

1. **NO eliminar** logs de debug hasta confirmar que todo funciona
2. **Verificar** en Firebase Console que `siteRoles` tenga `["super_admin"]`
3. **Agregar** `restaurantRoles` al usuario para que `accessibleRestaurants` no esté vacío
4. **Después de migración**: Limpiar logs de debug y remover botón de migración

---

**Última actualización**: 7 de Diciembre 2025, 00:10 AM
**Estado**: Pendiente de migración de staff
**Próxima sesión**: Completar migración de datos
