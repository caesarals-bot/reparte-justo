## Gestión de personal (StaffManagementPage)

### Componentización y flujo actual
- **Archivo**: `src/appPropinaSegura/staff/StaffManagementPage.tsx`.
- Las acciones de edición y eliminación comparten la lógica contenida en `useStaffManagement` y solo utilizan estados locales mínimos para controlar popovers de calendario.
- La tabla consolidada muestra tanto staff de servicio como de apoyo con etiquetas, estados y accesos a las acciones.

### Hook `useStaffManagement`
- **Archivo**: `src/appPropinaSegura/staff/hooks/useStaffManagement.ts`.
- Encapsula:
  - Fetch inicial desde `restaurants/{uid}` (servicio, apoyo, editores y `settlementMode`).
  - Estado de modal (`editModal`, `modalDraft`, `modalError`) y de confirmación (`pendingDelete`).
  - Validaciones de ponderación/correo a través de `validateMemberDraft`.
  - Handlers de edición (`handleModal*`, `handleModalSave`) y eliminación (`openDeleteDialog`, `confirmDeleteMember`).
  - Persistencia inmediata mediante `persistStaffChanges`, que escribe en Firestore y actualiza indicadores `isSaving`, `saveError`, `saveSuccess`.
  - Control de permisos (`canManageStaffEditors`, `staffInputsDisabled`) reutilizando `useStaffEditors`.

### Persistencia inmediata
- Al confirmar un borrado o guardar en la modal, el hook sincroniza el estado local con Firestore de inmediato.
- Se bloquean interacciones mientras `isSaving` está activo para evitar condiciones de carrera; el botón de confirmación en `AlertDialog` y los popovers se deshabilitan automáticamente.
- Los mensajes de éxito/error del guardado se muestran en `StaffManagementPage` reutilizando `saveError` / `saveSuccess` y pueden consumirse también desde otros componentes si fuese necesario.

### Reutilización
- Componentes futuros que necesiten listar o administrar staff pueden importar `useStaffManagement` y reutilizar `categorizedStaff`, `openEditModal`, etc., sin replicar lógica de Firestore.
- `persistStaffChanges` admite parámetros opcionales, lo que habilita operaciones masivas (p. ej. reordenar ponderaciones) manteniendo un único punto de escritura.

- La edición y eliminación dentro de esta página se actualiza automáticamente tras confirmar, disparando `persistStaffChanges` en el hook para reflejar los cambios en Firestore sin depender de botones globales.
# Documentación Técnica

## Resumen del Proyecto
ReparteJusto es una aplicación frontend construida con React, TypeScript y Vite que permite a restaurantes gestionar de forma transparente la distribución de propinas. El proyecto se centra en entregar una experiencia moderna, responsiva y accesible, apoyada en componentes de Shadcn/UI.

## Arquitectura de Páginas

| Ruta | Descripción | Componentes Clave |
|------|-------------|-------------------|
| `/` | Landing responsiva con héroe, características y navegación global. | `NavBar`, `HeroPage`, `FeaturesPage`, `Footer`. |
| `/setup` | Configuración inicial con tabs para definir modo de liquidación y gestionar staff. | `InitialSetupPage`, `Tabs`, `Card`, `RadioGroup`, tablas responsive. |
| `/cierre` | Pantalla de cierre diario que muestra ambos flujos (Pocillo y Venta Directa). | `CierreDiarioPage`, `Calendar`, `Checkbox`, tablas comparativas. |
| `/auth/login` | Formulario de inicio de sesión con validación básica. | `LoginPage`, `Card`, `Button`, inputs accesibles. |
| `/auth/register` | Registro con campos adicionales, confirmación y validaciones mínimas. | `RegisterPage`, `Card`, `Button`, inputs accesibles. |

## Componentes Reutilizables
- **NavBar**: navegación sticky con comportamiento móvil (menú hamburguesa, bloqueo de scroll, cierre por *Escape*).
- **Footer**: enlaces a secciones principales y disposición responsiva.
- **Cards / Tabs / Calendar**: provenientes de Shadcn/UI, estilizados con Tailwind y aprovechados para formularios estructurados.
- **useStaffManagement**: hook especializado para la página de gestión de personal (ver sección dedicada más abajo). Centraliza estados, efectos y persistencia inmediata sobre Firestore, evitando lógica duplicada en los componentes de UI.

## Flujo de Configuración Inicial
1. **Modo de Liquidación**
   - Opciones: `Pocillo / Pozo Común` y `Venta Directa del Garzón`.
   - Configuración condicional:
     - *Pocillo*: porcentajes para cocina, transbank y descuentos adicionales dinámicos (nombre + porcentaje).
     - *Venta Directa*: porcentaje directo al garzón con nota informativa.
2. **Gestión de Personal**
   - Formularios independientes para staff de servicio y de apoyo.
   - Calendario para fecha de ingreso.
   - Tabla con acciones básicas (eliminar) y estado local simulado (`crypto.randomUUID`).

## Flujo de Cierre Diario
- **Modo Pocillo**
  - Calendar, monto bruto del día y tablas de asistencia con columnas para penalización (%) y deducción ($) por colaborador tanto en servicio como cocina.
- **Modo Venta Directa**
  - Calendar, registro de montos individuales por garzón con penalización y deducción; asistencia del staff secundario con ponderaciones y descuentos monetarios.
- **Botón global** para guardar (pendiente de link a API real).

### Hook `useCierreDiario`
- **Archivo**: `src/appPropinaSegura/cierre/hooks/useCierreDiario.ts`.
- Responsabilidades principales:
  - Inicializar el formulario del cierre (staff, fechas, totales, configuraciones versionadas) con `react-hook-form` y `useFieldArray` para cada tipo de asistencia.
  - Calcular totales derivados (`poolTotalAmount`, `totalDirectSales`, `netAfterDeductions`, `generalExpenseTotal`, montos asignados por staff) y exponerlos para UI/resumen.
  - Construir el payload (`buildClosureSnapshotPayload`) que se envía a `guardarCierreDiario`, incluyendo snapshots de staff, configuraciones, `generalExpenses` y metadatos (`referenceDateKey`, `daysWithoutSettlement`).
  - Administrar el flujo de edición (cargar cierre existente, marcar cuando el original se elimina, limpiar estado al terminar) mediante `editingState`, `isHydratingFromClosure` y helpers (`loadClosureForEditing`, `markEditingOriginalDeleted`, `clearEditingState`).
  - Exponer banderas de guardado (`isSavingClosure`, `saveError`, `saveSuccessMessage`), reseteo (`resetAfterSave`) e información auxiliar (`ineligibleStaffNames`).

#### Soporte para gastos generales múltiples
- `generalExpenses` es un `useFieldArray` con entradas `{ entryId, nombre, tipo, monto }` Validadas por Zod.
- `generalExpenseEntries` y `generalExpenseTotal` se calculan con `useWatch` + `useMemo` y se restan del reparto a garzones/kitchen antes de construir el snapshot.
- Cuando se edita un cierre antiguo que solo tenía `gastoGeneral` numérico, el hook genera un fallback con una entrada única para mantener compatibilidad.
- Cada snapshot guardado expone tanto el total (`totals.generalExpense`) como el arreglo completo `generalExpenses`, lo que habilita mostrar el desglose en dashboard, detalle y futuros reportes.

### Visualización de gastos generales en dashboard y detalle
- `ClosureDetailPage` muestra ahora una tarjeta dedicada con el total de gasto general y el listado de cada partida (nombre, tipo, monto), manteniendo trazabilidad aunque el cierre se haya creado antes de la nueva UI.
- `DashboardPage` agrega un grupo de deducción "Gasto general" dentro de la sección de pendientes, acumulando los montos registrados por día y mostrando un breakdown resumido.
- Esta información se alimenta directamente desde `useClosuresDashboard`, que normaliza las entradas históricas para evitar duplicados y preservar compatibilidad hacia atrás.

#### Advertencia cuando el neto ≤ 0
- `buildClosureSnapshotPayload` calcula `dailySummary.netAfterDeductions`; en la página, antes de guardar se revisa este valor.
- Si el neto es cero o negativo, la UI abre un `AlertDialog` que muestra el monto resultante y exige confirmación explícita antes de llamar a `guardarCierreDiario`.
- El hook no bloquea el guardado, pero expone `netAfterDeductions` para que la capa de presentación implemente las políticas necesarias.

### Guardar un cierre
- **Archivo principal**: `src/appPropinaSegura/cierre/CierreDiarioPage.tsx` con lógica central en `useCierreDiario`.
- Los totales y snapshots se generan a través de `buildClosureSnapshotPayload`. El payload incluye: configuraciones vigentes, snapshot de staff, asignaciones y metadatos (`referenceDateKey`, `daysWithoutSettlement`).
- La función `guardarCierreDiario` (cliente en `src/appPropinaSegura/cierre/services/closuresApi.ts`) llama al Cloud Function homónimo para persistir el cierre y recalcular los totales pendientes del restaurante.

### Eliminar un cierre
- **Backend**: Cloud Function `eliminarCierreDiario` (`functions/src/handlers/eliminarCierreDiario.ts`) valida que el cierre esté pendiente, revierte los pendientes diarios y escribe un registro de auditoría.
- **Frontend**: `ClosureDetailPage` utiliza `useClosureDetail` para disparar `eliminarCierreDiario` mostrando un `AlertDialog` con motivo obligatorio. Tras eliminar, refresca el dashboard y redirige a `/dashboard`.

### Editar un cierre (delete + replace)
- **Motivación**: modificar cierres históricos requiere mantener trazabilidad; por ello se aplica un flujo "eliminar y volver a crear" para evitar inconsistencias en agregados.
- **Carga para edición**: desde `ClosureDetailPage` se navega a `/cierre?closureId=XYZ`. `useCierreDiario` lee dicho parámetro, consulta el cierre en Firestore y rellena el formulario con los snapshots almacenados (asistencia, montos, gasto general, configuraciones y modo).
- **Guardado**: al presionar "Guardar" en modo edición, `CierreDiarioPage` invoca `eliminarCierreDiario` sobre el cierre original (con un motivo fijo) y luego vuelve a llamar `guardarCierreDiario` con el nuevo snapshot. Si el borrado falla no se crea un duplicado, manteniendo atomicidad lógica.
- **Estado UI**: se muestran banners y estados de carga específicos (`isHydratingFromClosure`, `editingState.hasDeletedOriginal`) para prevenir acciones duplicadas y comunicar al usuario que el cierre previo será reemplazado.
- **Post-proceso**: tras un guardado exitoso se limpian los parámetros de búsqueda, se resetea la forma y se obliga a un `refreshClosures()` para reflejar el cierre recién creado en el dashboard.

## Estado y Datos
- Se utilizan `useState` y estructuras mock para formularios y tablas.
- No hay integración con API aún; se recomienda conectar con backend o contexto global en próximas iteraciones.

## Accesibilidad y UX
- Todos los inputs cuentan con `Label`, `aria-label` donde corresponde y `tabIndex` explícitos según guía del proyecto.
- El menú móvil bloquea el scroll y responde al teclado (Escape).
- Tablas extensas cuentan con *scroll* horizontal controlado (`overflow-x-auto`) para mantener legibilidad en pantallas móviles.

## Próximos Pasos Recomendados
1. Conectar formularios con endpoints reales y manejar estados de carga/éxito.
2. Persistir configuraciones dinámicas (descuentos, staff) en almacenamiento remoto.
3. Añadir mensajes de validación y *toast* de confirmación (Shadcn `sonner`).
4. Incorporar pruebas unitarias para componentes clave y flujos críticos.

## Ajustes paralelos en cierres diarios

### Modelo de datos
- Los ajustes se almacenan en la subcolección `restaurants/{restaurantId}/registros_diarios/{closureId}/ajustes`.
- Cada documento sigue la forma:
  ```ts
  type ClosureAdjustment = {
    id: string
    staffId?: string
    staffName?: string
    amount: number
    type: "incremento" | "descuento"
    motivo?: string
    createdAt?: Timestamp | null
    createdBy?: string
  }
  ```
- `type` determina el signo: `descuento` resta del neto y `incremento` lo suma.
- `staffId` puede omitirse para ajustes generales; se obtiene el identificador mediante `buildMemberIdentifier`.

### Hook `useClosuresDashboard`
- Archivo: `src/appPropinaSegura/dashboard/hooks/useClosuresDashboard.ts`.
- Nuevas utilidades exportadas:
  - `fetchClosureAdjustments(restaurantId, closureId)` para leer la subcolección con `orderBy("createdAt", "desc")`.
  - `createClosureAdjustment({ restaurantId, closureId, adjustment })` para registrar un nuevo ajuste con `serverTimestamp()`.
  - `mapSnapshotToClosure` ahora acepta ajustes precargados y los expone en `ClosureDocument.adjustments`.
- El hook agrega `totalAjustes` a los agregados por colaborador (`StaffAggregate`) sumando o restando según el tipo de ajuste.
- `refresh` recarga cierres y ajustes para mantener el dashboard sincronizado tras crear un ajuste desde otras vistas.

### Página `ClosureDetailPage`
- Archivo: `src/appPropinaSegura/dashboard/ClosureDetailPage.tsx`.
- Se incorporó un `Dialog` para registrar ajustes con los campos:
  - Integrante (selector de presentes + opción "Aplicar ajuste general").
  - Tipo (`descuento` o `incremento`).
  - Monto numérico positivo.
  - Motivo opcional.
- Los handlers controlan validaciones básicas, muestran feedback y llaman a `createClosureAdjustment`.
- Tras guardar, se refresca la lista de ajustes con `refreshClosureAdjustments()` y se dispara `useClosuresDashboard().refresh()`.
- El resumen financiero ahora incluye:
  - Total de ajustes registrados (formato con signo).
  - Neto ajustado (`totals.netAfterDeductions + totalAdjustments`).
- Se agregó una tarjeta "Historial de ajustes" con orden descendente por `createdAt`, mostrando motivo y autor.
- Cada integrante del cierre muestra:
  - Neto original (snapshot).
  - Total de ajustes aplicados.
  - Neto ajustado final.

### Consideraciones de UX
- El modal se cierra al guardar o cancelar y resetea el formulario.
- Se muestran alertas de éxito/error sobre la tarjeta de resumen para contextualizar el estado del último envío.
- Los badges permiten distinguir rápidamente ajustes positivos vs negativos.

### Verificación manual
1. Navegar al dashboard, abrir un cierre y pulsar "Registrar ajuste".
2. Registrar un descuento a un integrante específico y confirmar que el historial y los totales reflejan el nuevo valor.
3. Registrar un ajuste general positivo y validar que el resumen financiero actualiza el "Total neto ajustado".
4. Recargar la página y verificar que los ajustes persisten (lectura desde Firestore).
5. Ejecutar `npm run build` para garantizar que no existan errores de tipo.

## Reglas de negocio: ponderaciones y ajustes

### Ponderaciones base
- Cada integrante (garzón o cocina) tiene una **ponderación base** definida en la configuración de staff.
- Regla general: la ponderación base **no puede ser mayor a 1.0**.
- Cambios permanentes de ponderación (por antigüedad o cambio de rol) se deben registrar explícitamente en la configuración, no como ajustes diarios.

### Ajustes diarios sobre ponderación / desempeño
- Casos típicos: un integrante con ponderación `0.5` que trabajó más en un día concreto puede recibir un ajuste que refleje un "salto" temporal hacia `0.75`.
- Ese tipo de reconocimiento se modela como **ajuste de porcentaje o monto** en el cierre del día, **no** modificando la ponderación base.
- En cierres futuros, si se decide subir la ponderación base (por ejemplo, de 0.5 a 0.75 de forma permanente), debe quedar documentada la fecha y el motivo en la configuración, y no mezclarse con los ajustes diarios.

### Suma cero dentro del grupo
- Para cada cierre y grupo (servicio, cocina, venta directa):
  - Descuentos porcentuales reducen el neto del integrante sancionado.
  - El monto descontado se redistribuye al resto del grupo **sin penalizaciones** y sin ajustes porcentuales propios.
  - La redistribución es proporcional al neto base de cada integrante elegible.
- Propiedad: la suma de los `netAmountAdjusted` de un grupo es igual a la suma de los `netAmount` originales del grupo (no queda dinero "volando").

### Card "Ajustes registrados" en el dashboard
- El dashboard muestra una tarjeta compacta de **"Ajustes registrados"** para los cierres pendientes.
- Esta card resume únicamente **descuentos efectivos en CLP** (monto + porcentaje), por integrante o ajustes generales.
- Ajustes que solo incrementan propina (bonos) **no se suman** en el total de la card, aunque sí se reflejan en el neto ajustado y en los pools de distribución.
- Cada fila de la card incluye:
  - Nombre del integrante (o "Ajuste general").
  - Monto del descuento en pesos.
  - Etiqueta corta con porcentaje (si lo hay) y primeras palabras del motivo.

### Regla de fechas para ajustes y liquidación

- Cada ajuste se asocia siempre a un **cierre diario específico** (la "foto" del día) mediante su `closureId`.
- La fecha que **manda para la liquidación** es la `referenceDate` del cierre:
  - Si se registra un ajuste el día 14 sobre un cierre del día 11, ese ajuste pertenece al cierre del **11**.
  - Cuando se liquida un rango que incluye el 11, el cierre entra con su neto ya ajustado (incluyendo ese ajuste creado el 14).
- La propiedad `createdAt` del ajuste es **solo informativa** y se usa para el historial (orden cronológico, trazabilidad), pero **no cambia** a qué período de liquidación pertenece el ajuste.
- Esto garantiza que todas las correcciones sobre un cierre pasado se vean reflejadas en la siguiente liquidación que incluya la fecha de ese cierre, sin importar el día en que se registró el ajuste.

## Flujo propuesto: Liquidar y Generar Reporte

> Estado actual: el botón "Liquidar y Generar Reporte" aún no ejecuta lógica de negocio real; este apartado define el comportamiento esperado para una futura implementación.

### Selección de rango a liquidar
- Al pulsar **"Liquidar y Generar Reporte"** se abrirá un flujo guiado con calendario:
  - El calendario mostrará en un color destacado (ej. verde) los días con **cierres pendientes de liquidación**.
  - El usuario podrá seleccionar un rango continuo de fechas (desde `fechaInicio` hasta `fechaFin`).
  - Solo se permitirán rangos que incluyan cierres en estado `pendiente`.

### Cálculo previo a la liquidación
- Una vez elegido el rango:
  - Se muestran los totales agregados del período:
    - **Total a liquidar** (suma de netos ajustados para todos los integrantes en el rango).
    - **Total de descuentos** (Transbank + ajustes negativos).
    - **Total por grupo** (Pool Garzones, Pool Cocina) y número de integrantes.
  - El usuario podrá revisar un resumen por integrante (tipo tabla) con:
    - Neto acumulado en el período.
    - Ajustes y descuentos aplicados.

### Confirmación y efectos de la liquidación
- Al confirmar la liquidación:
  - Los cierres seleccionados se marcan como `liquidado` / `pagado` en Firestore.
  - Dejan de aparecer en la sección de "pendientes" del dashboard.
  - Si quedan cierres posteriores sin liquidar, estos serán el inicio del **nuevo ciclo**.
  - Se genera un **reporte descargable** (ej. PDF/CSV) con el detalle de distribución por integrante y grupo.

### Consideraciones futuras
- En iteraciones posteriores se deberá definir:
  - Integración con medios de pago o registro manual de que la propina fue efectivamente entregada.
  - Notificaciones opcionales al staff (email o canal interno) una vez ejecutada la liquidación.
  - Reglas de auditoría para modificaciones posteriores a una liquidación (ej. cierres reajustados).

## Estado actual de la página de Liquidación

- Existe una página dedicada de **Liquidación** accesible desde el dashboard mediante el botón "Liquidar y Generar Reporte".
- Esta pantalla funciona actualmente en modo **solo lectura** sobre los cierres en estado `pendiente`:
  - Permite seleccionar un **rango de fechas** usando un `DateRangePicker`.
  - El filtro se aplica sobre `metadata.referenceDate` de cada cierre (regla de fechas descrita más arriba).
  - Se muestran totales del período:
    - `Total a liquidar` (suma de `netAfterDeductions` de los cierres filtrados).
    - `Total descuentos` (suma de `deductionsAmount`).
    - Número de integrantes únicos presentes en el período.
- La sección "Detalle por integrante" resume, para el rango seleccionado:
  - Neto acumulado ya ajustado (`netAmountAdjusted ?? netAmount`) por persona y grupo.
  - Penalizaciones directas, deducciones y ajustes (porcentaje + monto) acumulados por integrante.
  - Todos los montos se muestran redondeados a pesos chilenos.
- El calendario de selección de rango destaca, con un color diferente, los días que tienen cierres pendientes (a partir de `referenceDate`), para facilitar elegir períodos con movimiento.
- El botón de **Confirmar liquidación** está deshabilitado por ahora; no se marcan cierres como liquidados ni se generan reportes automáticos todavía.

### Metadatos persistidos por liquidación (Nov 2025)

- Cada vez que `liquidarPeriodo` marca cierres como pagados, la función escribe dos campos adicionales en cada documento de `registros_diarios`:
  - `liquidacionRange`: objeto `{ from: string | null, to: string | null }` con el ISO del rango solicitado.
  - `liquidacionId`: hash derivado del rango (`from|to`) para agrupar cierres de la misma ejecución.
- Estos metadatos permiten reconstruir periodos liquidados para el dashboard histórico y facilitan generar reportes retroactivos sin reconsultar parámetros originales.

### Histórico de liquidaciones pagadas (PaidSettlementsPage)

- La vista `/dashboard/liquidaciones-pagadas` ahora consume los metadatos anteriores desde `useClosuresDashboard`.
- El hook expone `paidSettlementGroups`, agrupando cierres `estado = "pagado"` por `liquidacionId`/rango y consolidando totales (`netAfterDeductions`, `deductionsAmount`, `generalExpense`, `propinas`).
- La UI muestra:
  - Tarjetas por rango (`Liquidación de N días`) con monto repartido, descuentos y gasto general.
  - Botón "Ver detalles" que abre un `Dialog` reutilizando `buildDailyClosureSummaries` para listar cada día liquidadito con sus montos netos, descuentos y gasto general, emulando el PDF.
- Esta pantalla no se carga en el dashboard principal para mantenerlo liviano; solo se consulta bajo demanda.

## Tema "Dark Serenity" — avances UI (Nov 2025)

### Contexto
- **Objetivo**: unificar la experiencia visual del dashboard y staff management bajo la estética "Dark Serenity" (fondos profundos, brillo sutil y tipografías blancas de alto contraste).
- **Alcance actual**: NavBar, fondo global, dashboard principal (header, métricas pendientes, cards y liquidaciones históricas).

### Cambios realizados
1. **NavBar (`src/appPropinaSegura/component/navbar/NavBar.tsx`)**
   - Gradiente `from-[#0f172a] via-[#111827] to-[#0b1120]` con blur y borde translucido.
   - Tipografía ampliada (links a 0.95rem) y estado activo con glow `shadow-[0_0_20px_rgba(14,165,233,0.35)]`.
   - Avatar despliega sólo iniciales; nombre completo aparece en tooltip con `Popover`. Accesibilidad mejorada con `aria-label`.

2. **Fondo global (`src/index.css`)**
   - Variables CSS redefinidas (`--background`, `--muted`, `--card-foreground`) para tonos azul oscuro.
   - `body` aplica doble gradiente (radial + linear) y `backdrop-filter` consistente, generando contraste natural vs tarjetas.

3. **Cards de distribución (`payment-group-card.tsx`)**
   - Contenedores semitransparentes `bg-[rgba(17,20,33,0.9)]` con borde `white/12` y blur.
   - Iconos circulares con gradiente vertical y sombras internas.
   - Badges y textos ajustados a blanco puro, con subtítulos en `white/65` para jerarquía.

4. **Bloque "Liquidaciones Pasadas" (`historical-settlement.tsx`)**
   - Se replica el lenguaje visual de las cards principales (fondos translúcidos, insignias degradadas, botón redondeado con transición).
   - Los estados "PAGADO"/"PENDIENTE" usan degradados verdes/ámbar en lugar de colores planos.

5. **Header + métrica principal (`dashboard.tsx`)**
   - Header ahora usa panel difuminado con borde blanco/10.
   - Sección "Pendiente de Pago" transformada en tarjeta hero: título con tracking extendido, monto principal a 3rem, chips para descuentos y acciones.
   - Botones rápidos convertidos en "píldoras" (bordes redondeados, gradientes), alineados con el CTA "Liquidar y Generar Reporte".

### Lineamientos visuales derivados
- **Paleta**: base `#0b1120` con acentos `#38bdf8` (primary) y `#c084fc` (accent). Se evita fondo puro negro.
- **Tipografía**: títulos ≥ `text-2xl`, subtítulos en mayúsculas con `letter-spacing` amplio para acentuar el feel futurista.
- **Componentes**: todas las cards relevantes deberán incluir `border-white/[0.08-0.12]`, `bg-white/[0.04-0.08]` y `backdrop-blur` mínimo de 12px.
- **Interacción**: hover states iluminan bordes (`hover:border-primary/50`) y botones cambian el nivel de transparencia en lugar de color plano.

### Cierre Diario (`src/appPropinaSegura/cierre/CierreDiarioPage.tsx`)
- Loader/errores migrados a tarjetas translúcidas con blur y botones tipo píldora.
- Header del cierre usa panel blur con acciones redondeadas y sombra profunda, alineado al CTA del dashboard.
- Banners de éxito/error y alertas de staff no elegible aplican bordes y fondos semi-transparentes (rojo ámbar/verde) para mantener el glow.
- Resumen del último cierre enviado se transformó en tarjeta "glass" con tipografía iluminada y métricas en grid.
- Resumen numérico y cards internas (registro de pocillo, venta directa, asistencias) usan bordes `white/10`, fondos `white/5` y sombras `0_15px_35px`.
- Popovers y calendarios reciben contenedores oscuros con bordes y texto blanco.

### Próximos pasos sugeridos
1. Repasar componentes secundarios (staff modals, ajustes en `ClosureDetailPage`) para aplicar las mismas gradientes.
2. Incorporar iluminación suave en los `Dialog`/`AlertDialog` (aplicar `shadow-[0_30px_60px_rgba(3,6,23,0.65)]`).
3. Actualizar screenshots o mockups internos para QA visual y mantener consistencia con la guía Dark Serenity.

## Bitácora · 20/11/2025

- **Funciones Cloud (guardarCierreDiario)**
  - Se agregó control de CORS con lista blanca de orígenes (`localhost:5173`, `repartejusto.netlify.app`) devolviendo `Access-Control-Allow-Origin` dinámico y `Vary: Origin`.
  - Se desplegó la función con Firebase CLI y se habilitaron invocaciones públicas (`allUsers → Cloud Functions Invoker`).
  - QA de preflight: `OPTIONS https://us-central1-reparte-justo.cloudfunctions.net/guardarCierreDiario` respondió `204` con los headers esperados.
- **Problemas detectados**
  - El campo `gastoGeneral` (anfitriona/part-time) no se muestra ni impacta los totales en dashboard, detalle de cierre ni liquidación.
  - No existen acciones para editar o eliminar cierres almacenados; cualquier error obliga a duplicar el día.

## Bitácora · 19/11/2025

- **Staff Management & Setup**
  - `/dashboard/personal` ahora detecta el query param `?section=add|edit` para separar flujos de alta y edición, con botones tipo píldora que respetan el tema Dark Serenity.
  - Se sumó confirmación de eliminación y guardado inmediato (Firestore) en ediciones dentro del modal.
  - `InitialSetupPage` exige completar los datos del restaurante antes de pasar al tab "Personal" y requiere registrar al menos un garzón antes de guardar la configuración.
  - La tarjeta de permisos ahora lista a los garzones registrados y permite seleccionar al responsable de datos sensibles desde un `Select`, evitando correos escritos manualmente.
- **Build & QA**
  - `npm run build` ejecutado a las 22:35 (UTC-03). Resultado exitoso con el warning habitual de chunks > 500 kB (pendiente de `manualChunks`).
  - Commit generado: `ef23e66` — _"chore: UI tweaks and staff flow adjustments"_.
  - Próximo paso: documentar capturas/QA del nuevo flujo y validar navegación desde el dashboard.

## Bitácora · 22/11/2025

- **Errores críticos detectados en `liquidarPeriodo`**
  - El logger de Firebase fallaba con `entryFromArgs` al intentar serializar `Error` completos. Se reemplazó el helper por `safeLogError` basado en `console.error`, garantizando stacktraces limpios para futuros diagnósticos.
  - Una vez expuestos los mensajes reales, Firestore devolvió `transactions require all reads to be executed before all writes`. Se reescribió la transacción en `functions/src/handlers/liquidarPeriodo.ts` en tres fases (lecturas → cómputo → escrituras) para cumplir la regla y evitar 500.
- **Liquidación y PDF enriquecidos con gastos generales**
  - `closureCalculations.ts` ahora agrega los `generalExpenses` por nombre/tipo, lo cual alimenta `useLiquidacionWorkflow`, el modal de confirmación y el PDF generado automáticamente. En la UI se lista explícitamente cada gasto (ej. "Sofía • anfitriona") para validar antes de pagar.
  - Se añadieron también los porcentajes de configuración (`configurationSnapshot.poolPercentages`) a `useClosuresDashboard`/`useLiquidacionWorkflow`, permitiendo mostrar el porcentaje de cocina aun cuando no haya personal de cocina en el rango seleccionado.
- **Despliegue**
  - Se ejecutó `npm run build` en `functions/` y `firebase deploy --only functions` para publicar los fixes anteriores.
  - Status de endpoints: `guardarCierreDiario`, `eliminarCierreDiario` y `liquidarPeriodo` operativos en `reparte-justo/us-central1`.
