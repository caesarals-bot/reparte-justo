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
