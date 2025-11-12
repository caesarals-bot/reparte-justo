# Plan de trabajo para mañana

## 1. Backend: Guardado de Cierre Diario
- Definir payload y contrato de la Cloud Function `guardarCierreDiario`.
- Modelar colección `registros_diarios` con snapshot completo (montos por persona, descuentos, estado `pendiente`).
- Implementar lógica de cálculo segura en el backend (aplicar deducciones, separar cocina/garzones, reparto individual según asistencia y ponderaciones).
- Actualizar los acumulados del restaurante tras guardar el registro (totales no liquidados, días registrados).

## 2. Frontend: Integración con la nueva API
- Ajustar formulario de Cierre Diario para enviar datos crudos (montos, deducciones, presentes/ausentes, modo).
- Manejar respuesta del backend: confirmar guardado, mostrar errores y refrescar totales del dashboard.
- Añadir botón "Guardar" (estado pendiente) además del flujo "Pagar".

## 3. Dashboard de Liquidación (Fase 3)
- Diseñar card de "Total No Liquidado" y tabla/desglose por miembro.
- Crear modal de selección de rango de fechas para ejecutar pago.
- Definir interacción con Cloud Function `liquidarPeriodo` (pendiente de implantar).

## 4. Trazabilidad y Auditoría
- Versionar configuración usada (porcentajes, staff, deducciones) dentro del snapshot.
- Registrar quién guardó cada cierre y timestamps.
- Planificar estrategia para notificaciones/emails post liquidación.
