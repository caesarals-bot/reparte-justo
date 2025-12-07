# Solución Rápida: Migración de Staff

## El Problema
- Tu usuario tiene rol `owner`
- Las reglas de Firestore **no permiten** que `owner` escriba en el documento del restaurante (Ley 20.549)
- Solo `closure_editor` puede escribir

## Solución Rápida (5 minutos)

### Paso 1: Cambiar temporalmente tu rol
1. Ve a Firebase Console: https://console.firebase.google.com/project/reparte-justo/firestore/data/users/xTbuyXF7C5NqBIPQj6FBYukMBFc2
2. Edita el campo `roles`
3. Cambia de:
   ```json
   {
     "rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881": ["owner"]
   }
   ```
   A:
   ```json
   {
     "rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881": ["owner", "closure_editor"]
   }
   ```

### Paso 2: Cerrar sesión y volver a entrar
1. En la aplicación, cierra sesión
2. Vuelve a iniciar sesión
3. Esto cargará los nuevos roles

### Paso 3: Ejecutar la migración
1. Ve a la página de Cierre Diario
2. Haz clic en el botón "🔧 Migrar Staff"
3. Espera el mensaje de éxito

### Paso 4: Restaurar tu rol (opcional)
1. Vuelve a Firebase Console
2. Edita el campo `roles` de nuevo
3. Quita `closure_editor` si quieres (o déjalo, no afecta nada)

## Alternativa: Copiar manualmente en Firebase Console

Si prefieres no cambiar roles, sigue las instrucciones en `INSTRUCCIONES-MIGRACION-STAFF.md`

### Resumen de campos a copiar:

Del documento `restaurants/xTbuyXF7C5NqBIPQj6FBYukMBFc2` al documento `restaurants/rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`:

1. **serviceStaff** (array) - Los garzones (Jimmy cieza, Dayana)
2. **supportStaff** (array) - Los cocineros
3. **settlementMode** (string) - "pool"
4. **poolConfig** (map) - { kitchenPercentage: 20, transbankPercentage: 2 }
5. **directConfig** (map) - { directWaiterPercentage: 0 }
6. **additionalDeductions** (array)
7. **contactEmail** (string) - "brianydanito@gmail.com"
8. **responsibleName** (string) - "daniel garcia"
9. **staffEditors** (array)

Puedes copiar y pegar cada campo directamente en Firebase Console.
