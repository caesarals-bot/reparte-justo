import { Link } from "react-router"
import Seo from "@/components/Seo"
import { Button } from "@/components/ui/button"
import StaffPayoutChart from "@/appPropinaSegura/component/dashboard/charts/StaffPayoutChart"
import LiquidationTrendChart from "@/appPropinaSegura/component/dashboard/charts/LiquidationTrendChart"

const DemoPage = () => {
    const title = "Demo en vivo | ReparteJusto"
    const description =
        "Agenda una demo personalizada para ver cómo repartir propinas con transparencia: setup, ponderaciones y reportes en minutos."
    const canonicalUrl = "https://repartejusto.com/demo"

    const staffChartData = [
        { name: "Victor", amount: 38000, group: "Pool Garzones" },
        { name: "Eucaris", amount: 38000, group: "Pool Garzones" },
        { name: "Jimmy", amount: 19000, group: "Pool Garzones" },
        { name: "Cocina", amount: 14000, group: "Pool Cocina" },
    ]

    const trendChartData = [
        { label: "Cierre del 6 dic 2025", total: 95000, deductions: 5000 },
        { label: "Cierre del 4 dic 2025", total: 100000, deductions: 5000 },
        { label: "Cierre del 1 dic 2025", total: 100000, deductions: 5000 },
        { label: "Cierre del 28 nov 2025", total: 80000, deductions: 4000 },
    ]

    return (
        <>
            <Seo
                title={title}
                description={description}
                canonicalUrl={canonicalUrl}
                siteName="ReparteJusto"
                ogImage="https://repartejusto.com/og-image.png"
            />
            <section className="bg-linear-to-b from-background to-muted/60 py-16 md:py-24">
                <div className="container mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Demo guiada</p>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                            Conoce cómo repartimos propinas con trazabilidad completa
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Te mostramos el flujo completo: registro de asistencia, ponderaciones, liquidación y cómo el staff
                            consulta sus pagos. Resolvemos dudas de implementación en menos de 30 minutos.
                        </p>
                        <ul className="space-y-3 text-base text-muted-foreground">
                            <li className="flex gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    1
                                </span>
                                Cuéntanos tu operación (salón, barra, cocina) y roles actuales.
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    2
                                </span>
                                Configuramos reglas de reparto y mostramos cálculos auditables en vivo.
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    3
                                </span>
                                Definimos siguiente paso: prueba gratis o puesta en marcha con tu equipo.
                            </li>
                        </ul>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <Button size="lg" className="w-full sm:w-auto" asChild>
                                <Link to="/contact" aria-label="Agendar demo" tabIndex={0}>
                                    Agenda tu demo
                                </Link>
                            </Button>
                            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                                <Link to="/auth/register" aria-label="Crear cuenta gratuita" tabIndex={0}>
                                    Probar gratis
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-background/80 p-6 shadow-xl backdrop-blur">
                        <div className="absolute inset-0 bg-grid-slate-900/10" aria-hidden="true" />
                        <div className="relative space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/70 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold">Distribución diaria</p>
                                    <p className="text-xs text-muted-foreground">Registro, asistencia y totales</p>
                                </div>
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">En vivo</span>
                            </div>
                            <div className="space-y-3 rounded-xl border border-border/80 bg-background/80 p-4">
                                <div className="flex items-center justify-between text-sm font-semibold">
                                    <span>Propinas del día</span>
                                    <span className="text-primary">$380.000</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 w-4/5 rounded-full bg-primary" aria-hidden="true" />
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                                    <div className="rounded-lg border border-border/80 bg-muted/50 p-3">
                                        <p className="text-xs font-semibold text-foreground">Sala</p>
                                        <p className="text-base font-bold text-foreground">$240.000</p>
                                        <p className="text-xs">6 integrantes</p>
                                    </div>
                                    <div className="rounded-lg border border-border/80 bg-muted/50 p-3">
                                        <p className="text-xs font-semibold text-foreground">Cocina</p>
                                        <p className="text-base font-bold text-foreground">$140.000</p>
                                        <p className="text-xs">4 integrantes</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-xs">
                                    <span>Historial transparente</span>
                                    <span className="font-semibold text-foreground">Descargar PDF</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Durante la demo te compartimos la grabación y un checklist para que tu equipo pruebe sin fricción.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-background py-14">
                <div className="container mx-auto grid gap-6 px-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card/80 shadow-xl">
                        <div className="space-y-2 border-b border-border px-5 py-4">
                            <h3 className="text-lg font-semibold text-foreground">Distribución por integrante (demo)</h3>
                            <p className="text-sm text-muted-foreground">
                                Vista de cómo se reparte la propina entre integrantes en un cierre típico.
                            </p>
                        </div>
                        <div className="px-3 pb-5 pt-4">
                            <StaffPayoutChart data={staffChartData} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card/80 shadow-xl">
                        <div className="space-y-2 border-b border-border px-5 py-4">
                            <h3 className="text-lg font-semibold text-foreground">Evolución por liquidación (demo)</h3>
                            <p className="text-sm text-muted-foreground">
                                Tendencia de montos repartidos y descuentos en las últimas liquidaciones.
                            </p>
                        </div>
                        <div className="px-3 pb-5 pt-4">
                            <LiquidationTrendChart data={trendChartData} />
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

export default DemoPage
