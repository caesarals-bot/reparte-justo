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

import { cierreSchema, type CierreFormValues, type GeneralExpenseEntry, type StaffEntry } from "../schema"
import { db } from "@/firebase/config"

export type SummaryItem = {
    key: string
    label: string
    value: string
}

const mapGeneralExpenseInput = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
        return value
    }

    if (value && typeof value === "object") {
        return Object.entries(value as Record<string, unknown>).map(([entryId, payload]) =>
            payload && typeof payload === "object"
                ? { entryId, ...(payload as Record<string, unknown>) }
                : { entryId, nombre: payload },
        )
    }

    return []
}

const sanitizeGeneralExpenseEntries = (value: unknown): GeneralExpenseEntry[] => {
    const entries = mapGeneralExpenseInput(value)

    if (!entries.length) {
        return []
    }

    return entries
        .map((item) => {
            if (!item || typeof item !== "object") {
                return null
            }

            const record = item as Partial<GeneralExpenseEntry>
            const amount = toSafeNumber(record.monto)

            if (!record.nombre || !record.tipo || amount < 0) {
                return null
            }

            return {
                entryId: record.entryId ?? generateExpenseId(),
                nombre: String(record.nombre),
                tipo: record.tipo === "anfitriona" ? "anfitriona" : "part-time",
                monto: amount,
            }
        })
        .filter((entry): entry is GeneralExpenseEntry => Boolean(entry))
}

type StaffFieldName = "asistenciaServicio" | "asistenciaCocina" | "ventaDirecta" | "pocilloSecundario"

export type StaffAssignmentSnapshot = {
    staffId: string
    nombre: string
    role?: "garzon" | "cocinero" | "ayudante"
    email?: string
    present: boolean
    assignedAmount: number
    penaltyPercentage: number
    penaltyAmount: number
    deductionAmount: number
    deductionName?: string
    deductionDescription?: string
    netAmount: number
}

export type StaffAssignmentsSnapshot = {
    servicio: StaffAssignmentSnapshot[]
    cocina: StaffAssignmentSnapshot[]
    ventaDirecta: StaffAssignmentSnapshot[]
    pocilloSecundario: StaffAssignmentSnapshot[]
}

export type PenaltyEntry = {
    staffId?: string
    nombre: string
    role?: string | null
    referenceDate: string | null
    percentage: number
    amount: number
}

export type AdjustmentEntry = {
    id: string
    staffId?: string
    staffName?: string
    variant: "monto" | "porcentaje"
    type: "incremento" | "descuento"
    amount?: number
    percentage?: number
    motivo?: string
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
        generalExpense: number
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
    generalExpenses: GeneralExpenseEntry[]
    assignments: StaffAssignmentsSnapshot
    metadata: {
        referenceDate: string | null
        referenceDateKey: string | null
        daysWithoutSettlement: number
    }
    penalties: PenaltyEntry[]
    adjustments: AdjustmentEntry[]
    dailySummary: {
        netAfterDeductions: number
        propinas: number
        transbankAmount: number
        deductionsAmount: number
        generalExpense: number
    }
    restaurantContact?: {
        email?: string
        responsibleName?: string
    }
    configurationSnapshot?: ConfigurationVersionSnapshot
    submittedBy?: SubmittedBySnapshot
    submittedAt?: string
}

type StoredStaffMember = {
    id: string
    name: string
    email?: string
    role?: "garzon" | "cocinero" | "ayudante"
    weight?: number | string
    entryDate?: string | Date | { toDate: () => Date }
    startDate?: string | Date | { toDate: () => Date }
    isActive?: boolean
    inactiveSince?: string | Date | { toDate: () => Date }
}

type RestaurantConfigurationSnapshot = {
    serviceStaff?: StoredStaffMember[]
    supportStaff?: StoredStaffMember[]
    settlementMode?: "pool" | "directa"
    poolConfig?: {
        kitchenPercentage?: number
        transbankPercentage?: number
    }
    directConfig?: {
        directWaiterPercentage?: number
    }
    additionalDeductions?: { percentage?: number }[]
    responsibleName?: string
    contactEmail?: string
}

type VersionedStaffMemberSnapshot = {
    id: string
    name: string
    role?: "garzon" | "cocinero" | "ayudante" | string
    weight?: number | string
    email?: string
    isActive?: boolean
    entryDate?: string
    inactiveSince?: string
}

type SubmittedBySnapshot = {
    uid?: string
    name?: string
    email?: string
}

type ConfigurationVersionSnapshot = {
    settlementMode?: "pool" | "directa" | null
    poolPercentages: {
        kitchen: number
        transbank: number
    }
    directConfig?: {
        directWaiterPercentage?: number
    }
    additionalDeductions: number[]
    serviceStaff: VersionedStaffMemberSnapshot[]
    supportStaff: VersionedStaffMemberSnapshot[]
    contact?: {
        email?: string
        responsibleName?: string
    }
}

type UseCierreDiarioArgs = {
    restaurantId?: string | null
    userInfo?: {
        uid?: string | null
        name?: string | null
        email?: string | null
    }
}

type UseCierreDiarioFieldArrays = {
    asistenciaServicio: UseFieldArrayReturn<CierreFormValues, "asistenciaServicio", "id">
    asistenciaCocina: UseFieldArrayReturn<CierreFormValues, "asistenciaCocina", "id">
    ventaDirecta: UseFieldArrayReturn<CierreFormValues, "ventaDirecta", "id">
    pocilloSecundario: UseFieldArrayReturn<CierreFormValues, "pocilloSecundario", "id">
    generalExpenses: UseFieldArrayReturn<CierreFormValues, "generalExpenses", "id">
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
    generalExpenseEntries: GeneralExpenseEntry[]
    generalExpenseTotal: number
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
    directWaiterPercentage: number | null
    isSavingClosure: boolean
    setIsSavingClosure: (value: boolean) => void
    saveError: string | null
    setSaveError: (value: string | null) => void
    saveSuccessMessage: string | null
    setSaveSuccessMessage: (value: string | null) => void
    resetAfterSave: () => void
    ineligibleStaffNames: string[]
    editingState: EditingClosureState | null
    isHydratingFromClosure: boolean
    loadClosureForEditing: (params: { restaurantId: string; closureId: string }) => Promise<void>
    markEditingOriginalDeleted: () => void
    clearEditingState: () => void
}

type EditingClosureState = {
    closureId: string
    referenceDate?: string | null
    referenceDateKey?: string | null
    mode: "pool" | "directa" | null
    hasDeletedOriginal: boolean
}

const defaultCierreValues: CierreFormValues = {
    asistenciaServicio: [],
    asistenciaCocina: [],
    ventaDirecta: [],
    pocilloSecundario: [],
    generalExpenses: [],
}

const generateExpenseId = () => {
    try {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
            return crypto.randomUUID()
        }
    } catch (error) {
        console.warn("No crypto.randomUUID available", error)
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const toSafeNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const sanitizeDeductionText = (value: unknown, maxLength: number): string | undefined => {
    if (typeof value !== "string") {
        return undefined
    }

    const trimmed = value.trim()
    if (!trimmed) {
        return undefined
    }

    return trimmed.slice(0, maxLength)
}

const sanitizeStaffEntries = (value: unknown): StaffEntry[] => {
    if (!Array.isArray(value)) {
        return []
    }

    return value
        .map((item) => {
            if (!item || typeof item !== "object") {
                return null
            }

            const entry = item as Partial<StaffEntry>

            if (!entry.id || !entry.nombre) {
                return null
            }

            const deductionName = sanitizeDeductionText(entry.deduccion_nombre, 80)
            const deductionDescription = sanitizeDeductionText(entry.deduccion_descripcion, 200)

            return {
                ...entry,
                id: String(entry.id),
                nombre: String(entry.nombre),
                presente: entry.presente !== false,
                penalizacion_pct: toSafeNumber(entry.penalizacion_pct),
                deduccion_valor: toSafeNumber(entry.deduccion_valor),
                deduccion_nombre: deductionName,
                deduccion_descripcion: deductionDescription,
                montoIndividual:
                    entry.montoIndividual !== undefined ? toSafeNumber(entry.montoIndividual) : entry.montoIndividual,
            } as StaffEntry
        })
        .filter((entry): entry is StaffEntry => Boolean(entry))
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
    const normalizedInactiveDate = normalizeEntryDate(member.inactiveSince)
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

    if (typeof member.isActive === "boolean") {
        entry.isActive = member.isActive
    }

    if (normalizedInactiveDate) {
        entry.inactiveSince = normalizedInactiveDate.toISOString()
    }

    return entry
}

const mapStaffMemberToDirectEntry = (member: StoredStaffMember): StaffEntry => ({
    ...mapStaffMemberToEntry(member),
    montoIndividual: 0,
})

const mapStaffMemberForConfigurationSnapshot = (
    member: StoredStaffMember,
): VersionedStaffMemberSnapshot => {
    const entryDate = normalizeEntryDate(member.entryDate ?? member.startDate)
    const inactiveSince = normalizeEntryDate(member.inactiveSince)

    return {
        id: member.id,
        name: member.name,
        role: member.role,
        weight: member.weight,
        email: member.email,
        isActive: member.isActive,
        entryDate: entryDate ? entryDate.toISOString() : undefined,
        inactiveSince: inactiveSince ? inactiveSince.toISOString() : undefined,
    }
}

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

export const useCierreDiario = ({ restaurantId, userInfo }: UseCierreDiarioArgs): UseCierreDiarioResult => {
    const [poolDate, setPoolDate] = useState<Date | undefined>(new Date())
    const [directDate, setDirectDate] = useState<Date | undefined>(new Date())
    const [isLoadingConfig, setIsLoadingConfig] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [poolTotalInput, setPoolTotalInput] = useState("")
    const [settlementModeConfig, setSettlementModeConfig] = useState<"pool" | "directa" | null>(null)
    const [poolPercentages, setPoolPercentages] = useState({ kitchen: 0, transbank: 0 })
    const [directWaiterPercentage, setDirectWaiterPercentage] = useState<number | null>(null)
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
    const [restaurantContact, setRestaurantContact] = useState<{ email?: string; responsibleName?: string }>({})
    const [editingState, setEditingState] = useState<EditingClosureState | null>(null)
    const [isHydratingFromClosure, setIsHydratingFromClosure] = useState(false)

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
    const generalExpenses = useFieldArray({ control, name: "generalExpenses" })

    const asistenciaServicioValues = useWatch({ control, name: "asistenciaServicio" }) ?? []
    const asistenciaCocinaValues = useWatch({ control, name: "asistenciaCocina" }) ?? []
    const ventaDirectaValues = useWatch({ control, name: "ventaDirecta" }) ?? []
    const pocilloSecundarioValues = useWatch({ control, name: "pocilloSecundario" }) ?? []
    const generalExpenseEntries = useWatch({ control, name: "generalExpenses" }) ?? []

    const generalExpenseTotal = useMemo(() => {
        return generalExpenseEntries.reduce((sum, entry) => {
            const amount = Number(entry?.monto ?? 0)
            return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0)
        }, 0)
    }, [generalExpenseEntries])

    const presentDirectWaiterCount = useMemo(() => {
        return ventaDirectaValues.reduce((count, entry) => (entry?.presente === false ? count : count + 1), 0)
    }, [ventaDirectaValues])

    const generalExpenseSharePerDirectWaiter = useMemo(() => {
        if (settlementModeConfig !== "directa" || generalExpenseTotal <= 0 || presentDirectWaiterCount <= 0) {
            return 0
        }

        return generalExpenseTotal / presentDirectWaiterCount
    }, [settlementModeConfig, generalExpenseTotal, presentDirectWaiterCount])

    const buildInitialFormValues = useCallback(
        (serviceStaff: StoredStaffMember[], supportStaff: StoredStaffMember[], mode: "pool" | "directa") => ({
            asistenciaServicio: serviceStaff.map(mapStaffMemberToEntry),
            asistenciaCocina: supportStaff.map(mapStaffMemberToEntry),
            ventaDirecta: mode === "directa" ? serviceStaff.map(mapStaffMemberToDirectEntry) : [],
            pocilloSecundario: supportStaff.map(mapStaffMemberToEntry),
            generalExpenses: [],
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
                const current = Number(entry?.montoIndividual ?? 0)
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
    const netBeforeGeneralExpense = Math.max(totalPropinasGeneradas - deductionsAmount, 0)
    const kitchenShareBase = settlementModeConfig === "pool" ? netBeforeGeneralExpense * (poolPercentages.kitchen / 100) : 0
    const totalKitchenShare = Math.max(kitchenShareBase, 0)
    const serviceShareBeforeGeneralExpense = Math.max(netBeforeGeneralExpense - totalKitchenShare, 0)
    const totalGarzonShare = Math.max(serviceShareBeforeGeneralExpense - generalExpenseTotal, 0)
    const netAfterDeductions = Math.max(netBeforeGeneralExpense - generalExpenseTotal, 0)
    const transbankAmount = totalPropinasGeneradas * (effectiveTransbankPercentage / 100)

    const formattedKitchenShare = currencyFormatter.format(totalKitchenShare)
    const formattedGarzonShare = currencyFormatter.format(totalGarzonShare)
    const formattedTransbankAmount = currencyFormatter.format(transbankAmount)
    const formattedGeneralExpense = currencyFormatter.format(generalExpenseTotal)

    const summaryItems = useMemo<SummaryItem[]>(() => {
        const items: SummaryItem[] = [{ key: "propinas", label: "Propinas", value: formattedTotalPropinas }]

        if (settlementModeConfig === "directa") {
            items.push({ key: "directa", label: "Venta directa", value: formattedDirectSales })
        } else {
            items.push({ key: "cocina", label: "Propina cocina", value: formattedKitchenShare })
            items.push({ key: "garzones", label: "Propina garzones", value: formattedGarzonShare })
        }

        items.push({ key: "gastoGeneral", label: "Gasto general", value: formattedGeneralExpense })
        items.push({ key: "transbank", label: "Transbank", value: formattedTransbankAmount })
        items.push({ key: "dias", label: "Días sin liquidar", value: daysWithoutSettlement.toString() })

        return items
    }, [
        formattedDirectSales,
        formattedTotalPropinas,
        formattedKitchenShare,
        formattedGarzonShare,
        formattedGeneralExpense,
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

    const directAssignedAmounts = useMemo(() => {
        return ventaDirectaValues.map((entry) => {
            const baseAmount = Number(entry?.montoIndividual ?? 0)
            if (!Number.isFinite(baseAmount) || entry?.presente === false) {
                return 0
            }

            if (settlementModeConfig !== "directa" || generalExpenseSharePerDirectWaiter <= 0) {
                return baseAmount
            }

            const adjustedAmount = baseAmount - generalExpenseSharePerDirectWaiter
            return adjustedAmount > 0 ? adjustedAmount : 0
        })
    }, [ventaDirectaValues, settlementModeConfig, generalExpenseSharePerDirectWaiter])

    const handlePoolTotalChange = (event: ChangeEvent<HTMLInputElement>) => {
        setPoolTotalInput(event.target.value)
    }

    useEffect(() => {
        if (!restaurantId) {
            setLoadError("No se encontró un restaurante. Verifica tus permisos.")
            setIsLoadingConfig(false)
            reset(defaultCierreValues)
            return
        }

        const handleLoadConfiguration = async () => {
            try {
                setIsLoadingConfig(true)
                console.log("🔍 DEBUG - restaurantId usado:", restaurantId)
                const restaurantReference = doc(db, "restaurants", restaurantId)
                console.log("🔍 DEBUG - Ruta completa:", `restaurants/${restaurantId}`)
                const snapshot = await getDoc(restaurantReference)

                if (!snapshot.exists()) {
                    setLoadError(
                        "Aún no completas la configuración inicial. Configúrala para poder registrar cierres.",
                    )
                    reset(defaultCierreValues)
                    return
                }

                const data = snapshot.data() as RestaurantConfigurationSnapshot
                
                console.log("🔍 DEBUG - Documento completo de Firestore:", data)
                console.log("🔍 DEBUG - Claves del documento:", Object.keys(data))
                
                const serviceStaff = data.serviceStaff ?? []
                const supportStaff = data.supportStaff ?? []
                
                console.log("🔍 DEBUG - Datos cargados de Firestore:", {
                    serviceStaff,
                    supportStaff,
                    serviceStaffCount: serviceStaff.length,
                    supportStaffCount: supportStaff.length
                })
                
                const mode = data.settlementMode ?? "pool"
                const kitchenPercentage = sanitizePercentageValue(data.poolConfig?.kitchenPercentage)
                const transbankPercentage = sanitizePercentageValue(data.poolConfig?.transbankPercentage)
                const waiterPercentage = sanitizePercentageValue(data.directConfig?.directWaiterPercentage)
                const deductions = (data.additionalDeductions ?? []).map((item) => sanitizePercentageValue(item?.percentage))

                const initialValues = buildInitialFormValues(serviceStaff, supportStaff, mode)
                
                console.log("🔍 DEBUG - Valores iniciales del formulario:", {
                    asistenciaServicio: initialValues.asistenciaServicio,
                    asistenciaCocina: initialValues.asistenciaCocina,
                    serviceCount: initialValues.asistenciaServicio.length,
                    supportCount: initialValues.asistenciaCocina.length
                })

                setInitialStaffConfig({ serviceStaff, supportStaff, mode })
                reset(initialValues)

                setPoolPercentages({ kitchen: kitchenPercentage, transbank: transbankPercentage })
                setDirectWaiterPercentage(Number.isFinite(waiterPercentage) && waiterPercentage > 0 ? waiterPercentage : null)
                setAdditionalDeductionPercents(deductions)
                setSettlementModeConfig(mode)
                setRestaurantContact({
                    email: typeof data.contactEmail === "string" ? data.contactEmail : undefined,
                    responsibleName: typeof data.responsibleName === "string" ? data.responsibleName : undefined,
                })
                setLoadError(null)
            } catch (error) {
                console.error("Error al cargar la configuración del cierre", error)
                setLoadError("No pudimos obtener la configuración guardada. Intenta nuevamente en unos segundos.")
                setSettlementModeConfig(null)
                setPoolPercentages({ kitchen: 0, transbank: 0 })
                setAdditionalDeductionPercents([])
                reset(defaultCierreValues)
                setRestaurantContact({})
            } finally {
                setIsLoadingConfig(false)
            }
        }

        void handleLoadConfiguration()
    }, [reset, restaurantId])

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
        const submittedAt = new Date().toISOString()
        const submittedBy: SubmittedBySnapshot = {
            uid: userInfo?.uid ?? undefined,
            name: userInfo?.name ?? undefined,
            email: userInfo?.email ?? undefined,
        }

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
                const deductionName = sanitizeDeductionText(entry?.deduccion_nombre, 80)
                const deductionDescription = sanitizeDeductionText(entry?.deduccion_descripcion, 200)

                return {
                    staffId: entry.id,
                    nombre: entry.nombre,
                    role: entry.role,
                    email: entry.email,
                    present: entry.presente !== false,
                    assignedAmount,
                    penaltyPercentage,
                    penaltyAmount,
                    deductionAmount,
                    deductionName,
                    deductionDescription,
                    netAmount,
                }
            })

        const referenceDateIso = referenceDate?.toISOString() ?? null

        const buildPenaltyEntries = (assignmentsSnapshot: StaffAssignmentsSnapshot): PenaltyEntry[] => {
            const pools = [
                ...assignmentsSnapshot.servicio,
                ...assignmentsSnapshot.cocina,
                ...assignmentsSnapshot.ventaDirecta,
                ...assignmentsSnapshot.pocilloSecundario,
            ]

            return pools
                .filter((assignment) => assignment.present && assignment.penaltyAmount > 0)
                .map((assignment) => ({
                    staffId: assignment.staffId,
                    nombre: assignment.nombre,
                    role: assignment.role,
                    referenceDate: referenceDateIso,
                    percentage: assignment.penaltyPercentage,
                    amount: assignment.penaltyAmount,
                }))
        }

        const assignmentsSnapshot = {
            servicio: buildAssignmentSnapshot(asistenciaServicioValues, serviceAssignedAmounts),
            cocina: buildAssignmentSnapshot(asistenciaCocinaValues, supportAssignedAmounts),
            ventaDirecta: buildAssignmentSnapshot(ventaDirectaValues, directAssignedAmounts),
            pocilloSecundario: buildAssignmentSnapshot(pocilloSecundarioValues, supportAssignedAmounts),
        }

        const penalties = buildPenaltyEntries(assignmentsSnapshot)

        const configurationSnapshot: ConfigurationVersionSnapshot = {
            settlementMode: settlementModeConfig,
            poolPercentages: {
                kitchen: poolPercentages.kitchen,
                transbank: poolPercentages.transbank,
            },
            directConfig:
                settlementModeConfig === "directa" && Number.isFinite(directWaiterPercentage ?? NaN)
                    ? { directWaiterPercentage: directWaiterPercentage ?? 0 }
                    : undefined,
            additionalDeductions: additionalDeductionPercents,
            serviceStaff: (initialStaffConfig?.serviceStaff ?? []).map(mapStaffMemberForConfigurationSnapshot),
            supportStaff: (initialStaffConfig?.supportStaff ?? []).map(mapStaffMemberForConfigurationSnapshot),
            contact:
                restaurantContact && (restaurantContact.email || restaurantContact.responsibleName)
                    ? {
                          email: restaurantContact.email,
                          responsibleName: restaurantContact.responsibleName,
                      }
                    : undefined,
        }

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
                generalExpense: generalExpenseTotal,
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
            generalExpenses: sanitizeGeneralExpenseEntries(generalExpenseEntries),
            assignments: assignmentsSnapshot,
            metadata: {
                referenceDate: referenceDateIso,
                referenceDateKey: referenceDate ? format(referenceDate, "yyyy-MM-dd") : null,
                daysWithoutSettlement,
            },
            penalties,
            adjustments: [],
            dailySummary: {
                netAfterDeductions,
                propinas: totalPropinasGeneradas,
                transbankAmount,
                deductionsAmount,
                generalExpense: generalExpenseTotal,
            },
            restaurantContact,
            configurationSnapshot,
            submittedBy,
            submittedAt,
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
        generalExpenseEntries,
        generalExpenseTotal,
        settlementModeConfig,
        referenceDate,
        daysWithoutSettlement,
        serviceAssignedAmounts,
        supportAssignedAmounts,
        directAssignedAmounts,
        restaurantContact,
        poolPercentages.kitchen,
        poolPercentages.transbank,
        initialStaffConfig,
        userInfo?.uid,
        userInfo?.name,
        userInfo?.email,
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

    const loadClosureForEditing = useCallback(
        async ({ restaurantId, closureId }: { restaurantId: string; closureId: string }) => {
            if (!restaurantId || !closureId) {
                return
            }

            setIsHydratingFromClosure(true)

            try {
                const closureRef = doc(db, "restaurants", restaurantId, "registros_diarios", closureId)
                const snapshot = await getDoc(closureRef)

                if (!snapshot.exists()) {
                    setLoadError("No encontramos el cierre que intentas editar.")
                    setEditingState(null)
                    return
                }

                const data = snapshot.data() as Record<string, unknown>
                const staffSnapshotRecord =
                    (data["staffSnapshot"] as Record<string, unknown>) ??
                    ((data["snapshot"] as Record<string, unknown>)?.["staff"] as Record<string, unknown>) ??
                    (data["staff"] as Record<string, unknown>) ??
                    {}

                const generalExpensesRecord = data["generalExpenses"]
                const existingGeneralExpenses = sanitizeGeneralExpenseEntries(generalExpensesRecord)
                const fallbackGeneralExpenseTotal = toSafeNumber((data["totals"] as Record<string, unknown>)?.["generalExpense"], 0)

                const fallbackExpenseEntries: GeneralExpenseEntry[] =
                    fallbackGeneralExpenseTotal > 0
                        ? [
                              {
                                  entryId: generateExpenseId(),
                                  nombre: "Gasto general",
                                  tipo: "part-time",
                                  monto: fallbackGeneralExpenseTotal,
                              },
                          ]
                        : []

                const nextValues: CierreFormValues = {
                    asistenciaServicio: sanitizeStaffEntries(staffSnapshotRecord["asistenciaServicio"]),
                    asistenciaCocina: sanitizeStaffEntries(staffSnapshotRecord["asistenciaCocina"]),
                    ventaDirecta: sanitizeStaffEntries(staffSnapshotRecord["ventaDirecta"]),
                    pocilloSecundario: sanitizeStaffEntries(staffSnapshotRecord["pocilloSecundario"]),
                    generalExpenses:
                        existingGeneralExpenses.length > 0 ? existingGeneralExpenses : fallbackExpenseEntries,
                }

                reset(nextValues)

                const totalsRecord = (data["totals"] as Record<string, unknown>) ?? {}
                const poolAmount = totalsRecord["pool"]
                setPoolTotalInput(poolAmount === undefined ? "" : String(toSafeNumber(poolAmount)))

                const referenceDateValue = (data["metadata"] as Record<string, unknown>)?.["referenceDate"] as
                    | string
                    | null
                    | undefined
                const parsedReferenceDate = referenceDateValue ? new Date(referenceDateValue) : new Date()
                setPoolDate(parsedReferenceDate)
                setDirectDate(parsedReferenceDate)

                const configurationSnapshot = data["configurationSnapshot"] as ConfigurationVersionSnapshot | undefined
                if (configurationSnapshot?.poolPercentages) {
                    setPoolPercentages({
                        kitchen: toSafeNumber(configurationSnapshot.poolPercentages.kitchen),
                        transbank: toSafeNumber(configurationSnapshot.poolPercentages.transbank),
                    })
                }

                if (configurationSnapshot?.directConfig) {
                    const waiterPercentage = toSafeNumber(configurationSnapshot.directConfig.directWaiterPercentage)
                    setDirectWaiterPercentage(Number.isFinite(waiterPercentage) && waiterPercentage > 0 ? waiterPercentage : null)
                }

                if (!configurationSnapshot?.directConfig && data["configurationSnapshot"]) {
                    // Intenta extraer del snapshot anidado si existe
                    const nestedDirectPercentage = toSafeNumber(
                        (configurationSnapshot as ConfigurationVersionSnapshot | undefined)?.directConfig?.directWaiterPercentage,
                    )
                    setDirectWaiterPercentage(
                        Number.isFinite(nestedDirectPercentage) && nestedDirectPercentage > 0
                            ? nestedDirectPercentage
                            : directWaiterPercentage,
                    )
                }

                if (Array.isArray(configurationSnapshot?.additionalDeductions)) {
                    setAdditionalDeductionPercents(
                        configurationSnapshot.additionalDeductions.map((value) => toSafeNumber(value)),
                    )
                }

                if (configurationSnapshot?.contact || data["restaurantContact"]) {
                    setRestaurantContact(
                        configurationSnapshot?.contact ??
                            ((data["restaurantContact"] as { email?: string; responsibleName?: string }) ?? {}),
                    )
                }

                const editingMode =
                    (data["mode"] as "pool" | "directa" | null | undefined) ?? configurationSnapshot?.settlementMode ?? null
                setSettlementModeConfig(editingMode)

                if (editingMode === "directa" && configurationSnapshot?.directConfig) {
                    const waiterPercentage = toSafeNumber(configurationSnapshot.directConfig.directWaiterPercentage)
                    setDirectWaiterPercentage(Number.isFinite(waiterPercentage) && waiterPercentage > 0 ? waiterPercentage : null)
                }

                setIneligibleStaffNames([])
                setLoadError(null)

                const metadataRecord = (data["metadata"] as Record<string, unknown>) ?? {}
                setEditingState({
                    closureId,
                    referenceDate: (metadataRecord["referenceDate"] as string | null | undefined) ?? null,
                    referenceDateKey: (metadataRecord["referenceDateKey"] as string | null | undefined) ?? null,
                    mode: editingMode,
                    hasDeletedOriginal: false,
                })
            } catch (error) {
                console.error("Error al cargar el cierre para edición", error)
                setLoadError("No pudimos cargar el cierre para edición. Intenta nuevamente en unos segundos.")
                setEditingState(null)
            } finally {
                setIsHydratingFromClosure(false)
            }
        }, [
            reset,
            setLoadError,
            setPoolTotalInput,
            setPoolDate,
            setDirectDate,
            setPoolPercentages,
            setAdditionalDeductionPercents,
            setSettlementModeConfig,
            setRestaurantContact,
            setIneligibleStaffNames,
        ])

    const markEditingOriginalDeleted = useCallback(() => {
        setEditingState((previous) => (previous ? { ...previous, hasDeletedOriginal: true } : previous))
    }, [])

    const clearEditingState = useCallback(() => {
        setEditingState(null)
    }, [])

    useEffect(() => {
        if (!referenceDate) {
            setIneligibleStaffNames([])
            return
        }

        const referenceDay = startOfDay(referenceDate)
        const updatedIneligible = new Set<string>()

        const evaluateEntries = (entries: StaffEntry[], fieldName: StaffFieldName) => {
            entries.forEach((entry, index) => {
                const parsedEntryDate = entry.fechaIngreso ? startOfDay(new Date(entry.fechaIngreso)) : null
                const parsedInactiveDate = entry.inactiveSince ? startOfDay(new Date(entry.inactiveSince)) : null
                const explicitlyInactive = entry.isActive === false

                const startsAfterReference = parsedEntryDate && differenceInCalendarDays(referenceDay, parsedEntryDate) < 0
                const inactiveBeforeReference =
                    parsedInactiveDate && differenceInCalendarDays(referenceDay, parsedInactiveDate) >= 0

                if (startsAfterReference || inactiveBeforeReference || explicitlyInactive) {
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
            generalExpenses,
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
        formattedDirectSales,
        summaryItems,
        serviceAssignedAmounts,
        supportAssignedAmounts,
        directAssignedAmounts,
        generalExpenseEntries,
        generalExpenseTotal,
        isLoadingConfig,
        loadError,
        settlementModeConfig,
        directWaiterPercentage,
        isSavingClosure,
        setLoadError,
        buildClosureSnapshotPayload,
        effectiveTransbankPercentage,
        transbankAmount,
        totalDeductionsPercentage,
        netAfterDeductions,
        totalKitchenShare,
        totalGarzonShare,
        setIsSavingClosure,
        saveError,
        setSaveError,
        saveSuccessMessage,
        setSaveSuccessMessage,
        resetAfterSave,
        ineligibleStaffNames,
        editingState,
        isHydratingFromClosure,
        loadClosureForEditing,
        markEditingOriginalDeleted,
        clearEditingState,
    }
}
