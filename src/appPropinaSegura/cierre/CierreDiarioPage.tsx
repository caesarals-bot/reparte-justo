import { useMemo, useState } from "react"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

const percentageInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

const amountInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

type StaffMember = {
    id: string
    name: string
    weight?: string
}

const serviceStaff: StaffMember[] = [
    { id: "1", name: "María Rojas", weight: "1.0 pt" },
    { id: "2", name: "Jorge Sáez", weight: "0.75 pt" },
    { id: "3", name: "Camila Díaz", weight: "0.5 pt" },
]

const kitchenStaff: StaffMember[] = [
    { id: "a", name: "Lucas González" },
    { id: "b", name: "Valentina Ortiz" },
]

const CierreDiarioPage = () => {
    const [poolDate, setPoolDate] = useState<Date | undefined>(new Date())
    const [directDate, setDirectDate] = useState<Date | undefined>(new Date())

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
        <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
            <section className="w-full max-w-6xl">
                <Card className="border bg-background/95 shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-semibold">Registrar Cierre del Día</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid gap-8 lg:grid-cols-2">
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

                                <section className="space-y-4">
                                    <h4 className="text-lg font-semibold">Asistencia del Personal</h4>

                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                            Staff de Servicio
                                        </h5>
                                        <div className="overflow-hidden rounded-lg border">
                                            <table className="w-full divide-y divide-border text-left text-sm">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">Presente</th>
                                                        <th className="px-4 py-3 font-semibold">Nombre</th>
                                                        <th className="px-4 py-3 font-semibold">Ponderación</th>
                                                        <th className="px-4 py-3 font-semibold">Descuento (%)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {serviceStaff.map((member) => (
                                                        <tr key={`pool-service-${member.id}`}>
                                                            <td className="px-4 py-3">
                                                                <Checkbox defaultChecked aria-label={`Presente ${member.name}`} />
                                                            </td>
                                                            <td className="px-4 py-3">{member.name}</td>
                                                            <td className="px-4 py-3">{member.weight}</td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    defaultValue="0"
                                                                    className={percentageInputClassName}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                            Staff de Cocina
                                        </h5>
                                        <div className="overflow-hidden rounded-lg border">
                                            <table className="w-full divide-y divide-border text-left text-sm">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">Presente</th>
                                                        <th className="px-4 py-3 font-semibold">Nombre</th>
                                                        <th className="px-4 py-3 font-semibold">Ponderación</th>
                                                        <th className="px-4 py-3 font-semibold">Descuento (%)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {kitchenStaff.map((member) => (
                                                        <tr key={`pool-kitchen-${member.id}`}>
                                                            <td className="px-4 py-3">
                                                                <Checkbox defaultChecked aria-label={`Presente ${member.name}`} />
                                                            </td>
                                                            <td className="px-4 py-3">{member.name}</td>
                                                            <td className="px-4 py-3">-</td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    defaultValue="0"
                                                                    className={percentageInputClassName}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </section>
                            </article>

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
                                        <h4 className="text-lg font-semibold">Registro de Garzones</h4>
                                        <div className="overflow-hidden rounded-lg border">
                                            <table className="w-full divide-y divide-border text-left text-sm">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">Presente</th>
                                                        <th className="px-4 py-3 font-semibold">Nombre</th>
                                                        <th className="px-4 py-3 font-semibold">Monto Venta Individual</th>
                                                        <th className="px-4 py-3 font-semibold">Descuento (%)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {serviceStaff.map((member) => (
                                                        <tr key={`direct-service-${member.id}`}>
                                                            <td className="px-4 py-3">
                                                                <Checkbox defaultChecked aria-label={`Presente ${member.name}`} />
                                                            </td>
                                                            <td className="px-4 py-3">{member.name}</td>
                                                            <td className="px-4 py-3">
                                                                <input type="number" placeholder="Ej. 120000" className={amountInputClassName} />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input type="number" defaultValue="0" className={percentageInputClassName} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-lg font-semibold">Asistencia Pocillo Secundario (Cocina/Bar)</h4>
                                        <div className="overflow-hidden rounded-lg border">
                                            <table className="w-full divide-y divide-border text-left text-sm">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">Presente</th>
                                                        <th className="px-4 py-3 font-semibold">Nombre</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {kitchenStaff.map((member) => (
                                                        <tr key={`direct-kitchen-${member.id}`}>
                                                            <td className="px-4 py-3">
                                                                <Checkbox defaultChecked aria-label={`Presente ${member.name}`} />
                                                            </td>
                                                            <td className="px-4 py-3">{member.name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </section>
                            </article>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button size="lg" className="w-full">
                            Guardar Cierre Diario
                        </Button>
                    </CardFooter>
                </Card>
            </section>
        </main>
    )
}

export default CierreDiarioPage
