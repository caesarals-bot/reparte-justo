import { useCallback, useEffect, useMemo, useState } from "react"
import { FormProvider } from "react-hook-form"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, CalendarIcon, PlusCircle, Trash2 } from "lucide-react"
import StaffAsistenciaCard from "./StaffAsistenciaCard"
import { amountInputClassName } from "./constants"
import { useAuth } from "@/context/AuthContext"
import { useNavigate, useSearchParams } from "react-router"
import { useCierreDiario, type ClosureSnapshotPayload } from "./hooks/useCierreDiario"
import { useClosuresDashboard } from "@/appPropinaSegura/dashboard/hooks/useClosuresDashboard"
import { buildClosureHighlights } from "@/appPropinaSegura/dashboard/utils/closureCalculations"
import {
    guardarCierreDiario,
    type GuardarCierreDiarioResponse,
    eliminarCierreDiario,
} from "./services/closuresApi"

const calendarModifiersClassNames = {
    pendingClosure:
        "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 data-[selected]:bg-emerald-600 data-[selected]:text-emerald-50",
    settledClosure:
        "bg-muted text-foreground/70 hover:bg-muted data-[selected]:bg-muted data-[selected]:text-foreground",
    latestClosure: "ring-2 ring-primary ring-offset-1",
}

const CierreDiarioPage = () => {
    const { uid, displayName, email } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const {
        formMethods,
        fieldArrays,
        poolDate,
        setPoolDate,
        directDate,
        setDirectDate,
        poolDateLabel,
        directDateLabel,
        poolTotalInput,
        handlePoolTotalChange,
        currencyFormatter,
        formattedDirectSales,
        summaryItems,
        serviceAssignedAmounts,
        supportAssignedAmounts,
        directAssignedAmounts,
        generalExpenseEntries,
        generalExpenseTotal,
        netAfterDeductions,
        isLoadingConfig,
        loadError,
        settlementModeConfig,
        buildClosureSnapshotPayload,
        isSavingClosure,
        setIsSavingClosure,
        saveError,
        setSaveError,
        saveSuccessMessage,
        setSaveSuccessMessage,
        resetAfterSave,
        ineligibleStaffNames,
        editingState,
        isHydratingFromClosure,
        loadClosureForEditing,
        markEditingOriginalDeleted,
        clearEditingState,
    } = useCierreDiario({
        uid,
        userInfo: {
            name: displayName ?? undefined,
            email: email ?? undefined,
        },
    })

    const { register } = formMethods

    const { asistenciaServicio, asistenciaCocina, ventaDirecta, pocilloSecundario, generalExpenses } = fieldArrays
    const { closures, refresh: refreshClosures } = useClosuresDashboard({ uid })
    const [hasSavedPendingClosure, setHasSavedPendingClosure] = useState(false)
    const [lastSavedResponse, setLastSavedResponse] = useState<GuardarCierreDiarioResponse | null>(null)
    const [isNetWarningOpen, setIsNetWarningOpen] = useState(false)
    const [pendingSnapshotPayload, setPendingSnapshotPayload] = useState<ClosureSnapshotPayload | null>(null)

    const highlightData = useMemo(() => buildClosureHighlights(closures), [closures])

    const disabledDates = useMemo(() => {
        if (!highlightData.pendingDates.length && !highlightData.settledDates.length) {
            return [] as Date[]
        }

        const map = new Map<number, Date>()
        highlightData.pendingDates.forEach((date) => map.set(date.getTime(), date))
        highlightData.settledDates.forEach((date) => map.set(date.getTime(), date))
        return Array.from(map.values())
    }, [highlightData.pendingDates, highlightData.settledDates])

    const calendarModifiers = useMemo(
        () => ({
            pendingClosure: highlightData.pendingDates,
            settledClosure: highlightData.settledDates,
            latestClosure: highlightData.latestDates,
        }),
        [highlightData],
    )

    useEffect(() => {
        if (!formMethods.formState.isDirty) {
            return
        }

        setHasSavedPendingClosure(false)
        setLastSavedResponse(null)
        setSaveSuccessMessage(null)
    }, [formMethods.formState.isDirty, setSaveSuccessMessage])

    const closureIdParam = searchParams.get("closureId")

    useEffect(() => {
        if (!uid) {
            return
        }

        if (closureIdParam) {
            void loadClosureForEditing({ restaurantId: uid, closureId: closureIdParam })
        } else {
            clearEditingState()
        }
    }, [uid, closureIdParam, loadClosureForEditing, clearEditingState])

    const handleCancelEditing = () => {
        if (editingState) {
            const redirectClosureId = editingState.closureId || closureIdParam
            clearEditingState()
            if (closureIdParam) {
                const nextParams = new URLSearchParams(searchParams)
                nextParams.delete("closureId")
                setSearchParams(nextParams, { replace: true })
            }
            if (redirectClosureId) {
                navigate(`/dashboard/closures/${redirectClosureId}`)
                return
            }
        }

        navigate(-1)
    }

    const saveSnapshotPayload = useCallback(
        async (snapshotPayload: ClosureSnapshotPayload) => {
            if (!uid) {
                setSaveError("No se encontró una sesión activa. Inicia sesión para guardar el cierre.")
                return
            }

            try {
                setIsSavingClosure(true)

                if (editingState && !editingState.hasDeletedOriginal) {
                    await eliminarCierreDiario({
                        restaurantId: uid,
                        closureId: editingState.closureId,
                        reason: "Reemplazo por edición del cierre",
                        deletedBy: {
                            uid,
                            name: displayName ?? undefined,
                            email: email ?? undefined,
                        },
                    })
                    markEditingOriginalDeleted()
                }

                const response = await guardarCierreDiario({ restaurantId: uid, payload: snapshotPayload })
                await refreshClosures()

                setLastSavedResponse(response)
                const successMessage = editingState
                    ? `Cierre ${response.closureId} actualizado correctamente. Ya aparece como pendiente.`
                    : `Cierre ${response.closureId} guardado correctamente. Ya aparece como pendiente.`
                setSaveSuccessMessage(successMessage)
                setHasSavedPendingClosure(true)
                resetAfterSave()

                if (editingState) {
                    clearEditingState()
                    if (closureIdParam) {
                        const nextParams = new URLSearchParams(searchParams)
                        nextParams.delete("closureId")
                        setSearchParams(nextParams, { replace: true })
                    }
                }
            } catch (error) {
                console.error("Error al guardar el cierre", error)
                setSaveError("No pudimos guardar el cierre. Intenta nuevamente en unos segundos.")
            } finally {
                setIsSavingClosure(false)
                setPendingSnapshotPayload(null)
                setIsNetWarningOpen(false)
            }
        },
        [
            uid,
            setSaveError,
            editingState,
            eliminarCierreDiario,
            displayName,
            email,
            markEditingOriginalDeleted,
            refreshClosures,
            setLastSavedResponse,
            setSaveSuccessMessage,
            setHasSavedPendingClosure,
            resetAfterSave,
            clearEditingState,
            closureIdParam,
            searchParams,
            setSearchParams,
        ],
    )

    const handleSaveClosure = async () => {
        if (isSavingClosure) {
            return
        }

        setSaveError(null)
        setSaveSuccessMessage(null)
        setLastSavedResponse(null)

        if (!uid) {
            setSaveError("No se encontró una sesión activa. Inicia sesión para guardar el cierre.")
            return
        }

        const snapshotPayload = buildClosureSnapshotPayload()

        if (!snapshotPayload.metadata.referenceDateKey) {
            setSaveError("Selecciona una fecha válida antes de guardar el cierre.")
            return
        }

        if (snapshotPayload.dailySummary.netAfterDeductions <= 0) {
            setPendingSnapshotPayload(snapshotPayload)
            setIsNetWarningOpen(true)
            return
        }

        await saveSnapshotPayload(snapshotPayload)
    }

    const handleConfirmNetWarning = async () => {
        if (!pendingSnapshotPayload || isSavingClosure) {
            return
        }

        await saveSnapshotPayload(pendingSnapshotPayload)
    }

    const handleCancelNetWarning = () => {
        if (isSavingClosure) {
            return
        }

        setPendingSnapshotPayload(null)
        setIsNetWarningOpen(false)
    }

    const handlePayClosure = () => {
        setSaveError(null)
        setSaveSuccessMessage("La liquidación general se habilitará cuando se conecte la Cloud Function de pago.")
    }

    const showPayButton = hasSavedPendingClosure && !isSavingClosure
    const hasIneligibleStaff = ineligibleStaffNames.length > 0
    const referenceDateLabel = settlementModeConfig === "directa" ? directDateLabel : poolDateLabel

    const renderGeneralExpensesSection = () => {
        const helperText =
            settlementModeConfig === "directa"
                ? "Aplica descuentos (ej. anfitriona, caja) antes de repartir la venta directa."
                : "Asigna montos para part-time o anfitriona antes de repartir el pocillo."

        return (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(3,6,23,0.35)]">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">Gastos generales</p>
                        <p className="text-sm text-white/80">{helperText}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total</p>
                        <p className="text-2xl font-semibold text-white">{currencyFormatter.format(generalExpenseTotal)}</p>
                    </div>
                </header>

                <div className="mt-4 space-y-3">
                    {generalExpenses.fields.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
                            Aún no registras gastos generales. Agrega uno para descontarlo del reparto de garzones.
                        </p>
                    ) : (
                        generalExpenses.fields.map((field, index) => {
                            const expenseErrors = formMethods.formState.errors.generalExpenses?.[index]

                            return (
                                <div
                                    key={field.id}
                                    className="rounded-2xl border border-white/10 bg-[rgba(15,18,33,0.75)] p-4 shadow-[0_10px_25px_rgba(3,6,23,0.45)]"
                                >
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                                        <div className="space-y-1">
                                            <Label htmlFor={`general-expense-name-${field.id}`}>Nombre</Label>
                                            <input
                                                id={`general-expense-name-${field.id}`}
                                                placeholder="Ej. Turno part-time"
                                                className={amountInputClassName}
                                                {...register(`generalExpenses.${index}.nombre` as const)}
                                                defaultValue={field.nombre ?? ""}
                                            />
                                            {expenseErrors?.nombre?.message ? (
                                                <p className="text-xs text-rose-300">{expenseErrors.nombre.message}</p>
                                            ) : null}
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor={`general-expense-type-${field.id}`}>Tipo</Label>
                                            <select
                                                id={`general-expense-type-${field.id}`}
                                                className="w-full rounded-2xl border border-white/20 bg-transparent px-3 py-3 text-sm text-white shadow-inner shadow-black/20 focus:border-primary focus:outline-none"
                                                {...register(`generalExpenses.${index}.tipo` as const)}
                                                defaultValue={field.tipo ?? "part-time"}
                                            >
                                                <option className="bg-slate-950" value="part-time">
                                                    Part-time
                                                </option>
                                                <option className="bg-slate-950" value="anfitriona">
                                                    Anfitriona
                                                </option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor={`general-expense-amount-${field.id}`}>Monto</Label>
                                            <input
                                                id={`general-expense-amount-${field.id}`}
                                                type="number"
                                                min={0}
                                                step="1000"
                                                placeholder="Ej. 20000"
                                                className={amountInputClassName}
                                                {...register(`generalExpenses.${index}.monto` as const, {
                                                    valueAsNumber: true,
                                                    min: 0,
                                                })}
                                                defaultValue={field.monto ?? 0}
                                            />
                                            {expenseErrors?.monto?.message ? (
                                                <p className="text-xs text-rose-300">{expenseErrors.monto.message}</p>
                                            ) : null}
                                        </div>

                                        <div className="flex items-center justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-white/70 hover:text-white"
                                                onClick={() => generalExpenses.remove(index)}
                                                aria-label="Eliminar gasto"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <input
                                        type="hidden"
                                        {...register(`generalExpenses.${index}.entryId` as const)}
                                        defaultValue={field.entryId ?? field.id}
                                    />
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                        onClick={() =>
                            generalExpenses.append({
                                entryId:
                                    typeof crypto !== "undefined" && "randomUUID" in crypto
                                        ? crypto.randomUUID()
                                        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                                nombre: "",
                                tipo: "part-time",
                                monto: 0,
                            })
                        }
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar gasto
                    </Button>
                    {generalExpenseEntries.length > 0 ? (
                        <p className="text-xs text-white/60">
                            Se descontarán {currencyFormatter.format(generalExpenseTotal)} del reparto de garzones.
                        </p>
                    ) : null}
                </div>
            </section>
        )
    }

    if (isLoadingConfig) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-14 text-white">
                <section className="w-full max-w-3xl">
                    <Card className="border border-white/10 bg-[rgba(10,13,25,0.92)] text-white shadow-[0_30px_65px_rgba(3,6,23,0.55)] backdrop-blur-xl">
                        <CardContent className="py-16 text-center text-sm text-white/70" aria-busy="true">
                            Cargando configuración del cierre...
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    if (loadError) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-14 text-white">
                <section className="w-full max-w-3xl">
                    <Card className="border border-white/10 bg-[rgba(10,13,25,0.92)] text-white shadow-[0_30px_65px_rgba(3,6,23,0.55)] backdrop-blur-xl">
                        <CardContent className="space-y-6 py-12 text-center">
                            <p className="text-sm text-destructive">{loadError}</p>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => navigate(0)} variant="outline" className="rounded-full border-white/30 bg-white/5 text-white">
                                    Reintentar
                                </Button>
                                <Button onClick={() => navigate("/setup")} className="rounded-full bg-linear-to-r from-primary to-accent text-primary-foreground">
                                    Ir a configuración inicial
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    return (
        <>
            <FormProvider {...formMethods}>
            <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-14 text-white">
                <section className="w-full max-w-4xl space-y-8">
                    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[rgba(10,13,25,0.9)] p-6 shadow-[0_25px_60px_rgba(3,6,23,0.45)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 text-center sm:text-left">
                            <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">Reparte Justo</p>
                            <h1 className="text-3xl font-semibold tracking-tight">Registrar Cierre del Día</h1>
                            <p className="text-sm text-white/70">Propinas claras, equipo justo.</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleSaveClosure}
                                disabled={isSavingClosure || isHydratingFromClosure}
                                aria-disabled={isSavingClosure || isHydratingFromClosure}
                                className="w-full gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-white transition hover:bg-white/15 sm:w-auto"
                            >
                                {isHydratingFromClosure ? "Cargando cierre..." : isSavingClosure ? "Guardando..." : "Guardar"}
                            </Button>
                            {showPayButton ? (
                                <Button
                                    type="button"
                                    onClick={handlePayClosure}
                                    className="w-full gap-2 rounded-full bg-linear-to-r from-primary to-accent px-6 text-primary-foreground shadow-[0_15px_35px_rgba(26,31,77,0.55)] sm:w-auto"
                                >
                                    Pagar general
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {editingState ? (
                        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Estás editando el cierre original {editingState.referenceDateKey ?? editingState.closureId}. Se eliminará el
                                cierre previo y se volverá a crear con la información actualizada.
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="inline-flex items-center gap-2 border border-amber-200/80 text-amber-50 hover:bg-amber-200/10"
                                onClick={handleCancelEditing}
                                disabled={isSavingClosure || isHydratingFromClosure}
                            >
                                <ArrowLeft className="h-4 w-4" /> Volver sin editar
                            </Button>
                        </div>
                    ) : null}

                    {saveError ? (
                        <div
                            role="alert"
                            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[0_15px_35px_rgba(82,8,23,0.35)]"
                        >
                            {saveError}
                        </div>
                    ) : null}

                    {saveSuccessMessage ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary shadow-[0_15px_35px_rgba(24,94,255,0.35)]"
                        >
                            {saveSuccessMessage}
                        </div>
                    ) : null}

                    {lastSavedResponse ? (
                        <div className="rounded-3xl border border-emerald-300/40 bg-emerald-400/10 p-5 text-sm text-emerald-100 shadow-[0_20px_50px_rgba(8,47,35,0.55)]">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-base font-semibold">Resumen del cierre enviado</p>
                                <span className="text-xs text-emerald-200">ID: {lastSavedResponse.closureId}</span>
                            </div>
                            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <dt className="text-[11px] uppercase tracking-[0.4em] text-emerald-200">Total neto del día</dt>
                                    <dd className="mt-1 text-lg font-semibold text-white">
                                        ${lastSavedResponse.totals.netAfterDeductions.toLocaleString("es-CL")}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] uppercase tracking-[0.4em] text-emerald-200">Transbank</dt>
                                    <dd className="mt-1 text-lg font-semibold text-white">
                                        ${lastSavedResponse.totals.transbankAmount.toLocaleString("es-CL")}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] uppercase tracking-[0.4em] text-emerald-200">Deducciones</dt>
                                    <dd className="mt-1 text-lg font-semibold text-white">
                                        ${lastSavedResponse.totals.deductionsAmount.toLocaleString("es-CL")}
                                    </dd>
                                </div>
                                {lastSavedResponse.pendingTotals ? (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-[0.4em] text-emerald-200">Total no liquidado</dt>
                                        <dd className="mt-1 text-lg font-semibold text-white">
                                            ${lastSavedResponse.pendingTotals.netAfterDeductions.toLocaleString("es-CL")}
                                        </dd>
                                        <p className="text-[11px] text-emerald-100">
                                            Pendientes: {lastSavedResponse.pendingTotals.pendingCount}
                                        </p>
                                    </div>
                                ) : null}
                            </dl>
                            <p className="mt-3 text-xs text-emerald-100/80">
                                El calendario ya marca este día como pendiente; avanza al dashboard para liquidarlo cuando corresponda.
                            </p>
                        </div>
                    ) : null}

                    {hasIneligibleStaff ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 shadow-[0_15px_35px_rgba(82,47,8,0.45)]"
                        >
                            <p className="font-medium">
                                Excluimos automáticamente del cierre a quienes ingresaron después de la fecha seleccionada ({referenceDateLabel}).
                            </p>
                            <p className="mt-1 text-xs">
                                Revisa las fechas de ingreso o ajusta la fecha del cierre para incluir nuevamente a:
                                <span className="ml-1 font-semibold">{ineligibleStaffNames.join(", ")}</span>.
                            </p>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3 lg:grid-cols-5">
                        {summaryItems.map((item) => (
                            <div
                                key={item.key}
                                className="min-w-[140px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white shadow-[0_15px_35px_rgba(3,6,23,0.35)] sm:text-left"
                            >
                                <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/60">{item.label}</p>
                                <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <Card className="border border-white/10 bg-[rgba(12,15,28,0.92)] text-white shadow-[0_35px_80px_rgba(3,6,23,0.6)] backdrop-blur-xl">
                        <CardContent className="space-y-10 p-6">
                            {settlementModeConfig !== "directa" ? (
                                <article className="space-y-6">
                                    <header className="flex flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="text-xl font-semibold">Registro de Pocillo</h3>
                                    </header>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Fecha</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="flex w-full items-center justify-start gap-2 rounded-2xl border-white/20 bg-white/5 px-4 py-3 text-white">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{poolDateLabel}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="space-y-2 rounded-2xl border border-white/10 bg-[rgba(12,15,28,0.95)] p-3 text-white" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={poolDate}
                                                        onSelect={setPoolDate}
                                                        initialFocus
                                                        modifiers={calendarModifiers}
                                                        modifiersClassNames={calendarModifiersClassNames}
                                                        disabled={disabledDates}
                                                    />
                                                    <p className="text-[11px] text-white/70">
                                                        <span className="font-medium text-emerald-300">Verde</span> = cierre pendiente •
                                                        <span className="ml-1 font-medium text-white/70"> Gris</span> = cierre liquidado •
                                                        <span className="ml-1 font-medium text-primary">Borde</span> = último cierre guardado
                                                    </p>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="pool-total">Monto Bruto Total del Día</Label>
                                            <input
                                                id="pool-total"
                                                type="number"
                                                min="0"
                                                placeholder="Ej. 450000"
                                                className={amountInputClassName}
                                                value={poolTotalInput}
                                                onChange={handlePoolTotalChange}
                                            />
                                        </div>
                                    </div>

                                    {renderGeneralExpensesSection()}

                                    <Separator className="border-white/10" />

                                    <section className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(3,6,23,0.35)]">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Staff de Servicio</h4>
                                            <div className="mt-3 space-y-3">
                                                {asistenciaServicio.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="asistenciaServicio"
                                                        showPonderacion
                                                        assignedAmount={
                                                            serviceAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(serviceAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(3,6,23,0.35)]">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Staff de Cocina</h4>
                                            <div className="mt-3 space-y-3">
                                                {asistenciaCocina.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="asistenciaCocina"
                                                        showPonderacion
                                                        assignedAmount={
                                                            supportAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(supportAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                </article>
                            ) : null}

                            {settlementModeConfig !== "directa" ? <Separator className="my-8" /> : null}

                            {settlementModeConfig === "directa" ? (
                                <article className="space-y-6">
                                    <header className="flex flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="text-xl font-semibold">Registro de Venta Directa</h3>
                                    </header>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Fecha</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="flex w-full items-center justify-start gap-2 rounded-2xl border-white/20 bg-white/5 px-4 py-3 text-white">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{directDateLabel}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="space-y-2 rounded-2xl border border-white/10 bg-[rgba(12,15,28,0.95)] p-3 text-white" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={directDate}
                                                        onSelect={setDirectDate}
                                                        initialFocus
                                                        modifiers={calendarModifiers}
                                                        modifiersClassNames={calendarModifiersClassNames}
                                                        disabled={disabledDates}
                                                    />
                                                    <p className="text-[11px] text-white/70">
                                                        <span className="font-medium text-emerald-300">Verde</span> = cierre pendiente •
                                                        <span className="ml-1 font-medium text-white/70"> Gris</span> = cierre liquidado •
                                                        <span className="ml-1 font-medium text-primary">Borde</span> = último cierre guardado
                                                    </p>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="direct-total">Total Venta Directa del Día</Label>
                                            <input
                                                id="direct-total"
                                                type="text"
                                                disabled
                                                value={formattedDirectSales}
                                                className="w-full rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 py-3 text-sm text-white/70 shadow-inner shadow-black/30"
                                            />
                                        </div>
                                    </div>

                                    <Separator className="border-white/10" />

                                    {renderGeneralExpensesSection()}

                                    <Separator className="border-white/10" />

                                    <section className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(3,6,23,0.35)]">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Registro de Garzones</h4>
                                            <div className="mt-3 space-y-3">
                                                {ventaDirecta.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="ventaDirecta"
                                                        showMontoIndividual
                                                        assignedAmount={
                                                            directAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(directAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(3,6,23,0.35)]">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Asistencia Pocillo Secundario</h4>
                                            <div className="mt-3 space-y-3">
                                                {pocilloSecundario.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="pocilloSecundario"
                                                        showPonderacion
                                                        assignedAmount={
                                                            supportAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(supportAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                </article>
                            ) : null}
                        </CardContent>
                    </Card>
                </section>
            </main>
            </FormProvider>

            <AlertDialog
                open={isNetWarningOpen}
                onOpenChange={(open) => (!open ? handleCancelNetWarning() : setIsNetWarningOpen(true))}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            El neto quedó en {currencyFormatter.format(
                                pendingSnapshotPayload?.dailySummary.netAfterDeductions ?? netAfterDeductions,
                            )}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            El monto neto después de deducciones es cero o negativo. Si continúas, registraremos este cierre
                            igualmente y los garzones podrían no recibir reparto. ¿Deseas guardar de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel type="button" onClick={handleCancelNetWarning} disabled={isSavingClosure}>
                            Revisar montos
                        </AlertDialogCancel>
                        <AlertDialogAction type="button" onClick={handleConfirmNetWarning} disabled={isSavingClosure}>
                            Guardar de todas maneras
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
export default CierreDiarioPage
