import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
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
import { Plus, Trash2 } from "lucide-react"
import { useNavigate } from "react-router"
import { deleteField, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/firebase/config"

import type {
    SettlementMode,
    PoolConfig,
    DirectConfig,
    AdditionalDeduction,
    StaffMember,
    RestaurantFormValues,
    RestaurantConfigurationDocument,
} from "./staffTypes.ts"
import {
    defaultAdditionalDeductionForm,
    defaultDirectConfig,
    defaultPoolConfig,
    defaultRestaurantForm,
    isValidEmail,
    mapAdditionalDeductionForStorage,
    mapStaffMemberForStorage,
    mapStoredAdditionalDeduction,
    mapStoredStaffMember,
    parseNumberInput,
} from "./staffUtils.ts"
import { useStaffForms } from "./hooks/useStaffForms.ts"
import { useStaffEditors } from "./hooks/useStaffEditors.ts"
import { StaffPermissionsCard } from "./components/StaffPermissionsCard.tsx"
import { StaffFormCard, type StaffPopoverId, getStaffCategoryFromRole } from "./components/StaffFormCard.tsx"

const percentageInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
const baseInputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
const MAX_STAFF_EDITORS = 1

const InitialSetupPage = () => {
    const { displayName, email, uid } = useAuth()
    const navigate = useNavigate()
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("pool")
    const [poolConfig, setPoolConfig] = useState<PoolConfig>(defaultPoolConfig)
    const [additionalDeductions, setAdditionalDeductions] = useState<AdditionalDeduction[]>([])
    const [additionalDeductionForm, setAdditionalDeductionForm] = useState(defaultAdditionalDeductionForm)
    const [directConfig, setDirectConfig] = useState<DirectConfig>(defaultDirectConfig)
    const [serviceStaff, setServiceStaff] = useState<StaffMember[]>([])
    const [supportStaff, setSupportStaff] = useState<StaffMember[]>([])
    const [activePopover, setActivePopover] = useState<StaffPopoverId>(null)
    const [responsibleName, setResponsibleName] = useState(() => displayName ?? email ?? "")
    const [restaurantForm, setRestaurantForm] = useState<RestaurantFormValues>(defaultRestaurantForm)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [hasExistingConfig, setHasExistingConfig] = useState(false)
    const {
        staffForm,
        formattedStartDate,
        formattedInactiveDate,
        formatInactiveDateLabel,
        handleStaffFormChange,
        resetStaffForm,
    } = useStaffForms()
    const normalizedUserEmail = email ? email.toLowerCase() : null
    const {
        staffEditors,
        setStaffEditors,
        newStaffEditor,
        staffEditorError,
        canManageStaffEditors,
        staffInputsDisabled,
        reachedStaffEditorsLimit,
        handleNewStaffEditorChange,
        handleAddStaffEditor,
        handleRemoveStaffEditor,
    } = useStaffEditors({ normalizedUserEmail, maxEditors: MAX_STAFF_EDITORS })

    useEffect(() => {
        const authName = displayName ?? email ?? ""

        if (!responsibleName && authName) {
            setResponsibleName(authName)
        }
    }, [displayName, email, responsibleName])

    const handleResponsibleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setResponsibleName(event.target.value)
    }

    const handleRestaurantNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target
        setRestaurantForm((previousState) => ({
            ...previousState,
            restaurantName: value,
        }))
    }

    const handleSettlementModeChange = (value: SettlementMode) => {
        setSettlementMode(value)
    }

    const handlePoolConfigChange = (field: keyof PoolConfig) => (event: ChangeEvent<HTMLInputElement>) => {
        setPoolConfig((previousState) => ({
            ...previousState,
            [field]: event.target.value,
        }))
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

    const handleAddStaffMember = () => {
        if (staffInputsDisabled) {
            return
        }

        const { name, weight, email: memberEmail, role, isActive, inactiveSince, startDate } = staffForm

        if (!name.trim()) {
            return
        }

        const sanitizedEmail = memberEmail.trim()

        if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
            setSaveError("El correo ingresado no parece válido. Corrígelo para continuar.")
            return
        }

        const category = getStaffCategoryFromRole(role)

        const newMember: StaffMember = {
            id: crypto.randomUUID(),
            name: name.trim(),
            weight: weight.trim(),
            email: sanitizedEmail,
            role,
            startDate,
            isActive,
            inactiveSince: isActive ? undefined : inactiveSince ?? new Date(),
        }

        if (category === "service") {
            setServiceStaff((previousState) => [...previousState, newMember])
            resetStaffForm(role)
            return
        }

        setSupportStaff((previousState) => [...previousState, newMember])
        resetStaffForm(role)
    }

    const handleRemoveMember = (category: "service" | "support", memberId: string) => {
        if (staffInputsDisabled) {
            return
        }

        if (category === "service") {
            setServiceStaff((previousState) => previousState.filter((member) => member.id !== memberId))
            return
        }

        setSupportStaff((previousState) => previousState.filter((member) => member.id !== memberId))
    }

    useEffect(() => {
        if (!uid) {
            return
        }

        const handleFetchConfiguration = async () => {
            try {
                const restaurantReference = doc(db, "restaurants", uid)
                const snapshot = await getDoc(restaurantReference)

                if (!snapshot.exists()) {
                    setHasExistingConfig(false)
                    return
                }

                const data = snapshot.data() as RestaurantConfigurationDocument

                setHasExistingConfig(true)
                setRestaurantForm({
                    restaurantName: data.restaurantName ?? "",
                })

                if (data.responsibleName) {
                    setResponsibleName(data.responsibleName)
                }

                if (data.settlementMode) {
                    setSettlementMode(data.settlementMode)
                }

                if (data.poolConfig) {
                    setPoolConfig({
                        kitchenPercentage:
                            data.poolConfig.kitchenPercentage?.toString() ?? defaultPoolConfig.kitchenPercentage,
                        transbankPercentage:
                            data.poolConfig.transbankPercentage?.toString() ?? defaultPoolConfig.transbankPercentage,
                    })
                }

                if (data.directConfig) {
                    setDirectConfig({
                        directWaiterPercentage:
                            data.directConfig.directWaiterPercentage?.toString() ??
                            defaultDirectConfig.directWaiterPercentage,
                    })
                }

                setAdditionalDeductions(
                    data.additionalDeductions?.map(mapStoredAdditionalDeduction) ?? [],
                )
                setServiceStaff(data.serviceStaff?.map(mapStoredStaffMember) ?? [])
                setSupportStaff(data.supportStaff?.map(mapStoredStaffMember) ?? [])
                setStaffEditors(data.staffEditors ?? [])
                setSaveError(null)
            } catch (error) {
                console.error("Error al cargar la configuración del restaurante", error)
                setSaveError(
                    "No pudimos cargar la configuración guardada. Revisa tu conexión e inténtalo nuevamente.",
                )
            }
        }

        void handleFetchConfiguration()
    }, [uid])

    const handleSaveConfiguration = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!uid) {
            setSaveError("No se pudo identificar al usuario autenticado.")
            return
        }

        const trimmedRestaurantName = restaurantForm.restaurantName.trim()

        if (!trimmedRestaurantName) {
            setSaveError("Ingresa el nombre del restaurante para continuar.")
            return
        }

        if (settlementMode === "directa" && !serviceStaff.length) {
            setSaveError(
                "Añade al menos un integrante del staff de servicio para el modo de venta directa.",
            )
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            const restaurantReference = doc(db, "restaurants", uid)
            const timestamp = serverTimestamp()
            const payload: Record<string, unknown> = {
                restaurantName: trimmedRestaurantName,
                responsibleName: responsibleName.trim() || null,
                settlementMode,
                additionalDeductions: additionalDeductions.map(mapAdditionalDeductionForStorage),
                serviceStaff: serviceStaff.map(mapStaffMemberForStorage),
                supportStaff: supportStaff.map(mapStaffMemberForStorage),
                updatedAt: timestamp,
                staffEditors,
            }

            if (!hasExistingConfig) {
                payload.createdAt = timestamp
            }

            if (settlementMode === "pool") {
                payload.poolConfig = {
                    kitchenPercentage: parseNumberInput(poolConfig.kitchenPercentage),
                    transbankPercentage: parseNumberInput(poolConfig.transbankPercentage),
                }
                payload.directConfig = deleteField()
            } else {
                payload.directConfig = {
                    directWaiterPercentage: parseNumberInput(directConfig.directWaiterPercentage),
                }
                payload.poolConfig = deleteField()
            }

            await setDoc(restaurantReference, payload, { merge: true })

            setHasExistingConfig(true)
            navigate("/cierre")
        } catch (error) {
            console.error("Error al guardar la configuración del restaurante", error)
            setSaveError("No pudimos guardar la configuración. Intenta nuevamente en unos segundos.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
            <section className="w-full max-w-5xl">
                <form className="space-y-8" onSubmit={handleSaveConfiguration}>
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
                                        value={restaurantForm.restaurantName}
                                        onChange={handleRestaurantNameChange}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                        tabIndex={0}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="restaurant-manager">Encargado de la liquidación</Label>
                                    <input
                                        id="restaurant-manager"
                                        name="restaurant-manager"
                                        type="text"
                                        value={responsibleName}
                                        onChange={handleResponsibleChange}
                                        placeholder="Nombre del encargado"
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                        tabIndex={0}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Por defecto usamos el usuario autenticado, pero puedes indicar a otra persona responsable del cierre.
                                    </p>
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
                                            <StaffPermissionsCard
                            staffEditors={staffEditors}
                            maxStaffEditors={MAX_STAFF_EDITORS}
                            canManageStaffEditors={canManageStaffEditors}
                            newStaffEditor={newStaffEditor}
                            staffEditorError={staffEditorError}
                            reachedStaffEditorsLimit={reachedStaffEditorsLimit}
                            onNewEditorChange={handleNewStaffEditorChange}
                            onAddEditor={handleAddStaffEditor}
                            onRemoveEditor={handleRemoveStaffEditor}
                        />
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="personal" className="mt-6">
                        <StaffFormCard
                            settlementMode={settlementMode}
                            formValues={staffForm}
                            formattedStartDate={formattedStartDate}
                            formattedInactiveDate={formattedInactiveDate}
                            activePopover={activePopover}
                            onActivePopoverChange={setActivePopover}
                            onFieldChange={handleStaffFormChange}
                            onAddMember={handleAddStaffMember}
                            serviceStaff={serviceStaff}
                            supportStaff={supportStaff}
                            onRemoveMember={handleRemoveMember}
                            staffInputsDisabled={staffInputsDisabled}
                            baseInputClassName={baseInputClass}
                            formatInactiveDateLabel={formatInactiveDateLabel}
                        />
                    </TabsContent>
                </Tabs>

                    {saveError ? (
                        <div
                            role="alert"
                            className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                        >
                            {saveError}
                        </div>
                    ) : null}

                    <CardFooter className="flex justify-center">
                        <Button
                            size="lg"
                            className="w-full max-w-md py-6 text-base"
                            type="submit"
                            disabled={isSaving}
                            aria-busy={isSaving}
                        >
                            {isSaving ? "Guardando configuración..." : "Guardar configuración y continuar"}
                        </Button>
                    </CardFooter>
                </form>
            </section>
        </main>
    )
}

export default InitialSetupPage
