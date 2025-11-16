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

## 8. Micro-tareas para la página de Liquidación

- **Exportar datos de liquidación**
  - Diseñar un payload tipo `LiquidacionMemberSummary` con la información que se muestra en la tabla (neto, penalizaciones, deducciones, ajustes) para poder exportar a CSV o enviar a un backend.
  - Añadir un botón de "Exportar resumen" que por ahora solo haga `console.log` del payload generado.

- **Preparar resumen para correos al staff**
  - Definir la forma del resumen por integrante para email (nombre, rol, rango de fechas, monto total a pagar, desglose básico).
  - Identificar desde dónde se obtendrán los correos de cada integrante (`staffId` → documento de staff en Firestore).

- **Flujo futuro de confirmación de liquidación**
  - Especificar la API/Cloud Function que marcará como `liquidado` un conjunto de cierres (por `closureId`) y generará un reporte persistente.
  - Definir el comportamiento de la UI tras confirmar: recarga del dashboard, estado de éxito y bloqueo de modificaciones sobre cierres liquidados.

- **Mejoras UX del calendario de liquidación**
  - Evaluar si se debe restringir el rango seleccionable a días que tengan cierres pendientes (evitar rangos vacíos).
  - Ajustar la leyenda del calendario para explicar el color de los días con movimiento y el comportamiento del filtro.

## 9. Gestión centralizada de personal

- **Conectar altas desde `/dashboard/personal` con el cierre diario**
  - Consumir la misma transformación que usa `InitialSetupPage` para garantizar que las ponderaciones/porcentajes mantengan el formato esperado.
  - Sincronizar inmediatamente tras guardar para que el dashboard refleje los nuevos integrantes sin requerir reload manual.
- **Notas de UX**
  - Mostrar un badge en cada tabla indicando cuántos integrantes están inactivos y permitir filtrarlos rápidamente.
  - Añadir confirmación al eliminar integrantes (modal ligero) para evitar eliminaciones accidentales.
- **Permisos**
  - Analizar si conviene admitir más de un `staffEditor` y exponerlo en esta misma vista (evitar volver al setup).
