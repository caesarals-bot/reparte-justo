import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
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
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[rgba(5,8,21,0.85)]"
const baseInputClass =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[rgba(5,8,21,0.85)]"
const MAX_STAFF_EDITORS = 1

const InitialSetupPage = () => {
    const { displayName, email, uid, refreshUserRoles } = useAuth()
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
    const [restaurantNameExists, setRestaurantNameExists] = useState(false)
    const [activeTab, setActiveTab] = useState<"restaurante" | "personal">("restaurante")
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
        setNewStaffEditorValue,
        handleAddStaffEditor,
        handleRemoveStaffEditor,
    } = useStaffEditors({ normalizedUserEmail, maxEditors: MAX_STAFF_EDITORS })

    const availableStaffForPermissions = useMemo(
        () =>
            serviceStaff.map((member) => ({
                id: member.id,
                name: member.name,
                email: member.email,
            })),
        [serviceStaff],
    )

    const hasServiceStaff = serviceStaff.length > 0
    const canContinueToStaff = restaurantNameExists || Boolean(restaurantForm.restaurantName.trim())

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

    const handleContinueToStaffSection = () => {
        if (!canContinueToStaff) {
            return
        }

        setSaveError(null)
        setActiveTab("personal")
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
                // Primero consultar el documento del usuario para obtener primaryRestaurant
                const userDocRef = doc(db, "users", uid)
                const userSnapshot = await getDoc(userDocRef)
                
                let restaurantId = uid // Fallback: usar uid como antes
                let restaurantNameFromRegistration = ""
                
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.data()
                    if (userData.primaryRestaurant) {
                        restaurantId = userData.primaryRestaurant
                        
                        // Consultar el restaurante para obtener el nombre
                        const restaurantDocRef = doc(db, "restaurants", restaurantId)
                        const restaurantSnapshot = await getDoc(restaurantDocRef)
                        
                        if (restaurantSnapshot.exists()) {
                            const restaurantData = restaurantSnapshot.data()
                            if (restaurantData.name) {
                                restaurantNameFromRegistration = restaurantData.name
                                setRestaurantNameExists(true)
                            }
                        }
                    }
                }
                
                // Ahora consultar la configuración en /restaurants/{restaurantId}
                const restaurantReference = doc(db, "restaurants", restaurantId)
                const snapshot = await getDoc(restaurantReference)

                if (!snapshot.exists()) {
                    setHasExistingConfig(false)
                    // Si tenemos nombre del registro, usarlo
                    if (restaurantNameFromRegistration) {
                        setRestaurantForm({ restaurantName: restaurantNameFromRegistration })
                    }
                    return
                }

                const data = snapshot.data() as RestaurantConfigurationDocument

                setHasExistingConfig(true)
                setRestaurantForm({
                    restaurantName: restaurantNameFromRegistration || data.restaurantName || "",
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

        // Solo validar nombre si no existe previamente
        if (!restaurantNameExists && !trimmedRestaurantName) {
            setSaveError("Ingresa el nombre del restaurante para continuar.")
            return
        }

        if (!hasServiceStaff) {
            setSaveError("Añade al menos un integrante del staff de servicio antes de guardar la configuración.")
            setActiveTab("personal")
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            const restaurantReference = doc(db, "restaurants", uid)
            const timestamp = serverTimestamp()
            const payload: Record<string, unknown> = {
                responsibleName: responsibleName.trim() || null,
                settlementMode,
                additionalDeductions: additionalDeductions.map(mapAdditionalDeductionForStorage),
                serviceStaff: serviceStaff.map(mapStaffMemberForStorage),
                supportStaff: supportStaff.map(mapStaffMemberForStorage),
                updatedAt: timestamp,
                staffEditors,
                setupCompleted: true, // Marcar setup como completado
            }
            
            // Solo actualizar restaurantName si no existe previamente (no se registró en el signup)
            if (!restaurantNameExists && trimmedRestaurantName) {
                payload.restaurantName = trimmedRestaurantName
            }

            if (!hasExistingConfig) {
                payload.createdAt = timestamp
                payload.ownerId = uid // Requerido por las reglas de Firestore
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

            // Si es un nuevo restaurante, actualizar los roles del usuario
            if (!hasExistingConfig) {
                const userReference = doc(db, "users", uid)
                await setDoc(userReference, {
                    restaurantRoles: { [uid]: ["closure_editor"] },
                    primaryRestaurant: uid,
                    updatedAt: timestamp,
                }, { merge: true })
                
                // Refrescar roles en el contexto para que la app reconozca los nuevos permisos
                await refreshUserRoles()
            }

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
        <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-14 text-white">
            <section className="w-full max-w-5xl">
                <form className="space-y-10" onSubmit={handleSaveConfiguration}>
                    <header className="rounded-3xl border border-white/10 bg-[rgba(8,11,25,0.85)] p-8 text-center shadow-[0_30px_65px_rgba(3,6,23,0.55)] backdrop-blur-xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/60">Primeros pasos</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Configuración Inicial</h1>
                        <p className="mt-3 text-sm text-white/70 sm:text-base">
                            Completa estos datos para alinear ReparteJusto con tu operación y comenzar a distribuir propinas con claridad.
                        </p>
                    </header>

                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as "restaurante" | "personal")}
                        className="w-full"
                    >
                        <TabsList className="flex w-full overflow-hidden rounded-full border border-white/20 bg-transparent p-0.5 text-white shadow-[0_12px_30px_rgba(2,4,15,0.65)]">
                            <TabsTrigger
                                value="restaurante"
                                className="flex-1 rounded-full px-6 py-3 text-sm font-semibold text-white/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 data-[state=active]:bg-linear-to-r data-[state=active]:from-white/65 data-[state=active]:to-white/25 data-[state=active]:text-[#0b0f1d] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] data-[state=inactive]:hover:text-white"
                            >
                                Restaurante
                            </TabsTrigger>
                            <TabsTrigger
                                value="personal"
                                className="flex-1 rounded-full px-6 py-3 text-sm font-semibold text-white/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 data-[state=active]:bg-linear-to-r data-[state=active]:from-white/65 data-[state=active]:to-white/25 data-[state=active]:text-[#0b0f1d] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] data-[state=inactive]:hover:text-white"
                            >
                                Personal
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="restaurante" className="mt-6">
                            <Card className="border border-white/10 bg-[rgba(9,12,24,0.9)] text-white shadow-[0_30px_65px_rgba(3,6,23,0.45)] backdrop-blur-xl">
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
                                            className={baseInputClass}
                                            tabIndex={0}
                                            disabled={restaurantNameExists}
                                        />
                                        {restaurantNameExists && (
                                            <p className="text-xs text-green-400/80">
                                                ✓ Nombre ya registrado durante la creación de tu cuenta
                                            </p>
                                        )}
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
                                            className={baseInputClass}
                                            tabIndex={0}
                                        />
                                        <p className="text-xs text-white/60">
                                            Por defecto usamos el usuario autenticado, pero puedes indicar a otra persona responsable del cierre.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Modo de Liquidación</Label>
                                        <RadioGroup
                                            value={settlementMode}
                                            onValueChange={handleSettlementModeChange}
                                            className="grid gap-4 sm:grid-cols-2"
                                        >
                                            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80 shadow-inner shadow-black/20">
                                                <RadioGroupItem id="modo-pool" value="pool" />
                                                <Label htmlFor="modo-pool" className="flex-1">
                                                    Pocillo / Pozo Común
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80 shadow-inner shadow-black/20">
                                                <RadioGroupItem id="modo-directa" value="directa" />
                                                <Label htmlFor="modo-directa" className="flex-1">
                                                    Venta Directa del Garzón
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {settlementMode === "pool" ? (
                                        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/30">
                                            <h4 className="text-lg font-semibold text-white">Configuración del Pocillo</h4>
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
                                                            className={baseInputClass}
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
                                                        variant="ghost"
                                                        className="h-11 w-full rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/15 sm:w-auto"
                                                        onClick={handleAddAdditionalDeduction}
                                                        aria-label="Añadir descuento"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    {additionalDeductions.length === 0 ? (
                                                        <p className="text-sm text-white/60">
                                                            Agrega descuentos adicionales que quieras considerar en el reparto.
                                                        </p>
                                                    ) : (
                                                        <ul className="space-y-2">
                                                            {additionalDeductions.map((deduction) => (
                                                                <li
                                                                    key={deduction.id}
                                                                    className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{deduction.name}</span>
                                                                        <span className="text-white/60">{deduction.percentage}%</span>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="rounded-full text-white hover:bg-white/10"
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
                                                <div className="flex flex-col gap-3 pt-2">
                                                    <Button
                                                        type="button"
                                                        onClick={handleContinueToStaffSection}
                                                        disabled={!canContinueToStaff}
                                                        className="w-full rounded-full border border-white/25 bg-white/10 py-3 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/40"
                                                    >
                                                        Continuar para añadir garzones
                                                    </Button>
                                                    {!canContinueToStaff ? (
                                                        <p className="text-center text-xs text-white/60">
                                                            Ingresa el nombre del restaurante para poder continuar.
                                                        </p>
                                                    ) : (
                                                        <p className="text-center text-xs text-white/60">
                                                            Revisa los datos y continúa para registrar a tu staff antes de guardar.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="personal" className="mt-6 space-y-6">
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
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
                                <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                                    <StaffPermissionsCard
                                        staffEditors={staffEditors}
                                        maxStaffEditors={MAX_STAFF_EDITORS}
                                        canManageStaffEditors={canManageStaffEditors}
                                        newStaffEditor={newStaffEditor}
                                        staffEditorError={staffEditorError}
                                        reachedStaffEditorsLimit={reachedStaffEditorsLimit}
                                        availableStaff={availableStaffForPermissions}
                                        onSelectStaff={setNewStaffEditorValue}
                                        onAddEditor={handleAddStaffEditor}
                                        onRemoveEditor={handleRemoveStaffEditor}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {saveError ? (
                        <div
                            role="alert"
                            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[0_15px_35px_rgba(82,8,23,0.35)]"
                        >
                            {saveError}
                        </div>
                    ) : null}

                    <CardFooter className="flex flex-col items-center gap-3 border-none bg-transparent p-0">
                        <Button
                            size="lg"
                            className="w-full max-w-md gap-2 rounded-full bg-linear-to-r from-primary to-accent py-6 text-base text-primary-foreground shadow-[0_20px_45px_rgba(26,31,77,0.55)] transition hover:opacity-90"
                            type="submit"
                            disabled={isSaving || !hasServiceStaff}
                            aria-busy={isSaving}
                        >
                            {isSaving ? "Guardando configuración..." : "Guardar configuración y continuar"}
                        </Button>
                        {!hasServiceStaff ? (
                            <p className="text-center text-sm text-white/60">
                                Añade al menos un garzón antes de guardar la configuración.
                            </p>
                        ) : null}
                    </CardFooter>
                </form>
            </section>
        </main>
    )
}

export default InitialSetupPage
