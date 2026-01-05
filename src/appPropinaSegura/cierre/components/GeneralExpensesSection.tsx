import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PlusCircle, Trash2 } from "lucide-react"
import { amountInputClassName } from "../constants"

interface GeneralExpensesSectionProps {
    settlementModeConfig: string | null
    generalExpenseTotal: number
    generalExpenses: any
    currencyFormatter: Intl.NumberFormat
    register: any
    formErrors: any
}

const GeneralExpensesSection = ({
    settlementModeConfig,
    generalExpenseTotal,
    generalExpenses,
    currencyFormatter,
    register,
    formErrors,
}: GeneralExpensesSectionProps) => {
    const helperText =
        settlementModeConfig === "directa"
            ? "Aplica descuentos (ej. anfitriona, caja) antes de repartir la venta directa."
            : "Asigna montos para part-time o anfitriona antes de repartir el pocillo."

    return (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(3,6,23,0.35)]">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">Gastos generales</p>
                    <p className="text-sm text-white/80">{helperText}</p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total</p>
                    <p className="text-2xl font-semibold text-white">{currencyFormatter.format(generalExpenseTotal)}</p>
                </div>
            </header>

            <div className="mt-4 space-y-3">
                {generalExpenses.fields.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
                        Aún no registras gastos generales. Agrega uno para descontarlo del reparto de garzones.
                    </p>
                ) : (
                    generalExpenses.fields.map((field: any, index: number) => {
                        const expenseErrors = formErrors?.generalExpenses?.[index]

                        return (
                            <div
                                key={field.id}
                                className="rounded-2xl border border-white/10 bg-[rgba(15,18,33,0.75)] p-4 shadow-[0_10px_25px_rgba(3,6,23,0.45)]"
                            >
                                <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                                    <div className="space-y-1">
                                        <Label htmlFor={`general-expense-name-${field.id}`}>Nombre</Label>
                                        <input
                                            id={`general-expense-name-${field.id}`}
                                            placeholder="Ej. Turno part-time"
                                            className={amountInputClassName}
                                            {...register(`generalExpenses.${index}.nombre` as const)}
                                            defaultValue={field.nombre ?? ""}
                                        />
                                        {expenseErrors?.nombre?.message ? (
                                            <p className="text-xs text-rose-300">{expenseErrors.nombre.message}</p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor={`general-expense-type-${field.id}`}>Tipo</Label>
                                        <select
                                            id={`general-expense-type-${field.id}`}
                                            className="w-full rounded-2xl border border-white/20 bg-transparent px-3 py-3 text-sm text-white shadow-inner shadow-black/20 focus:border-primary focus:outline-none"
                                            {...register(`generalExpenses.${index}.tipo` as const)}
                                            defaultValue={field.tipo ?? "part-time"}
                                        >
                                            <option className="bg-slate-950" value="part-time">
                                                Part-time
                                            </option>
                                            <option className="bg-slate-950" value="anfitriona">
                                                Anfitriona
                                            </option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor={`general-expense-amount-${field.id}`}>Monto</Label>
                                        <input
                                            id={`general-expense-amount-${field.id}`}
                                            type="number"
                                            min={0}
                                            step="1000"
                                            placeholder="Ej. 20000"
                                            className={amountInputClassName}
                                            {...register(`generalExpenses.${index}.monto` as const, {
                                                valueAsNumber: true,
                                                min: 0,
                                            })}
                                            defaultValue={field.monto ?? 0}
                                        />
                                        {expenseErrors?.monto?.message ? (
                                            <p className="text-xs text-rose-300">{expenseErrors.monto.message}</p>
                                        ) : null}
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-white/70 hover:text-white"
                                            onClick={() => generalExpenses.remove(index)}
                                            aria-label="Eliminar gasto"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <input
                                    type="hidden"
                                    {...register(`generalExpenses.${index}.entryId` as const)}
                                    defaultValue={field.entryId ?? field.id}
                                />
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                    type="button"
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                    onClick={() =>
                        generalExpenses.append({
                            entryId:
                                typeof crypto !== "undefined" && "randomUUID" in crypto
                                    ? crypto.randomUUID()
                                    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                            nombre: "",
                            tipo: "part-time",
                            monto: 0,
                        })
                    }
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar gasto
                </Button>
                {generalExpenses.fields.length > 0 ? (
                    <p className="text-xs text-white/60">
                        Se descontarán {currencyFormatter.format(generalExpenseTotal)} del reparto de garzones.
                    </p>
                ) : null}
            </div>
        </section>
    )
}

export default GeneralExpensesSection
