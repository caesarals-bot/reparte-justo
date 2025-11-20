import { useEffect, useMemo, useState } from "react"
import { FormProvider } from "react-hook-form"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon } from "lucide-react"
import StaffAsistenciaCard from "./StaffAsistenciaCard"
import { amountInputClassName } from "./constants"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router"
import { useCierreDiario } from "./hooks/useCierreDiario"
import { useClosuresDashboard } from "@/appPropinaSegura/dashboard/hooks/useClosuresDashboard"
import { buildClosureHighlights } from "@/appPropinaSegura/dashboard/utils/closureCalculations"
import { guardarCierreDiario, type GuardarCierreDiarioResponse } from "./services/closuresApi"

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
    } = useCierreDiario({
        uid,
        userInfo: {
            name: displayName ?? undefined,
            email: email ?? undefined,
        },
    })

    const { asistenciaServicio, asistenciaCocina, ventaDirecta, pocilloSecundario } = fieldArrays
    const { closures, refresh: refreshClosures } = useClosuresDashboard({ uid })
    const [hasSavedPendingClosure, setHasSavedPendingClosure] = useState(false)
    const [lastSavedResponse, setLastSavedResponse] = useState<GuardarCierreDiarioResponse | null>(null)

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

        try {
            setIsSavingClosure(true)
            const snapshotPayload = buildClosureSnapshotPayload()

            if (!snapshotPayload.metadata.referenceDateKey) {
                setSaveError("Selecciona una fecha válida antes de guardar el cierre.")
                setIsSavingClosure(false)
                return
            }

            const response = await guardarCierreDiario({ restaurantId: uid, payload: snapshotPayload })
            await refreshClosures()

            setLastSavedResponse(response)
            setSaveSuccessMessage(`Cierre ${response.closureId} guardado correctamente. Ya aparece como pendiente.`)
            setHasSavedPendingClosure(true)
            resetAfterSave()
        } catch (error) {
            console.error("Error al guardar el cierre", error)
            setSaveError(error instanceof Error ? error.message : "No pudimos guardar el cierre. Intenta nuevamente en unos segundos.")
        } finally {
            setIsSavingClosure(false)
        }
    }

    const handlePayClosure = () => {
        setSaveError(null)
        setSaveSuccessMessage("La liquidación general se habilitará cuando se conecte la Cloud Function de pago.")
    }

    const showPayButton = hasSavedPendingClosure && !isSavingClosure
    const hasIneligibleStaff = ineligibleStaffNames.length > 0
    const referenceDateLabel = settlementModeConfig === "directa" ? directDateLabel : poolDateLabel

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
                                disabled={isSavingClosure}
                                aria-disabled={isSavingClosure}
                                className="w-full gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-white transition hover:bg-white/15 sm:w-auto"
                            >
                                {isSavingClosure ? "Guardando..." : "Guardar"}
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
    )
}
export default CierreDiarioPage
