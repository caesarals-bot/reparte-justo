import { useState } from "react"
import { useNavigate } from "react-router"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/appPropinaSegura/component/dashboard/date-range-picker"
import { AlertCircle, CalendarRange } from "lucide-react"

const LiquidacionPage = () => {
    const navigate = useNavigate()
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    })

    const handleBack = () => {
        navigate("/dashboard")
    }

    const handlePreview = () => {
        // En esta primera iteración solo mostramos un placeholder
        // La lógica real de cálculo de totales se implementará más adelante.
        // eslint-disable-next-line no-console
        console.log("Previsualizar liquidación para rango", dateRange)
    }

    const handleConfirm = () => {
        // Placeholder: en el futuro marcará cierres como liquidados y generará reporte
        // eslint-disable-next-line no-console
        console.log("Confirmar liquidación (pendiente de implementar)")
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
                        <CardTitle className="text-base">Rango de fechas a liquidar</CardTitle>
                        <CardDescription className="text-xs">
                            En versiones futuras se resaltarán en el calendario los días con cierres pendientes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>
                                    Esta pantalla aún no ejecuta la liquidación real. Sirve como base de diseño para el flujo
                                    definitivo.
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={handlePreview}>
                                    Previsualizar resumen
                                </Button>
                                <Button type="button" size="sm" disabled onClick={handleConfirm}>
                                    Confirmar liquidación
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Resumen del período (mock)</CardTitle>
                        <CardDescription className="text-xs">
                            Totales y desglose por integrante se conectarán cuando el flujo de liquidación esté
                            implementado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide">Total a liquidar</p>
                                <p className="text-lg font-semibold text-foreground">$0</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide">Total descuentos</p>
                                <p className="text-lg font-semibold text-foreground">$0</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide">Integrantes</p>
                                <p className="text-lg font-semibold text-foreground">0</p>
                            </div>
                        </div>
                        <Separator />
                        <p className="text-xs">
                            Este resumen es provisional. En el diseño final se listarán los montos acumulados por integrante
                            y por grupo (garzones / cocina) para el rango seleccionado.
                        </p>
                    </CardContent>
                </Card>
            </section>
        </main>
    )
}

export default LiquidacionPage
