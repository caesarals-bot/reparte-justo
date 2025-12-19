import { Info, Scissors } from "lucide-react"
import { useController, useFormContext, useWatch, type FieldArrayWithId } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

const sheetFieldWrapper = "space-y-2 w-full max-w-xs mx-auto sm:max-w-sm"

import type { CierreFormValues } from "./schema"
import { amountInputClassName, percentageInputClassName } from "./constants"

export type StaffArrayField = keyof Pick<
    CierreFormValues,
    "asistenciaServicio" | "asistenciaCocina" | "ventaDirecta" | "pocilloSecundario"
>

interface StaffAsistenciaCardProps {
    field: FieldArrayWithId<CierreFormValues, StaffArrayField, "id">
    index: number
    name: StaffArrayField
    showPonderacion?: boolean
    showMontoIndividual?: boolean
    assignedAmount?: string
}

const StaffAsistenciaCard = ({
    field,
    index,
    name,
    showPonderacion,
    showMontoIndividual,
    assignedAmount,
}: StaffAsistenciaCardProps) => {
    const { control } = useFormContext<CierreFormValues>()
    const baseName = `${name}.${index}` as const

    const {
        field: presenteField,
    } = useController({
        control,
        name: `${baseName}.presente`,
    })

    const {
        field: penalizacionField,
    } = useController({
        control,
        name: `${baseName}.penalizacion_pct`,
    })

    const {
        field: deduccionField,
    } = useController({
        control,
        name: `${baseName}.deduccion_valor`,
    })

    const {
        field: deduccionNombreField,
    } = useController({
        control,
        name: `${baseName}.deduccion_nombre`,
    })

    const {
        field: deduccionDescripcionField,
    } = useController({
        control,
        name: `${baseName}.deduccion_descripcion`,
    })

    const montoController = useController({
        control,
        name: `${baseName}.montoIndividual`,
    })

    const ajustes = useWatch({ control, name: baseName })
    const hasAdjustments = Boolean(
        ajustes && ((ajustes.penalizacion_pct ?? 0) > 0 || (ajustes.deduccion_valor ?? 0) > 0),
    )

    return (
        <Sheet>
            <div className="flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-start">
                <Checkbox
                    checked={Boolean(presenteField.value)}
                    onCheckedChange={(checked) => presenteField.onChange(checked === true)}
                    aria-label={`Presente ${field.nombre}`}
                    className="mt-1"
                />

                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <p className="text-base font-semibold leading-tight text-foreground">{field.nombre}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {showPonderacion && field.ponderacion ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 font-medium">
                                        <Info className="h-3 w-3" /> Ponderación {field.ponderacion}
                                    </span>
                                ) : null}
                                {assignedAmount ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                                        Asignado {assignedAmount}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {hasAdjustments ? <Badge variant="destructive">Con ajustes</Badge> : null}
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    className="gap-2 px-3"
                                    aria-label={`Deducciones para ${field.nombre}`}
                                >
                                    <Scissors className="h-4 w-4" />
                                    <span>Deducciones</span>
                                </Button>
                            </SheetTrigger>
                        </div>
                    </div>

                    {showMontoIndividual ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor={`${baseName}-monto`}>Monto venta ($)</Label>
                                <input
                                    id={`${baseName}-monto`}
                                    type="number"
                                    min={0}
                                    max={999999}
                                    className={amountInputClassName}
                                    value={montoController.field.value ?? 0}
                                    onChange={(event) =>
                                        montoController.field.onChange(Number(event.target.value) || 0)
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground">Ponderación</Label>
                                <div className="flex h-10 items-center rounded-md border border-dashed border-muted-foreground/50 bg-background/40 px-3 text-sm text-muted-foreground">
                                    {field.ponderacion ?? "Sin definir"}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <SheetContent side="bottom" className="space-y-6 px-4 pb-6 sm:px-6">
                <SheetHeader>
                    <SheetTitle>Ajustes para {field.nombre}</SheetTitle>
                    <SheetDescription>Añade penalizaciones o adelantos solo por hoy.</SheetDescription>
                </SheetHeader>

                <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className={sheetFieldWrapper}>
                            <Label htmlFor={`${baseName}-penalizacion`}>Penalización (%)</Label>
                            <input
                                id={`${baseName}-penalizacion`}
                                type="number"
                                min={0}
                                className={percentageInputClassName}
                                value={penalizacionField.value ?? 0}
                                onChange={(event) => penalizacionField.onChange(Number(event.target.value) || 0)}
                            />
                        </div>

                        <div className={sheetFieldWrapper}>
                            <Label htmlFor={`${baseName}-deduccion`}>Monto deducción ($)</Label>
                            <input
                                id={`${baseName}-deduccion`}
                                type="number"
                                min={0}
                                className={amountInputClassName}
                                value={deduccionField.value ?? 0}
                                onChange={(event) => deduccionField.onChange(Number(event.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className={sheetFieldWrapper}>
                            <Label htmlFor={`${baseName}-deduccion-nombre`}>Nombre del descuento</Label>
                            <input
                                id={`${baseName}-deduccion-nombre`}
                                type="text"
                                maxLength={80}
                                placeholder="Ej. Pocillo"
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={deduccionNombreField.value ?? ""}
                                onChange={(event) => deduccionNombreField.onChange(event.target.value)}
                            />
                        </div>
                        <div className={sheetFieldWrapper}>
                            <Label htmlFor={`${baseName}-deduccion-descripcion`}>Descripción corta</Label>
                            <textarea
                                id={`${baseName}-deduccion-descripcion`}
                                rows={2}
                                maxLength={200}
                                placeholder="Motivo o referencia"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={deduccionDescripcionField.value ?? ""}
                                onChange={(event) => deduccionDescripcionField.onChange(event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <SheetFooter className="pt-0">
                    <SheetClose asChild>
                        <Button type="button" className="w-full sm:w-auto">
                            Guardar cambios
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

export default StaffAsistenciaCard
