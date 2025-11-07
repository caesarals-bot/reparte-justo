import { useMemo, useState, type ChangeEvent } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"

type SettlementMode = "pool" | "directa"

type PoolConfig = {
    kitchenPercentage: string
    transbankPercentage: string
}

type DirectConfig = {
    directWaiterPercentage: string
}

type AdditionalDeduction = {
    id: string
    name: string
    percentage: string
}

type StaffMember = {
    id: string
    name: string
    weight: string
    startDate?: Date
}

type StaffFormValues = {
    name: string
    weight: string
    startDate?: Date
}

const defaultPoolConfig: PoolConfig = {
    kitchenPercentage: "35",
    transbankPercentage: "5",
}

const defaultDirectConfig: DirectConfig = {
    directWaiterPercentage: "70",
}

const defaultStaffForm: StaffFormValues = {
    name: "",
    weight: "1.0",
}

const defaultAdditionalDeductionForm: Omit<AdditionalDeduction, "id"> = {
    name: "",
    percentage: "",
}

const percentageInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

const InitialSetupPage = () => {
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("pool")
    const [poolConfig, setPoolConfig] = useState<PoolConfig>(defaultPoolConfig)
    const [additionalDeductions, setAdditionalDeductions] = useState<AdditionalDeduction[]>([])
    const [additionalDeductionForm, setAdditionalDeductionForm] = useState(defaultAdditionalDeductionForm)
    const [directConfig, setDirectConfig] = useState<DirectConfig>(defaultDirectConfig)
    const [serviceStaffForm, setServiceStaffForm] = useState<StaffFormValues>(defaultStaffForm)
    const [supportStaffForm, setSupportStaffForm] = useState<StaffFormValues>(defaultStaffForm)
    const [serviceStaff, setServiceStaff] = useState<StaffMember[]>([])
    const [supportStaff, setSupportStaff] = useState<StaffMember[]>([])
    const [activePopover, setActivePopover] = useState<"service" | "support" | null>(null)

    const formattedServiceDate = useMemo(() => {
        if (!serviceStaffForm.startDate) {
            return "Seleccionar fecha"
        }

        return format(serviceStaffForm.startDate, "PPP", { locale: es })
    }, [serviceStaffForm.startDate])

    const formattedSupportDate = useMemo(() => {
        if (!supportStaffForm.startDate) {
            return "Seleccionar fecha"
        }

        return format(supportStaffForm.startDate, "PPP", { locale: es })
    }, [supportStaffForm.startDate])

    const handleSettlementModeChange = (value: SettlementMode) => {
        setSettlementMode(value)
    }

    const handlePoolConfigChange = (field: keyof PoolConfig) => (event: ChangeEvent<HTMLInputElement>) => {
        setPoolConfig((previousState) => ({
            ...previousState,
            [field]: event.target.value,
        }))
    }

    const handleDirectConfigChange = (event: ChangeEvent<HTMLInputElement>) => {
        setDirectConfig({ directWaiterPercentage: event.target.value })
    }

    const handleAdditionalDeductionChange = (field: keyof typeof defaultAdditionalDeductionForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target
        setAdditionalDeductionForm((previousState) => ({
            ...previousState,
            [field]: value,
        }))
    }

    const handleAddAdditionalDeduction = () => {
        if (!additionalDeductionForm.name.trim() || !additionalDeductionForm.percentage.trim()) {
            return
        }

        const newDeduction: AdditionalDeduction = {
            id: crypto.randomUUID(),
            name: additionalDeductionForm.name.trim(),
            percentage: additionalDeductionForm.percentage.trim(),
        }

        setAdditionalDeductions((previousState) => [...previousState, newDeduction])
        setAdditionalDeductionForm(defaultAdditionalDeductionForm)
    }

    const handleRemoveAdditionalDeduction = (deductionId: string) => {
        setAdditionalDeductions((previousState) => previousState.filter((item) => item.id !== deductionId))
    }

    const handleStaffFormChange = (
        category: "service" | "support",
        field: keyof StaffFormValues,
    ) => (eventOrValue: React.ChangeEvent<HTMLInputElement> | Date | undefined) => {
        if (field === "startDate") {
            const selectedDate = eventOrValue as Date | undefined

            if (category === "service") {
                setServiceStaffForm((previousState) => ({
                    ...previousState,
                    startDate: selectedDate,
                }))
                return
            }

            setSupportStaffForm((previousState) => ({
                ...previousState,
                startDate: selectedDate,
            }))
            return
        }

        const event = eventOrValue as React.ChangeEvent<HTMLInputElement>
        const { value } = event.target

        if (category === "service") {
            setServiceStaffForm((previousState) => ({
                ...previousState,
                [field]: value,
            }))
            return
        }

        setSupportStaffForm((previousState) => ({
            ...previousState,
            [field]: value,
        }))
    }

    const resetStaffForm = (category: "service" | "support") => {
        if (category === "service") {
            setServiceStaffForm(defaultStaffForm)
            return
        }

        setSupportStaffForm(defaultStaffForm)
    }

    const handleAddStaffMember = (category: "service" | "support") => {
        const formValues = category === "service" ? serviceStaffForm : supportStaffForm
        const { name, weight } = formValues

        if (!name.trim()) {
            return
        }

        const newMember: StaffMember = {
            id: crypto.randomUUID(),
            name: name.trim(),
            weight: weight.trim(),
            startDate: formValues.startDate,
        }

        if (category === "service") {
            setServiceStaff((previousState) => [...previousState, newMember])
            resetStaffForm("service")
            return
        }

        setSupportStaff((previousState) => [...previousState, newMember])
        resetStaffForm("support")
    }

    const handleRemoveMember = (category: "service" | "support", memberId: string) => {
        if (category === "service") {
            setServiceStaff((previousState) => previousState.filter((member) => member.id !== memberId))
            return
        }

        setSupportStaff((previousState) => previousState.filter((member) => member.id !== memberId))
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
            <section className="w-full max-w-5xl space-y-8">
                <header className="text-center space-y-3">
                    <p className="text-sm font-medium uppercase tracking-wide text-primary">Primeros pasos</p>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Configuración Inicial</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Completa estos datos básicos para adaptar ReparteJusto al funcionamiento de tu restaurante.
                    </p>
                </header>

                <Tabs defaultValue="restaurante" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="restaurante">Restaurante</TabsTrigger>
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                    </TabsList>

                    <TabsContent value="restaurante" className="mt-6">
                        <Card className="border bg-background/95 shadow-sm">
                            <CardHeader>
                                <CardTitle>Configuración General</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="restaurant-name">Nombre del Restaurante</Label>
                                    <input
                                        id="restaurant-name"
                                        name="restaurant-name"
                                        type="text"
                                        placeholder="Ej. Restaurante La Transparencia"
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                        tabIndex={0}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Modo de Liquidación</Label>
                                    <RadioGroup
                                        value={settlementMode}
                                        onValueChange={handleSettlementModeChange}
                                        className="grid gap-3 sm:grid-cols-2"
                                    >
                                        <div className="flex items-center space-x-3 rounded-md border p-3">
                                            <RadioGroupItem id="modo-pool" value="pool" />
                                            <Label htmlFor="modo-pool" className="flex-1">
                                                Pocillo / Pozo Común
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-3 rounded-md border p-3">
                                            <RadioGroupItem id="modo-directa" value="directa" />
                                            <Label htmlFor="modo-directa" className="flex-1">
                                                Venta Directa del Garzón
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {settlementMode === "pool" ? (
                                    <div className="space-y-5 rounded-lg border bg-background/80 p-5">
                                        <h4 className="text-lg font-semibold">Configuración del Pocillo</h4>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="pool-kitchen">Porcentaje de Cocina (%)</Label>
                                                <input
                                                    id="pool-kitchen"
                                                    type="number"
                                                    inputMode="decimal"
                                                    value={poolConfig.kitchenPercentage}
                                                    onChange={handlePoolConfigChange("kitchenPercentage")}
                                                    className={percentageInputClassName}
                                                    tabIndex={0}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pool-transbank">Porcentaje de Transbank (%)</Label>
                                                <input
                                                    id="pool-transbank"
                                                    type="number"
                                                    inputMode="decimal"
                                                    value={poolConfig.transbankPercentage}
                                                    onChange={handlePoolConfigChange("transbankPercentage")}
                                                    className={percentageInputClassName}
                                                    tabIndex={0}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Label>Otros Descuentos</Label>
                                            <div className="grid gap-3 sm:grid-cols-[1fr_minmax(0,140px)_auto] sm:items-end">
                                                <div className="space-y-2">
                                                    <Label htmlFor="additional-discount-name" className="sr-only">
                                                        Nombre del descuento
                                                    </Label>
                                                    <input
                                                        id="additional-discount-name"
                                                        type="text"
                                                        placeholder="Nombre del descuento"
                                                        value={additionalDeductionForm.name}
                                                        onChange={handleAdditionalDeductionChange("name")}
                                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                                        tabIndex={0}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="additional-discount-percentage" className="sr-only">
                                                        Porcentaje
                                                    </Label>
                                                    <input
                                                        id="additional-discount-percentage"
                                                        type="number"
                                                        inputMode="decimal"
                                                        placeholder="%"
                                                        value={additionalDeductionForm.percentage}
                                                        onChange={handleAdditionalDeductionChange("percentage")}
                                                        className={percentageInputClassName}
                                                        tabIndex={0}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    className="h-10 w-full sm:w-auto"
                                                    onClick={handleAddAdditionalDeduction}
                                                    aria-label="Añadir descuento"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="space-y-2">
                                                {additionalDeductions.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        Agrega descuentos adicionales que quieras considerar en el reparto.
                                                    </p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {additionalDeductions.map((deduction) => (
                                                            <li
                                                                key={deduction.id}
                                                                className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{deduction.name}</span>
                                                                    <span className="text-muted-foreground">{deduction.percentage}%</span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    aria-label={`Eliminar ${deduction.name}`}
                                                                    onClick={() => handleRemoveAdditionalDeduction(deduction.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="personal" className="mt-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="border bg-background/95 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Gestionar Staff de Servicio</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="service-name">Nombre</Label>
                                            <input
                                                id="service-name"
                                                type="text"
                                                value={serviceStaffForm.name}
                                                onChange={handleStaffFormChange("service", "name")}
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                                tabIndex={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="service-weight">Ponderación (ej. 1.0, 0.75, 0.5)</Label>
                                            <input
                                                id="service-weight"
                                                type="number"
                                                step="0.25"
                                                value={serviceStaffForm.weight}
                                                onChange={handleStaffFormChange("service", "weight")}
                                                className={percentageInputClassName}
                                                tabIndex={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fecha de Ingreso</Label>
                                            <Popover
                                                open={activePopover === "service"}
                                                onOpenChange={(open) => setActivePopover(open ? "service" : null)}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="flex w-full items-center justify-start gap-2 px-3"
                                                    >
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{formattedServiceDate}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-2" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={serviceStaffForm.startDate}
                                                        onSelect={handleStaffFormChange("service", "startDate")}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <Button onClick={() => handleAddStaffMember("service")} className="w-full" tabIndex={0}>
                                            Añadir Garzón
                                        </Button>
                                    </div>

                                    <div className="overflow-hidden rounded-lg border">
                                        <table className="w-full min-w-full divide-y divide-border text-left text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 font-semibold">Nombre</th>
                                                    <th scope="col" className="px-4 py-3 font-semibold">Ponderación</th>
                                                    <th scope="col" className="px-4 py-3 font-semibold">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {serviceStaff.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                                                            Aún no has añadido garzones.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    serviceStaff.map((member) => (
                                                        <tr key={member.id}>
                                                            <td className="px-4 py-3">{member.name}</td>
                                                            <td className="px-4 py-3">{member.weight}</td>
                                                            <td className="px-4 py-3">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveMember("service", member.id)}
                                                                    aria-label={`Eliminar ${member.name}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border bg-background/95 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Gestionar Otro Staff (Cocina/Bar)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="support-name">Nombre</Label>
                                            <input
                                                id="support-name"
                                                type="text"
                                                value={supportStaffForm.name}
                                                onChange={handleStaffFormChange("support", "name")}
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                                tabIndex={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="support-weight">Ponderación (ej. 1.0, 0.75, 0.5)</Label>
                                            <input
                                                id="support-weight"
                                                type="number"
                                                step="0.25"
                                                value={supportStaffForm.weight}
                                                onChange={handleStaffFormChange("support", "weight")}
                                                className={percentageInputClassName}
                                                tabIndex={0}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fecha de Ingreso</Label>
                                            <Popover
                                                open={activePopover === "support"}
                                                onOpenChange={(open) => setActivePopover(open ? "support" : null)}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="flex w-full items-center justify-start gap-2 px-3"
                                                    >
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{formattedSupportDate}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-2" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={supportStaffForm.startDate}
                                                        onSelect={handleStaffFormChange("support", "startDate")}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <Button onClick={() => handleAddStaffMember("support")} className="w-full" tabIndex={0}>
                                            Añadir Staff
                                        </Button>
                                    </div>

                                    <div className="overflow-hidden rounded-lg border">
                                        <table className="w-full min-w-full divide-y divide-border text-left text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 font-semibold">Nombre</th>
                                                    <th scope="col" className="px-4 py-3 font-semibold">Ponderación</th>
                                                    <th scope="col" className="px-4 py-3 font-semibold">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {supportStaff.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                                                            Aún no has añadido staff de apoyo.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    supportStaff.map((member) => (
                                                        <tr key={member.id}>
                                                            <td className="px-4 py-3">{member.name}</td>
                                                            <td className="px-4 py-3">{member.weight}</td>
                                                            <td className="px-4 py-3">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveMember("support", member.id)}
                                                                    aria-label={`Eliminar ${member.name}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                <CardFooter className="flex justify-center">
                    <Button size="lg" className="w-full max-w-md py-6 text-base">
                        Guardar Configuración y Continuar
                    </Button>
                </CardFooter>
            </section>
        </main>
    )
}

export default InitialSetupPage
