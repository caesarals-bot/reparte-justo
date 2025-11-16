import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { db } from "@/firebase/config"
import type { StaffMember, RestaurantConfigurationDocument, SettlementMode } from "../setup/staffTypes.ts"
import {
    mapStaffMemberForStorage,
    mapStoredStaffMember,
    isValidEmail,
} from "../setup/staffUtils.ts"
import { useStaffEditors } from "../setup/hooks/useStaffEditors.ts"
import { StaffPermissionsCard } from "../setup/components/StaffPermissionsCard.tsx"
import { useStaffForms } from "../setup/hooks/useStaffForms.ts"
import { getStaffCategoryFromRole } from "../setup/components/StaffFormCard.tsx"

const baseInputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
const percentageInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
const MAX_STAFF_EDITORS = 1

type StaffCategory = "service" | "support"
type StaffPopoverId = `${StaffCategory}-${string}-inactive` | "staff-form-start" | "staff-form-inactive"

const StaffManagementPage = () => {
    const { uid, email } = useAuth()
    const navigate = useNavigate()
    const normalizedUserEmail = email ? email.toLowerCase() : null

    const [serviceStaff, setServiceStaff] = useState<StaffMember[]>([])
    const [supportStaff, setSupportStaff] = useState<StaffMember[]>([])
    const [activePopover, setActivePopover] = useState<StaffPopoverId | null>(null)
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("pool")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

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
    const {
        staffForm,
        formattedStartDate,
        formattedInactiveDate,
        formatInactiveDateLabel,
        handleStaffFormChange,
        resetStaffForm,
    } = useStaffForms()

    const isEmptyState = useMemo(
        () => serviceStaff.length === 0 && supportStaff.length === 0,
        [serviceStaff.length, supportStaff.length],
    )

    useEffect(() => {
        if (!uid) {
            setSaveError("No encontramos una sesión válida. Inicia sesión nuevamente.")
            setIsLoading(false)
            return
        }

        const fetchStaff = async () => {
            try {
                setIsLoading(true)
                const restaurantReference = doc(db, "restaurants", uid)
                const snapshot = await getDoc(restaurantReference)

                if (!snapshot.exists()) {
                    setSaveError("Aún no completas la configuración inicial. Configúrala antes de gestionar el personal.")
                    return
                }

                const data = snapshot.data() as RestaurantConfigurationDocument
                setServiceStaff(data.serviceStaff?.map(mapStoredStaffMember) ?? [])
                setSupportStaff(data.supportStaff?.map(mapStoredStaffMember) ?? [])
                setStaffEditors(data.staffEditors ?? [])
                if (data.settlementMode) {
                    setSettlementMode(data.settlementMode)
                }
                setSaveError(null)
            } catch (error) {
                console.error("Error al cargar el personal", error)
                setSaveError("No pudimos cargar el personal. Intenta nuevamente en unos segundos.")
            } finally {
                setIsLoading(false)
            }
        }

        void fetchStaff()
    }, [uid, setStaffEditors])

    const updateMember = (
        category: StaffCategory,
        memberId: string,
        updater: (member: StaffMember) => StaffMember,
    ) => {
        const setter = category === "service" ? setServiceStaff : setSupportStaff
        setter((previousMembers) => previousMembers.map((member) => (member.id === memberId ? updater(member) : member)))
    }

    const handleEmailChange = (category: StaffCategory, memberId: string, value: string) => {
        updateMember(category, memberId, (member) => ({ ...member, email: value }))
    }

    const handleActiveToggle = (category: StaffCategory, memberId: string, isActive: boolean) => {
        updateMember(category, memberId, (member) => ({
            ...member,
            isActive,
            inactiveSince: isActive ? undefined : member.inactiveSince ?? new Date(),
        }))
    }

    const handleInactiveDateChange = (category: StaffCategory, memberId: string, date?: Date) => {
        updateMember(category, memberId, (member) => ({
            ...member,
            inactiveSince: date ?? undefined,
        }))
    }

    const handleRemoveMember = (category: StaffCategory, memberId: string) => {
        if (staffInputsDisabled) {
            return
        }

        const setter = category === "service" ? setServiceStaff : setSupportStaff
        setter((previousMembers) => previousMembers.filter((member) => member.id !== memberId))
    }

    const handleAddStaffMember = () => {
        if (staffInputsDisabled) {
            return
        }

        const { name, weight, email: memberEmail, role, isActive, inactiveSince, startDate } = staffForm

        if (!name.trim()) {
            setFormError("Ingresa el nombre del integrante")
            return
        }

        const sanitizedEmail = memberEmail.trim()

        if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
            setFormError("El correo ingresado no parece válido")
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
            setServiceStaff((previous) => [...previous, newMember])
        } else {
            setSupportStaff((previous) => [...previous, newMember])
        }

        resetStaffForm(role)
        setFormError(null)
    }

    const handleSaveChanges = async () => {
        if (!uid) {
            setSaveError("No se pudo identificar al restaurante")
            return
        }

        setIsSaving(true)
        setSaveError(null)
        setSaveSuccess(null)

        try {
            const restaurantReference = doc(db, "restaurants", uid)
            await setDoc(
                restaurantReference,
                {
                    serviceStaff: serviceStaff.map(mapStaffMemberForStorage),
                    supportStaff: supportStaff.map(mapStaffMemberForStorage),
                    staffEditors,
                    updatedAt: serverTimestamp(),
                },
                { merge: true },
            )

            setSaveSuccess("Personal actualizado correctamente.")
        } catch (error) {
            console.error("Error al actualizar el personal", error)
            setSaveError("No pudimos guardar los cambios. Intenta otra vez en unos segundos.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleBackToDashboard = () => {
        navigate("/dashboard")
    }

    const renderStaffCard = (category: StaffCategory, members: StaffMember[]) => (
        <Card className="border bg-background/95 shadow-sm">
            <CardHeader>
                <CardTitle>{category === "service" ? "Staff de Servicio" : "Staff de Cocina / Apoyo"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {category === "service"
                            ? "Aún no has añadido integrantes de servicio."
                            : "Aún no has añadido integrantes de cocina o apoyo."}
                    </p>
                ) : (
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full min-w-full divide-y divide-border text-left text-sm">
                            <thead className="bg-muted/40">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Nombre</th>
                                    <th className="px-4 py-3 font-semibold">Correo</th>
                                    <th className="px-4 py-3 font-semibold">Estado</th>
                                    <th className="px-4 py-3 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {members.map((member) => {
                                    const inactivePopoverId: StaffPopoverId = `${category}-${member.id}-inactive`
                                    return (
                                        <tr key={member.id}>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{member.name}</span>
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {member.role.replace("_", " ")}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Label htmlFor={`email-${member.id}`} className="sr-only">
                                                    Correo
                                                </Label>
                                                <input
                                                    id={`email-${member.id}`}
                                                    type="email"
                                                    value={member.email}
                                                    onChange={(event) =>
                                                        handleEmailChange(category, member.id, event.target.value)
                                                    }
                                                    className={baseInputClass}
                                                    placeholder="correo@ejemplo.com"
                                                    disabled={staffInputsDisabled}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            checked={member.isActive}
                                                            onCheckedChange={(checked) =>
                                                                handleActiveToggle(category, member.id, checked)
                                                            }
                                                            disabled={staffInputsDisabled}
                                                            aria-label={`Cambiar estado de ${member.name}`}
                                                        />
                                                        <span className="text-xs font-medium uppercase tracking-wide">
                                                            {member.isActive ? "Activo" : "Inactivo"}
                                                        </span>
                                                    </div>
                                                    {!member.isActive ? (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-medium text-muted-foreground">
                                                                Fecha de baja
                                                            </Label>
                                                            <Popover
                                                                open={activePopover === inactivePopoverId}
                                                                onOpenChange={(open) =>
                                                                    setActivePopover(open ? inactivePopoverId : null)
                                                                }
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        className="flex w-full items-center justify-start gap-2 px-3"
                                                                        disabled={staffInputsDisabled}
                                                                    >
                                                                        <CalendarIcon className="h-4 w-4" />
                                                                        <span>
                                                                            {member.inactiveSince
                                                                                ? format(member.inactiveSince, "PPP", { locale: es })
                                                                                : "Seleccionar fecha"}
                                                                        </span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="p-2" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={member.inactiveSince}
                                                                        onSelect={(date) =>
                                                                            handleInactiveDateChange(category, member.id, date)
                                                                        }
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                            <p className="text-xs text-muted-foreground">
                                                                {`Mostrará: ${formatInactiveDateLabel(member.inactiveSince)}`}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground">
                                                        Desde: {member.startDate ? format(member.startDate, "dd/MM/yy", { locale: es }) : "—"}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveMember(category, member.id)}
                                                        aria-label={`Eliminar ${member.name}`}
                                                        disabled={staffInputsDisabled}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando personal…
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-linear-to-b from-background to-muted/30 px-4 py-10">
            <section className="mx-auto w-full max-w-5xl space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Gestión de personal
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight">Editar integrantes</h1>
                        <p className="text-sm text-muted-foreground">
                            Actualiza correos, estados e inactivaciones sin alterar la configuración inicial.
                        </p>
                    </div>
                    <Button variant="ghost" className="gap-2" onClick={handleBackToDashboard}>
                        <ArrowLeft className="h-4 w-4" />
                        Volver al dashboard
                    </Button>
                </div>

                {!canManageStaffEditors ? (
                    <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden />
                        <div>
                            <p className="font-semibold">Sin permisos de edición</p>
                            <p className="text-destructive/90">
                                Solo el encargado y la persona autorizada pueden editar este listado. Pide acceso o solicita que
                                actualicen los datos por ti.
                            </p>
                        </div>
                    </div>
                ) : null}

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

                <Card className="border bg-background/95 shadow-sm">
                    <CardHeader>
                        <CardTitle>Añadir integrante</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="staff-name">Nombre</Label>
                                <input
                                    id="staff-name"
                                    type="text"
                                    value={staffForm.name}
                                    onChange={handleStaffFormChange("name")}
                                    className={baseInputClass}
                                    disabled={staffInputsDisabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="staff-email">Correo electrónico</Label>
                                <input
                                    id="staff-email"
                                    type="email"
                                    value={staffForm.email}
                                    onChange={handleStaffFormChange("email")}
                                    className={baseInputClass}
                                    placeholder="correo@ejemplo.com"
                                    disabled={staffInputsDisabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="staff-weight">
                                    {settlementMode === "pool"
                                        ? "Ponderación (ej. 1.0, 0.75, 0.5)"
                                        : "Porcentaje de venta (%)"}
                                </Label>
                                <input
                                    id="staff-weight"
                                    type="number"
                                    step="0.25"
                                    value={staffForm.weight}
                                    onChange={handleStaffFormChange("weight")}
                                    className={percentageInputClassName}
                                    min={settlementMode === "pool" ? 0 : 0}
                                    max={settlementMode === "pool" ? 5 : 100}
                                    disabled={staffInputsDisabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="staff-role">Rol</Label>
                                <select
                                    id="staff-role"
                                    value={staffForm.role}
                                    onChange={handleStaffFormChange("role") as unknown as React.ChangeEventHandler<HTMLSelectElement>}
                                    className={baseInputClass}
                                    disabled={staffInputsDisabled}
                                >
                                    <option value="garzon">Garzón</option>
                                    <option value="ayudante_garzon">Ayudante de Garzón</option>
                                    <option value="cocinero">Cocinero</option>
                                    <option value="ayudante_cocina">Ayudante de Cocina</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Fecha de ingreso</Label>
                                <Popover
                                    open={activePopover === "staff-form-start"}
                                    onOpenChange={(open) => setActivePopover(open ? ("staff-form-start" as StaffPopoverId) : null)}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="flex w-full items-center justify-start gap-2 px-3"
                                            disabled={staffInputsDisabled}
                                        >
                                            <CalendarIcon className="h-4 w-4" />
                                            <span>{formattedStartDate}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-2" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={staffForm.startDate}
                                            onSelect={handleStaffFormChange("startDate") as (value: Date | undefined) => void}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Estado</Label>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={staffForm.isActive}
                                        onCheckedChange={(checked) => handleStaffFormChange("isActive")(checked)}
                                        disabled={staffInputsDisabled}
                                    />
                                    <span className="text-sm font-medium">
                                        {staffForm.isActive ? "Activo" : "Inactivo"}
                                    </span>
                                </div>
                                {!staffForm.isActive ? (
                                    <div className="space-y-2">
                                        <Label>Fecha de baja</Label>
                                        <Popover
                                            open={activePopover === "staff-form-inactive"}
                                            onOpenChange={(open) =>
                                                setActivePopover(open ? ("staff-form-inactive" as StaffPopoverId) : null)
                                            }
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="flex w-full items-center justify-start gap-2 px-3"
                                                    disabled={staffInputsDisabled}
                                                >
                                                    <CalendarIcon className="h-4 w-4" />
                                                    <span>{formattedInactiveDate}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-2" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={staffForm.inactiveSince}
                                                    onSelect={handleStaffFormChange("inactiveSince") as (value: Date | undefined) => void}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        {formError ? (
                            <p className="text-sm text-destructive">{formError}</p>
                        ) : null}
                        <div className="flex justify-end">
                            <Button onClick={handleAddStaffMember} disabled={staffInputsDisabled}>
                                Añadir integrante
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {isEmptyState ? (
                    <Card className="border bg-background/95 shadow-sm">
                        <CardContent className="space-y-4 py-8 text-center text-sm text-muted-foreground">
                            <p>No hay integrantes para editar todavía.</p>
                            <Button variant="secondary" onClick={() => navigate("/setup")}>Ir a configuración inicial</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {renderStaffCard("service", serviceStaff)}
                        {renderStaffCard("support", supportStaff)}
                    </div>
                )}

                {saveError ? (
                    <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden />
                        <div>
                            <p className="font-semibold">No se pudo guardar</p>
                            <p>{saveError}</p>
                        </div>
                    </div>
                ) : null}

                {saveSuccess ? (
                    <div className="flex items-start gap-3 rounded-md border border-emerald-200/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden />
                        <div>
                            <p className="font-semibold">Cambios guardados</p>
                            <p>{saveSuccess}</p>
                        </div>
                    </div>
                ) : null}

                <div className="flex justify-center">
                    <Button
                        size="lg"
                        className="w-full max-w-md py-6 text-base"
                        onClick={handleSaveChanges}
                        disabled={isSaving || staffInputsDisabled}
                        aria-busy={isSaving}
                    >
                        {isSaving ? "Guardando cambios..." : "Guardar cambios"}
                    </Button>
                </div>
            </section>
        </main>
    )
}

export default StaffManagementPage
