import { useEffect, useMemo, useState } from "react"
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { differenceInCalendarDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import StaffAsistenciaCard from "./StaffAsistenciaCard"
import { amountInputClassName } from "./constants"
import { cierreSchema, type CierreFormValues, type StaffEntry } from "./schema"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/firebase/config"
import { doc, getDoc } from "firebase/firestore"
import { useNavigate } from "react-router"

type StoredStaffMember = {
    id: string
    name: string
    email?: string
    role?: "garzon" | "cocinero" | "ayudante"
    weight?: number | string
}

type RestaurantConfigurationSnapshot = {
    serviceStaff?: StoredStaffMember[]
    supportStaff?: StoredStaffMember[]
    settlementMode?: "pool" | "directa"
    poolConfig?: {
        kitchenPercentage?: number
        transbankPercentage?: number
    }
    additionalDeductions?: { percentage?: number }[]
}

const formatWeight = (weight?: number | string) => {
    if (weight === undefined || weight === null) {
        return undefined
    }

    if (typeof weight === "string" && weight.trim().length > 0) {
        return weight
    }

    if (typeof weight === "number" && Number.isFinite(weight)) {
        return weight % 1 === 0 ? `${weight}` : weight.toFixed(2)
    }

    return undefined
}

const parseWeightValue = (value?: string) => {
    if (!value) {
        return 0
    }

    const sanitized = value.toString().replace(/[^0-9.,-]/g, "").replace(/,/g, ".")
    const parsed = Number.parseFloat(sanitized)

    return Number.isFinite(parsed) ? parsed : 0
}

const mapStaffMemberToEntry = (member: StoredStaffMember): StaffEntry => ({
    id: member.id,
    nombre: member.name,
    ponderacion: formatWeight(member.weight),
    presente: true,
    penalizacion_pct: 0,
    deduccion_valor: 0,
    email: member.email,
    role: member.role,
})

const mapStaffMemberToDirectEntry = (member: StoredStaffMember): StaffEntry => ({
    ...mapStaffMemberToEntry(member),
    montoIndividual: 0,
    porcentajeVenta: 0,
    totalVenta: 0,
})

const defaultCierreValues: CierreFormValues = {
    asistenciaServicio: [],
    asistenciaCocina: [],
    ventaDirecta: [],
    pocilloSecundario: [],
}

const CierreDiarioPage = () => {
    const { uid } = useAuth()
    const navigate = useNavigate()
    const [poolDate, setPoolDate] = useState<Date | undefined>(new Date())
    const [directDate, setDirectDate] = useState<Date | undefined>(new Date())
    const [isLoadingConfig, setIsLoadingConfig] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [poolTotalInput, setPoolTotalInput] = useState("")
    const [settlementModeConfig, setSettlementModeConfig] = useState<"pool" | "directa" | null>(null)
    const [poolPercentages, setPoolPercentages] = useState({ kitchen: 0, transbank: 0 })
    const [additionalDeductionPercents, setAdditionalDeductionPercents] = useState<number[]>([])

    const formMethods = useForm<CierreFormValues>({
        resolver: zodResolver(cierreSchema),
        defaultValues: defaultCierreValues,
        mode: "onChange",
    })

    const { control, reset } = formMethods

    const asistenciaServicio = useFieldArray({ control, name: "asistenciaServicio" })
    const asistenciaCocina = useFieldArray({ control, name: "asistenciaCocina" })
    const ventaDirecta = useFieldArray({ control, name: "ventaDirecta" })
    const pocilloSecundario = useFieldArray({ control, name: "pocilloSecundario" })

    const ventaDirectaValues = useWatch({ control, name: "ventaDirecta" }) ?? []
    const asistenciaServicioValues = useWatch({ control, name: "asistenciaServicio" }) ?? []
    const asistenciaCocinaValues = useWatch({ control, name: "asistenciaCocina" }) ?? []

    const poolTotalAmount = (() => {
        const normalized = poolTotalInput.replace(",", ".")
        const parsed = Number.parseFloat(normalized)
        return Number.isFinite(parsed) ? parsed : 0
    })()

    const totalDirectSales = ventaDirectaValues.reduce<number>((sum, entry) => {
        const current = Number(entry?.totalVenta ?? 0)
        return sum + (Number.isFinite(current) ? current : 0)
    }, 0)

    const totalPropinasGeneradas = poolTotalAmount + totalDirectSales

    const referenceDate = settlementModeConfig === "directa" ? directDate : poolDate

    const daysWithoutSettlement = (() => {
        if (!referenceDate) {
            return 0
        }

        const difference = differenceInCalendarDays(new Date(), referenceDate)
        return Math.max(difference, 0)
    })()

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat("es-CL", {
                style: "currency",
                currency: "CLP",
                minimumFractionDigits: 0,
            }),
        [],
    )

    const formattedTotalPropinas = currencyFormatter.format(totalPropinasGeneradas)
    const formattedDirectSales = currencyFormatter.format(totalDirectSales)

    const totalDeductionsPercentage = useMemo(() => {
        const extras = additionalDeductionPercents.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0)
        const transbank = settlementModeConfig === "pool" ? poolPercentages.transbank : 0

        return extras + transbank
    }, [additionalDeductionPercents, poolPercentages.transbank, settlementModeConfig])

    const deductionsAmount = totalPropinasGeneradas * (totalDeductionsPercentage / 100)
    const netAfterDeductions = Math.max(totalPropinasGeneradas - deductionsAmount, 0)

    const totalKitchenShare = settlementModeConfig === "pool" ? netAfterDeductions * (poolPercentages.kitchen / 100) : 0
    const totalGarzonShare = Math.max(netAfterDeductions - totalKitchenShare, 0)
    const formattedKitchenShare = currencyFormatter.format(totalKitchenShare)
    const formattedGarzonShare = currencyFormatter.format(totalGarzonShare)

    const summaryItems = useMemo(() => {
        const items: { key: string; label: string; value: string }[] = [
            { key: "propinas", label: "Propinas", value: formattedTotalPropinas },
        ]

        if (settlementModeConfig === "directa") {
            items.push({ key: "directa", label: "Venta directa", value: formattedDirectSales })
        } else {
            items.push({ key: "cocina", label: "Propina cocina", value: formattedKitchenShare })
            items.push({ key: "garzones", label: "Propina garzones", value: formattedGarzonShare })
        }

        items.push({ key: "dias", label: "Días sin liquidar", value: daysWithoutSettlement.toString() })

        return items
    }, [
        formattedDirectSales,
        formattedTotalPropinas,
        formattedKitchenShare,
        formattedGarzonShare,
        daysWithoutSettlement,
        settlementModeConfig,
    ])

    const { serviceAssignedAmounts, supportAssignedAmounts } = useMemo(() => {
        if (settlementModeConfig === "directa" || (totalGarzonShare <= 0 && totalKitchenShare <= 0)) {
            return {
                serviceAssignedAmounts: asistenciaServicioValues.map(() => 0),
                supportAssignedAmounts: asistenciaCocinaValues.map(() => 0),
            }
        }

        const serviceWeightTotal = asistenciaServicioValues.reduce((sum, entry) => {
            const baseWeight = parseWeightValue(entry?.ponderacion)
            return entry?.presente === false ? sum : sum + baseWeight
        }, 0)

        const supportWeightTotal = asistenciaCocinaValues.reduce((sum, entry) => {
            const baseWeight = parseWeightValue(entry?.ponderacion)
            return entry?.presente === false ? sum : sum + baseWeight
        }, 0)

        return {
            serviceAssignedAmounts: asistenciaServicioValues.map((entry) => {
                if (entry?.presente === false || serviceWeightTotal <= 0) {
                    return 0
                }

                return totalGarzonShare * (parseWeightValue(entry?.ponderacion) / serviceWeightTotal)
            }),
            supportAssignedAmounts: asistenciaCocinaValues.map((entry) => {
                if (entry?.presente === false || supportWeightTotal <= 0) {
                    return 0
                }

                return totalKitchenShare * (parseWeightValue(entry?.ponderacion) / supportWeightTotal)
            }),
        }
    }, [
        asistenciaServicioValues,
        asistenciaCocinaValues,
        totalGarzonShare,
        totalKitchenShare,
        settlementModeConfig,
    ])

    const directAssignedAmounts = useMemo(
        () =>
            ventaDirectaValues.map((entry) => {
                const baseAmount = Number(entry?.totalVenta ?? entry?.montoIndividual ?? 0)
                return Number.isFinite(baseAmount) ? baseAmount : 0
            }),
        [ventaDirectaValues],
    )

    const handlePoolTotalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPoolTotalInput(event.target.value)
    }

    useEffect(() => {
        if (!uid) {
            setLoadError("No se encontró una sesión activa. Inicia sesión para registrar cierres.")
            setIsLoadingConfig(false)
            reset(defaultCierreValues)
            return
        }

        const handleLoadConfiguration = async () => {
            try {
                setIsLoadingConfig(true)
                const restaurantReference = doc(db, "restaurants", uid)
                const snapshot = await getDoc(restaurantReference)

                if (!snapshot.exists()) {
                    setLoadError(
                        "Aún no completas la configuración inicial. Configúrala para poder registrar cierres.",
                    )
                    reset(defaultCierreValues)
                    return
                }

                const data = snapshot.data() as RestaurantConfigurationSnapshot
                const serviceStaff = data.serviceStaff ?? []
                const supportStaff = data.supportStaff ?? []
                const mode = data.settlementMode ?? "pool"
                const kitchenPercentage = Number(data.poolConfig?.kitchenPercentage ?? 0)
                const transbankPercentage = Number(data.poolConfig?.transbankPercentage ?? 0)
                const deductions = (data.additionalDeductions ?? []).map((item) =>
                    Number(item?.percentage ?? 0),
                )

                reset({
                    asistenciaServicio: serviceStaff.map(mapStaffMemberToEntry),
                    asistenciaCocina: supportStaff.map(mapStaffMemberToEntry),
                    ventaDirecta:
                        mode === "directa"
                            ? serviceStaff.map(mapStaffMemberToDirectEntry)
                            : [],
                    pocilloSecundario: supportStaff.map(mapStaffMemberToEntry),
                })

                setPoolPercentages({ kitchen: kitchenPercentage, transbank: transbankPercentage })
                setAdditionalDeductionPercents(deductions)
                setSettlementModeConfig(mode)
                setLoadError(null)
            } catch (error) {
                console.error("Error al cargar la configuración del cierre", error)
                setLoadError("No pudimos obtener la configuración guardada. Intenta nuevamente en unos segundos.")
                setSettlementModeConfig(null)
                setPoolPercentages({ kitchen: 0, transbank: 0 })
                setAdditionalDeductionPercents([])
                reset(defaultCierreValues)
            } finally {
                setIsLoadingConfig(false)
            }
        }

        void handleLoadConfiguration()
    }, [uid, reset])

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

    if (isLoadingConfig) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="py-16 text-center text-sm text-muted-foreground" aria-busy="true">
                            Cargando configuración del cierre...
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    if (loadError) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="space-y-6 py-12 text-center">
                            <p className="text-sm text-destructive">{loadError}</p>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => navigate(0)} variant="outline">
                                    Reintentar
                                </Button>
                                <Button onClick={() => navigate("/setup")}>
                                    Ir a configuración inicial
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    return (
        <FormProvider {...formMethods}>
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-4xl space-y-6">
                    <div className="space-y-2 text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Reparte Justo</p>
                        <h1 className="text-2xl font-semibold sm:text-3xl">Registrar Cierre del Día</h1>
                        <p className="text-sm text-muted-foreground">Propinas claras, equipo justo.</p>
                    </div>

                    <div className="flex flex-wrap items-stretch gap-2 overflow-x-auto pb-2 sm:flex-nowrap">
                        {summaryItems.map((item) => (
                            <div
                                key={item.key}
                                className="min-w-[140px] rounded-lg border bg-background/95 px-3 py-2 text-center shadow-sm sm:text-left"
                            >
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    {item.label}
                                </p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="space-y-10 p-6">
                            {settlementModeConfig !== "directa" ? (
                                <article className="space-y-6">
                                    <header className="flex flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="text-xl font-semibold">Registro de Pocillo</h3>
                                        {poolTotalAmount > 0 ? (
                                            <Button type="button" className="w-full sm:w-auto">
                                                Pagar general
                                            </Button>
                                        ) : null}
                                    </header>

                                    <div className="grid gap-4 md:grid-cols-2">
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
                                                value={poolTotalInput}
                                                onChange={handlePoolTotalChange}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <section className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Staff de Servicio
                                            </h4>
                                            <div className="mt-3 space-y-3">
                                                {asistenciaServicio.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="asistenciaServicio"
                                                        showPonderacion
                                                        assignedAmount={
                                                            serviceAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(serviceAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Staff de Cocina
                                            </h4>
                                            <div className="mt-3 space-y-3">
                                                {asistenciaCocina.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="asistenciaCocina"
                                                        showPonderacion
                                                        assignedAmount={
                                                            supportAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(supportAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                </article>
                            ) : null}

                            {settlementModeConfig !== "directa" ? <Separator className="my-8" /> : null}

                            {settlementModeConfig === "directa" ? (
                                <article className="space-y-6">
                                    <header className="flex flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="text-xl font-semibold">Registro de Venta Directa</h3>
                                        {totalDirectSales > 0 ? (
                                            <Button type="button" className="w-full sm:w-auto">
                                                Pagar general
                                            </Button>
                                        ) : null}
                                    </header>

                                    <div className="grid gap-4 md:grid-cols-2">
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

                                        <div className="space-y-2">
                                            <Label htmlFor="direct-total">Total Venta Directa del Día</Label>
                                            <input
                                                id="direct-total"
                                                type="text"
                                                disabled
                                                value={formattedDirectSales}
                                                className="w-full rounded-md border border-dashed border-input bg-muted/20 px-3 py-2 text-sm text-muted-foreground shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <section className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Registro de Garzones
                                            </h4>
                                            <div className="mt-3 space-y-3">
                                                {ventaDirecta.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="ventaDirecta"
                                                        showMontoIndividual
                                                        assignedAmount={
                                                            directAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(directAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                Asistencia Pocillo Secundario
                                            </h4>
                                            <div className="mt-3 space-y-3">
                                                {pocilloSecundario.fields.map((field, index) => (
                                                    <StaffAsistenciaCard
                                                        key={field.id}
                                                        field={field}
                                                        index={index}
                                                        name="pocilloSecundario"
                                                        showPonderacion
                                                        assignedAmount={
                                                            supportAssignedAmounts[index] > 0
                                                                ? currencyFormatter.format(supportAssignedAmounts[index])
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                </article>
                            ) : null}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </FormProvider>
    )
}
export default CierreDiarioPage
