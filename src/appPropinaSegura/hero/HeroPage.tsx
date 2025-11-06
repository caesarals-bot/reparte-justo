import { Button } from "@/components/ui/button"

const HeroPage = () => {
    return (
        <section
            id="hero"
            aria-label="Sección principal ReparteJusto"
            className="relative overflow-hidden bg-linear-to-b from-background to-muted/50 py-12 sm:py-16 md:py-24 lg:py-28"
        >
            <div className="container mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center md:items-start md:text-left">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                    La forma transparente de recompensar al equipo
                </h1>

                <div className="w-full max-w-xl rounded-2xl border bg-background/80 p-6 text-left shadow-sm backdrop-blur sm:p-7 md:max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Cómo funciona
                    </p>
                    <ul className="mt-4 space-y-3 text-sm text-muted-foreground sm:text-base">
                        <li className="flex gap-3">
                            <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                1
                            </span>
                            Registra la asistencia diaria del staff en minutos.
                        </li>
                        <li className="flex gap-3">
                            <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                2
                            </span>
                            Define ponderaciones y reglas de reparto personalizadas.
                        </li>
                        <li className="flex gap-3">
                            <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                3
                            </span>
                            Obtén cálculos auditables para compartir con el equipo.
                        </li>
                    </ul>
                </div>

                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                    Distribución justa de propinas
                </span>
                <p className="text-base text-muted-foreground sm:text-lg md:text-xl md:max-w-2xl">
                    Ingresa el monto diario, gestiona la asistencia y obtén cálculos automáticos para garzones y cocina.
                    Todo queda documentado para total confianza.
                </p>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start md:gap-4">
                    <Button size="lg" className="w-full text-base sm:w-auto sm:text-lg">
                        Empezar Gratis
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full text-base sm:w-auto sm:text-lg"
                    >
                        Ver Demo
                    </Button>
                </div>
            </div>
        </section>
    )
}

export default HeroPage
