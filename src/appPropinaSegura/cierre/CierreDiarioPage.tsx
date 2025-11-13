import { useEffect, useState } from "react"
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
import { db } from "@/firebase/config"
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from "firebase/firestore"

const CierreDiarioPage = () => {
    const { uid } = useAuth()
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
    } = useCierreDiario({ uid })

    const { asistenciaServicio, asistenciaCocina, ventaDirecta, pocilloSecundario } = fieldArrays
    const [hasSavedPendingClosure, setHasSavedPendingClosure] = useState(false)

    useEffect(() => {
        if (!formMethods.formState.isDirty) {
            return
        }

        setHasSavedPendingClosure(false)
        setSaveSuccessMessage(null)
    }, [formMethods.formState.isDirty, setSaveSuccessMessage])

    const handleSaveClosure = async () => {
        if (isSavingClosure) {
            return
        }

        setSaveError(null)
        setSaveSuccessMessage(null)

        if (!uid) {
            setSaveError("No se encontró una sesión activa. Inicia sesión para guardar el cierre.")
            return
        }

        try {
            setIsSavingClosure(true)
            const snapshotPayload = buildClosureSnapshotPayload()
            const closureCollection = collection(db, "restaurants", uid, "registros_diarios")

            const referenceDateKey = snapshotPayload.metadata.referenceDateKey

            if (!referenceDateKey) {
                setSaveError("Selecciona una fecha válida antes de guardar el cierre.")
                setIsSavingClosure(false)
                return
            }

            const duplicateQuery = query(
                closureCollection,
                where("metadata.referenceDateKey", "==", referenceDateKey),
                limit(1),
            )

            const existingSnapshot = await getDocs(duplicateQuery)

            if (!existingSnapshot.empty) {
                setSaveError("Esa fecha ya tiene un cierre guardado. Usa la vista de historial para editarlo.")
                setSaveSuccessMessage(null)
                setHasSavedPendingClosure(false)
                setIsSavingClosure(false)
                return
            }

            const legacyDuplicateQuery = query(
                closureCollection,
                where("snapshot.metadata.referenceDateKey", "==", referenceDateKey),
                limit(1),
            )

            const existingLegacySnapshot = await getDocs(legacyDuplicateQuery)

            if (!existingLegacySnapshot.empty) {
                setSaveError("Esa fecha ya tiene un cierre guardado. Usa la vista de historial para editarlo.")
                setSaveSuccessMessage(null)
                setHasSavedPendingClosure(false)
                setIsSavingClosure(false)
                return
            }

            await addDoc(closureCollection, {
                estado: "pendiente",
                snapshot: snapshotPayload,
                restaurantId: uid,
                metadata: snapshotPayload.metadata,
                totals: snapshotPayload.totals,
                // createdAt es la fecha/hora del registro; metadata.referenceDateKey corresponde al día de la propina.
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })

            setSaveSuccessMessage("Cierre guardado como pendiente. Podrás liquidarlo cuando el backend esté listo.")
            setHasSavedPendingClosure(true)
            resetAfterSave()
        } catch (error) {
            console.error("Error al guardar el cierre", error)
            setSaveError("No pudimos guardar el cierre. Intenta nuevamente en unos segundos.")
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
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="py-16 text-center text-sm text-muted-foreground" aria-busy="true">
                            Cargando configuración del cierre...
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    if (loadError) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="space-y-6 py-12 text-center">
                            <p className="text-sm text-destructive">{loadError}</p>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => navigate(0)} variant="outline">
                                    Reintentar
                                </Button>
                                <Button onClick={() => navigate("/setup")}>
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
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-4xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2 text-center sm:text-left">
                            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Reparte Justo</p>
                            <h1 className="text-2xl font-semibold sm:text-3xl">Registrar Cierre del Día</h1>
                            <p className="text-sm text-muted-foreground">Propinas claras, equipo justo.</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleSaveClosure}
                                disabled={isSavingClosure}
                                aria-disabled={isSavingClosure}
                                className="w-full sm:w-auto"
                            >
                                {isSavingClosure ? "Guardando..." : "Guardar"}
                            </Button>
                            {showPayButton ? (
                                <Button
                                    type="button"
                                    onClick={handlePayClosure}
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                >
                                    Pagar general
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {saveError ? (
                        <div
                            role="alert"
                            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
                        >
                            {saveError}
                        </div>
                    ) : null}

                    {saveSuccessMessage ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary"
                        >
                            {saveSuccessMessage}
                        </div>
                    ) : null}

                    {hasIneligibleStaff ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700"
                        >
                            <p className="font-medium">
                                Excluimos automáticamente del cierre a quienes ingresaron después de la fecha seleccionada
                                ({referenceDateLabel}).
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
                                className="min-w-[140px] rounded-lg border bg-background/95 px-3 py-2 text-center shadow-sm sm:text-left"
                            >
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    {item.label}
                                </p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <Card className="border bg-background/95 shadow-lg">
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
                                                    <Button variant="outline" className="flex w-full items-center justify-start gap-2 px-3">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{poolDateLabel}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-2" align="start">
                                                    <Calendar mode="single" selected={poolDate} onSelect={setPoolDate} initialFocus />
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

                                    <Separator />

                                    <section className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Staff de Servicio
                                            </h4>
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

                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Staff de Cocina
                                            </h4>
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
                                                    <Button variant="outline" className="flex w-full items-center justify-start gap-2 px-3">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{directDateLabel}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-2" align="start">
                                                    <Calendar mode="single" selected={directDate} onSelect={setDirectDate} initialFocus />
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
                                                className="w-full rounded-md border border-dashed border-input bg-muted/20 px-3 py-2 text-sm text-muted-foreground shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <section className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Registro de Garzones
                                            </h4>
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

                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Asistencia Pocillo Secundario
                                            </h4>
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
