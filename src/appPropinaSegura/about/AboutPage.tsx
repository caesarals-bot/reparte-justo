import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const AboutPage = () => {
    return (
        <main className="min-h-[calc(100vh-72px)] bg-background">
            <section className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Quiénes somos</h1>
                    <p className="text-base text-muted-foreground sm:text-lg">
                        ReparteJusto es una herramienta pensada para quienes trabajan en el rubro del servicio y
                        reciben una compensación como agradecimiento por su atención. Te ayuda a registrar, calcular y
                        compartir la distribución de propinas de forma transparente.
                    </p>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transparencia</CardTitle>
                            <CardDescription>
                                Cada cálculo queda respaldado y es fácil de revisar por el equipo.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Flexibilidad</CardTitle>
                            <CardDescription>
                                Define ponderaciones, reglas de reparto y ajustes para adaptarlo a tu operación.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Orden diario</CardTitle>
                            <CardDescription>
                                Marca asistencia y registra el monto del día en minutos, sin planillas.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Confianza</CardTitle>
                            <CardDescription>
                                Historial claro para evitar dudas y mantener buenas relaciones dentro del equipo.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>
        </main>
    )
}

export default AboutPage
