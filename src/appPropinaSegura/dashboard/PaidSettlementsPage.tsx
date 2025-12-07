import { useMemo, useState } from "react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { usePermissions } from "@/hooks/usePermissions"
import {
    useClosuresDashboard,
    resolveClosureMode,
    type SettlementMode,
    type PaidSettlementPeriod,
} from "./hooks/useClosuresDashboard"
import { Loader2, ArrowLeft, EyeIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const formatDateLabel = (value?: Date | null) => {
    if (!value) {
        return "Sin fecha"
    }

    return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(value)
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(
        Math.round(value),
    )

type GroupModeInfo = {
    mode: SettlementMode | null
    isMixed: boolean
}

type ModeBadgeProps = {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    className?: string
}

const resolveGroupModeInfo = (closures: PaidSettlementPeriod["closures"]): GroupModeInfo => {
    if (!closures.length) {
        return { mode: null, isMixed: false }
    }

    let detectedMode: SettlementMode | null = null
    let mixed = false

    closures.forEach((closure) => {
        const closureMode = resolveClosureMode(closure)
        if (!closureMode) {
            mixed = true
            return
        }

        if (!detectedMode) {
            detectedMode = closureMode
            return
        }

        if (detectedMode !== closureMode) {
            mixed = true
        }
    })

    return {
        mode: mixed ? null : detectedMode,
        isMixed: mixed,
    }
}

const sumDirectSalesAdjustments = (closures: PaidSettlementPeriod["closures"]): number =>
    closures.reduce((total, closure) => total + (closure.directSalesAdjustmentApplied ?? 0), 0)

const getModeBadgeProps = (info: GroupModeInfo): ModeBadgeProps => {
    if (info.isMixed) {
        return {
            label: "Mixto",
            variant: "outline",
            className: "border-destructive/50 text-destructive",
        }
    }

    if (info.mode === "directa") {
        return {
            label: "Venta directa",
            variant: "outline",
            className: "border-emerald-400/50 text-emerald-200",
        }
    }

    if (info.mode === "pool") {
        return {
            label: "Pool",
            variant: "outline",
            className: "border-white/25 text-white/80",
        }
    }

    return {
        label: "Sin modo",
        variant: "outline",
        className: "border-white/15 text-white/60",
    }
}

const PaidSettlementsPage = () => {
    const { uid, isLoading: isLoadingAuth } = useAuth()
    const { accessibleRestaurants } = usePermissions()
    const restaurantId = accessibleRestaurants[0]
    const navigate = useNavigate()
    const { paidSettlementGroups, isLoading, error } = useClosuresDashboard({ 
        restaurantId: isLoadingAuth ? null : restaurantId 
    })
    const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

    const selectedSettlement = useMemo(
        () => paidSettlementGroups.find((group) => group.id === selectedSettlementId) ?? null,
        [paidSettlementGroups, selectedSettlementId],
    )

    const selectedModeInfo = useMemo(
        () => (selectedSettlement ? resolveGroupModeInfo(selectedSettlement.closures) : null),
        [selectedSettlement],
    )
    const selectedModeBadge = useMemo(
        () => (selectedModeInfo ? getModeBadgeProps(selectedModeInfo) : null),
        [selectedModeInfo],
    )
    const selectedDirectSalesAdjustments = useMemo(
        () => (selectedSettlement ? sumDirectSalesAdjustments(selectedSettlement.closures) : 0),
        [selectedSettlement],
    )

    const isEmpty = !paidSettlementGroups.length && !isLoading && !error

    if (!uid) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 text-center text-sm text-white">
                        <CardContent className="py-12">
                            Debes iniciar sesión para revisar liquidaciones pagadas.
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-transparent px-4 py-10 text-white sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Histórico</p>
                        <h1 className="text-3xl font-semibold tracking-tight">Liquidaciones pagadas</h1>
                        <p className="text-sm text-white/70">
                            Consulta sólo cuando lo necesites; estos datos no se cargan en el dashboard principal para mantenerlo ligero.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        className="gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-white transition hover:bg-white/10"
                        onClick={() => navigate("/dashboard")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al dashboard
                    </Button>
                </header>

                {isLoading ? (
                    <Card className="border border-white/10 bg-white/5 text-white">
                        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-white/70">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando liquidaciones pagadas...
                        </CardContent>
                    </Card>
                ) : null}

                {error ? (
                    <Card className="border border-destructive/40 bg-destructive/10 text-white">
                        <CardContent className="py-6 text-sm">
                            No pudimos cargar las liquidaciones pagadas. Intenta nuevamente más tarde.
                        </CardContent>
                    </Card>
                ) : null}

                {isEmpty ? (
                    <Card className="border border-white/10 bg-white/5 text-white">
                        <CardContent className="py-12 text-center text-sm text-white/70">
                            Aún no registras liquidaciones con estado "pagado".
                        </CardContent>
                    </Card>
                ) : null}

                {!isLoading && !error && paidSettlementGroups.length ? (
                    <Card className="border border-white/10 bg-[rgba(21,24,40,0.9)]">
                        <CardHeader className="border-b border-white/10">
                            <CardTitle className="text-lg font-semibold">Historial por liquidación</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[600px] overflow-y-auto">
                                <Table className="text-sm text-white">
                                <TableHeader>
                                    <TableRow className="border-white/10 text-white/60">
                                        <TableHead className="text-white/70">Ciclo liquidado</TableHead>
                                        <TableHead className="text-center text-white/70">Modo</TableHead>
                                        <TableHead className="text-center text-white/70">Cierres</TableHead>
                                        <TableHead className="text-right text-white/70">Propinas (bruto)</TableHead>
                                        <TableHead className="text-right text-white/70">Total repartido</TableHead>
                                        <TableHead className="text-right text-white/70">Descuentos</TableHead>
                                        <TableHead className="text-right text-white/70">Gasto general</TableHead>
                                        <TableHead className="text-right text-white/70">Venta directa</TableHead>
                                        <TableHead className="text-right text-white/70">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paidSettlementGroups.map((settlement) => {
                                        const modeInfo = resolveGroupModeInfo(settlement.closures)
                                        const badgeProps = getModeBadgeProps(modeInfo)
                                        const directSalesAdjustmentsTotal = sumDirectSalesAdjustments(settlement.closures)

                                        return (
                                            <TableRow key={settlement.id} className="border-white/5">
                                                <TableCell>
                                                    <div className="font-medium text-white">{settlement.rangeLabel}</div>
                                                    <p className="text-xs text-white/60">{settlement.label}</p>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={badgeProps.variant} className={badgeProps.className}>
                                                        {badgeProps.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-base">
                                                    {settlement.closures.length}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-base">
                                                    {formatCurrency(settlement.totals.propinas)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-base">
                                                    {formatCurrency(settlement.totals.netAfterDeductions)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-white/80">
                                                    {settlement.totals.deductionsAmount > 0
                                                        ? formatCurrency(settlement.totals.deductionsAmount)
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-white/80">
                                                    {settlement.totals.generalExpense > 0
                                                        ? formatCurrency(settlement.totals.generalExpense)
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-emerald-200">
                                                    {directSalesAdjustmentsTotal > 0
                                                        ? `-${formatCurrency(directSalesAdjustmentsTotal)}`
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="gap-2 rounded-full border border-white/10 px-3 text-white transition hover:bg-white/10"
                                                        onClick={() => setSelectedSettlementId(settlement.id)}
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                        Ver detalles
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            <Dialog open={Boolean(selectedSettlement)} onOpenChange={(open) => !open && setSelectedSettlementId(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedSettlement?.label ?? "Liquidación"}</DialogTitle>
                        <DialogDescription>
                            {selectedSettlement?.rangeLabel ?? "Selecciona una liquidación para revisar su detalle."}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSettlement ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70 text-xs">Modo</span>
                                    {selectedModeBadge ? (
                                        <Badge variant={selectedModeBadge.variant} className={`${selectedModeBadge.className} text-xs px-2 py-0.5`}>
                                            {selectedModeBadge.label}
                                        </Badge>
                                    ) : (
                                        <span className="text-white/50">—</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70 text-xs">Total repartido</span>
                                    <strong className="font-mono text-sm">
                                        {formatCurrency(selectedSettlement.totals.netAfterDeductions)}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70 text-xs">Descuentos</span>
                                    <strong className="font-mono text-sm">
                                        {formatCurrency(selectedSettlement.totals.deductionsAmount)}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70 text-xs">Gasto general</span>
                                    <strong className="font-mono text-sm">
                                        {formatCurrency(selectedSettlement.totals.generalExpense)}
                                    </strong>
                                </div>
                                {selectedDirectSalesAdjustments > 0 ? (
                                    <div className="flex items-center justify-between text-emerald-200">
                                        <span className="text-white/70 text-xs">Venta directa aplicada</span>
                                        <strong className="font-mono text-sm">
                                            -{formatCurrency(selectedDirectSalesAdjustments)}
                                        </strong>
                                    </div>
                                ) : null}
                            </div>

                            <div>
                                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-white/60">Días incluidos</p>
                                <div className="max-h-[300px] overflow-y-auto rounded-lg border border-white/10">
                                    <Table className="text-xs text-white">
                                    <TableHeader>
                                        <TableRow className="border-white/10 text-white/70">
                                            <TableHead className="text-xs">Fecha</TableHead>
                                            <TableHead className="text-right text-xs">Total neto</TableHead>
                                            <TableHead className="text-right text-xs">Descuentos</TableHead>
                                            <TableHead className="text-right text-xs">Gasto general</TableHead>
                                            <TableHead className="text-right text-xs">Venta directa</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSettlement.dailySummaries.map((summary) => (
                                            <TableRow key={summary.id} className="border-white/5">
                                                <TableCell className="text-xs py-2">{formatDateLabel(summary.referenceDate)}</TableCell>
                                                <TableCell className="text-right font-mono text-xs py-2">
                                                    {formatCurrency(summary.netAfterDeductions)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-white/80 text-xs py-2">
                                                    {summary.deductionsAmount > 0
                                                        ? formatCurrency(summary.deductionsAmount)
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-white/80 text-xs py-2">
                                                    {summary.generalExpense > 0
                                                        ? formatCurrency(summary.generalExpense)
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-emerald-200 text-xs py-2">
                                                    {summary.directSalesAdjustmentApplied &&
                                                    summary.directSalesAdjustmentApplied > 0
                                                        ? `-${formatCurrency(summary.directSalesAdjustmentApplied)}`
                                                        : "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </main>
    )
}

export default PaidSettlementsPage
