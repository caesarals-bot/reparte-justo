import { useMemo } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/context/AuthContext"
import { useClosuresDashboard } from "./hooks/useClosuresDashboard"
import { Loader2, ArrowLeft, EyeIcon } from "lucide-react"

const formatReferenceDate = (value?: string | null) => {
    if (!value) {
        return "Sin fecha definida"
    }

    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
        return "Fecha no válida"
    }

    return format(parsedDate, "d 'de' MMMM yyyy", { locale: es })
}

const formatClosureLabel = (referenceDate?: string | null, fallbackId?: string) => {
    const formattedDate = formatReferenceDate(referenceDate)

    if (formattedDate === "Sin fecha definida" && fallbackId) {
        return `Cierre ${fallbackId.slice(0, 6)}`
    }

    return `Cierre del ${formattedDate}`
}

const PaidSettlementsPage = () => {
    const { uid } = useAuth()
    const navigate = useNavigate()
    const { historicalClosures, isLoading, error } = useClosuresDashboard({ uid })

    const paidSettlements = useMemo(
        () =>
            historicalClosures
                .filter((closure) => closure.estado === "pagado")
                .map((closure) => ({
                    id: closure.id,
                    label: formatClosureLabel(closure.metadata.referenceDate, closure.id),
                    totalRepartido: closure.totals.netAfterDeductions,
                    totalDescuentos: closure.totals.deductionsAmount,
                    estado: closure.estado,
                })),
        [historicalClosures],
    )

    const isEmpty = !paidSettlements.length && !isLoading && !error

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

                {!isLoading && !error && paidSettlements.length ? (
                    <Card className="border border-white/10 bg-[rgba(21,24,40,0.9)]">
                        <CardHeader className="border-b border-white/10">
                            <CardTitle className="text-lg font-semibold">Historial completo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table className="text-sm text-white">
                                <TableHeader>
                                    <TableRow className="border-white/10 text-white/60">
                                        <TableHead className="text-white/70">Período</TableHead>
                                        <TableHead className="text-right text-white/70">Total repartido</TableHead>
                                        <TableHead className="text-right text-white/70">Descuentos</TableHead>
                                        <TableHead className="text-right text-white/70">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paidSettlements.map((settlement) => (
                                        <TableRow key={settlement.id} className="border-white/5">
                                            <TableCell>
                                                <div className="font-medium text-white">{settlement.label}</div>
                                                <div className="text-xs uppercase tracking-wide text-emerald-300/80">{settlement.estado}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-base">
                                                ${settlement.totalRepartido.toLocaleString("es-CL")}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm text-white/80">
                                                {settlement.totalDescuentos > 0
                                                    ? `$${settlement.totalDescuentos.toLocaleString("es-CL")}`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="gap-2 rounded-full border border-white/10 px-3 text-white transition hover:bg-white/10"
                                                    onClick={() => navigate(`/dashboard/closures/${settlement.id}`)}
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                    Ver detalles
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </main>
    )
}

export default PaidSettlementsPage
