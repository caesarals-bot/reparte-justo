# Instrucciones para Migrar Datos de Staff

## Problema
Los datos del staff (garzones y cocineros) se guardaron en el documento incorrecto:
- **Ubicación actual (incorrecta)**: `restaurants/xTbuyXF7C5NqBIPQj6FBYukMBFc2`
- **Ubicación correcta**: `restaurants/rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`

## Solución: Migración Manual desde Firebase Console

### Paso 1: Abrir Firebase Console
1. Ve a: https://console.firebase.google.com/project/reparte-justo/firestore/data
2. Inicia sesión con tu cuenta de Google

### Paso 2: Copiar datos del documento incorrecto
1. En el panel izquierdo, busca la colección `restaurants`
2. Busca el documento `xTbuyXF7C5NqBIPQj6FBYukMBFc2`
3. Copia los siguientes campos (haz clic en cada uno y copia su valor):
   - `serviceStaff` (array con los garzones)
   - `supportStaff` (array con los cocineros)
   - `settlementMode` (probablemente "pool")
   - `poolConfig` (objeto con kitchenPercentage y transbankPercentage)
   - `directConfig` (objeto con directWaiterPercentage)
   - `additionalDeductions` (array)
   - `contactEmail` (string)
   - `responsibleName` (string)
   - `staffEditors` (array)

### Paso 3: Pegar datos en el documento correcto
1. En la misma colección `restaurants`, busca el documento `rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881`
2. Para cada campo copiado:
   - Haz clic en "Agregar campo" (o edita el campo si ya existe)
   - Pega el nombre del campo
   - Selecciona el tipo correcto (array, map, string, etc.)
   - Pega el valor

### Paso 4: Verificar
1. Recarga la aplicación
2. Ve a la página de Cierre Diario
3. Deberías ver aparecer los garzones y cocineros

## Alternativa: Usar Firebase CLI

Si tienes Firebase CLI instalado, puedes ejecutar este script:

```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Ejecutar script de migración (crear este archivo)
node migrate-staff-firestore.js
```

## Datos a Migrar (según las imágenes de Firestore)

Del documento `xTbuyXF7C5NqBIPQj6FBYukMBFc2`:

```json
{
  "serviceStaff": [
    {
      "id": "...",
      "name": "Jimmy cieza",
      "role": "garzon",
      "weight": 1,
      "isActive": true,
      "entryDate": "..."
    },
    {
      "id": "...",
      "name": "Dayana",
      "role": "garzon",
      "weight": 1,
      "isActive": true,
      "entryDate": "..."
    }
  ],
  "supportStaff": [],
  "settlementMode": "pool",
  "poolConfig": {
    "kitchenPercentage": 20,
    "transbankPercentage": 2
  },
  "directConfig": {
    "directWaiterPercentage": 0
  },
  "additionalDeductions": [],
  "contactEmail": "brianydanito@gmail.com",
  "responsibleName": "daniel garcia",
  "staffEditors": []
}
```

## Después de la Migración

Una vez migrados los datos:
1. Puedes eliminar el documento incorrecto `xTbuyXF7C5NqBIPQj6FBYukMBFc2` (opcional)
2. Todos los nuevos cambios se guardarán correctamente en el documento correcto
3. El sistema funcionará normalmente
