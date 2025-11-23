# Plan de trabajo

> Actualizado: 21 de noviembre de 2025

## Mañana · 22/11/2025

1. **Propagar gastos generales al dashboard/detalle**
   - Mostrar `generalExpenses` y su total en `ClosureDetailPage`, cards del dashboard y futuros PDFs.
   - Validar que los snapshots históricos guardan el arreglo completo para mantención.
2. **QA de edición con advertencias**
   - Escenarios de creación/edición con múltiples gastos generales verificando el `AlertDialog` de neto ≤ 0.
   - Documentar hallazgos en `DOCUMENTACION.md` con capturas o pasos.
3. **Preparación para alertas por correo**
   - Definir payload/resumen que se enviará cuando el neto sea ≤ 0 y dejarlo documentado.
   - Identificar qué datos del responsable (nombre/email) faltan para enviar el aviso desde Cloud Functions.

## Histórico · 21/11/2025

1. **Correcciones sobre cierres guardados**
   - Diseñar endpoints y UI para eliminar un cierre diario (revirtiendo `pendingTotals`).
   - Preparar flujo de edición (abrir cierre existente, ajustar montos y volver a guardar) con confirmaciones.
2. **Propagar `gastoGeneral` (anfitriona/part-time)**
   - Mostrar el campo en el formulario con su valor real y enviarlo en los payloads.
   - Reflejar el gasto en tarjetas del dashboard, detalle del cierre y totales de liquidación/PDF.
   - Asegurar que los totales pendientes y agregados no excedan el neto después del gasto general.
3. **Documentación y QA**
   - Registrar en `DOCUMENTACION.md` la gestión de cierres (guardar, editar, eliminar) y el nuevo flujo del gasto general.
   - Preparar casos de prueba manuales para borrar/editar cierres y verificar el impacto en dashboard/liquidación.

## Enfoque de hoy · 19/11/2025

1. **Dashboard & Staff Management**
   - Re-implementar los botones "Añadir personal" / "Editar personal" en el dashboard con navegación parametrizada.
   - Añadir accesos rápidos dentro de `/dashboard/personal` que respeten permisos y permitan editar correos adicionales.
2. **Ponderaciones y correos adicionales**
   - Diseñar flujo para cambiar ponderaciones a partir de fechas específicas y documentar reglas.
   - Evaluar soporte multi-correo por integrante + validaciones.
3. **Dashboard administrativo (propietario)**
   - Definir secciones mínimas y fuentes de datos para llevar el prototipo a Netlify.
4. **Deploy & QA**
   - Preparar build de frontend y desplegar en Netlify para validar integración con Cloud Functions.
   - Documentar resultados de QA (capturas, hallazgos) en README/DOCUMENTACION.
5. **Seguimiento Dark Serenity**
   - Priorizar componentes críticos (navbar, cards, badges) según la guía `docs/dark-serenity-ui-guide.md`.

---

## Tareas previas (18/11/2025)

1. **Backend – `guardarCierreDiario`:**
   - Cerrar contrato definitivo del payload y validar duplicados por `referenceDateKey`.
   - Implementar normalización + cálculo (penalizaciones, redistribución, netos por integrante).
   - Persistir snapshot completo y actualizar agregados del restaurante.
   - Preparar respuesta (`totals`, `pendingTotals`, `contactEmailStatus`) y casos de error estandarizados.
2. **QA y pruebas manuales:**
   - Escenarios con penalizaciones porcentuales, ajustes generales y correos opcionales.
   - Confirmar que el frontend actual recibe los nuevos totales sin romper el flujo de liquidación (PDF y bloqueo de fechas ya funcionales).
3. **Seguimiento post-backend:**
   - Documentar endpoints/herramientas para que el frontend conecte (`useCierreDiario` y dashboard).
   - Coordinar la habilitación del indicador "Total no liquidado" en el dashboard una vez que `pendingTotals` esté vivo.

## 1. Backend: Guardado de Cierre Diario
- Cerrar el diseño del payload de `guardarCierreDiario` incorporando los nuevos campos documentados (totales diarios, penalizaciones listadas, email opcional).
- Modelar la colección `registros_diarios` asegurando snapshots con: montos por persona, desglose diario, transbank, penalizaciones/ajustes y correo del restaurante que recibirá la liquidación.
- Implementar la lógica de cálculo en backend alineada con el reparto actual (descuentos globales redistribuidos sólo entre quienes no tienen penalizaciones activas).
- Actualizar acumulados del restaurante tras cada registro (totales no liquidados, días pendientes, histórico de correos enviados).
- Retornar identificador del registro, totales acumulados y errores de validación estandarizados.

## 2. Frontend: Integración con la nueva API
- Ajustar el formulario de Cierre Diario para enviar datos crudos y el email opcional del restaurante cuando corresponda.
- Manejar respuesta del backend (guardar vs. pagar): mostrar errores, refrescar totales y preparar payload para correos/CSV.
- Añadir botón "Guardar" (estado pendiente) además del flujo "Pagar".
- Validar responsive y accesibilidad de las nuevas tablas (desglose diario y penalizaciones).

## 3. Dashboard de Liquidación (Fase 3)
- Card de "Total No Liquidado" con totales del rango seleccionado y resaltado del saldo enviado por correo.
- Modal de selección de rango para ejecutar pago/descarga y disparar correo al email del restaurante.
- Definir interacción con `liquidarPeriodo` para marcar cierres liquidados y registrar evidencia (correos enviados, archivo CSV/PDF generado).

## 4. Trazabilidad y Auditoría
- Versionar configuración usada (porcentajes, staff, deducciones y correo receptor) dentro del snapshot.
- Registrar quién guardó cada cierre y timestamps.
- Definir estrategia para disparar correos automáticos (staff y correo del restaurante) con adjunto CSV/PDF.

## 5. Ajustes paralelos y ponderaciones
- Diseñar el flujo para aplicar ajustes puntuales sobre ponderaciones diarias (inputs, límites, validaciones).
- Calcular efecto real sobre `netAmountAdjusted` y actualizar `useClosuresDashboard` para mostrarlo.
- Validar formularios para evitar ponderaciones negativas o inconsistentes.

## 6. Pendientes adicionales de frontend
- Indicador en dashboard para mostrar ajustes recientes y su impacto en el total no liquidado.
- Revisar accesibilidad de las nuevas tablas (penalizaciones, desglose diario) y badges en `ClosureDetailPage`.
- Planificar pruebas manuales para ajustes generales vs. individuales (guía QA).

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
  - Exponer un helper que construya el payload `LiquidacionMemberSummary[]` + penalizaciones para CSV y correo.
  - Añadir botón de "Exportar resumen" que por ahora registre por consola o descargue CSV.

- **Preparar resumen para correos**
  - Definir el template por integrante (nombre, rol, rango, monto total, desglose de descuentos, penalizaciones, transbank).
  - Confirmar origen de los correos del staff (`staffId` → documento en Firestore) y usar el nuevo email opcional del restaurante como copia.

- **Confirmación de liquidación**
  - Diseñar API/Cloud Function `liquidarPeriodo` para marcar cierres y generar reporte (CSV/PDF) + registro de correo enviado.
  - Definir la UX posterior (estado de éxito, bloqueo de cierres liquidados, refresco del dashboard).

- **Mejoras de calendario**
  - Restringir selección a días con cierres pendientes y actualizar la leyenda para explicar colores/estados.

## 9. Gestión centralizada de personal

- **Conectar altas desde `/dashboard/personal` con el cierre diario**
  - Consumir la misma transformación que usa `InitialSetupPage` para garantizar que las ponderaciones/porcentajes mantengan el formato esperado.
  - Sincronizar inmediatamente tras guardar para que el dashboard refleje los nuevos integrantes sin requerir reload manual.
- **Notas de UX**
  - Mostrar un badge en cada tabla indicando cuántos integrantes están inactivos y permitir filtrarlos rápidamente.
  - Añadir confirmación al eliminar integrantes (modal ligero) para evitar eliminaciones accidentales.
- **Permisos**
  - Analizar si conviene admitir más de un `staffEditor` y exponerlo en esta misma vista (evitar volver al setup).

## Nuevas tareas identificadas (19/11/2025)

1. **Dashboard principal**
   - Cambiar el CTA de "Editar personal" por "Añadir personal".
   - Agregar un segundo botón para "Editar personal" que abra la vista existente.
   - Definir navegación con parámetros (section=add|edit) para aterrizar en la sección deseada.

2. **Gestión de personal (`/dashboard/personal`)**
   - Implementar accesos rápidos dentro de la página que permitan alternar entre añadir y editar integrantes.
   - Mostrar listado completo de personal con acciones para editar correos adicionales por integrante.
   - Diseñar flujo para actualizar ponderaciones a partir de una fecha específica (o plan alternativo si no se puede modificar el histórico).

3. **Ajustes avanzados**
   - Evaluar soporte para añadir múltiples correos por integrante para notificaciones futuras.
   - Documentar reglas de negocio para ajustar ponderaciones "post fecha" y su impacto en cálculos históricos.

4. **Dashboard administrativo (propietario)**
   - Bocetar secciones: overview económico, permisos, auditorías y métricas de uso.
   - Identificar datos necesarios desde Firestore para alimentar este dashboard.

5. **Plan de commits y build**
   - Ejecutar `npm run build` antes de cualquier commit.
   - Preparar **Commit A**: documentación UI (ej. `docs/dark-serenity-ui-guide.md`) + ajustes relacionados.
   - Preparar **Commit B**: resto de cambios funcionales del día (dashboard, hooks, etc.).
   - Confirmar que cada commit se acompaña de notas de QA/manual (capturas o descripciones en README/DOCUMENTACION).

> Nota: hasta implementar las tareas anteriores, no volver a tocar `StaffManagementPage.tsx` para evitar corrupción del componente original.
