import { useCallback, useMemo, useState } from "react"

import {
    aggregateMembersFromClosures,
    buildClosureHighlights,
    buildDailyClosureSummaries,
    buildPenaltyAndAdjustmentEntries,
    normalizeReferenceDate,
    summarizeClosures,
} from "../utils/closureCalculations"
import { buildLiquidacionPdfFileName, generateLiquidacionPdf } from "../utils/liquidacionPdf"
import { useClosuresDashboard } from "./useClosuresDashboard"
import { useLiquidacionActions, type LiquidarPeriodoResponse } from "./useLiquidacionActions"

export type DateRangeValue = { from: Date | undefined; to: Date | undefined }

const emptyRange: DateRangeValue = { from: undefined, to: undefined }

export type UseLiquidacionWorkflowArgs = {
    uid?: string | null
    ownerEmail?: string | null
    ownerName?: string | null
}

/**
 * Encapsula la lógica de la página de liquidación: filtros, payload, descarga del PDF
 * y bloqueo de fechas liquidadas. Devuelve todo lo necesario para que el componente
 * de UI solo se enfoque en renderizar.
 */
export const useLiquidacionWorkflow = ({ uid, ownerEmail, ownerName }: UseLiquidacionWorkflowArgs) => {
    const [dateRange, setDateRange] = useState<DateRangeValue>(emptyRange)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmittingLiquidacion, setIsSubmittingLiquidacion] = useState(false)
    const [liquidacionFeedback, setLiquidacionFeedback] = useState<
        { type: "success" | "error"; message: string } | null
    >(null)
    const [prepareError, setPrepareError] = useState<string | null>(null)
    const [locallySettledDates, setLocallySettledDates] = useState<Date[]>([])

    const { closures, pendingClosures, isLoading, refresh } = useClosuresDashboard({ uid })
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

    const resumen = useMemo(() => summarizeClosures(filteredClosures), [filteredClosures])

    const pendingSummary = useMemo(() => summarizeClosures(availablePendingClosures), [availablePendingClosures])

    const detalleIntegrantes = useMemo(() => aggregateMembersFromClosures(filteredClosures), [filteredClosures])

    const detallePorDia = useMemo(() => buildDailyClosureSummaries(filteredClosures), [filteredClosures])

    const penalizacionesYAjustes = useMemo(
        () => buildPenaltyAndAdjustmentEntries(filteredClosures),
        [filteredClosures],
    )

    const restaurantContact = useMemo(() => {
        const closureWithContact = pendingClosures.find((closure) => closure.restaurantContact)
        return closureWithContact?.restaurantContact
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

    const selectedTotals = useMemo(() => summarizeClosures(filteredClosures), [filteredClosures])
    const selectedMembers = useMemo(() => aggregateMembersFromClosures(filteredClosures), [filteredClosures])

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

        setPrepareError(null)
        setLiquidacionFeedback(null)
        setIsModalOpen(true)
    }, [availablePendingClosures.length, dateRange.from, filteredClosures.length])

    const handleConfirmLiquidacion = useCallback(async () => {
        if (!uid) {
            setLiquidacionFeedback({ type: "error", message: "Inicia sesión para enviar la liquidación." })
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

        try {
            setIsSubmittingLiquidacion(true)
            setLiquidacionFeedback(null)
            const payload = buildLiquidacionPayload({
                restaurantId: uid,
                closures: filteredClosures,
                dateRange,
                contact: notificationContact,
            })
            const result: LiquidarPeriodoResponse = await liquidarPeriodo(payload)
            await refresh()
            const pdfBytes = await generateLiquidacionPdf({
                rangeLabel: dateRangeLabel,
                totals: selectedTotals,
                members: selectedMembers,
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
        uid,
        dateRange,
        filteredClosures,
        buildLiquidacionPayload,
        notificationContact,
        liquidarPeriodo,
        dateRangeLabel,
        selectedTotals,
        selectedMembers,
        refresh,
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
        penalizacionesYAjustes,
        notificationContact,
        isFallbackContact,
        selectedTotals,
        selectedMembers,
        dateRangeLabel,
        handlePrepareLiquidacion,
        handleConfirmLiquidacion,
    }
}

const filterClosuresByRange = (closures: ReturnType<typeof useClosuresDashboard>["pendingClosures"], range: DateRangeValue) => {
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
