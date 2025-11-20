import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CalendarIcon, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react"

import { useStaffManagement } from "./hooks/useStaffManagement"
import type { StaffCategory } from "./hooks/useStaffManagement"
import { StaffFormCard, type StaffPopoverId } from "../setup/components/StaffFormCard"
import { useStaffForms } from "../setup/hooks/useStaffForms"
import { isValidEmail } from "../setup/staffUtils"
import type { StaffMember } from "../setup/staffTypes"

const baseInputClass =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[rgba(5,8,21,0.85)]"
const weightInputClassName = baseInputClass
const STAFF_CATEGORY_LABELS: Record<StaffCategory, string> = {
    service: "Servicio",
    support: "Cocina / Apoyo",
}

const StaffManagementPage = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const [modalPopover, setModalPopover] = useState<"start" | "inactive" | null>(null)
    const [activePopover, setActivePopover] = useState<StaffPopoverId>(null)
    const [addError, setAddError] = useState<string | null>(null)
    const [addSuccess, setAddSuccess] = useState<string | null>(null)

    const {
        staffForm,
        formattedStartDate,
        formattedInactiveDate,
        handleStaffFormChange,
        resetStaffForm,
        formatInactiveDateLabel,
    } = useStaffForms()

    const sectionParam = searchParams.get("section")
    const currentSection: "add" | "edit" = sectionParam === "add" ? "add" : "edit"
    const isAddSection = currentSection === "add"

    const {
        serviceStaff,
        supportStaff,
        settlementMode,
        editModal,
        modalDraft,
        modalError,
        pendingDelete,
        isEmptyState,
        categorizedStaff,
        isLoading,
        isSaving,
        saveError,
        saveSuccess,
        canManageStaffEditors,
        staffInputsDisabled,
        openEditModal,
        closeEditModal,
        handleModalEmailChange,
        handleModalWeightChange,
        handleModalStartDateChange,
        handleModalInactiveDateChange,
        handleModalActiveToggle,
        handleModalSave,
        openDeleteDialog,
        cancelDeleteDialog,
        confirmDeleteMember,
        addStaffMember,
    } = useStaffManagement()

    const handleOpenEditModal = (category: StaffCategory, memberId: string) => {
        setModalPopover(null)
        openEditModal(category, memberId)
    }

    const handleCloseEditModal = () => {
        setModalPopover(null)
        closeEditModal()
    }

    const handleBackToDashboard = () => {
        navigate("/dashboard")
    }

    const handleSectionChange = (nextSection: "add" | "edit") => {
        const params = new URLSearchParams(searchParams)
        if (nextSection === "edit") {
            params.delete("section")
        } else {
            params.set("section", "add")
        }
        setSearchParams(params, { replace: true })
        setAddError(null)
        setAddSuccess(null)
    }

    const handleRemoveMemberFromCard = (category: "service" | "support", memberId: string) => {
        const source = category === "service" ? serviceStaff : supportStaff
        const member = source.find((item) => item.id === memberId)
        if (!member) {
            return
        }
        openDeleteDialog(category, memberId, member.name)
    }

    const handleAddMember = async () => {
        if (staffInputsDisabled) {
            return
        }

        const trimmedName = staffForm.name.trim()
        if (!trimmedName) {
            setAddError("Ingresa el nombre del integrante.")
            setAddSuccess(null)
            return
        }

        const sanitizedEmail = staffForm.email.trim()
        if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
            setAddError("El correo ingresado no parece válido.")
            setAddSuccess(null)
            return
        }

        if (!staffForm.weight.trim()) {
            setAddError("Define la ponderación o porcentaje para este integrante.")
            setAddSuccess(null)
            return
        }

        const newMember: StaffMember = {
            id: crypto.randomUUID(),
            name: trimmedName,
            email: sanitizedEmail,
            role: staffForm.role,
            weight: staffForm.weight.trim(),
            startDate: staffForm.startDate,
            isActive: staffForm.isActive,
            inactiveSince: staffForm.isActive ? undefined : staffForm.inactiveSince ?? new Date(),
        }

        const saved = await addStaffMember(newMember)

        if (saved) {
            setAddError(null)
            setAddSuccess(`${trimmedName} fue añadido correctamente.`)
            resetStaffForm(staffForm.role)
            setActivePopover(null)
            return
        }

        setAddSuccess(null)
        setAddError("No pudimos añadir al integrante. Intenta nuevamente.")
    }

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

    const headerTitle = isAddSection ? "Añadir personal" : "Editar integrantes"
    const headerDescription = isAddSection
        ? "Registra nuevos integrantes y notifícalos de inmediato."
        : "Actualiza correos, estados e inactivaciones sin alterar la configuración inicial."

    return (
        <main className="min-h-screen bg-linear-to-b from-background to-muted/30 px-4 py-10">
            <section className="mx-auto w-full max-w-5xl space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Gestión de personal
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight">{headerTitle}</h1>
                        <p className="text-sm text-muted-foreground">{headerDescription}</p>
                    </div>
                    <Button variant="ghost" className="gap-2" onClick={handleBackToDashboard}>
                        <ArrowLeft className="h-4 w-4" />
                        Volver al dashboard
                    </Button>
                </div>

                <div className="inline-flex overflow-hidden rounded-full border border-white/20 bg-transparent text-sm text-white shadow-[0_12px_30px_rgba(2,4,15,0.65)]">
                    <button
                        type="button"
                        className={`px-5 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                            !isAddSection
                                ? "bg-linear-to-r from-white/65 to-white/25 text-[#0b0f1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                                : "text-white/65 hover:text-white"
                        }`}
                        onClick={() => handleSectionChange("edit")}
                    >
                        Editar existentes
                    </button>
                    <button
                        type="button"
                        className={`px-5 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                            isAddSection
                                ? "bg-linear-to-r from-white/65 to-white/25 text-[#0b0f1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                                : "text-white/65 hover:text-white"
                        }`}
                        onClick={() => handleSectionChange("add")}
                    >
                        Añadir personal
                    </button>
                </div>

                {isAddSection ? (
                    <>
                        {addError ? (
                            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {addError}
                            </div>
                        ) : null}
                        {addSuccess ? (
                            <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                                {addSuccess}
                            </div>
                        ) : null}

                        <Card className="border border-white/10 bg-[rgba(9,12,24,0.9)] text-white shadow-[0_30px_65px_rgba(3,6,23,0.45)] backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Formulario de incorporación</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StaffFormCard
                                    settlementMode={settlementMode}
                                    formValues={staffForm}
                                    formattedStartDate={formattedStartDate}
                                    formattedInactiveDate={formattedInactiveDate}
                                    activePopover={activePopover}
                                    onActivePopoverChange={setActivePopover}
                                    onFieldChange={handleStaffFormChange}
                                    onAddMember={handleAddMember}
                                    serviceStaff={serviceStaff}
                                    supportStaff={supportStaff}
                                    onRemoveMember={handleRemoveMemberFromCard}
                                    staffInputsDisabled={staffInputsDisabled}
                                    baseInputClassName={baseInputClass}
                                    formatInactiveDateLabel={formatInactiveDateLabel}
                                />
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <>
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

                        {isEmptyState ? (
                            <Card className="border bg-background/95 shadow-sm">
                                <CardContent className="space-y-4 py-8 text-center text-sm text-muted-foreground">
                                    <p>No hay integrantes para editar todavía.</p>
                                    <Button variant="secondary" onClick={() => navigate("/setup")}>
                                        Ir a configuración inicial
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border bg-background/95 shadow-sm">
                                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle>Integrantes registrados</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {serviceStaff.length + supportStaff.length} personas entre servicio y cocina/apoyo.
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] divide-y divide-border text-left text-sm">
                                        <thead className="bg-muted/40">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold">Categoría</th>
                                                <th className="px-4 py-3 font-semibold">Nombre y rol</th>
                                                <th className="px-4 py-3 font-semibold">Correo</th>
                                                <th className="px-4 py-3 font-semibold">
                                                    {settlementMode === "pool" ? "Ponderación" : "% de venta"}
                                                </th>
                                                <th className="px-4 py-3 font-semibold">Fecha de ingreso</th>
                                                <th className="px-4 py-3 font-semibold">Estado</th>
                                                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {categorizedStaff.map((member) => (
                                                <tr key={member.id}>
                                                    <td className="px-4 py-3 align-top text-xs font-semibold uppercase text-muted-foreground">
                                                        {STAFF_CATEGORY_LABELS[member.category]}
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{member.name}</span>
                                                            <span className="text-xs text-muted-foreground capitalize">
                                                                {member.role.replace("_", " ")}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <p className="text-sm font-medium text-foreground">{member.email || "Sin correo"}</p>
                                                        <p className="text-xs text-muted-foreground">Se notifica a este correo.</p>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <div>
                                                            <p className="text-sm font-semibold">{member.weight || "—"}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {settlementMode === "pool"
                                                                    ? "Usa decimales (ej. 0.75) para ponderaciones parciales."
                                                                    : "Corresponde al % de venta asignado."}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <p className="text-sm font-medium">
                                                            {member.startDate ? format(member.startDate, "PPP", { locale: es }) : "Sin definir"}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="space-y-1">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                    member.isActive
                                                                        ? "bg-emerald-100 text-emerald-900"
                                                                        : "bg-rose-100 text-rose-900"
                                                                }`}
                                                            >
                                                                {member.isActive ? "Activo" : "Inactivo"}
                                                            </span>
                                                            {!member.isActive && member.inactiveSince ? (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Baja desde {format(member.inactiveSince, "PPP", { locale: es })}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleOpenEditModal(member.category, member.id)}
                                                                disabled={staffInputsDisabled}
                                                            >
                                                                Editar
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openDeleteDialog(member.category, member.id, member.name)}
                                                                aria-label={`Eliminar ${member.name}`}
                                                                disabled={staffInputsDisabled}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                <Dialog open={editModal.isOpen} onOpenChange={(open) => (!open ? handleCloseEditModal() : undefined)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar integrante</DialogTitle>
                            <DialogDescription>
                                Actualiza el correo, ponderación, fechas y estado. Los cambios se aplican cuando guardes esta ventana.
                            </DialogDescription>
                        </DialogHeader>
                        {modalDraft ? (
                            <div className="space-y-5">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                                    <p className="text-base font-semibold">{modalDraft.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {modalDraft.role.replace("_", " ")}
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-email">Correo electrónico</Label>
                                        <input
                                            id="modal-email"
                                            type="email"
                                            value={modalDraft.email}
                                            onChange={(event) => handleModalEmailChange(event.target.value)}
                                            className={baseInputClass}
                                            placeholder="correo@ejemplo.com"
                                            disabled={staffInputsDisabled}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="modal-weight">
                                            {settlementMode === "pool" ? "Ponderación (ej. 1.0, 0.75)" : "% de venta"}
                                        </Label>
                                        <input
                                            id="modal-weight"
                                            type="number"
                                            step="0.25"
                                            min={0}
                                            value={modalDraft.weight}
                                            onChange={(event) => handleModalWeightChange(event.target.value)}
                                            className={weightInputClassName}
                                            disabled={staffInputsDisabled}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Fecha de ingreso</Label>
                                        <Popover
                                            open={modalPopover === "start"}
                                            onOpenChange={(open) => setModalPopover(open ? "start" : null)}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="flex w-full items-center justify-start gap-2 px-3"
                                                    disabled={staffInputsDisabled}
                                                >
                                                    <CalendarIcon className="h-4 w-4" />
                                                    <span>
                                                        {modalDraft.startDate
                                                            ? format(modalDraft.startDate, "PPP", { locale: es })
                                                            : "Seleccionar fecha"}
                                                    </span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-2" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={modalDraft.startDate}
                                                    onSelect={(date) => handleModalStartDateChange(date)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Estado</Label>
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={modalDraft.isActive}
                                                onCheckedChange={(checked) => handleModalActiveToggle(checked)}
                                                disabled={staffInputsDisabled}
                                            />
                                            <span className="text-sm font-medium">
                                                {modalDraft.isActive ? "Activo" : "Inactivo"}
                                            </span>
                                        </div>
                                        {!modalDraft.isActive ? (
                                            <div className="space-y-2">
                                                <Label>Fecha de baja</Label>
                                                <Popover
                                                    open={modalPopover === "inactive"}
                                                    onOpenChange={(open) => setModalPopover(open ? "inactive" : null)}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="flex w-full items-center justify-start gap-2 px-3"
                                                            disabled={staffInputsDisabled}
                                                        >
                                                            <CalendarIcon className="h-4 w-4" />
                                                            <span>
                                                                {modalDraft.inactiveSince
                                                                    ? format(modalDraft.inactiveSince, "PPP", { locale: es })
                                                                    : "Seleccionar fecha"}
                                                            </span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="p-2" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={modalDraft.inactiveSince}
                                                            onSelect={(date) => handleModalInactiveDateChange(date)}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <p className="text-xs text-muted-foreground">
                                                    {`Mostrará: ${formatInactiveDateLabel(modalDraft.inactiveSince)}`}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                {modalError ? <p className="text-sm text-destructive">{modalError}</p> : null}
                            </div>
                        ) : null}
                        <DialogFooter>
                            <Button variant="ghost" onClick={handleCloseEditModal} disabled={staffInputsDisabled}>
                                Cancelar
                            </Button>
                            <Button onClick={handleModalSave} disabled={staffInputsDisabled}>
                                Guardar cambios
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => (!open ? cancelDeleteDialog() : undefined)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar integrante?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción quitará permanentemente a "{pendingDelete?.memberName}" del listado. Podrás volver a
                                añadirlo desde la configuración inicial.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={cancelDeleteDialog}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={confirmDeleteMember}
                                disabled={isSaving}
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

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

            </section>
        </main>
    )
}

export default StaffManagementPage
