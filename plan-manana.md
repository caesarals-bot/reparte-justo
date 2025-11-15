# Plan de trabajo para mañana

## 1. Backend: Guardado de Cierre Diario
- Definir payload y contrato de la Cloud Function `guardarCierreDiario`.
- Modelar colección `registros_diarios` con snapshot completo (montos por persona, descuentos, estado `pendiente`).
- Implementar lógica de cálculo segura en el backend (aplicar deducciones, separar cocina/garzones, reparto individual según asistencia y ponderaciones).
- Actualizar los acumulados del restaurante tras guardar el registro (totales no liquidados, días registrados).
- Incluir en el snapshot porcentajes y montos de cada deducción, destacando Transbank para conciliación.
- Retornar identificador del registro, totales acumulados actualizados y errores de validación estandarizados.

## 2. Frontend: Integración con la nueva API
- Ajustar formulario de Cierre Diario para enviar datos crudos (montos, deducciones, presentes/ausentes, modo).
- Manejar respuesta del backend: confirmar guardado, mostrar errores y refrescar totales del dashboard.
- Añadir botón "Guardar" (estado pendiente) además del flujo "Pagar".
- Validar responsive y accesibilidad de las tarjetas de resumen, incluyendo la tarjeta de Transbank.

## 3. Dashboard de Liquidación (Fase 3)
- Diseñar card de "Total No Liquidado" y tabla/desglose por miembro.
- Crear modal de selección de rango de fechas para ejecutar pago.
- Definir interacción con Cloud Function `liquidarPeriodo` (pendiente de implantar).

## 4. Trazabilidad y Auditoría
- Versionar configuración usada (porcentajes, staff, deducciones) dentro del snapshot.
- Registrar quién guardó cada cierre y timestamps.
- Planificar estrategia para notificaciones/emails post liquidación.

## 5. Ajustes paralelos y ponderaciones
- Definir cómo permitir que un ajuste puntual modifique la ponderación diaria de un integrante (regla de negocio, límites y formato de entrada).
- Calcular y documentar qué porcentaje/monto debe reducirse de la ponderación al aplicar el ajuste para mantener consistencia con el neto final.
- Prototipar validaciones en el formulario de ajustes para evitar ponderaciones negativas o inconsistentes.

## 6. Pendientes adicionales de frontend
- Exponer en el dashboard un indicador de ajustes recientes y su impacto en el total no liquidado.
- Revisar accesibilidad de los nuevos badges y cards en `ClosureDetailPage` (contraste y navegación por teclado).
- Planificar pruebas manuales específicas para ajustes generales vs. por persona (guía rápida para QA).

## 7. Estado al cierre del día (ajustes porcentuales)
- Se extendieron los tipos en `useClosuresDashboard` para soportar:
  - `StaffAssignment.netAmountAdjusted` y `StaffAssignment.adjustmentSummary`.
  - `StaffAggregate.totalNetoAjustado`.
- La agregación de asignaciones ya considera estos campos para acumular netos ajustados y ajustes por monto.
- Los ajustes con `variant = "monto"` siguen sumando/restando sobre el neto acumulado y ahora también sobre `totalNetoAjustado`.
- Los ajustes con `variant = "porcentaje"` *aún no recalculan* el neto; siguen almacenados solo como metadatos.
 - El dashboard incluye una card compacta de **"Ajustes registrados"** que muestra, para los cierres pendientes, un resumen de ajustes positivos y negativos (nombre, porcentaje, monto y motivo corto) sin ocupar demasiado espacio visual.

### Próximos pasos específicos sobre porcentajes
- Implementar un helper en `useClosuresDashboard` que, para cada cierre, calcule:
  - El neto base por integrante (monto asignado - penalización % - deducciones).
  - El efecto de los ajustes porcentuales sobre ese neto base.
  - El nuevo `netAmountAdjusted` y un `adjustmentSummary` con monto equivalente del % y delta redistribuido.
- Usar ese helper antes de construir los `StaffAggregate` para que el dashboard refleje el neto ajustado por porcentaje.
- Validar manualmente con casos:
  - Descuento de 50% a un garzón presente.
  - Incremento de porcentaje a un integrante de cocina.
  - Combinación de ajustes por monto y porcentaje en el mismo cierre.
