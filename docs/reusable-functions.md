# Reutilización de funciones y hooks clave

Este archivo resume los bloques que ya implementamos para que, antes de construir algo nuevo, verifiquemos si podemos reutilizarlos o extenderlos.

## `useClosuresDashboard`
- **Ubicación:** `src/appPropinaSegura/dashboard/hooks/useClosuresDashboard.ts`
- **Qué expone:**
  - `closures`: todos los cierres (pendientes e históricos) con `metadata.referenceDate`, `estado`, `assignments`, `adjustments`.
  - `pendingClosures`: filtro directo `estado === "pendiente"`.
  - `historicalClosures`: alias de `closures` para vistas históricas.
  - `summary`: totales acumulados (propinas, neto, transbank, descuentos, cantidad de pendientes).
  - `aggregates`: acumulado por staff (`totalNeto`, `totalNetoAjustado`, etc.).
  - `refresh`: vuelve a consultar Firestore.
- **Uso típico:** dashboard general, Liquidación, y ahora el calendario de cierres para colorear días según `estado`.

## `DateRangePicker`
- **Ubicación:** `src/appPropinaSegura/component/dashboard/date-range-picker.tsx`
- **Props clave:**
  - `dateRange` (`{ from?: Date; to?: Date }`) y `setDateRange`.
  - `highlightedDates?: Date[]` → usa `Calendar` con `modifiers.hasClosure` para pintar días en verde.
- **Reutilización:** cualquier componente que necesite seleccionar un rango con días destacados puede usar este picker directamente (ya trae formato con `es` y estilos consistentes con Liquidación).

## `closureCalculations`
- **Ubicación:** `src/appPropinaSegura/dashboard/utils/closureCalculations.ts`.
- **Helpers incluidos:**
  - `normalizeReferenceDate` → evita corrimientos por zona horaria.
  - `buildClosureHighlights` → devuelve fechas pendientes, liquidadas y último cierre (ya lo usan Liquidación y CierreDiario).
  - `summarizeClosures` → totales globales (neto, descuentos, propinas, transbank, integrantes únicos).
  - `aggregateMembersFromClosures` → detalle por integrante con neto ajustado, penalizaciones, deducciones y ajustes (monto + %).
- **Reutilización:** cualquier vista o reporte que necesite totales, detalle por integrante o calendario coloreado debe apoyarse en estos helpers antes de escribir lógica nueva.

> Próximos pasos sugeridos: extraer estos helpers a un módulo `calendar-utils.ts` si empezamos a usarlos en más de dos pantallas.
