import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"

import type { StaffMember } from "../staffTypes.ts"

type SelectableStaffMember = Pick<StaffMember, "id" | "name" | "email">

interface StaffPermissionsCardProps {
    staffEditors: string[]
    maxStaffEditors: number
    canManageStaffEditors: boolean
    newStaffEditor: string
    staffEditorError: string | null
    reachedStaffEditorsLimit: boolean
    availableStaff: SelectableStaffMember[]
    onSelectStaff: (email: string) => void
    onAddEditor: () => void
    onRemoveEditor: (email: string) => void
}

const buildDescription = (maxStaffEditors: number) => {
    if (maxStaffEditors === 1) {
        return "Puedes autorizar a una persona adicional (además del usuario autenticado) para editar datos sensibles."
    }

    return `Puedes autorizar hasta ${maxStaffEditors} personas adicionales además del usuario autenticado.`
}

export const StaffPermissionsCard = ({
    staffEditors,
    maxStaffEditors,
    canManageStaffEditors,
    newStaffEditor,
    staffEditorError,
    reachedStaffEditorsLimit,
    availableStaff = [],
    onSelectStaff,
    onAddEditor,
    onRemoveEditor,
}: StaffPermissionsCardProps) => (
    <Card className="border bg-background/95 shadow-sm">
        <CardHeader>
            <CardTitle>Permisos para editar datos sensibles</CardTitle>
            <CardDescription>
                {availableStaff.length === 0
                    ? "Primero agrega garzones para poder asignar un responsable de edición."
                    : buildDescription(maxStaffEditors)}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-xs uppercase tracking-wide">
                    {staffEditors.length}/{maxStaffEditors} editores activos
                </Badge>
                {!canManageStaffEditors ? (
                    <p className="text-sm text-muted-foreground">
                        Solo los editores designados pueden actualizar esta lista.
                    </p>
                ) : null}
            </div>

            <div className="space-y-2">
                <Label>Selecciona al garzón autorizado</Label>
                <Select
                    value={newStaffEditor || undefined}
                    onValueChange={onSelectStaff}
                    disabled={!canManageStaffEditors || reachedStaffEditorsLimit || availableStaff.length === 0}
                >
                    <SelectTrigger className="w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <SelectValue placeholder="Elige entre los garzones registrados" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableStaff.map((member) => {
                            const normalizedEmail = member.email?.trim()
                            return (
                                <SelectItem
                                    key={member.id}
                                    value={normalizedEmail ?? member.id}
                                    disabled={!normalizedEmail}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">{member.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {normalizedEmail ?? "Sin correo registrado"}
                                        </span>
                                    </div>
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Solo se pueden autorizar garzones con un correo electrónico registrado.
                </p>
                <div className="flex items-center gap-3 pt-2">
                    <Button
                        type="button"
                        onClick={onAddEditor}
                        disabled={
                            !canManageStaffEditors ||
                            reachedStaffEditorsLimit ||
                            availableStaff.length === 0 ||
                            !newStaffEditor
                        }
                        className="flex-1 sm:flex-none sm:w-48"
                    >
                        Autorizar
                    </Button>
                </div>
                {staffEditorError ? <p className="text-sm text-destructive">{staffEditorError}</p> : null}
            </div>

            <div className="space-y-2">
                <Label>Correos con permiso</Label>
                {staffEditors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        El usuario autenticado ya cuenta como editor. Puedes designar un garzón adicional.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {staffEditors.map((editorEmail) => (
                            <li
                                key={editorEmail}
                                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                            >
                                <span className="font-medium">{editorEmail}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemoveEditor(editorEmail)}
                                    disabled={!canManageStaffEditors}
                                    aria-label={`Quitar ${editorEmail}`}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </CardContent>
    </Card>
)
