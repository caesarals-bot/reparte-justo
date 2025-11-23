# ReparteJusto Frontend

Plataforma web para administrar cierres diarios, distribución de propinas y liquidaciones en restaurantes. El objetivo principal es garantizar trazabilidad completa (quién recibió cuánto, qué descuentos se aplicaron, cuál fue el gasto general) y ofrecer un flujo de liquidación confiable respaldado por Cloud Functions de Firebase.

## Resumen Ejecutivo

- **Stack**: React 19 + TypeScript + Vite + Tailwind + Shadcn/UI en el frontend; Firebase (Auth, Firestore, Functions) como backend administrado.
- **Estado actual** (noviembre 2025):
  - Cierres diarios generan snapshots completos (asistencia, asignaciones, gastos generales detallados).
  - Dashboard y modal de liquidación muestran los gastos generales con nombre/tipo y obtienen los porcentajes configurados de cocina/transbank.
  - La función `liquidarPeriodo` ya registra errores detallados y respeta las reglas de transacciones de Firestore gracias al refactor en 3 fases (lecturas → cómputo → escrituras).
  - El PDF de liquidación incorpora el desglose de gastos generales y el resumen por integrante.

## Contenido
1. [Arquitectura funcional](#arquitectura-funcional)
2. [Tecnologías y dependencias](#tecnologías-y-dependencias)
3. [Estructura de carpetas](#estructura-de-carpetas)
4. [Configuración y variables de entorno](#configuración-y-variables-de-entorno)
5. [Scripts y automatización](#scripts-y-automatización)
6. [Buenas prácticas de desarrollo](#buenas-prácticas-de-desarrollo)
7. [Estado de QA / Bitácora reciente](#estado-de-qa--bitácora-reciente)
8. [Roadmap](#roadmap)

## Arquitectura funcional

| Módulo | Descripción | Archivos clave |
|--------|-------------|----------------|
| **Landing / Marketing** | Presenta beneficios de ReparteJusto y dirige al onboarding. | `src/appPropinaSegura/component` |
| **Setup inicial (`/setup`)** | Define modo de liquidación, porcentajes de cocina/transbank, staff de servicio/apoyo y permisos. | `InitialSetupPage.tsx`, hooks en `setup/` |
| **Cierre diario (`/cierre`)** | Captura totales del día, asistencia, penalizaciones y gastos generales múltiples. Valida netos ≤ 0 y genera snapshot listo para el backend. | `CierreDiarioPage.tsx`, `useCierreDiario.ts` |
| **Dashboard / Detalle de cierre** | Lista cierres pendientes/históricos, permite registrar ajustes y visualizar gastos generales por entrada. | `DashboardPage.tsx`, `ClosureDetailPage.tsx`, `useClosuresDashboard.ts` |
| **Liquidación (`/dashboard/liquidacion`)** | Filtra cierres pendientes por rango, bloquea fechas liquidadas, arma payload para `liquidarPeriodo` y descarga un PDF con totales, integrantes y gastos generales. | `LiquidacionPage.tsx`, `useLiquidacionWorkflow.ts`, `generateLiquidacionPdf.ts` |
| **Cloud Functions** | `guardarCierreDiario`, `eliminarCierreDiario`, `liquidarPeriodo` y logger normalizado. La transacción de liquidación se reescribió para respetar el orden lecturas→escrituras. | `functions/src/handlers/*.ts`, `functions/src/index.ts` |

## Tecnologías y dependencias

- **Frontend**: React 19, Vite 5, TypeScript, Tailwind CSS, Shadcn/UI, pdf-lib, Lucide Icons.
- **Backend**: Firebase Functions (Node 20), Firestore, Firebase Auth.
- **Herramientas de soporte**: ESLint, Prettier (via configuración propia del repositorio), npm scripts.

## Estructura de carpetas

```
src/
 ├─ appPropinaSegura/
 │   ├─ cierre/               # Cierre diario y hooks asociados
 │   ├─ dashboard/            # Dashboard, liquidación, componentes de reportes
 │   ├─ setup/                # Configuración inicial y staff
 │   └─ component/            # Layout (NavBar, Footer, cards)
 ├─ context/, auth/, router/  # Infraestructura transversal
 └─ main.tsx, index.css

functions/
 ├─ src/
 │   ├─ index.ts              # Registro global de Cloud Functions
 │   ├─ handlers/             # guardarCierreDiario, liquidarPeriodo, eliminarCierreDiario
 │   ├─ types/                # Schemas Zod (closures, liquidaciones)
 │   └─ utils/                # pendingTotals, logging helpers
 └─ lib/                      # Salida compilada (tsc)
```

## Configuración y variables de entorno

1. Clonar el repositorio y ejecutar en la raíz:
   ```bash
   npm install
   npm run dev
   ```
   La app corre en `http://localhost:5173`.

2. Crear `.env` o `.env.local` con las credenciales de Firebase (ver `src/firebase/config.ts`):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. Para desplegar funciones:
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

## Scripts y automatización

| Script | Ubicación | Descripción |
|--------|-----------|-------------|
| `npm run dev` | raíz | Servidor de desarrollo Vite con HMR. |
| `npm run build` | raíz | Compila frontend (Vite) y revisa tipos con `tsc`. |
| `npm run preview` | raíz | Sirve la build estática. |
| `npm run build` | `functions/` | Compila Cloud Functions a `lib/`. |
| `npm run deploy` | `functions/` | Alias para `firebase deploy --only functions`. |
| `npm run emulate` | `functions/` | Emula HTTP Functions en local. |

## Buenas prácticas de desarrollo

- **Estilos**: priorizar utilidades Tailwind y los componentes Shadcn/UI. Evitar CSS aislado salvo que sea estrictamente necesario.
- **Accesibilidad**: cada input debe mantener relación `Label` ↔ control. Los botones iconográficos requieren `aria-label`.
- **Logs y diagnósticos**: usar `safeLogError` en funciones para evitar crashes del logger y capturar stack trace completo.
- **Snapshots**: cualquier cambio en la forma de `generalExpenses`, `assignments` o `configurationSnapshot` debe propagarse a `closureCalculations` y `useClosuresDashboard` para no romper compatibilidad con cierres históricos.

## Estado de QA / Bitácora reciente

- **22/11/2025**
  - `liquidarPeriodo` dejó de fallar con 500 gracias a la reestructuración de la transacción y al logger robusto basado en `console.error`.
  - El modal de liquidación y el PDF listan los gastos generales con nombre/tipo y traen el porcentaje de cocina desde el `configurationSnapshot` más reciente.
  - Despliegue completo de funciones (`guardarCierreDiario`, `eliminarCierreDiario`, `liquidarPeriodo`) en `reparte-justo/us-central1`.

Consulte `DOCUMENTACION.md` para la cronología y detalles técnicos adicionales de cada fix.

## Roadmap

1. **Notificaciones y flujos automáticos**
   - Enviar correo al responsable configurado tras cada liquidación, adjuntando el PDF generado.
2. **Permisos y auditoría avanzada**
   - Definir roles (admin, supervisor, staff) y restringir acciones sensibles como eliminar o editar cierres.
3. **Pruebas automatizadas**
   - Unit tests para hooks críticos (`useCierreDiario`, `useLiquidacionWorkflow`) y pruebas end-to-end del flujo de liquidación.
4. **Optimización de bundle**
   - Implementar `manualChunks`/`dynamic imports` para mantener cada chunk < 500 kB y mejorar tiempos de carga móviles.
5. **Panel de métricas**
   - Exponer KPIs de periodos liquidados (propinas netas, gasto general acumulado, montos por cocina vs garzones) usando los mismos snapshots ya persistidos.

---

Para documentación completa del dominio revisa [DOCUMENTACION.md](./DOCUMENTACION.md).
