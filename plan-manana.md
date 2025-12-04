# Plan de trabajo

> Actualizado: 3 de diciembre de 2025

---

## 🔥 PRIORIDAD ALTA: Sistema de Autenticación y Roles

**Contexto**: Se documentó completamente el sistema de auth en `PLAN-AUTH-ROLES.md` (1,477 líneas). Los componentes base están implementados pero requieren refactorización para cumplir con la Ley 20.549 chilena sobre propinas.

### Fase 1: Refactorización de componentes existentes (Semana 1)

1. **AuthContext - Consultar roles desde Firestore**
   - Actualizar `AuthContext.tsx` para consultar `/users/{uid}` después del login
   - Exponer `userRoles: { siteRoles: [], restaurantRoles: {} }` en el contexto
   - Registrar `lastLogin` timestamp en Firestore al autenticar
   - **Archivos**: `src/context/AuthContext.tsx`

2. **RegisterPage - Cambiar estructura de datos**
   - Cambiar collection de `adminUsers` → `users`
   - Eliminar rol hardcodeado `"operador"`
   - Agregar selector de tipo de cuenta: "Propietario" vs "Trabajador"
   - Implementar `sendEmailVerification()` después del registro
   - Validación de password fuerte: ≥8 chars, 1 mayúscula, 1 número
   - Redirección condicional: propietarios → `/setup`, trabajadores → `/pending`
   - **Archivos**: `src/auth/RegisterPage.tsx`

3. **LoginPage - Redirección inteligente y verificación**
   - Consultar roles después del login exitoso
   - Redirección según roles:
     - Si tiene `siteRoles` → `/admin`
     - Si tiene `restaurantRoles` → `/dashboard`
     - Si no tiene roles → `/setup`
   - Verificar `emailVerified` y mostrar banner si no está verificado
   - **Archivos**: `src/auth/LoginPage.tsx`

4. **Cloud Function `onUserCreate`**
   - Crear trigger que se ejecute al registrar nuevo usuario
   - Inicializar documento en `/users/{uid}` con estructura base
   - Estructura: `{ uid, email, displayName, siteRoles: [], restaurantRoles: {}, createdAt, isActive: true }`
   - **Archivos**: `functions/src/triggers/onUserCreate.ts` (nuevo)

### Fase 2: Protección de rutas y permisos (Semana 2)

5. **Hook `usePermissions`**
   - Implementar hook para validar permisos granulares
   - Exponer `hasPermission(permission)` y `hasSiteRole(role)`
   - Mapear roles → permisos según `PLAN-AUTH-ROLES.md`
   - **Archivos**: `src/hooks/usePermissions.ts` (nuevo)

6. **Componente `ProtectedRoute`**
   - Guard de autenticación y roles
   - Props: `requireSiteRole`, `requireRestaurantRole`, `restaurantId`
   - Redireccionar a `/auth/login` si no autenticado
   - Redireccionar a `/unauthorized` si no tiene permisos
   - **Archivos**: `src/router/ProtectedRoute.tsx` (nuevo)

7. **Actualizar rutas en `AppRouter.tsx`**
   - Proteger `/cierre` → solo `closure_editor`
   - Proteger `/dashboard/liquidacion` → `closure_editor` o `liquidator`
   - Proteger `/admin/*` → `super_admin` o `admin`
   - **Archivos**: `src/router/AppRouter.tsx`

### Fase 3: Firestore Security Rules (Semana 3)

8. **Implementar Security Rules completas**
   - Reglas para `/users/{uid}` (solo el usuario puede leer su propia data)
   - Reglas para `/restaurants/{restaurantId}` (owner puede leer, closure_editor puede escribir)
   - Reglas para `/registros_diarios/{closureId}` (bloquear escritura a owner)
   - Reglas para `/liquidaciones/{liquidacionId}` (closure_editor y liquidator pueden crear)
   - **Archivos**: `firestore.rules`

### Fase 4: Testing (Semana 4)

9. **Tests unitarios**
   - `LoginPage.test.tsx` - validaciones, errores de Firebase
   - `RegisterPage.test.tsx` - validaciones, passwords coinciden
   - `usePermissions.test.tsx` - permisos por rol
   - Target: 80% coverage
   - **Herramientas**: Vitest + React Testing Library

10. **Tests E2E**
    - Flujo completo: registro → verificación → login → dashboard
    - Intentos de acceso sin permisos
    - **Herramientas**: Playwright

### Tareas opcionales (prioridad baja)

11. **Recovery/Reset Password page**
    - Formulario de recuperación con `sendPasswordResetEmail`
    - Página de confirmación con link temporal

12. **Email Verification page**
    - Banner recordatorio para verificar email
    - Botón para reenviar verificación

13. **Setup/Onboarding pages**
    - `/setup` para propietarios (crear restaurante, invitar staff)
    - `/pending` para trabajadores (esperar invitación)

---

## 📋 TAREAS PENDIENTES (menor prioridad)

### Deducción grupal (pospuesta)

## Mañana · 29/11/2025

1. **Deducción grupal – UI y estado**
   - Agregar botón "Deducción grupal" en el bloque de venta directa y construir el `Dialog` con nombre opcional, tipo (monto/%), valor y selección de destinatarios.
   - Persistir las deducciones en `useCierreDiario` mediante un nuevo arreglo `groupDeductions` con helpers para crear/editar/eliminar.
2. **Cálculos y snapshot**
   - Ajustar los montos asignados (`directAssignedAmounts`) restando las deducciones según su tipo antes de generar el snapshot.
   - Registrar el detalle en `assignmentsSnapshot` para que la deducción aparezca en dashboards, PDF y futuras liquidaciones.
3. **QA y documentación**
   - Casos manuales: crear deducción de monto fijo aplicada a todos, otra porcentual solo para un garzón y validar que los netos nunca queden negativos.
   - Actualizar `DOCUMENTACION.md` con el flujo completo (capturas del modal, chips/resumen) y anotar pasos de prueba.

## Mañana · 27/11/2025

1. **Venta directa — cierre diario y snapshots**
   - Propagar `deduccion_nombre` y `deduccion_descripcion` hacia `useCierreDiario`, snapshot y payload de `guardarCierreDiario` para que queden registrados en Firestore.
   - Actualizar `closureCalculations` / `ClosureDetailPage` para mostrar el nombre y la descripción en las tablas e históricos.
2. **Documentación + UI**
   - Capturar pantallas del nuevo registro de venta directa (card alineada + modal con nombre/nota) y añadirlas a `DOCUMENTACION.md`.
   - Escribir pasos de QA: registrar venta directa con deducción nombrada, editar cierre y verificar persistencia.
3. **QA técnico**
   - Correr `npm run lint && npm run build` para asegurar que las importaciones nuevas no rompen el pipeline.
   - Revisar regresiones visuales en modo oscuro (contenedores y badges de ponderación).

## Mañana · 24/11/2025

1. **Liquidación por venta directa — definición funcional**
   - Documentar reglas: un cierre es exclusivo de un modo (`pool` o `directa`), cada garzón cobra sólo lo que vendió y se le aplican descuentos configurables (porcentaje + valor fijo tipo anfitriona).
   - Identificar en `configurationSnapshot` qué campos podemos reutilizar (cards actuales de gastos, ajustes) y qué nuevos necesitamos (`directSales.percentageFee`, `directSales.fixedFee`, descripciones).
   - Asegurar que las cards/resúmenes existentes puedan mostrar el modo seleccionado sin duplicar componentes (reutilizar cards del dashboard y modal de liquidación con toggle de modo).

2. **Backend: extensión de `liquidarPeriodo` para venta directa**
   - Validar que el payload incluya `mode: "directa"`, totales y descuentos aplicables; rechazar mezclas de modos.
   - Reutilizar la lógica de snapshots actual para marcar cierres pagados, agregando `directSalesAdjustments` y registrando cuánto se descontó a cada garzón.
   - Generar un `liquidacionId` por modo/ciclo para que el historial de liquidaciones (cards/tablas ya existentes) muestre los ciclos directos sin nuevas vistas.

3. **Hooks y UI**
   - `useClosuresDashboard` / `useLiquidacionWorkflow`: agregar selector de modo (pool vs. venta directa) reutilizando el mismo calendario y cards, filtrando cierres según `mode`.
   - `PaidSettlementsPage` / cards del dashboard: mostrar badge de modo y permitir filtrar (reutilizar tabla actual cambiando sólo labels).
   - Modal de detalle: aprovechar el componente existente para listar días y añadir filas de descuentos específicos (porcentaje/fijo) sólo cuando el modo sea "directa".

4. **Documentación y QA**
   - Incluir en `DOCUMENTACION.md` el flujo de venta directa, ejemplos de descuentos y capturas reutilizando las mismas cards.
   - Preparar casos de prueba: liquidación diaria directa, liquidación por ciclo y verificación de descuentos aplicados en el modal y PDF.

---

## Histórico · 22/11/2025

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

---

## ✅ COMPLETADO RECIENTEMENTE

### 3 de diciembre de 2025

**Fix: Liquidación en modo venta directa** ✅
- **Problema**: Error 400 INVALID_PAYLOAD al liquidar cierres en modo "directa"
- **Causa**: No se enviaba `directSalesAdjustments` en el payload
- **Solución**: Extraer `directSalesAdjustmentsSnapshot` del primer cierre y pasarlo al payload
- **Archivos**: `src/appPropinaSegura/dashboard/hooks/useLiquidacionWorkflow.ts`
- **Commit**: `bbe6168` - "fix: incluir directSalesAdjustments en payload de liquidación modo directa"

**Documentación: Sistema de Autenticación y Roles** ✅
- Creado `PLAN-AUTH-ROLES.md` (1,477 líneas)
- Análisis completo de componentes existentes (LoginPage, RegisterPage, AuthContext)
- Diseño de sistema de roles conforme a Ley 20.549 chilena
- Definición de Site Roles (admin del sitio) y Restaurant Roles (operativos)
- Ejemplos de código, tests, Firestore Rules, rate limiting
- **Commit**: `bbe6168` - incluido en el mismo commit

### 28 de noviembre de 2025

**Venta directa en liquidaciones + Admin overview + Deducciones nombradas** ✅
- Backend: soporte completo para liquidar en modo 'directa' con descuentos configurables
- Frontend: filtros por modo, badges y previsualización de ajustes en liquidación
- Admin: hook `useAdminOverview` con métricas en vivo desde Firestore
- Cierre diario: campos para nombre y descripción de deducciones individuales
- Dashboard: columna 'Modo' y 'Venta directa' en liquidaciones pagadas
- Docs: actualización de `plan-manana.md` y `DOCUMENTACION.md` con estado actual
- **Commit**: `1a0d533`

---

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
