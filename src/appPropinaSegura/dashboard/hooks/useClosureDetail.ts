import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { doc, getDoc } from "firebase/firestore"

import { db } from "@/firebase/config"
import { eliminarCierreDiario } from "@/appPropinaSegura/cierre/services/closuresApi"
import {
    useClosuresDashboard,
    type ClosureAdjustment,
    type ClosureAdjustmentVariant,
    type ClosureDocument,
    type GeneralExpenseEntry,
    type StaffAssignment,
    createClosureAdjustment,
    fetchClosureAdjustments,
    applyClosureAdjustmentsForDisplay,
    mapSnapshotToClosure,
} from "./useClosuresDashboard"

export const buildMemberIdentifier = (staffId?: string, name?: string, role?: string | null) =>
    staffId ?? `${name ?? ""}|${role ?? ""}`

export type UseClosureDetailArgs = {
    restaurantId?: string | null
    closureId?: string
    displayName?: string | null
    email?: string | null
}

export type ClosureSummaryItem = {
    label: string
    value: number
}

export type ClosureGeneralExpense = GeneralExpenseEntry

export type AssignmentSection = {
    key: string
    title: string
    data: StaffAssignment[]
}

export type StaffMemberOption = {
    identifier: string
    staffId?: string
    name: string
    role?: string | null
}

/**
 * Maneja toda la lógica de la página de detalle de cierre: carga de datos,
 * registro de ajustes y agregaciones auxiliares que la UI necesita para renderizar.
 */
export const useClosureDetail = ({ restaurantId, closureId, displayName, email }: UseClosureDetailArgs) => {
    const { refresh } = useClosuresDashboard({ restaurantId })

    const [closure, setClosure] = useState<ClosureDocument | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adjustmentFeedback, setAdjustmentFeedback] = useState<{
        type: "success" | "error"
        message: string
    } | null>(null)
    const [deleteFeedback, setDeleteFeedback] = useState<{
        type: "success" | "error"
        message: string
    } | null>(null)
    const [isDeletingClosure, setIsDeletingClosure] = useState(false)
    const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false)
    const generalAdjustmentKey = "__general__"
    const [adjustmentForm, setAdjustmentForm] = useState({
        staffKey: "",
        type: "descuento" as "incremento" | "descuento",
        variant: "monto" as ClosureAdjustmentVariant,
        amount: "",
        percentage: "",
        motivo: "",
    })
    const [adjustmentFormError, setAdjustmentFormError] = useState<string | null>(null)
    const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false)

    const refreshClosureAdjustments = useCallback(async () => {
        if (!restaurantId || !closureId) {
            return [] as ClosureAdjustment[]
        }

        const adjustments = await fetchClosureAdjustments(restaurantId, closureId)
        setClosure((previous) => (previous ? { ...previous, adjustments } : previous))
        return adjustments
    }, [closureId, restaurantId])

    const resetAdjustmentForm = useCallback(() => {
        setAdjustmentForm({
            staffKey: "",
            type: "descuento",
            variant: "monto",
            amount: "",
            percentage: "",
            motivo: "",
        })
        setAdjustmentFormError(null)
    }, [])

    const loadClosure = useCallback(async () => {
        if (!restaurantId) {
            setError("No tienes acceso a ningún restaurante.")
            setIsLoading(false)
            return
        }

        if (!closureId) {
            setError("No se especificó un cierre a consultar.")
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const reference = doc(db, "restaurants", restaurantId, "registros_diarios", closureId)
            const snapshot = await getDoc(reference)

            if (!snapshot.exists()) {
                setError("No encontramos el cierre solicitado. Verifica el historial o intenta con otro registro.")
                setClosure(null)
                setIsLoading(false)
                return
            }

            const mapped = mapSnapshotToClosure({
                id: snapshot.id,
                data: () => (snapshot.data() as Record<string, unknown>) ?? {},
            })

            const adjustments = await fetchClosureAdjustments(restaurantId, snapshot.id)

            setClosure(applyClosureAdjustmentsForDisplay({ ...mapped, adjustments }))
            setError(null)
            void refresh()
        } catch (fetchError) {
            console.error("Error al obtener el cierre", fetchError)
            setError("No pudimos cargar el detalle del cierre. Intenta nuevamente en unos segundos.")
            setClosure(null)
        } finally {
            setIsLoading(false)
        }
    }, [closureId, refresh, restaurantId])

    useEffect(() => {
        void loadClosure()
    }, [loadClosure])

    const isClosurePaid = closure?.estado === "pagado"

    const handleAdjustmentDialogOpenChange = useCallback(
        (open: boolean) => {
            if (open && isClosurePaid) {
                return
            }

            setIsAdjustmentDialogOpen(open)
            if (!open) {
                resetAdjustmentForm()
            }
        },
        [isClosurePaid, resetAdjustmentForm],
    )

    const handleAdjustmentMemberChange = useCallback((value: string) => {
        setAdjustmentForm((previous) => ({ ...previous, staffKey: value }))
        setAdjustmentFormError(null)
    }, [])

    const handleAdjustmentTypeChange = useCallback((value: "incremento" | "descuento") => {
        setAdjustmentForm((previous) => ({ ...previous, type: value }))
        setAdjustmentFormError(null)
    }, [])

    const handleAdjustmentVariantChange = useCallback((value: ClosureAdjustmentVariant) => {
        setAdjustmentForm((previous) => ({ ...previous, variant: value }))
        setAdjustmentFormError(null)
    }, [])

    const handleAdjustmentAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setAdjustmentForm((previous) => ({ ...previous, amount: event.target.value }))
        setAdjustmentFormError(null)
    }, [])

    const handleAdjustmentPercentageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setAdjustmentForm((previous) => ({ ...previous, percentage: event.target.value }))
        setAdjustmentFormError(null)
    }, [])

    const handleAdjustmentMotivoChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        setAdjustmentForm((previous) => ({ ...previous, motivo: event.target.value }))
    }, [])

    const staffMembers = useMemo<StaffMemberOption[]>(() => {
        if (!closure) {
            return []
        }

        const map = new Map<string, StaffMemberOption>()
        const pushMembers = (members: StaffAssignment[]) => {
            members.forEach((assignment) => {
                if (!assignment.present) {
                    return
                }

                const identifier = buildMemberIdentifier(assignment.staffId, assignment.nombre, assignment.role)

                if (!map.has(identifier)) {
                    map.set(identifier, {
                        identifier,
                        staffId: assignment.staffId,
                        name: assignment.nombre,
                        role: assignment.role,
                    })
                }
            })
        }

        pushMembers(closure.assignments.servicio)
        pushMembers(closure.assignments.cocina)
        pushMembers(closure.assignments.ventaDirecta)

        return Array.from(map.values())
    }, [closure])

    const assignmentSections = useMemo<AssignmentSection[]>(() => {
        if (!closure) {
            return []
        }

        return [
            { key: "servicio", title: "Staff de servicio", data: closure.assignments.servicio },
            { key: "cocina", title: "Staff de cocina", data: closure.assignments.cocina },
            { key: "ventaDirecta", title: "Venta directa", data: closure.assignments.ventaDirecta },
        ].filter((section) => section.data.length)
    }, [closure])

    const adjustmentsByIdentifier = useMemo(() => {
        const map = new Map<
            string,
            { amountTotal: number; percentageTotal: number; items: ClosureAdjustment[] }
        >()

        closure?.adjustments?.forEach((adjustment) => {
            const identifier = buildMemberIdentifier(adjustment.staffId, adjustment.staffName)
            const signedAmount =
                adjustment.variant === "porcentaje"
                    ? 0
                    : adjustment.type === "descuento"
                      ? -adjustment.amount
                      : adjustment.amount
            const signedPercentage =
                adjustment.variant === "porcentaje"
                    ? (adjustment.type === "descuento" ? -1 : 1) * (adjustment.percentage ?? 0)
                    : 0

            if (map.has(identifier)) {
                const entry = map.get(identifier)!
                entry.amountTotal += signedAmount
                entry.percentageTotal += signedPercentage
                entry.items.push(adjustment)
            } else {
                map.set(identifier, {
                    amountTotal: signedAmount,
                    percentageTotal: signedPercentage,
                    items: [adjustment],
                })
            }
        })

        return map
    }, [closure?.adjustments])

    const totalAdjustments = useMemo(
        () =>
            closure?.adjustments?.reduce((acc, adjustment) => {
                if (adjustment.variant === "porcentaje") {
                    return acc
                }

                const signedAmount = adjustment.type === "descuento" ? -adjustment.amount : adjustment.amount
                return acc + signedAmount
            }, 0) ?? 0,
        [closure?.adjustments],
    )

    const sortedAdjustments = useMemo(() => {
        if (!closure?.adjustments?.length) {
            return [] as ClosureAdjustment[]
        }

        return [...closure.adjustments].sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0
            const bTime = b.createdAt?.toMillis?.() ?? 0
            return bTime - aTime
        })
    }, [closure?.adjustments])

    const formattedReferenceDate = useMemo(() => {
        if (!closure?.metadata.referenceDate) {
            return "Sin fecha definida"
        }

        const parsed = new Date(closure.metadata.referenceDate)

        if (Number.isNaN(parsed.getTime())) {
            return "Fecha no válida"
        }

        return format(parsed, "PPP", { locale: es })
    }, [closure?.metadata.referenceDate])

    const summaryItems: ClosureSummaryItem[] = useMemo(() => {
        if (!closure) {
            return []
        }

        return [
            { label: "Propinas brutas", value: closure.totals.propinas },
            { label: "Total neto (snapshot)", value: closure.totals.netAfterDeductions },
            { label: "Ajustes registrados", value: totalAdjustments },
            { label: "Total neto ajustado", value: closure.totals.netAfterDeductions + totalAdjustments },
            { label: "Deducciones", value: closure.totals.deductionsAmount },
            { label: "Transbank", value: closure.totals.transbankAmount },
            { label: "Gasto general", value: closure.totals.generalExpense },
        ]
    }, [closure, totalAdjustments])

    const handleAdjustmentSubmit = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()

            if (!restaurantId || !closureId) {
                setAdjustmentFormError("No tienes acceso a ningún restaurante.")
                return
            }

            const isPercentageVariant = adjustmentForm.variant === "porcentaje"
            const amountNumber = isPercentageVariant ? 0 : Number.parseInt(adjustmentForm.amount, 10)
            const percentageNumber = isPercentageVariant
                ? Number.parseFloat(adjustmentForm.percentage.replace(",", "."))
                : undefined

            if (!isPercentageVariant && (!amountNumber || amountNumber <= 0)) {
                setAdjustmentFormError("Ingresa un monto mayor a 0.")
                return
            }

            if (isPercentageVariant) {
                if (!adjustmentForm.staffKey || adjustmentForm.staffKey === generalAdjustmentKey) {
                    setAdjustmentFormError("Selecciona un integrante específico para ajustar porcentaje.")
                    return
                }

                if (percentageNumber === undefined || Number.isNaN(percentageNumber)) {
                    setAdjustmentFormError("Ingresa un porcentaje válido.")
                    return
                }

                if (percentageNumber === 0) {
                    setAdjustmentFormError("El porcentaje debe ser distinto de 0.")
                    return
                }

                if (percentageNumber < -100 || percentageNumber > 100) {
                    setAdjustmentFormError("El porcentaje debe estar entre -100 y 100.")
                    return
                }
            }

            const isGeneralAdjustment = adjustmentForm.staffKey === generalAdjustmentKey
            const staffData = staffMembers.find((member) => member.identifier === adjustmentForm.staffKey)

            if (!isGeneralAdjustment && !staffData) {
                setAdjustmentFormError("Selecciona el integrante al que aplicarás el ajuste.")
                return
            }

            if (isGeneralAdjustment && isPercentageVariant) {
                setAdjustmentFormError("Los ajustes porcentuales deben aplicarse a un integrante específico.")
                return
            }

            try {
                setIsSubmittingAdjustment(true)
                await createClosureAdjustment({
                    restaurantId,
                    closureId,
                    adjustment: {
                        staffId: staffData?.staffId,
                        staffName: isGeneralAdjustment ? "Ajuste general" : staffData?.name ?? "Integrante",
                        amount: amountNumber,
                        type: adjustmentForm.type,
                        variant: adjustmentForm.variant,
                        percentage: isPercentageVariant ? percentageNumber : undefined,
                        motivo: adjustmentForm.motivo.trim() ? adjustmentForm.motivo.trim() : undefined,
                        createdBy: displayName ?? email ?? "Usuario",
                    },
                })

                await refreshClosureAdjustments()
                setAdjustmentFeedback({
                    type: "success",
                    message: "Ajuste registrado correctamente.",
                })
                resetAdjustmentForm()
                handleAdjustmentDialogOpenChange(false)
                void refresh()
            } catch (submitError) {
                console.error("Error al crear el ajuste", submitError)
                setAdjustmentFeedback({
                    type: "error",
                    message: "No pudimos registrar el ajuste. Intenta nuevamente.",
                })
            } finally {
                setIsSubmittingAdjustment(false)
            }
        },
        [
            adjustmentForm.amount,
            adjustmentForm.motivo,
            adjustmentForm.percentage,
            adjustmentForm.type,
            adjustmentForm.variant,
            closureId,
            displayName,
            email,
            generalAdjustmentKey,
            handleAdjustmentDialogOpenChange,
            refresh,
            refreshClosureAdjustments,
            resetAdjustmentForm,
            staffMembers,
            restaurantId,
        ],
    )

    const handleDeleteClosure = useCallback(
        async (reason?: string, userUid?: string) => {
            if (!restaurantId || !closureId) {
                setDeleteFeedback({ type: "error", message: "No tienes acceso a ningún restaurante." })
                return false
            }

            setIsDeletingClosure(true)
            setDeleteFeedback(null)

            try {
                await eliminarCierreDiario({
                    restaurantId,
                    closureId,
                    reason,
                    deletedBy: {
                        uid: userUid,
                        name: displayName ?? undefined,
                        email: email ?? undefined,
                    },
                })

                setClosure(null)
                setDeleteFeedback({ type: "success", message: "Cierre eliminado correctamente." })
                void refresh()
                return true
            } catch (deleteError) {
                console.error("Error al eliminar el cierre", deleteError)
                setDeleteFeedback({
                    type: "error",
                    message:
                        deleteError instanceof Error
                            ? deleteError.message
                            : "No pudimos eliminar el cierre. Intenta nuevamente.",
                })
                return false
            } finally {
                setIsDeletingClosure(false)
            }
        },
        [closureId, displayName, email, refresh, restaurantId],
    )

    return {
        isLoading,
        error,
        closure,
        summaryItems,
        formattedReferenceDate,
        assignmentSections,
        staffMembers,
        adjustmentsByIdentifier,
        totalAdjustments,
        sortedAdjustments,
        adjustmentFeedback,
        generalAdjustmentKey,
        adjustmentForm,
        adjustmentFormError,
        isAdjustmentDialogOpen,
        isSubmittingAdjustment,
        handleAdjustmentDialogOpenChange,
        handleAdjustmentMemberChange,
        handleAdjustmentTypeChange,
        handleAdjustmentVariantChange,
        handleAdjustmentAmountChange,
        handleAdjustmentPercentageChange,
        handleAdjustmentMotivoChange,
        handleAdjustmentSubmit,
        handleRetry: loadClosure,
        isClosurePaid,
        deleteFeedback,
        isDeletingClosure,
        handleDeleteClosure,
    }
}
