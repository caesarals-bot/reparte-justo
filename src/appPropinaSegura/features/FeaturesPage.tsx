import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, CalendarDays, FileCheck } from "lucide-react"


const FeaturesPage = () => {
    return (
        <>
            <section id="features" className="py-16 md:py-24 bg-muted/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Todo lo que necesitas en un solo lugar
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Card 1 - Registro Diario */}
                        <Card className="text-center">
                            <CardHeader>
                                <div className="mx-auto mb-4 h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <CalendarDays className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Registro Diario</CardTitle>
                            </CardHeader>
                            <CardDescription className="text-base">
                                Ingresa el monto bruto del día y marca la asistencia del personal con un simple checklist. Maneja ausencias y nuevos ingresos sin esfuerzo.
                            </CardDescription>
                        </Card>

                        {/* Card 2 - Cálculo Ponderado */}
                        <Card className="text-center">
                            <CardHeader>
                                <div className="mx-auto mb-4 h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Calculator className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Cálculo Ponderado</CardTitle>
                            </CardHeader>
                            <CardDescription className="text-base">
                                Asigna ponderaciones (puntos) a cada miembro (ej: 1.0, 0.75, 0.5) y nuestro motor se encarga de la matemática, incluyendo descuentos o penalizaciones.
                            </CardDescription>
                        </Card>

                        {/* Card 3 - Historial Transparente */}
                        <Card className="text-center">
                            <CardHeader>
                                <div className="mx-auto mb-4 h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <FileCheck className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Historial Transparente</CardTitle>
                            </CardHeader>
                            <CardDescription className="text-base">
                                Todos los cálculos se guardan en un historial inmutable. Los administradores liquidan y el staff puede consultar sus pagos para total transparencia.
                            </CardDescription>
                        </Card>
                    </div>
                </div>
            </section>
        </>
    )
}

export default FeaturesPage
