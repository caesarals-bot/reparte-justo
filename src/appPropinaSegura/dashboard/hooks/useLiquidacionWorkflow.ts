import { useCallback, useMemo, useState } from "react"

import {
    aggregateGeneralExpensesFromClosures,
    aggregateMembersFromClosures,
    buildClosureHighlights,
    buildDailyClosureSummaries,
    buildPenaltyAndAdjustmentEntries,
    normalizeReferenceDate,
    summarizeClosures,
} from "../utils/closureCalculations"
import { buildLiquidacionPdfFileName, generateLiquidacionPdf } from "../utils/liquidacionPdf"
import {
    useClosuresDashboard,
    resolveClosureMode,
    type ClosureDocument,
    type SettlementMode,
    type StaffAssignment,
} from "./useClosuresDashboard"
import { useLiquidacionActions, type LiquidarPeriodoResponse } from "./useLiquidacionActions"

export type DateRangeValue = { from: Date | undefined; to: Date | undefined }

const emptyRange: DateRangeValue = { from: undefined, to: undefined }

const FALLBACK_DEDUCTION_NAME = "Otros"
const FALLBACK_DEDUCTION_DESCRIPTION = "Asignado automáticamente por falta de nombre"

type UnnamedDeductionEntry = {
    staffName: string
    closureId: string
    referenceDate?: string | null
}

const collectAssignmentsFromClosure = (closure: ClosureDocument): StaffAssignment[] => [
    ...closure.assignments.servicio,
    ...closure.assignments.cocina,
    ...closure.assignments.ventaDirecta,
    ...closure.assignments.pocilloSecundario,
]

const hasUnnamedDeduction = (assignment: StaffAssignment) =>
    assignment.deductionAmount > 0 && !(assignment.deductionName && assignment.deductionName.trim().length > 0)

const trimOrUndefined = (value?: string | null) => {
    if (typeof value !== "string") {
        return undefined
    }

    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
}

const normalizeAssignmentDeduction = (assignment: StaffAssignment): StaffAssignment => {
    const trimmedName = trimOrUndefined(assignment.deductionName)
    const trimmedDescription = trimOrUndefined(assignment.deductionDescription)

    if (assignment.deductionAmount <= 0) {
        if (trimmedName === assignment.deductionName && trimmedDescription === assignment.deductionDescription) {
            return assignment
        }

        return {
            ...assignment,
            deductionName: trimmedName,
            deductionDescription: trimmedDescription,
        }
    }

    if (trimmedName) {
        if (trimmedName === assignment.deductionName && trimmedDescription === assignment.deductionDescription) {
            return assignment
        }

        return {
            ...assignment,
            deductionName: trimmedName,
            deductionDescription: trimmedDescription,
        }
    }

    return {
        ...assignment,
        deductionName: FALLBACK_DEDUCTION_NAME,
        deductionDescription: trimmedDescription ?? FALLBACK_DEDUCTION_DESCRIPTION,
    }
}

const applyDeductionFallbackToClosure = (closure: ClosureDocument): ClosureDocument => {
    const mapGroup = (assignments: StaffAssignment[]) => assignments.map(normalizeAssignmentDeduction)

    return {
        ...closure,
        assignments: {
            servicio: mapGroup(closure.assignments.servicio),
            cocina: mapGroup(closure.assignments.cocina),
            ventaDirecta: mapGroup(closure.assignments.ventaDirecta),
            pocilloSecundario: mapGroup(closure.assignments.pocilloSecundario),
        },
    }
}

export type UseLiquidacionWorkflowArgs = {
    restaurantId?: string | null
    ownerEmail?: string | null
    ownerName?: string | null
}

/**
 * Encapsula la lógica de la página de liquidación: filtros, payload, descarga del PDF
 * y bloqueo de fechas liquidadas. Devuelve todo lo necesario para que el componente
 * de UI solo se enfoque en renderizar.
 */
export const useLiquidacionWorkflow = ({ restaurantId, ownerEmail, ownerName }: UseLiquidacionWorkflowArgs) => {
    const [dateRange, setDateRange] = useState<DateRangeValue>(emptyRange)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmittingLiquidacion, setIsSubmittingLiquidacion] = useState(false)
    const [liquidacionFeedback, setLiquidacionFeedback] = useState<
        { type: "success" | "error"; message: string } | null
    >(null)
    const [prepareError, setPrepareError] = useState<string | null>(null)
    const [locallySettledDates, setLocallySettledDates] = useState<Date[]>([])
    const { closures, pendingClosures, isLoading, refresh } = useClosuresDashboard({ restaurantId })
    const { buildLiquidacionPayload, liquidarPeriodo } = useLiquidacionActions()

    const availablePendingClosures = useMemo(() => {
        if (!locallySettledDates.length) {
            return pendingClosures
        }

        const settledSet = new Set(locallySettledDates.map((date) => date.getTime()))
        return pendingClosures.filter((closure) => {
            const reference = normalizeReferenceDate(closure.metadata.referenceDate)
            if (!reference) {
                return false
            }

            return !settledSet.has(reference.getTime())
        })
    }, [pendingClosures, locallySettledDates])

    const filteredClosures = useMemo(
        () => filterClosuresByRange(availablePendingClosures, dateRange),
        [availablePendingClosures, dateRange],
    )

    const normalizedClosures = useMemo(
        () => filteredClosures.map((closure) => applyDeductionFallbackToClosure(closure)),
        [filteredClosures],
    )

    const unnamedDeductionEntries = useMemo<UnnamedDeductionEntry[]>(() => {
        if (!filteredClosures.length) {
            return []
        }

        const entries: UnnamedDeductionEntry[] = []

        filteredClosures.forEach((closure) => {
            const referenceDate = closure.metadata.referenceDate
            collectAssignmentsFromClosure(closure).forEach((assignment) => {
                if (hasUnnamedDeduction(assignment)) {
                    entries.push({
                        staffName: assignment.nombre,
                        closureId: closure.id,
                        referenceDate,
                    })
                }
            })
        })

        return entries
    }, [filteredClosures])

    const modeInfo = useMemo(() => {
        if (!filteredClosures.length) {
            return { mode: null as SettlementMode | null, isMixed: false }
        }

        let detectedMode: SettlementMode | null = null
        let mixed = false

        for (const closure of filteredClosures) {
            const closureMode = resolveClosureMode(closure)
            if (!closureMode) {
                mixed = true
                break
            }

            if (!detectedMode) {
                detectedMode = closureMode
                continue
            }

            if (detectedMode !== closureMode) {
                mixed = true
                break
            }
        }

        return {
            mode: mixed ? null : detectedMode,
            isMixed: mixed,
        }
    }, [filteredClosures])

    const isDirectSalesMode = modeInfo.mode === "directa"

    const { pendingDates: pendingHighlightDates, settledDates: settledHighlightDates } = useMemo(() => {
        return buildClosureHighlights(closures)
    }, [closures])

    const settledDates = useMemo(
        () => mergeDates(settledHighlightDates, locallySettledDates),
        [settledHighlightDates, locallySettledDates],
    )

    const highlightedDates = useMemo(() => {
        if (!settledDates.length) {
            return pendingHighlightDates
        }

        const settledSet = new Set(settledDates.map((date) => date.getTime()))
        return pendingHighlightDates.filter((date) => !settledSet.has(date.getTime()))
    }, [pendingHighlightDates, settledDates])

    const resumen = useMemo(() => summarizeClosures(normalizedClosures), [normalizedClosures])

    const pendingSummary = useMemo(() => summarizeClosures(availablePendingClosures), [availablePendingClosures])

    const detalleIntegrantes = useMemo(
        () => aggregateMembersFromClosures(normalizedClosures),
        [normalizedClosures],
    )
    const detalleGastosGenerales = useMemo(
        () => aggregateGeneralExpensesFromClosures(normalizedClosures),
        [normalizedClosures],
    )

    const detallePorDia = useMemo(() => buildDailyClosureSummaries(normalizedClosures), [normalizedClosures])

    const penalizacionesYAjustes = useMemo(
        () => buildPenaltyAndAdjustmentEntries(normalizedClosures),
        [normalizedClosures],
    )

    const restaurantContact = useMemo(() => {
        const closureWithContact = pendingClosures.find((closure) => closure.restaurantContact)
        return closureWithContact?.restaurantContact
    }, [pendingClosures])

    const configurationSummary = useMemo(() => {
        const closureWithConfig = pendingClosures.find((closure) => closure.configurationSnapshot)
        const settlementMode = closureWithConfig?.configurationSnapshot?.settlementMode ?? null
        const poolPercentages = closureWithConfig?.configurationSnapshot?.poolPercentages
        const directWaiterPercentage = closureWithConfig?.configurationSnapshot?.directConfig?.directWaiterPercentage

        return {
            settlementMode,
            kitchenPercentage:
                settlementMode === "pool" ? poolPercentages?.kitchen ?? null : null,
            transbankPercentage:
                settlementMode === "pool" ? poolPercentages?.transbank ?? null : null,
            directWaiterPercentage:
                settlementMode === "directa" && typeof directWaiterPercentage === "number"
                    ? directWaiterPercentage
                    : null,
        }
    }, [pendingClosures])

    const notificationContact = useMemo(() => {
        if (restaurantContact?.email) {
            return restaurantContact
        }

        if (ownerEmail) {
            return {
                email: ownerEmail,
                responsibleName: restaurantContact?.responsibleName ?? ownerName ?? undefined,
            }
        }

        return restaurantContact
    }, [restaurantContact, ownerEmail, ownerName])

    const isFallbackContact = Boolean(notificationContact?.email && !restaurantContact?.email)

    const selectedTotals = useMemo(() => summarizeClosures(normalizedClosures), [normalizedClosures])
    const selectedMembers = useMemo(
        () => aggregateMembersFromClosures(normalizedClosures),
        [normalizedClosures],
    )

    const dateRangeLabel = useMemo(() => {
        if (!dateRange.from) {
            return "Selecciona un rango antes de liquidar"
        }

        const formatter = new Intl.DateTimeFormat("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })

        const fromLabel = formatter.format(dateRange.from)

        if (!dateRange.to) {
            return fromLabel
        }

        return `${fromLabel} - ${formatter.format(dateRange.to)}`
    }, [dateRange])

    const handleModalOpenChange = useCallback((open: boolean) => {
        setIsModalOpen(open)
        if (!open) {
            setLiquidacionFeedback(null)
        }
    }, [])

    const handlePrepareLiquidacion = useCallback(() => {
        if (!availablePendingClosures.length) {
            return
        }

        if (!dateRange.from) {
            setPrepareError("Selecciona al menos una fecha (o rango) antes de preparar la liquidación.")
            return
        }

        if (!filteredClosures.length) {
            setPrepareError("No hay cierres pendientes en el rango seleccionado.")
            return
        }

        if (modeInfo.isMixed) {
            setPrepareError("No puedes mezclar cierres de Pool y Venta directa en la misma liquidación.")
            return
        }

        setPrepareError(null)
        setLiquidacionFeedback(null)
        setIsModalOpen(true)
    }, [availablePendingClosures.length, dateRange.from, filteredClosures.length, modeInfo.isMixed])

    const modeMismatchError = modeInfo.isMixed
        ? "No puedes mezclar cierres de Pool y Venta directa en la misma liquidación."
        : null

    const handleConfirmLiquidacion = useCallback(async () => {
        if (!restaurantId) {
            setLiquidacionFeedback({ type: "error", message: "No tienes acceso a ningún restaurante." })
            return
        }

        if (!dateRange.from) {
            setLiquidacionFeedback({
                type: "error",
                message: "Selecciona un rango válido antes de confirmar.",
            })
            return
        }

        if (!filteredClosures.length) {
            setLiquidacionFeedback({
                type: "error",
                message: "Selecciona al menos un cierre pendiente para continuar.",
            })
            return
        }

        if (modeInfo.isMixed) {
            setLiquidacionFeedback({
                type: "error",
                message: "No puedes liquidar cierres de modos distintos en la misma solicitud.",
            })
            return
        }

        try {
            setIsSubmittingLiquidacion(true)
            setLiquidacionFeedback(null)
            
            // Extraer directSalesAdjustments del primer cierre si es modo directa
            const directSalesAdjustments = isDirectSalesMode 
                ? normalizedClosures[0]?.directSalesAdjustmentsSnapshot ?? undefined
                : undefined
            
            const payload = buildLiquidacionPayload({
                restaurantId,
                closures: normalizedClosures,
                dateRange,
                contact: notificationContact,
                modeOverride: modeInfo.mode,
                directSalesAdjustments,
            })
            const result: LiquidarPeriodoResponse = await liquidarPeriodo(payload)
            await refresh()
            const pdfBytes = await generateLiquidacionPdf({
                rangeLabel: dateRangeLabel,
                totals: selectedTotals,
                members: selectedMembers,
                generalExpenses: detalleGastosGenerales,
                closureCount: filteredClosures.length,
                contactEmail: notificationContact?.email,
                responsibleName: notificationContact?.responsibleName,
            })
            const pdfArrayBuffer = new ArrayBuffer(pdfBytes.byteLength)
            new Uint8Array(pdfArrayBuffer).set(pdfBytes)
            const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" })
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = downloadUrl
            link.download = buildLiquidacionPdfFileName(dateRangeLabel)
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(downloadUrl)

            const responseSettledDates = (result?.settledReferenceDates ?? [])
                .map((isoDate) => normalizeReferenceDate(isoDate))
                .filter((date): date is Date => Boolean(date))

            const newlySettledDates = filteredClosures
                .map((closure) => normalizeReferenceDate(closure.metadata.referenceDate))
                .filter((date): date is Date => Boolean(date))

            setLocallySettledDates((previousDates) =>
                mergeDates(previousDates, mergeDates(newlySettledDates, responseSettledDates)),
            )
            setIsModalOpen(false)
            setDateRange(emptyRange)
            setLiquidacionFeedback({
                type: "success",
                message:
                    result?.processedCount && result.processedCount > 0
                        ? `Liquidamos ${result.processedCount} cierre(s) y descargamos el PDF del periodo.`
                        : "Preparamos el payload y descargamos el PDF con los cierres seleccionados.",
            })
        } catch (error) {
            console.error("Error al preparar la liquidación", error)
            setLiquidacionFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "No pudimos preparar la liquidación. Intenta nuevamente en unos segundos.",
            })
        } finally {
            setIsSubmittingLiquidacion(false)
        }
    }, [
        restaurantId,
        dateRange,
        filteredClosures,
        normalizedClosures,
        buildLiquidacionPayload,
        notificationContact,
        liquidarPeriodo,
        dateRangeLabel,
        selectedTotals,
        selectedMembers,
        refresh,
        modeInfo.isMixed,
        modeInfo.mode,
        isDirectSalesMode,
        detalleGastosGenerales,
    ])

    return {
        isLoading,
        dateRange,
        setDateRange,
        isModalOpen,
        handleModalOpenChange,
        isSubmittingLiquidacion,
        liquidacionFeedback,
        prepareError,
        highlightedDates,
        settledDates,
        availablePendingClosures,
        filteredClosures,
        resumen,
        pendingSummary,
        detalleIntegrantes,
        detallePorDia,
        detalleGastosGenerales,
        penalizacionesYAjustes,
        notificationContact,
        isFallbackContact,
        selectedTotals,
        selectedMembers,
        configurationSummary,
        dateRangeLabel,
        handlePrepareLiquidacion,
        handleConfirmLiquidacion,
        selectedMode: modeInfo.mode,
        isDirectSalesMode,
        modeMismatchError,
        hasUnnamedDeductions: unnamedDeductionEntries.length > 0,
        unnamedDeductionCount: unnamedDeductionEntries.length,
        unnamedDeductionSample: unnamedDeductionEntries.slice(0, 3),
    }
}

const filterClosuresByRange = (closures: ClosureDocument[], range: DateRangeValue): ClosureDocument[] => {
    if (!closures.length) {
        return []
    }

    const { from, to } = range

    if (!from && !to) {
        return closures
    }

    return closures.filter((closure) => {
        const reference = normalizeReferenceDate(closure.metadata.referenceDate)

        if (!reference) {
            return false
        }

        if (from && reference < from) {
            return false
        }

        if (to && reference > to) {
            return false
        }

        return true
    })
}

const mergeDates = (base: Date[], additions: Date[]) => {
    if (!additions.length) {
        return base
    }

    const map = new Map<number, Date>(base.map((date) => [date.getTime(), date]))
    additions.forEach((date) => {
        map.set(date.getTime(), date)
    })

    return Array.from(map.values()).sort((a, b) => a.getTime() - b.getTime())
}
