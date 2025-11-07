import { useMemo, useState } from "react"
import { FormProvider, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import StaffAsistenciaCard from "./StaffAsistenciaCard"
import { amountInputClassName, createDefaultCierreValues } from "./constants"
import { cierreSchema, type CierreFormValues } from "./schema"

const CierreDiarioPage = () => {
    const [poolDate, setPoolDate] = useState<Date | undefined>(new Date())
    const [directDate, setDirectDate] = useState<Date | undefined>(new Date())

    const formMethods = useForm<CierreFormValues>({
        resolver: zodResolver(cierreSchema),
        defaultValues: createDefaultCierreValues(),
        mode: "onChange",
    })

    const { control } = formMethods

    const asistenciaServicio = useFieldArray({ control, name: "asistenciaServicio" })
    const asistenciaCocina = useFieldArray({ control, name: "asistenciaCocina" })
    const ventaDirecta = useFieldArray({ control, name: "ventaDirecta" })
    const pocilloSecundario = useFieldArray({ control, name: "pocilloSecundario" })

    const poolDateLabel = useMemo(() => {
        if (!poolDate) {
            return "Seleccionar fecha"
        }

        return format(poolDate, "PPP", { locale: es })
    }, [poolDate])

    const directDateLabel = useMemo(() => {
        if (!directDate) {
            return "Seleccionar fecha"
        }

        return format(directDate, "PPP", { locale: es })
    }, [directDate])

    return (
        <FormProvider {...formMethods}>
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-4xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-semibold">Registrar Cierre del Día</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-10">
                            <form className="space-y-10">
                                <article className="space-y-6">
                                    <header className="space-y-2 text-left">
                                        <h3 className="text-xl font-semibold">Registro de Pocillo</h3>
                                    </header>

                                    <div className="space-y-4">
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
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <section className="space-y-5">
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                                Staff de Servicio
                                            </h4>
                                            <div className="space-y-3">
                                                {asistenciaServicio.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="asistenciaServicio"
                                                        showPonderacion
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                                Staff de Cocina
                                            </h4>
                                            <div className="space-y-3">
                                                {asistenciaCocina.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="asistenciaCocina"
                                                        showPonderacion
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                </article>

                                <Separator className="my-8" />

                                <article className="space-y-6">
                                    <header className="space-y-2 text-left">
                                        <h3 className="text-xl font-semibold">Registro de Venta Directa</h3>
                                    </header>

                                    <div className="space-y-4">
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
                                    </div>

                                    <Separator />

                                    <section className="space-y-5">
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                                Registro de Garzones
                                            </h4>
                                            <div className="space-y-3">
                                                {ventaDirecta.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="ventaDirecta"
                                                        showMontoIndividual
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                                Asistencia Pocillo Secundario (Cocina/Bar)
                                            </h4>
                                            <div className="space-y-3">
                                                {pocilloSecundario.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="pocilloSecundario"
                                                        showPonderacion
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                </article>
                            </form>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </FormProvider>
    )
}
export default CierreDiarioPage
