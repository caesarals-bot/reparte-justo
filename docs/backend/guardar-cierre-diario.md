# Cloud Function `guardarCierreDiario`

## Objetivo
Registrar el cierre diario de propinas en Firestore de forma auditable, generando un snapshot completo del día (montos por persona, cargos automáticos, penalizaciones/ajustes) y actualizando los totales pendientes del restaurante. El backend debe validar reglas de negocio (redistribución de descuentos, inasistencias, límites de porcentajes) y retornar los datos necesarios para refrescar el dashboard.

## Flujo resumido
1. Validar autenticación (`restaurantId`) y estructura del payload.
2. Verificar que la fecha (`metadata.referenceDateKey`) no tenga otro cierre pendiente o pagado.
3. Calcular netos finales por integrante considerando penalizaciones/ajustes y redistribución.
4. Construir snapshot normalizado y guardarlo en `restaurants/{restaurantId}/registros_diarios/{closureId}` con `estado = "pendiente"`.
5. Actualizar los acumulados del restaurante (ej. `totalesNoLiquidados`, `pendingDays`, histórico de correos enviados si existe email opcional).
6. Responder con el identificador del cierre, totales resumidos y errores normalizados si aplica.
7. (Opcional) encolar notificaciones a `restaurantContact.email` y preparar la data para futuras liquidaciones.

## Request payload
```ts
export type GuardarCierreDiarioRequest = {
  restaurantId: string
  mode: "pool" | "directa"
  metadata: {
    referenceDate: string // ISO string
    referenceDateKey: string // yyyy-MM-dd
    daysWithoutSettlement: number
  }

export type VersionedStaffMemberSnapshot = {
  id: string
  name: string
  role?: string
  weight?: number | string
  email?: string
  isActive?: boolean
  entryDate?: string
  inactiveSince?: string
}
  totals: {
    propinas: number
    transbankPercentage: number
    transbankAmount: number
    deductionsPercentage: number
    deductionsAmount: number
    netAfterDeductions: number
    kitchenShare: number
    garzonShare: number
    directSales?: number
  }
  deductions: {
    additionalPercentages: number[]
    transbankPercentage: number
    transbankAmount: number
  }
  assignments: {
    servicio: StaffAssignmentSnapshot[]
    cocina: StaffAssignmentSnapshot[]
    ventaDirecta: StaffAssignmentSnapshot[]
    pocilloSecundario: StaffAssignmentSnapshot[]
  }
  penalties: PenaltyEntry[] // derivado de assignments (solo presente para claridad del backend)
  adjustments: AdjustmentEntry[] // futuros ajustes manuales que se quieran aplicar al snapshot al guardar
  dailySummary: {
    netAfterDeductions: number
    propinas: number
    transbankAmount: number
    deductionsAmount: number
  }
  restaurantContact?: {
    email?: string // correo opcional para notificaciones
    responsibleName?: string
  }
  configurationSnapshot?: {
    settlementMode?: "pool" | "directa"
    poolPercentages: { kitchen: number; transbank: number }
    additionalDeductions: number[]
    serviceStaff: VersionedStaffMemberSnapshot[]
    supportStaff: VersionedStaffMemberSnapshot[]
    contact?: { email?: string; responsibleName?: string }
  }
  submittedBy?: {
    uid?: string
    name?: string
    email?: string
  }
  submittedAt?: string // ISO timestamp generado en el cliente
}

// El backend usará `email` en cada `StaffAssignmentSnapshot` para disparar correos individuales
// a quienes participaron en el período liquidado.

export type StaffAssignmentSnapshot = {
  staffId: string
  nombre: string
  role?: "garzon" | "cocinero" | "ayudante"
  email?: string
  present: boolean
  assignedAmount: number
  penaltyPercentage: number
  penaltyAmount: number
  deductionAmount: number
  netAmount: number
}

export type PenaltyEntry = {
  staffId: string
  nombre: string
  role?: string
  referenceDate: string
  percentage: number
  amount: number
}

export type AdjustmentEntry = {
  id: string
  staffId?: string
  staffName?: string
  variant: "monto" | "porcentaje"
  type: "incremento" | "descuento"
  amount?: number
  percentage?: number
  motivo?: string
}
```

### Validaciones
- `referenceDateKey` debe ser única por restaurante.
- Las sumas de ponderaciones no pueden dar cero si hay integrantes presentes.
- `penaltyPercentage` se aplica solo cuando `present === true`.
- `deductionsAmount` = `propinas * deductionsPercentage / 100`.
- Redistribuir descuentos solo entre integrantes sin penalizaciones ni ajustes porcentuales.
- Si `restaurantContact.email` está presente, validar formato y registrar envío pendiente en la respuesta.
- Validar que todos los `StaffAssignmentSnapshot` incluyan los campos mínimos (`staffId`, `nombre`, `assignedAmount`).

## Escrituras en Firestore
```
restaurants/{restaurantId}/registros_diarios/{closureId}
  estado: "pendiente" | "pagado"
  metadata: {...}
  totals: {...}
  snapshot: { assignments, staff, totals, metadata, penalties?, adjustments? }
  dailySummary: { ... } // espejo directo para consultas ligeras
  contactEmail?: string | null
  createdAt, updatedAt (serverTimestamp)
```

Además actualizar en `restaurants/{restaurantId}`:
- `pendingTotals.netAfterDeductions += netAfterDeductions`
- `pendingTotals.deductions += deductionsAmount`
- `pendingTotals.transbank += transbankAmount`
- `pendingDays` según `daysWithoutSettlement`
- `lastClosureReferenceDate` = `metadata.referenceDate`

## Response
```ts
export type GuardarCierreDiarioResponse = {
  closureId: string
  estado: "pendiente"
  totals: {
    netAfterDeductions: number
    deductionsAmount: number
    transbankAmount: number
  }
  pendingTotals: {
    netAfterDeductions: number
    deductionsAmount: number
    transbankAmount: number
    pendingCount: number
  }
  contactEmailStatus?: "pending" | "skipped"
}
```

### Errores estandarizados
```
INVALID_REFERENCE_DATE
DUPLICATED_CLOSURE
INVALID_ASSIGNMENTS (detalle del integrante)
UNAUTHORIZED
INTERNAL_ERROR
```
Cualquier error debe incluir `message`, `code`, `fields?`.

## Pseudocódigo del cálculo

```ts
export async function guardarCierreDiarioHandler(req: GuardarCierreDiarioRequest) {
  assertAuth(req.restaurantId)
  validatePayload(req)

  const { metadata, assignments } = req
  await ensureReferenceDateIsUnique(req.restaurantId, metadata.referenceDateKey)

  const normalizedAssignments = normalizeAssignments(assignments)
  const penaltySummary = buildPenaltySummary(normalizedAssignments)
  const netTotals = applyRedistribution(normalizedAssignments, penaltySummary)

  const snapshot = buildClosureSnapshot({
    input: req,
    normalizedAssignments,
    penaltySummary,
    netTotals,
  })

  const closureDoc = await saveClosureSnapshot({ restaurantId: req.restaurantId, snapshot })
  const pendingTotals = await updateRestaurantAggregates({
    restaurantId: req.restaurantId,
    closureId: closureDoc.id,
    snapshot,
  })

  await maybeQueueEmail({
    restaurantId: req.restaurantId,
    closureId: closureDoc.id,
    contactEmail: snapshot.restaurantContact?.email,
  })

  return buildGuardarCierreResponse({ closureDoc, snapshot, pendingTotals })
}

// Helper functions
async function ensureReferenceDateIsUnique(restaurantId: string, referenceDateKey: string) {
  // Implementación para verificar si la fecha ya tiene un cierre pendiente o pagado
}

function normalizeAssignments(assignments: StaffAssignmentSnapshot[]) {
  // Implementación para normalizar las asignaciones
}

function buildPenaltySummary(assignments: StaffAssignmentSnapshot[]) {
  // Implementación para construir el resumen de penalizaciones
}

function applyRedistribution(assignments: StaffAssignmentSnapshot[], penaltySummary: any) {
  // Implementación para aplicar la redistribución
}

function buildClosureSnapshot(input: any) {
  // Implementación para construir el snapshot de cierre
}

async function saveClosureSnapshot({ restaurantId, snapshot }) {
  // Implementación para guardar el snapshot de cierre en Firestore
}

async function updateRestaurantAggregates({ restaurantId, closureId, snapshot }) {
  // Implementación para actualizar los acumulados del restaurante en Firestore
}

async function maybeQueueEmail({ restaurantId, closureId, contactEmail }) {
  // Implementación para encolar notificaciones si el correo del restaurante está presente
}

function buildGuardarCierreResponse({ closureDoc, snapshot, pendingTotals }) {
  // Implementación para construir la respuesta de guardar cierre
}
```

## Consideraciones adicionales
- Guardar `penalties` y `adjustments` como arrays independientes para que la UI pueda listarlos sin recalcular.
- Mantener `snapshot.assignments` como fuente de verdad para pagos individuales.
- `dailySummary` replica los totales para consultas agregadas sin leer todo el snapshot.
- Leave room para futuras Cloud Functions (`liquidarPeriodo`) reutilizando el mismo snapshot.
