import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { differenceInCalendarDays, format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { doc, getDoc } from "firebase/firestore"
import {
    useFieldArray,
    useForm,
    useWatch,
    type UseFieldArrayReturn,
    type UseFormReturn,
} from "react-hook-form"

import { cierreSchema, type CierreFormValues, type StaffEntry } from "../schema"
import { db } from "@/firebase/config"

export type SummaryItem = {
    key: string
    label: string
    value: string
}

export type StaffAssignmentSnapshot = {
    staffId: string
    nombre: string
    role?: "garzon" | "cocinero" | "ayudante"
    present: boolean
    assignedAmount: number
    penaltyPercentage: number
    penaltyAmount: number
    deductionAmount: number
    netAmount: number
}

export type StaffAssignmentsSnapshot = {
    servicio: StaffAssignmentSnapshot[]
    cocina: StaffAssignmentSnapshot[]
    ventaDirecta: StaffAssignmentSnapshot[]
    pocilloSecundario: StaffAssignmentSnapshot[]
}

export type ClosureSnapshotPayload = {
    mode: "pool" | "directa" | null
    totals: {
        pool: number
        directSales: number
        propinas: number
        transbankPercentage: number
        transbankAmount: number
        deductionsPercentage: number
        deductionsAmount: number
        netAfterDeductions: number
        kitchenShare: number
        garzonShare: number
    }
    deductions: {
        additionalPercentages: number[]
        transbankPercentage: number
        transbankAmount: number
    }
    staff: {
        asistenciaServicio: StaffEntry[]
        asistenciaCocina: StaffEntry[]
        ventaDirecta: StaffEntry[]
        pocilloSecundario: StaffEntry[]
    }
    assignments: StaffAssignmentsSnapshot
    metadata: {
        referenceDate: string | null
        referenceDateKey: string | null
        daysWithoutSettlement: number
    }
}

type StoredStaffMember = {
    id: string
    name: string
    email?: string
    role?: "garzon" | "cocinero" | "ayudante"
    weight?: number | string
    entryDate?: string | Date | { toDate: () => Date }
    startDate?: string | Date | { toDate: () => Date }
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

type UseCierreDiarioArgs = {
    uid?: string | null
}

type UseCierreDiarioFieldArrays = {
    asistenciaServicio: UseFieldArrayReturn<CierreFormValues, "asistenciaServicio", "id">
    asistenciaCocina: UseFieldArrayReturn<CierreFormValues, "asistenciaCocina", "id">
    ventaDirecta: UseFieldArrayReturn<CierreFormValues, "ventaDirecta", "id">
    pocilloSecundario: UseFieldArrayReturn<CierreFormValues, "pocilloSecundario", "id">
}

type UseCierreDiarioResult = {
    formMethods: UseFormReturn<CierreFormValues>
    fieldArrays: UseCierreDiarioFieldArrays
    poolDate: Date | undefined
    setPoolDate: (date: Date | undefined) => void
    directDate: Date | undefined
    setDirectDate: (date: Date | undefined) => void
    poolDateLabel: string
    directDateLabel: string
    poolTotalInput: string
    handlePoolTotalChange: (event: ChangeEvent<HTMLInputElement>) => void
    poolTotalAmount: number
    totalDirectSales: number
    currencyFormatter: Intl.NumberFormat
    formattedDirectSales: string
    summaryItems: SummaryItem[]
    serviceAssignedAmounts: number[]
    supportAssignedAmounts: number[]
    directAssignedAmounts: number[]
    isLoadingConfig: boolean
    loadError: string | null
    setLoadError: (value: string | null) => void
    buildClosureSnapshotPayload: () => ClosureSnapshotPayload
    effectiveTransbankPercentage: number
    transbankAmount: number
    totalDeductionsPercentage: number
    netAfterDeductions: number
    totalKitchenShare: number
    totalGarzonShare: number
    settlementModeConfig: "pool" | "directa" | null
    isSavingClosure: boolean
    setIsSavingClosure: (value: boolean) => void
    saveError: string | null
    setSaveError: (value: string | null) => void
    saveSuccessMessage: string | null
    setSaveSuccessMessage: (value: string | null) => void
    resetAfterSave: () => void
    ineligibleStaffNames: string[]
}

const defaultCierreValues: CierreFormValues = {
    asistenciaServicio: [],
    asistenciaCocina: [],
    ventaDirecta: [],
    pocilloSecundario: [],
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

const mapStaffMemberToEntry = (member: StoredStaffMember): StaffEntry => {
    const normalizedEntryDate = normalizeEntryDate(member.entryDate ?? member.startDate)
    const ponderacion = formatWeight(member.weight)

    const entry: StaffEntry = {
        id: member.id,
        nombre: member.name,
        presente: true,
        penalizacion_pct: 0,
        deduccion_valor: 0,
    }

    if (ponderacion) {
        entry.ponderacion = ponderacion
    }

    if (member.email) {
        entry.email = member.email
    }

    if (member.role) {
        entry.role = member.role
    }

    if (normalizedEntryDate) {
        entry.fechaIngreso = normalizedEntryDate.toISOString()
    }

    return entry
}

const mapStaffMemberToDirectEntry = (member: StoredStaffMember): StaffEntry => ({
    ...mapStaffMemberToEntry(member),
    montoIndividual: 0,
    porcentajeVenta: 0,
    totalVenta: 0,
})

const sanitizePercentageValue = (value: unknown) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0
    }

    if (typeof value === "string") {
        const parsed = Number.parseFloat(value.replace(/,/g, "."))
        return Number.isFinite(parsed) ? parsed : 0
    }

    return 0
}

const normalizeEntryDate = (value: StoredStaffMember["entryDate"]) => {
    if (!value) {
        return undefined
    }

    if (value instanceof Date) {
        return value
    }

    if (typeof value === "string") {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? undefined : parsed
    }

    if (typeof value === "object" && typeof value.toDate === "function") {
        return value.toDate()
    }

    return undefined
}

export const useCierreDiario = ({ uid }: UseCierreDiarioArgs): UseCierreDiarioResult => {
    const [poolDate, setPoolDate] = useState<Date | undefined>(new Date())
    const [directDate, setDirectDate] = useState<Date | undefined>(new Date())
    const [isLoadingConfig, setIsLoadingConfig] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [poolTotalInput, setPoolTotalInput] = useState("")
    const [settlementModeConfig, setSettlementModeConfig] = useState<"pool" | "directa" | null>(null)
    const [poolPercentages, setPoolPercentages] = useState({ kitchen: 0, transbank: 0 })
    const [additionalDeductionPercents, setAdditionalDeductionPercents] = useState<number[]>([])
    const [isSavingClosure, setIsSavingClosure] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
    const [initialStaffConfig, setInitialStaffConfig] = useState<{
        serviceStaff: StoredStaffMember[]
        supportStaff: StoredStaffMember[]
        mode: "pool" | "directa"
    } | null>(null)
    const [ineligibleStaffNames, setIneligibleStaffNames] = useState<string[]>([])

    const formMethods = useForm<CierreFormValues>({
        resolver: zodResolver(cierreSchema),
        defaultValues: defaultCierreValues,
        mode: "onChange",
    })

    const { control, reset, setValue } = formMethods

    const asistenciaServicio = useFieldArray({ control, name: "asistenciaServicio" })
    const asistenciaCocina = useFieldArray({ control, name: "asistenciaCocina" })
    const ventaDirecta = useFieldArray({ control, name: "ventaDirecta" })
    const pocilloSecundario = useFieldArray({ control, name: "pocilloSecundario" })

    const asistenciaServicioValues = useWatch({ control, name: "asistenciaServicio" }) ?? []
    const asistenciaCocinaValues = useWatch({ control, name: "asistenciaCocina" }) ?? []
    const ventaDirectaValues = useWatch({ control, name: "ventaDirecta" }) ?? []
    const pocilloSecundarioValues = useWatch({ control, name: "pocilloSecundario" }) ?? []

    const buildInitialFormValues = useCallback(
        (serviceStaff: StoredStaffMember[], supportStaff: StoredStaffMember[], mode: "pool" | "directa") => ({
            asistenciaServicio: serviceStaff.map(mapStaffMemberToEntry),
            asistenciaCocina: supportStaff.map(mapStaffMemberToEntry),
            ventaDirecta: mode === "directa" ? serviceStaff.map(mapStaffMemberToDirectEntry) : [],
            pocilloSecundario: supportStaff.map(mapStaffMemberToEntry),
        }),
        [],
    )

    const poolTotalAmount = useMemo(() => {
        const normalized = poolTotalInput.replace(",", ".")
        const parsed = Number.parseFloat(normalized)
        return Number.isFinite(parsed) ? parsed : 0
    }, [poolTotalInput])

    const totalDirectSales = useMemo(
        () =>
            ventaDirectaValues.reduce<number>((sum, entry) => {
                const current = Number(entry?.totalVenta ?? 0)
                return sum + (Number.isFinite(current) ? current : 0)
            }, 0),
        [ventaDirectaValues],
    )

    const totalPropinasGeneradas = poolTotalAmount + totalDirectSales
    const referenceDate = settlementModeConfig === "directa" ? directDate : poolDate

    const daysWithoutSettlement = useMemo(() => {
        if (!referenceDate) {
            return 0
        }

        const difference = differenceInCalendarDays(new Date(), referenceDate)
        return Math.max(difference, 0)
    }, [referenceDate])

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

    const effectiveTransbankPercentage = useMemo(() => {
        if (settlementModeConfig !== "pool") {
            return 0
        }

        return Number.isFinite(poolPercentages.transbank) ? poolPercentages.transbank : 0
    }, [poolPercentages.transbank, settlementModeConfig])

    const totalDeductionsPercentage = useMemo(() => {
        const extras = additionalDeductionPercents.reduce(
            (sum, value) => sum + (Number.isFinite(value) ? value : 0),
            0,
        )

        return extras + effectiveTransbankPercentage
    }, [additionalDeductionPercents, effectiveTransbankPercentage])

    const deductionsAmount = totalPropinasGeneradas * (totalDeductionsPercentage / 100)
    const netAfterDeductions = Math.max(totalPropinasGeneradas - deductionsAmount, 0)
    const transbankAmount = totalPropinasGeneradas * (effectiveTransbankPercentage / 100)

    const totalKitchenShare = settlementModeConfig === "pool" ? netAfterDeductions * (poolPercentages.kitchen / 100) : 0
    const totalGarzonShare = Math.max(netAfterDeductions - totalKitchenShare, 0)

    const formattedKitchenShare = currencyFormatter.format(totalKitchenShare)
    const formattedGarzonShare = currencyFormatter.format(totalGarzonShare)
    const formattedTransbankAmount = currencyFormatter.format(transbankAmount)

    const summaryItems = useMemo<SummaryItem[]>(() => {
        const items: SummaryItem[] = [{ key: "propinas", label: "Propinas", value: formattedTotalPropinas }]

        if (settlementModeConfig === "directa") {
            items.push({ key: "directa", label: "Venta directa", value: formattedDirectSales })
        } else {
            items.push({ key: "cocina", label: "Propina cocina", value: formattedKitchenShare })
            items.push({ key: "garzones", label: "Propina garzones", value: formattedGarzonShare })
        }

        items.push({ key: "transbank", label: "Transbank", value: formattedTransbankAmount })
        items.push({ key: "dias", label: "Días sin liquidar", value: daysWithoutSettlement.toString() })

        return items
    }, [
        formattedDirectSales,
        formattedTotalPropinas,
        formattedKitchenShare,
        formattedGarzonShare,
        formattedTransbankAmount,
        daysWithoutSettlement,
        settlementModeConfig,
    ])

    const serviceAssignedAmounts = useMemo(() => {
        if (settlementModeConfig === "directa" || (totalGarzonShare <= 0 && totalKitchenShare <= 0)) {
            return asistenciaServicioValues.map(() => 0)
        }

        const serviceWeightTotal = asistenciaServicioValues.reduce((sum, entry) => {
            const baseWeight = parseWeightValue(entry?.ponderacion)
            return entry?.presente === false ? sum : sum + baseWeight
        }, 0)

        return asistenciaServicioValues.map((entry) => {
            if (entry?.presente === false || serviceWeightTotal <= 0) {
                return 0
            }

            return totalGarzonShare * (parseWeightValue(entry?.ponderacion) / serviceWeightTotal)
        })
    }, [asistenciaServicioValues, settlementModeConfig, totalGarzonShare, totalKitchenShare])

    const supportAssignedAmounts = useMemo(() => {
        if (settlementModeConfig === "directa" || (totalGarzonShare <= 0 && totalKitchenShare <= 0)) {
            return asistenciaCocinaValues.map(() => 0)
        }

        const supportWeightTotal = asistenciaCocinaValues.reduce((sum, entry) => {
            const baseWeight = parseWeightValue(entry?.ponderacion)
            return entry?.presente === false ? sum : sum + baseWeight
        }, 0)

        return asistenciaCocinaValues.map((entry) => {
            if (entry?.presente === false || supportWeightTotal <= 0) {
                return 0
            }

            return totalKitchenShare * (parseWeightValue(entry?.ponderacion) / supportWeightTotal)
        })
    }, [asistenciaCocinaValues, settlementModeConfig, totalGarzonShare, totalKitchenShare])

    const directAssignedAmounts = useMemo(
        () =>
            ventaDirectaValues.map((entry) => {
                const baseAmount = Number(entry?.totalVenta ?? entry?.montoIndividual ?? 0)
                return Number.isFinite(baseAmount) ? baseAmount : 0
            }),
        [ventaDirectaValues],
    )

    const handlePoolTotalChange = (event: ChangeEvent<HTMLInputElement>) => {
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
                const kitchenPercentage = sanitizePercentageValue(data.poolConfig?.kitchenPercentage)
                const transbankPercentage = sanitizePercentageValue(data.poolConfig?.transbankPercentage)
                const deductions = (data.additionalDeductions ?? []).map((item) => sanitizePercentageValue(item?.percentage))

                const initialValues = buildInitialFormValues(serviceStaff, supportStaff, mode)

                setInitialStaffConfig({ serviceStaff, supportStaff, mode })
                reset(initialValues)

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

    const buildClosureSnapshotPayload = useCallback((): ClosureSnapshotPayload => {
        const buildAssignmentSnapshot = (
            entries: StaffEntry[],
            assignedAmounts: number[],
        ): StaffAssignmentSnapshot[] =>
            entries.map((entry, index) => {
                const assignedAmount = Number.isFinite(assignedAmounts[index]) ? assignedAmounts[index] : 0
                const penaltyPercentage = Number(entry?.penalizacion_pct ?? 0)
                const penaltyAmount = assignedAmount * (penaltyPercentage / 100)
                const deductionAmount = Number(entry?.deduccion_valor ?? 0)
                const netAmount = Math.max(assignedAmount - penaltyAmount - deductionAmount, 0)

                return {
                    staffId: entry.id,
                    nombre: entry.nombre,
                    role: entry.role,
                    present: entry.presente !== false,
                    assignedAmount,
                    penaltyPercentage,
                    penaltyAmount,
                    deductionAmount,
                    netAmount,
                }
            })

        return {
            mode: settlementModeConfig,
            totals: {
                pool: poolTotalAmount,
                directSales: totalDirectSales,
                propinas: totalPropinasGeneradas,
                transbankPercentage: effectiveTransbankPercentage,
                transbankAmount,
                deductionsPercentage: totalDeductionsPercentage,
                deductionsAmount,
                netAfterDeductions,
                kitchenShare: totalKitchenShare,
                garzonShare: totalGarzonShare,
            },
            deductions: {
                additionalPercentages: additionalDeductionPercents,
                transbankPercentage: effectiveTransbankPercentage,
                transbankAmount,
            },
            staff: {
                asistenciaServicio: asistenciaServicioValues,
                asistenciaCocina: asistenciaCocinaValues,
                ventaDirecta: ventaDirectaValues,
                pocilloSecundario: pocilloSecundarioValues,
            },
            assignments: {
                servicio: buildAssignmentSnapshot(asistenciaServicioValues, serviceAssignedAmounts),
                cocina: buildAssignmentSnapshot(asistenciaCocinaValues, supportAssignedAmounts),
                ventaDirecta: buildAssignmentSnapshot(ventaDirectaValues, directAssignedAmounts),
                pocilloSecundario: buildAssignmentSnapshot(pocilloSecundarioValues, supportAssignedAmounts),
            },
            metadata: {
                referenceDate: referenceDate?.toISOString() ?? null,
                referenceDateKey: referenceDate ? format(referenceDate, "yyyy-MM-dd") : null,
                daysWithoutSettlement,
            },
        }
    }, [
        additionalDeductionPercents,
        asistenciaCocinaValues,
        asistenciaServicioValues,
        ventaDirectaValues,
        pocilloSecundarioValues,
        poolTotalAmount,
        totalDirectSales,
        totalPropinasGeneradas,
        effectiveTransbankPercentage,
        transbankAmount,
        totalDeductionsPercentage,
        deductionsAmount,
        netAfterDeductions,
        totalKitchenShare,
        totalGarzonShare,
        settlementModeConfig,
        referenceDate,
        daysWithoutSettlement,
        serviceAssignedAmounts,
        supportAssignedAmounts,
        directAssignedAmounts,
    ])

    const resetAfterSave = useCallback(() => {
        if (initialStaffConfig) {
            const nextValues = buildInitialFormValues(
                initialStaffConfig.serviceStaff,
                initialStaffConfig.supportStaff,
                initialStaffConfig.mode,
            )
            reset(nextValues)
        } else {
            reset(defaultCierreValues)
        }

        setPoolTotalInput("")
        setPoolDate(new Date())
        setDirectDate(new Date())
        setIneligibleStaffNames([])
    }, [buildInitialFormValues, initialStaffConfig, reset])

    useEffect(() => {
        if (!referenceDate) {
            setIneligibleStaffNames([])
            return
        }

        const referenceDay = startOfDay(referenceDate)
        const updatedIneligible = new Set<string>()

        const evaluateEntries = (entries: StaffEntry[], fieldName: keyof CierreFormValues) => {
            entries.forEach((entry, index) => {
                const parsedEntryDate = entry.fechaIngreso ? startOfDay(new Date(entry.fechaIngreso)) : null

                if (parsedEntryDate && differenceInCalendarDays(referenceDay, parsedEntryDate) < 0) {
                    updatedIneligible.add(entry.nombre)

                    if (entry.presente !== false) {
                        const path = `${fieldName}.${index}.presente` as const
                        setValue(path, false, { shouldDirty: true, shouldTouch: false, shouldValidate: false })
                    }
                }
            })
        }

        evaluateEntries(asistenciaServicioValues, "asistenciaServicio")
        evaluateEntries(asistenciaCocinaValues, "asistenciaCocina")
        evaluateEntries(ventaDirectaValues, "ventaDirecta")
        evaluateEntries(pocilloSecundarioValues, "pocilloSecundario")

        setIneligibleStaffNames(Array.from(updatedIneligible))
    }, [
        referenceDate,
        asistenciaServicioValues,
        asistenciaCocinaValues,
        ventaDirectaValues,
        pocilloSecundarioValues,
        setValue,
    ])

    return {
        formMethods,
        fieldArrays: {
            asistenciaServicio,
            asistenciaCocina,
            ventaDirecta,
            pocilloSecundario,
        },
        poolDate,
        setPoolDate,
        directDate,
        setDirectDate,
        poolDateLabel,
        directDateLabel,
        poolTotalInput,
        handlePoolTotalChange,
        poolTotalAmount,
        totalDirectSales,
        currencyFormatter,
        summaryItems,
        formattedDirectSales,
        serviceAssignedAmounts,
        supportAssignedAmounts,
        directAssignedAmounts,
        isLoadingConfig,
        loadError,
        setLoadError,
        buildClosureSnapshotPayload,
        effectiveTransbankPercentage,
        transbankAmount,
        totalDeductionsPercentage,
        netAfterDeductions,
        totalKitchenShare,
        totalGarzonShare,
        settlementModeConfig,
        isSavingClosure,
        setIsSavingClosure,
        saveError,
        setSaveError,
        saveSuccessMessage,
        setSaveSuccessMessage,
        resetAfterSave,
        ineligibleStaffNames,
    }
}
