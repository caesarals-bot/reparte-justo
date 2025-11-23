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
import { useClosuresDashboard } from "./hooks/useClosuresDashboard"
import { Loader2, ArrowLeft, EyeIcon } from "lucide-react"

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

const PaidSettlementsPage = () => {
    const { uid } = useAuth()
    const navigate = useNavigate()
    const { paidSettlementGroups, isLoading, error } = useClosuresDashboard({ uid })
    const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

    const selectedSettlement = useMemo(
        () => paidSettlementGroups.find((group) => group.id === selectedSettlementId) ?? null,
        [paidSettlementGroups, selectedSettlementId],
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
                    <section className="space-y-4">
                        {paidSettlementGroups.map((settlement) => (
                            <Card key={settlement.id} className="border border-white/10 bg-[rgba(21,24,40,0.9)]">
                                <CardHeader className="flex flex-col gap-1 border-b border-white/10">
                                    <CardTitle className="text-lg font-semibold">
                                        {settlement.label}
                                    </CardTitle>
                                    <p className="text-sm text-white/70">{settlement.rangeLabel}</p>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4 py-6">
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Total repartido</p>
                                            <p className="font-mono text-2xl text-white">
                                                ${settlement.totals.netAfterDeductions.toLocaleString("es-CL")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Descuentos</p>
                                            <p className="font-mono text-2xl text-white">
                                                ${settlement.totals.deductionsAmount.toLocaleString("es-CL")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Gasto general</p>
                                            <p className="font-mono text-2xl text-white">
                                                ${settlement.totals.generalExpense.toLocaleString("es-CL")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <p className="text-sm text-white/70">
                                            Incluye {settlement.closures.length} cierre(s) con un total de $
                                            {settlement.totals.propinas.toLocaleString("es-CL")} en propinas brutas.
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="gap-2 rounded-full border border-white/10 px-4 text-white transition hover:bg-white/10"
                                            onClick={() => setSelectedSettlementId(settlement.id)}
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                            Ver detalles
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                ) : null}
            </div>

            <Dialog open={Boolean(selectedSettlement)} onOpenChange={(open) => !open && setSelectedSettlementId(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedSettlement?.label ?? "Liquidación"}</DialogTitle>
                        <DialogDescription>
                            {selectedSettlement?.rangeLabel ?? "Selecciona una liquidación para revisar su detalle."}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSettlement ? (
                        <div className="space-y-6">
                            <div className="grid gap-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70">Total repartido</span>
                                    <strong className="font-mono text-base">
                                        ${selectedSettlement.totals.netAfterDeductions.toLocaleString("es-CL")}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70">Descuentos</span>
                                    <strong className="font-mono text-base">
                                        ${selectedSettlement.totals.deductionsAmount.toLocaleString("es-CL")}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70">Gasto general</span>
                                    <strong className="font-mono text-base">
                                        ${selectedSettlement.totals.generalExpense.toLocaleString("es-CL")}
                                    </strong>
                                </div>
                            </div>

                            <div>
                                <p className="mb-3 text-sm uppercase tracking-[0.3em] text-white/60">Días incluidos</p>
                                <Table className="text-sm text-white">
                                    <TableHeader>
                                        <TableRow className="border-white/10 text-white/70">
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Total neto</TableHead>
                                            <TableHead className="text-right">Descuentos</TableHead>
                                            <TableHead className="text-right">Gasto general</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSettlement.dailySummaries.map((summary) => (
                                            <TableRow key={summary.id} className="border-white/5">
                                                <TableCell>{formatDateLabel(summary.referenceDate)}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    ${summary.netAfterDeductions.toLocaleString("es-CL")}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-white/80">
                                                    {summary.deductionsAmount > 0
                                                        ? `$${summary.deductionsAmount.toLocaleString("es-CL")}`
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-white/80">
                                                    {summary.generalExpense > 0
                                                        ? `$${summary.generalExpense.toLocaleString("es-CL")}`
                                                        : "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </main>
    )
}

export default PaidSettlementsPage
