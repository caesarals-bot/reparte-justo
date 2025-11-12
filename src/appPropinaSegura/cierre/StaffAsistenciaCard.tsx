import { Scissors } from "lucide-react"
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

    const montoController = showMontoIndividual
        ? useController({
              control,
              name: `${baseName}.montoIndividual`,
          })
        : null

    const porcentajeController = showMontoIndividual
        ? useController({
              control,
              name: `${baseName}.porcentajeVenta`,
          })
        : null

    const totalController = showMontoIndividual
        ? useController({
              control,
              name: `${baseName}.totalVenta`,
          })
        : null

    const ajustes = useWatch({ control, name: baseName })
    const hasAdjustments = Boolean(
        ajustes && ((ajustes.penalizacion_pct ?? 0) > 0 || (ajustes.deduccion_valor ?? 0) > 0),
    )

    return (
        <Sheet>
            <div className="flex items-start gap-4 rounded-xl border p-4 shadow-sm">
                <Checkbox
                    checked={Boolean(presenteField.value)}
                    onCheckedChange={(checked) => presenteField.onChange(checked === true)}
                    aria-label={`Presente ${field.nombre}`}
                />

                <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-base font-semibold leading-tight">{field.nombre}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                {showPonderacion && field.ponderacion ? (
                                    <span className="rounded-md bg-muted/60 px-2 py-0.5 font-medium">
                                        {field.ponderacion}
                                    </span>
                                ) : null}
                                {assignedAmount ? (
                                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
                                        {assignedAmount}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {hasAdjustments ? <Badge variant="destructive">Ajuste</Badge> : null}

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

                    {showMontoIndividual && montoController && porcentajeController && totalController ? (
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                                <Label htmlFor={`${baseName}-monto`}>Monto Venta ($)</Label>
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
                                <Label htmlFor={`${baseName}-porcentaje`}>Porcentaje (%)</Label>
                                <input
                                    id={`${baseName}-porcentaje`}
                                    type="number"
                                    min={0}
                                    max={100}
                                    className={percentageInputClassName}
                                    value={porcentajeController.field.value ?? 0}
                                    onChange={(event) =>
                                        porcentajeController.field.onChange(Number(event.target.value) || 0)
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor={`${baseName}-total`}>Total Día ($)</Label>
                                <input
                                    id={`${baseName}-total`}
                                    type="number"
                                    min={0}
                                    max={999999}
                                    className={amountInputClassName}
                                    value={totalController.field.value ?? 0}
                                    onChange={(event) =>
                                        totalController.field.onChange(Number(event.target.value) || 0)
                                    }
                                />
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
                        <Label htmlFor={`${baseName}-deduccion`}>Deducción ($) (Adelantos)</Label>
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
