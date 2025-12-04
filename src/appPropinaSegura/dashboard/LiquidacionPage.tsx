import { useNavigate } from "react-router"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/appPropinaSegura/component/dashboard/date-range-picker"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, CalendarRange, Loader2, PiggyBank } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLiquidacionWorkflow } from "./hooks/useLiquidacionWorkflow"
import { Badge } from "@/components/ui/badge"

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(
        Math.round(value),
    )

const LiquidacionPage = () => {
    const navigate = useNavigate()
    const { uid, email: ownerEmail, displayName: ownerName } = useAuth()
    const {
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
        selectedMode,
        isDirectSalesMode,
        modeMismatchError,
        configurationSummary,
        dateRangeLabel,
        hasUnnamedDeductions,
        unnamedDeductionCount,
        unnamedDeductionSample,
        handlePrepareLiquidacion,
        handleConfirmLiquidacion,
    } = useLiquidacionWorkflow({ uid, ownerEmail, ownerName })

    const modeLabel = selectedMode === "directa" ? "Venta directa" : selectedMode === "pool" ? "Pool" : "Sin modo"
    const prepareDisabled =
        !availablePendingClosures.length || !dateRange.from || filteredClosures.length === 0 || Boolean(modeMismatchError)
    const directWaiterPercentage = configurationSummary?.directWaiterPercentage ?? null
    const remainderPercentage = directWaiterPercentage !== null ? Math.max(0, 100 - directWaiterPercentage) : null

    const handleBack = () => {
        navigate("/dashboard")
    }

    const renderDirectModeHint = (variant: "card" | "modal") => {
        if (!isDirectSalesMode) {
            return null
        }

        const wrapperClassName =
            variant === "card"
                ? "rounded-md border border-primary/25 bg-primary/5 px-4 py-3"
                : "rounded-md border border-primary/25 bg-background/60 px-3 py-2"

        return (
            <div className={wrapperClassName}>
                <p className="text-xs uppercase tracking-wide text-primary">Ponderación de venta directa</p>
                <div className="mt-2 grid gap-3 text-sm text-primary sm:grid-cols-2">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-primary/70">Garzón directo</p>
                        <p className="text-base font-semibold">
                            {directWaiterPercentage !== null ? `${directWaiterPercentage}%` : "Sin definir"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-primary/70">Disponible para cocina/bar</p>
                        <p className="text-base font-semibold">
                            {remainderPercentage !== null ? `${remainderPercentage}%` : "Depende de la configuración"}
                        </p>
                    </div>
                </div>
                <p className="mt-2 text-[11px] text-primary/80">
                    Los descuentos con nombre (pocillo, caja, anfitriona, etc.) se registran desde el botón "Agregar deducción" de cada cierre.
                </p>
                {directWaiterPercentage === null ? (
                    <p className="mt-1 text-[11px] text-destructive">
                        Define esta ponderación en Configuración inicial → Personal para evitar inconsistencias.
                    </p>
                ) : null}
            </div>
        )
    }

    const renderUnnamedDeductionAlert = (variant: "card" | "modal") => {
        if (!hasUnnamedDeductions) {
            return null
        }

        const sampleLabel = unnamedDeductionSample
            .map((entry) => entry.staffName)
            .filter(Boolean)
            .join(", ")
        const sampleSuffix = unnamedDeductionCount > unnamedDeductionSample.length ? "…" : ""

        const baseClassName =
            variant === "card"
                ? "rounded-md border border-amber-300/60 bg-amber-100/80 px-3 py-2 text-amber-900"
                : "rounded-md border border-amber-300/60 bg-amber-100/70 px-3 py-2 text-amber-900"

        return (
            <div className={`${baseClassName} text-xs leading-relaxed`}>
                <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                    <div>
                        <p className="font-medium">{unnamedDeductionCount} deducción(es) sin nombre</p>
                        <p>
                            Las liquidaremos como <span className="font-semibold">“Otros”</span> para no bloquear el pago.
                            {sampleLabel ? ` Ej: ${sampleLabel}${sampleSuffix}` : ""}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-10">
                <section className="w-full max-w-2xl">
                    <Card className="border bg-background/95 shadow-sm">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            Cargando datos de cierres pendientes para liquidación...
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    return (
        <main className="flex min-h-screen items-start justify-center bg-linear-to-b from-background to-muted/30 px-4 py-10">
            <section className="w-full max-w-4xl space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <CalendarRange className="h-4 w-4" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold leading-tight">Liquidar propinas</h1>
                            <p className="text-sm text-muted-foreground">
                                Selecciona un rango de fechas con cierres pendientes para preparar la liquidación.
                            </p>
                        </div>
                    </div>

                    <Button type="button" variant="outline" onClick={handleBack}>
                        Volver al dashboard
                    </Button>
                </div>

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <PiggyBank className="h-4 w-4 text-primary" /> Total no liquidado
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Basado en los cierres pendientes sincronizados desde el backend.
                                </CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cierres</p>
                                <p className="text-lg font-semibold text-foreground">{availablePendingClosures.length}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Monto estimado</p>
                            <p className="text-2xl font-semibold text-foreground">
                                {formatCurrency(pendingSummary.totalNetAfterDeductions)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Incluye propinas, descuentos globales y penalizaciones registradas.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Gasto general acumulado: {formatCurrency(pendingSummary.totalGeneralExpense)}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>Modo detectado:</span>
                                <Badge
                                    variant={selectedMode === "directa" ? "default" : "outline"}
                                    className={selectedMode === "directa" ? "bg-primary/90" : "text-foreground"}
                                >
                                    {modeLabel}
                                </Badge>
                                {modeMismatchError ? (
                                    <span className="text-destructive">({modeMismatchError})</span>
                                ) : null}
                            </div>
                            {notificationContact?.email ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {isFallbackContact
                                        ? "Sin correo de contacto configurado. Usaremos el correo del titular: "
                                        : "Último contacto configurado: "}
                                    {notificationContact.responsibleName ?? "Responsable"}
                                    {` • ${notificationContact.email}`}
                                </p>
                            ) : (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Agrega un correo de contacto en la configuración inicial para automatizar el envío.
                                    El PDF se descargará automáticamente al confirmar la liquidación.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-3">
                            <Button
                                type="button"
                                onClick={handlePrepareLiquidacion}
                                disabled={prepareDisabled}
                            >
                                Preparar liquidación
                            </Button>
                            {renderUnnamedDeductionAlert("card")}
                            {renderDirectModeHint("card")}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Rango de fechas a liquidar</CardTitle>
                        <CardDescription className="text-xs">
                            Solo se usa como filtro visual. No se modifica ningún cierre ni se marca como liquidado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DateRangePicker
                            dateRange={dateRange}
                            setDateRange={setDateRange}
                            highlightedDates={highlightedDates}
                            settledDates={settledDates}
                        />

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Por ahora solo filtramos los cierres para preparar el payload de liquidación.</span>
                        </div>
                    </CardContent>
                </Card>

                {prepareError || modeMismatchError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {prepareError ?? modeMismatchError}
                    </div>
                ) : null}

                <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Preparar liquidación</DialogTitle>
                            <DialogDescription>
                                Ajusta el rango y revisa los montos antes de enviar el payload al backend.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 text-sm">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Rango a liquidar</p>
                                <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                                    {dateRangeLabel}
                                </div>
                            </div>

                            <div className="grid gap-3 rounded-md border bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Netos a pagar</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {formatCurrency(selectedTotals.totalNetAfterDeductions)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Propinas generadas</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {formatCurrency(selectedTotals.totalPropinas)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Descuentos globales</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {formatCurrency(selectedTotals.totalDeductions)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Gasto general</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {formatCurrency(selectedTotals.totalGeneralExpense)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cierres incluidos</p>
                                    <p className="text-lg font-semibold text-foreground">{filteredClosures.length}</p>
                                </div>
                            </div>

                            {notificationContact?.email ? (
                                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                                    Enviaremos la liquidación a {" "}
                                    <span className="font-semibold">{notificationContact.email}</span>
                                    {notificationContact.responsibleName
                                        ? ` (a cargo: ${notificationContact.responsibleName}${
                                              isFallbackContact ? ", titular" : ""
                                          })`
                                        : isFallbackContact
                                            ? " (titular de la cuenta)"
                                            : ""}
                                    .
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Agrega un correo de contacto en la configuración inicial para automatizar el envío.
                                </p>
                            )}

                            <div className="rounded-md border bg-background/60 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                                    Desglose por integrante (muestra hasta 6)
                                </p>
                                {selectedMembers.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No hay integrantes en el rango seleccionado.
                                    </p>
                                ) : (
                                    <ul className="space-y-1 text-sm text-foreground">
                                        {selectedMembers.slice(0, 6).map((member) => (
                                            <li key={member.id} className="flex justify-between text-xs">
                                                <span className="font-medium">
                                                    {member.nombre}
                                                    {member.role ? ` • ${member.role}` : ""}
                                                </span>
                                                <span>{formatCurrency(member.totalNeto)}</span>
                                            </li>
                                        ))}
                                        {selectedMembers.length > 6 ? (
                                            <li className="text-[11px] text-muted-foreground">+ {selectedMembers.length - 6} integrantes</li>
                                        ) : null}
                                    </ul>
                                )}
                            </div>

                            <div className="rounded-md border bg-background/60 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                                    Gastos generales incluidos en la liquidación
                                </p>
                                {detalleGastosGenerales.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No hay gastos generales registrados.</p>
                                ) : (
                                    <ul className="space-y-1 text-sm text-foreground">
                                        {detalleGastosGenerales.slice(0, 6).map((expense) => (
                                            <li key={expense.id} className="flex justify-between text-xs">
                                                <span className="font-medium">
                                                    {expense.nombre}
                                                    {expense.tipo ? ` • ${expense.tipo}` : ""}
                                                </span>
                                                <span>{formatCurrency(expense.total)}</span>
                                            </li>
                                        ))}
                                        {detalleGastosGenerales.length > 6 ? (
                                            <li className="text-[11px] text-muted-foreground">
                                                + {detalleGastosGenerales.length - 6} gastos adicionales
                                            </li>
                                        ) : null}
                                    </ul>
                                )}
                            </div>

                            <div className="rounded-md border bg-background/60 p-3 space-y-3">
                                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                                    <span>Modo de liquidación</span>
                                    <Badge
                                        variant={selectedMode === "directa" ? "default" : "outline"}
                                        className={selectedMode === "directa" ? "bg-primary/90" : "text-foreground"}
                                    >
                                        {modeLabel}
                                    </Badge>
                                </div>

                                {modeMismatchError ? (
                                    <p className="text-xs text-destructive">{modeMismatchError}</p>
                                ) : null}

                                {renderDirectModeHint("modal")}
                            </div>

                            {liquidacionFeedback ? (
                                <p
                                    className={`rounded-md border px-3 py-2 text-xs ${
                                        liquidacionFeedback.type === "success"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                            : "border-destructive/40 bg-destructive/10 text-destructive"
                                    }`}
                                >
                                    {liquidacionFeedback.message}
                                </p>
                            ) : null}
                            {renderUnnamedDeductionAlert("modal")}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => handleModalOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="button" onClick={handleConfirmLiquidacion} disabled={isSubmittingLiquidacion} className="gap-2">
                                {isSubmittingLiquidacion ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Confirmar envío (placeholder)
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Resumen del período</CardTitle>
                        <CardDescription className="text-xs">
                            Totales calculados a partir de los cierres pendientes dentro del rango seleccionado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide">Total a liquidar</p>
                                <p className="text-lg font-semibold text-foreground">
                                    ${Math.round(resumen.totalNetAfterDeductions).toLocaleString("es-CL")}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide">Total descuentos</p>
                                <p className="text-lg font-semibold text-foreground">
                                    ${Math.round(resumen.totalDeductions).toLocaleString("es-CL")}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide">Gasto general</p>
                                <p className="text-lg font-semibold text-foreground">
                                    ${Math.round(resumen.totalGeneralExpense).toLocaleString("es-CL")}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide">Integrantes</p>
                                <p className="text-lg font-semibold text-foreground">{resumen.memberCount}</p>
                            </div>
                        </div>
                        <Separator />
                        <p className="text-xs">
                            Este resumen es provisional. En el diseño final se listarán los montos acumulados por integrante
                            y por grupo (garzones / cocina) para el rango seleccionado.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Desglose diario del ciclo</CardTitle>
                        <CardDescription className="text-xs">
                            Totales diarios de neto, propinas y cargos globales (Transbank/otros descuentos automáticos) dentro del rango seleccionado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        {detallePorDia.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                Aún no hay cierres pendientes en el rango seleccionado.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-xs">
                                    <thead className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                                        <tr>
                                            <th className="py-2 pr-4">Fecha</th>
                                            <th className="py-2 pr-4 text-right">Total neto</th>
                                            <th className="py-2 pr-4 text-right">Propinas</th>
                                            <th className="py-2 pr-4 text-right">Gasto general</th>
                                            <th className="py-2 pr-0 text-right">Transbank / descuentos globales</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detallePorDia.map((day) => (
                                            <tr key={day.id} className="border-b last:border-0">
                                                <td className="py-1.5 pr-4 text-foreground">
                                                    {day.referenceDate
                                                        ? day.referenceDate.toLocaleDateString("es-CL", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                        })
                                                        : "Fecha no registrada"}
                                                </td>
                                                <td className="py-1.5 pr-4 text-right font-medium text-foreground">
                                                    ${Math.round(day.netAfterDeductions).toLocaleString("es-CL")}
                                                </td>
                                                <td className="py-1.5 pr-4 text-right">
                                                    ${Math.round(day.propinas).toLocaleString("es-CL")}
                                                </td>
                                                <td className="py-1.5 pr-4 text-right">
                                                    ${Math.round(day.generalExpense).toLocaleString("es-CL")}
                                                </td>
                                                <td className="py-1.5 pr-0 text-right">
                                                    ${Math.round(day.deductionsAmount + day.transbankAmount).toLocaleString("es-CL")}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Penalizaciones y ajustes</CardTitle>
                        <CardDescription className="text-xs">
                            Lista de descuentos manuales o penalizaciones aplicadas a integrantes, con su fecha y detalle para mayor claridad.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        {penalizacionesYAjustes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No hay penalizaciones ni ajustes registrados en el rango seleccionado.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-xs">
                                    <thead className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                                        <tr>
                                            <th className="py-2 pr-4">Fecha</th>
                                            <th className="py-2 pr-4">Descripción</th>
                                            <th className="py-2 pr-0 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {penalizacionesYAjustes.map((entry) => (
                                            <tr key={entry.id} className="border-b last:border-0">
                                                <td className="py-1.5 pr-4 text-foreground">
                                                    {entry.referenceDate
                                                        ? entry.referenceDate.toLocaleDateString("es-CL", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                        })
                                                        : entry.rawReferenceDate ?? "Fecha no registrada"}
                                                </td>
                                                <td className="py-1.5 pr-4 text-foreground">
                                                    {entry.description}
                                                </td>
                                                <td className="py-1.5 pr-0 text-right text-foreground">
                                                    {entry.amount !== undefined
                                                        ? `${entry.amount >= 0 ? "" : "-"}$${Math.abs(entry.amount).toLocaleString("es-CL")}`
                                                        : entry.amountLabel ?? "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Detalle por integrante (para pago)</CardTitle>
                        <CardDescription className="text-xs">
                            Montos acumulados por persona, considerando ajustes y descuentos. Los descuentos globales se
                            redistribuyen equitativamente entre quienes no tienen penalizaciones activas dentro del
                            rango filtrado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        {detalleIntegrantes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No hay integrantes con montos pendientes en el rango seleccionado.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-xs">
                                    <thead className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                                        <tr>
                                            <th className="py-2 pr-4">Integrante</th>
                                            <th className="py-2 pr-4">Rol</th>
                                            <th className="py-2 pr-4 text-right">Total a pagar</th>
                                            <th className="py-2 pr-4 text-right">Penalizaciones</th>
                                            <th className="py-2 pr-4 text-right">Descuentos/Ajustes</th>
                                            <th className="py-2 pr-0 text-right">Deducciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalleIntegrantes.map((member) => (
                                            <tr key={member.id} className="border-b last:border-0">
                                                <td className="py-1.5 pr-4 text-foreground">{member.nombre}</td>
                                                <td className="py-1.5 pr-4 text-muted-foreground">
                                                    {member.role ?? "—"}
                                                </td>
                                                <td className="py-1.5 pr-4 text-right font-medium text-foreground">
                                                    ${Math.round(member.totalNeto).toLocaleString("es-CL")}
                                                </td>
                                                <td className="py-1.5 pr-4 text-right">
                                                    ${Math.round(member.totalPenalizaciones).toLocaleString("es-CL")}
                                                </td>
                                                <td className="py-1.5 pr-4 text-right">
                                                    ${Math.round(member.totalAjustes).toLocaleString("es-CL")}
                                                </td>
                                                <td className="py-1.5 pr-0 text-right">
                                                    ${Math.round(member.totalDeducciones).toLocaleString("es-CL")}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </main>
    )
}

export default LiquidacionPage
