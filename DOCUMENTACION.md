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
