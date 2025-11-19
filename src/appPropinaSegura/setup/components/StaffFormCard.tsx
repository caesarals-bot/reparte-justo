import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Trash2 } from "lucide-react"
import type { ChangeEvent, ReactNode } from "react"

import type { StaffFormValues, StaffMember, StaffRole } from "../staffTypes.ts"

export type StaffPopoverId = "staff-start" | "staff-inactive" | null

interface StaffFormCardProps {
    settlementMode: "pool" | "directa"
    formValues: StaffFormValues
    formattedStartDate: string
    formattedInactiveDate: string
    activePopover: StaffPopoverId
    onActivePopoverChange: (nextPopover: StaffPopoverId) => void
    onFieldChange: (field: keyof StaffFormValues) => (value: ChangeEvent<HTMLInputElement> | Date | undefined | boolean) => void
    onAddMember: () => void
    serviceStaff: StaffMember[]
    supportStaff: StaffMember[]
    onRemoveMember: (category: "service" | "support", memberId: string) => void
    staffInputsDisabled: boolean
    baseInputClassName: string
    formatInactiveDateLabel: (date?: Date) => string
}

const roleOptions: { value: StaffRole; label: string }[] = [
    { value: "garzon", label: "Garzón" },
    { value: "ayudante_garzon", label: "Ayudante de Garzón" },
    { value: "cocinero", label: "Cocinero" },
    { value: "ayudante_cocina", label: "Ayudante de Cocina" },
]

const staffCategoryLabels: Record<"service" | "support", string> = {
    service: "Staff de Servicio",
    support: "Staff de Cocina / Apoyo",
}

const emptyStateText: Record<"service" | "support", string> = {
    service: "Aún no has añadido garzones o ayudantes",
    support: "Aún no has añadido integrantes de cocina/bar",
}

const categoryForRole = (role: StaffRole): "service" | "support" =>
    role === "garzon" || role === "ayudante_garzon" ? "service" : "support"

export const StaffFormCard = ({
    settlementMode,
    formValues,
    formattedStartDate,
    formattedInactiveDate,
    activePopover,
    onActivePopoverChange,
    onFieldChange,
    onAddMember,
    serviceStaff,
    supportStaff,
    onRemoveMember,
    staffInputsDisabled,
    baseInputClassName,
    formatInactiveDateLabel,
}: StaffFormCardProps) => {
    const handleRoleChange = onFieldChange("role") as unknown as React.ChangeEventHandler<HTMLSelectElement>

    const weightLabel: ReactNode =
        settlementMode === "pool" ? "Ponderación (ej. 1.0, 0.75, 0.5)" : "Porcentaje de venta (%)"

    const renderStaffTable = (category: "service" | "support", members: StaffMember[]) => (
        <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h4 className="text-sm font-semibold">{staffCategoryLabels[category]}</h4>
                <span className="text-xs text-muted-foreground">{members.length} integrantes</span>
            </div>
            <table className="w-full min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">
                            Nombre
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                            Rol
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                            Peso
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                            Estado
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {members.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                {emptyStateText[category]}
                            </td>
                        </tr>
                    ) : (
                        members.map((member) => (
                            <tr key={member.id}>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{member.name}</span>
                                        <span className="text-xs text-muted-foreground">{member.email || "—"}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 capitalize">{member.role.replace("_", " ")}</td>
                                <td className="px-4 py-3">{member.weight}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col gap-1">
                                        <span
                                            className={`rounded-full border px-2 py-1 text-xs font-medium ${member.isActive ? "bg-secondary/60" : "text-muted-foreground"}`}
                                        >
                                            {member.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                        {!member.isActive ? (
                                            <span className="text-xs text-muted-foreground">
                                                Baja: {formatInactiveDateLabel(member.inactiveSince)}
                                            </span>
                                        ) : null}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onRemoveMember(category, member.id)}
                                        aria-label={`Eliminar ${member.name}`}
                                        disabled={staffInputsDisabled}
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
    )

    return (
        <Card className="border bg-background/95 shadow-sm">
            <CardHeader>
                <CardTitle>Gestionar Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="staff-name">Nombre</Label>
                        <input
                            id="staff-name"
                            type="text"
                            value={formValues.name}
                            onChange={onFieldChange("name")}
                            className={baseInputClassName}
                            disabled={staffInputsDisabled}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="staff-email">Correo electrónico</Label>
                        <input
                            id="staff-email"
                            type="email"
                            value={formValues.email}
                            onChange={onFieldChange("email")}
                            className={baseInputClassName}
                            placeholder="correo@ejemplo.com"
                            disabled={staffInputsDisabled}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="staff-weight">{weightLabel}</Label>
                        <input
                            id="staff-weight"
                            type="number"
                            step="0.25"
                            value={formValues.weight}
                            onChange={onFieldChange("weight")}
                            className={baseInputClassName}
                            min={settlementMode === "pool" ? 0 : 0}
                            max={settlementMode === "pool" ? 5 : 100}
                            disabled={staffInputsDisabled}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="staff-role">Rol</Label>
                        <select
                            id="staff-role"
                            value={formValues.role}
                            onChange={handleRoleChange}
                            className={baseInputClassName}
                            disabled={staffInputsDisabled}
                        >
                            {roleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Fecha de Ingreso</Label>
                        <Popover
                            open={activePopover === "staff-start"}
                            onOpenChange={(open) => onActivePopoverChange(open ? "staff-start" : null)}
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
                                    selected={formValues.startDate}
                                    onSelect={onFieldChange("startDate") as (value: Date | undefined) => void}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label className="mb-0">Estado</Label>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                                    {formValues.isActive ? "Activo" : "Inactivo"}
                                </span>
                                <Switch
                                    checked={formValues.isActive}
                                    onCheckedChange={(checked) => onFieldChange("isActive")(checked)}
                                    disabled={staffInputsDisabled}
                                    aria-label="Cambiar estado del integrante"
                                />
                            </div>
                        </div>
                        {!formValues.isActive ? (
                            <div className="space-y-2">
                                <Label>Fecha de baja</Label>
                                <Popover
                                    open={activePopover === "staff-inactive"}
                                    onOpenChange={(open) => onActivePopoverChange(open ? "staff-inactive" : null)}
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
                                            selected={formValues.inactiveSince}
                                            onSelect={onFieldChange("inactiveSince") as (value: Date | undefined) => void}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : null}
                    </div>
                    <Button type="button" onClick={onAddMember} className="w-full" disabled={staffInputsDisabled}>
                        Añadir integrante
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {renderStaffTable("service", serviceStaff)}
                    {renderStaffTable("support", supportStaff)}
                </div>
            </CardContent>
        </Card>
    )
}

export const getStaffCategoryFromRole = (role: StaffRole): "service" | "support" => categoryForRole(role)
