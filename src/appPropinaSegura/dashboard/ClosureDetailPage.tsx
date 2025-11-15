import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { doc, getDoc, type Timestamp } from "firebase/firestore"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Users } from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { db } from "@/firebase/config"
import {
    useClosuresDashboard,
    type ClosureDocument,
    type StaffAssignment,
    type ClosureAdjustment,
    type ClosureAdjustmentVariant,
    createClosureAdjustment,
    fetchClosureAdjustments,
    mapSnapshotToClosure,
} from "./hooks/useClosuresDashboard"

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(value)

const formatSignedCurrency = (value: number) =>
    `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`

const getStatusBadgeVariant = (estado: string) => {
    if (estado === "liquidado" || estado === "pagado") {
        return "default" as const
    }

    if (estado === "pendiente") {
        return "secondary" as const
    }

    return "outline" as const
}

const buildMemberIdentifier = (staffId?: string, name?: string, role?: string | null) =>
    staffId ?? `${name ?? ""}|${role ?? ""}`

const fieldInputClassName =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"

const fieldTextareaClassName = `${fieldInputClassName} min-h-[96px] resize-y`

const formatAdjustmentTimestamp = (timestamp?: Timestamp | null) => {
    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "Sin registro de fecha"
    }

    try {
        return format(timestamp.toDate(), "PPP '•' p", { locale: es })
    } catch {
        return "Sin registro de fecha"
    }
}

const ClosureDetailPage = () => {
    const { closureId } = useParams()
    const navigate = useNavigate()
    const { uid, displayName, email } = useAuth()
    const { refresh } = useClosuresDashboard({ uid })

    const [closure, setClosure] = useState<ClosureDocument | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adjustmentFeedback, setAdjustmentFeedback] = useState<{
        type: "success" | "error"
        message: string
    } | null>(null)
    const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false)
    const generalAdjustmentKey = "__general__"
    const [adjustmentForm, setAdjustmentForm] = useState({
        staffKey: "",
        type: "descuento" as "incremento" | "descuento",
        variant: "monto" as ClosureAdjustmentVariant,
        amount: "",
        percentage: "",
        motivo: "",
    })
    const [adjustmentFormError, setAdjustmentFormError] = useState<string | null>(null)
    const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false)

    const refreshClosureAdjustments = useCallback(async () => {
        if (!uid || !closureId) {
            return [] as ClosureAdjustment[]
        }

        const adjustments = await fetchClosureAdjustments(uid, closureId)
        setClosure((previous) => (previous ? { ...previous, adjustments } : previous))
        return adjustments
    }, [closureId, uid])

    const loadClosure = useCallback(async () => {
        if (!uid) {
            setError("Inicia sesión para ver el detalle del cierre.")
            setIsLoading(false)
            return
        }

        if (!closureId) {
            setError("No se especificó un cierre a consultar.")
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const reference = doc(db, "restaurants", uid, "registros_diarios", closureId)
            const snapshot = await getDoc(reference)

            if (!snapshot.exists()) {
                setError("No encontramos el cierre solicitado. Verifica el historial o intenta con otro registro.")
                setClosure(null)
                return
            }

            const mapped = mapSnapshotToClosure({
                id: snapshot.id,
                data: () => (snapshot.data() as Record<string, unknown>) ?? {},
            })

            const adjustments = await fetchClosureAdjustments(uid, snapshot.id)

            setClosure({ ...mapped, adjustments })
            setError(null)
            void refresh()
        } catch (fetchError) {
            console.error("Error al obtener el cierre", fetchError)
            setError("No pudimos cargar el detalle del cierre. Intenta nuevamente en unos segundos.")
            setClosure(null)
        } finally {
            setIsLoading(false)
        }
    }, [closureId, refresh, uid])

    useEffect(() => {
        void loadClosure()
    }, [loadClosure])

    const handleAdjustmentDialogOpenChange = (open: boolean) => {
        setIsAdjustmentDialogOpen(open)

        if (!open) {
            setAdjustmentForm({
                staffKey: "",
                type: "descuento",
                variant: "monto",
                amount: "",
                percentage: "",
                motivo: "",
            })
            setAdjustmentFormError(null)
        }
    }

    const handleAdjustmentMemberChange = (value: string) => {
        setAdjustmentForm((previous) => ({ ...previous, staffKey: value }))
        setAdjustmentFormError(null)
    }

    const handleAdjustmentTypeChange = (value: "incremento" | "descuento") => {
        setAdjustmentForm((previous) => ({ ...previous, type: value }))
        setAdjustmentFormError(null)
    }

    const handleAdjustmentVariantChange = (value: ClosureAdjustmentVariant) => {
        setAdjustmentForm((previous) => ({
            ...previous,
            variant: value,
        }))
        setAdjustmentFormError(null)
    }

    const handleAdjustmentAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
        setAdjustmentForm((previous) => ({ ...previous, amount: event.target.value }))
        setAdjustmentFormError(null)
    }

    const handleAdjustmentPercentageChange = (event: ChangeEvent<HTMLInputElement>) => {
        setAdjustmentForm((previous) => ({ ...previous, percentage: event.target.value }))
        setAdjustmentFormError(null)
    }

    const handleAdjustmentMotivoChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setAdjustmentForm((previous) => ({ ...previous, motivo: event.target.value }))
    }

    const handleAdjustmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!uid || !closureId) {
            setAdjustmentFormError("Necesitas una sesión activa para registrar ajustes.")
            return
        }

        const isPercentageVariant = adjustmentForm.variant === "porcentaje"
        const amountNumber = isPercentageVariant ? 0 : Number.parseInt(adjustmentForm.amount, 10)
        const percentageNumber = isPercentageVariant
            ? Number.parseFloat(adjustmentForm.percentage.replace(",", "."))
            : undefined

        if (!isPercentageVariant && (!amountNumber || amountNumber <= 0)) {
            setAdjustmentFormError("Ingresa un monto mayor a 0.")
            return
        }

        if (isPercentageVariant) {
            if (!adjustmentForm.staffKey || adjustmentForm.staffKey === generalAdjustmentKey) {
                setAdjustmentFormError("Selecciona un integrante específico para ajustar porcentaje.")
                return
            }

            if (percentageNumber === undefined || Number.isNaN(percentageNumber)) {
                setAdjustmentFormError("Ingresa un porcentaje válido.")
                return
            }

            if (percentageNumber === 0) {
                setAdjustmentFormError("El porcentaje debe ser distinto de 0.")
                return
            }

            if (percentageNumber < -100 || percentageNumber > 100) {
                setAdjustmentFormError("El porcentaje debe estar entre -100 y 100.")
                return
            }
        }

        const isGeneralAdjustment = adjustmentForm.staffKey === generalAdjustmentKey
        const staffData = staffMembers.find((member) => member.identifier === adjustmentForm.staffKey)

        if (!isGeneralAdjustment && !staffData) {
            setAdjustmentFormError("Selecciona el integrante al que aplicarás el ajuste.")
            return
        }

        if (isGeneralAdjustment && isPercentageVariant) {
            setAdjustmentFormError("Los ajustes porcentuales deben aplicarse a un integrante específico.")
            return
        }

        try {
            setIsSubmittingAdjustment(true)
            await createClosureAdjustment({
                restaurantId: uid,
                closureId,
                adjustment: {
                    staffId: staffData?.staffId,
                    staffName: isGeneralAdjustment ? "Ajuste general" : staffData?.name ?? "Integrante",
                    amount: amountNumber,
                    type: adjustmentForm.type,
                    variant: adjustmentForm.variant,
                    percentage: isPercentageVariant ? percentageNumber : undefined,
                    motivo: adjustmentForm.motivo.trim() ? adjustmentForm.motivo.trim() : undefined,
                    createdBy: displayName ?? email ?? "Usuario",
                },
            })

            await refreshClosureAdjustments()
            setAdjustmentFeedback({
                type: "success",
                message: "Ajuste registrado correctamente.",
            })
            setAdjustmentForm({
                staffKey: "",
                type: "descuento",
                variant: "monto",
                amount: "",
                percentage: "",
                motivo: "",
            })
            setAdjustmentFormError(null)
            handleAdjustmentDialogOpenChange(false)
            void refresh()
        } catch (submitError) {
            console.error("Error al registrar ajuste", submitError)
            setAdjustmentFeedback({
                type: "error",
                message: "No pudimos registrar el ajuste. Intenta nuevamente en unos segundos.",
            })
        } finally {
            setIsSubmittingAdjustment(false)
        }
    }

    const formattedReferenceDate = useMemo(() => {
        if (!closure?.metadata.referenceDate) {
            return "Sin fecha definida"
        }

        const parsed = new Date(closure.metadata.referenceDate)

        if (Number.isNaN(parsed.getTime())) {
            return "Fecha no válida"
        }

        return format(parsed, "PPP", { locale: es })
    }, [closure?.metadata.referenceDate])

    const assignmentSections = useMemo(() => {
        if (!closure) {
            return [] as Array<{ key: string; title: string; data: StaffAssignment[] }>
        }

        return [
            { key: "servicio", title: "Staff de servicio", data: closure.assignments.servicio },
            { key: "cocina", title: "Staff de cocina", data: closure.assignments.cocina },
            { key: "ventaDirecta", title: "Venta directa", data: closure.assignments.ventaDirecta },
        ].filter((section) => section.data.length)
    }, [closure])

    const staffMembers = useMemo(() => {
        if (!closure) {
            return [] as Array<{
                identifier: string
                staffId?: string
                name: string
                role?: string | null
            }>
        }

        const map = new Map<string, { identifier: string; staffId?: string; name: string; role?: string | null }>()
        const pushMembers = (members: StaffAssignment[]) => {
            members.forEach((assignment) => {
                if (!assignment.present) {
                    return
                }

                const identifier = buildMemberIdentifier(assignment.staffId, assignment.nombre, assignment.role)

                if (!map.has(identifier)) {
                    map.set(identifier, {
                        identifier,
                        staffId: assignment.staffId,
                        name: assignment.nombre,
                        role: assignment.role,
                    })
                }
            })
        }

        pushMembers(closure.assignments.servicio)
        pushMembers(closure.assignments.cocina)
        pushMembers(closure.assignments.ventaDirecta)

        return Array.from(map.values())
    }, [closure])

    const adjustmentsByIdentifier = useMemo(() => {
        const map = new Map<
            string,
            { amountTotal: number; percentageTotal: number; items: ClosureAdjustment[] }
        >()

        closure?.adjustments?.forEach((adjustment) => {
            const identifier = buildMemberIdentifier(adjustment.staffId, adjustment.staffName)
            const signedAmount =
                adjustment.variant === "porcentaje"
                    ? 0
                    : adjustment.type === "descuento"
                      ? -adjustment.amount
                      : adjustment.amount
            const signedPercentage =
                adjustment.variant === "porcentaje"
                    ? (adjustment.type === "descuento" ? -1 : 1) * (adjustment.percentage ?? 0)
                    : 0

            if (map.has(identifier)) {
                const entry = map.get(identifier)!
                entry.amountTotal += signedAmount
                entry.percentageTotal += signedPercentage
                entry.items.push(adjustment)
            } else {
                map.set(identifier, {
                    amountTotal: signedAmount,
                    percentageTotal: signedPercentage,
                    items: [adjustment],
                })
            }
        })

        return map
    }, [closure?.adjustments])

    const totalAdjustments = useMemo(
        () =>
            closure?.adjustments?.reduce((accumulator, adjustment) => {
                if (adjustment.variant === "porcentaje") {
                    return accumulator
                }

                const signedAmount = adjustment.type === "descuento" ? -adjustment.amount : adjustment.amount
                return accumulator + signedAmount
            }, 0) ?? 0,
        [closure?.adjustments],
    )

    const sortedAdjustments = useMemo(() => {
        if (!closure?.adjustments?.length) {
            return [] as ClosureAdjustment[]
        }

        return [...closure.adjustments].sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0
            const bTime = b.createdAt?.toMillis?.() ?? 0
            return bTime - aTime
        })
    }, [closure?.adjustments])

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" aria-busy="true">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando detalle del cierre...
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    if (error || !closure) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl space-y-6">
                    <Card className="border border-destructive/40 bg-destructive/10 text-destructive">
                        <CardContent className="space-y-2 py-6 text-sm">
                            <p className="font-semibold">Algo no salió como esperábamos</p>
                            <p className="text-destructive/90">{error ?? "No encontramos información de este cierre."}</p>
                        </CardContent>
                    </Card>
                    <div className="flex justify-center">
                        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                        </Button>
                    </div>
                </section>
            </main>
        )
    }

    const { totals, metadata, estado } = closure
    const netAfterAdjustments = totals.netAfterDeductions + totalAdjustments

    const summaryItems = [
        { label: "Propinas brutas", value: totals.propinas, formatter: formatCurrency },
        { label: "Total neto (snapshot)", value: totals.netAfterDeductions, formatter: formatCurrency },
        { label: "Ajustes registrados", value: totalAdjustments, formatter: formatSignedCurrency },
        { label: "Total neto ajustado", value: netAfterAdjustments, formatter: formatCurrency },
        { label: "Deducciones", value: totals.deductionsAmount, formatter: formatCurrency },
        { label: "Transbank", value: totals.transbankAmount, formatter: formatCurrency },
    ]

    return (
        <main className="flex min-h-screen items-start justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
            <section className="w-full max-w-5xl space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-fit px-0 text-sm text-muted-foreground hover:text-foreground"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                        </Button>
                        <h1 className="text-2xl font-semibold leading-tight">Detalle del cierre</h1>
                        <p className="text-sm text-muted-foreground">
                            {formattedReferenceDate} &middot; {metadata.referenceDateKey ?? "Sin código"}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
                        <Badge variant={getStatusBadgeVariant(estado)} className="w-fit text-xs uppercase tracking-wide">
                            {estado}
                        </Badge>

                        <Dialog open={isAdjustmentDialogOpen} onOpenChange={handleAdjustmentDialogOpenChange}>
                            <DialogTrigger asChild>
                                <Button type="button" className="gap-2">
                                    Registrar ajuste
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Registrar ajuste</DialogTitle>
                                    <DialogDescription>
                                        Registra descuentos o incrementos sin alterar el snapshot original.
                                    </DialogDescription>
                                </DialogHeader>

                                <form className="space-y-5" onSubmit={handleAdjustmentSubmit}>
                                    <div className="space-y-2">
                                        <Label>Integrante</Label>
                                        <Select value={adjustmentForm.staffKey} onValueChange={handleAdjustmentMemberChange}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecciona al integrante" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={generalAdjustmentKey}>Aplicar ajuste general</SelectItem>
                                                {staffMembers.map((member) => (
                                                    <SelectItem key={member.identifier} value={member.identifier}>
                                                        {member.name}
                                                        {member.role ? ` • ${member.role}` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Tipo de ajuste</Label>
                                            <Select value={adjustmentForm.type} onValueChange={handleAdjustmentTypeChange}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="descuento">Descuento</SelectItem>
                                                    <SelectItem value="incremento">Incremento</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Modalidad</Label>
                                            <Select value={adjustmentForm.variant} onValueChange={handleAdjustmentVariantChange}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monto">Monto fijo</SelectItem>
                                                    <SelectItem value="porcentaje">Porcentaje</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {adjustmentForm.variant === "monto" ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="adjustment-amount">Monto ($)</Label>
                                            <input
                                                id="adjustment-amount"
                                                type="number"
                                                min={0}
                                                className={fieldInputClassName}
                                                value={adjustmentForm.amount}
                                                onChange={handleAdjustmentAmountChange}
                                                placeholder="Ej: 10000"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label htmlFor="adjustment-percentage">Porcentaje (%)</Label>
                                            <input
                                                id="adjustment-percentage"
                                                type="number"
                                                step="0.5"
                                                min={-100}
                                                max={100}
                                                className={fieldInputClassName}
                                                value={adjustmentForm.percentage}
                                                onChange={handleAdjustmentPercentageChange}
                                                placeholder="Ej: 50"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Usa valores negativos para restar porcentaje y positivos para incrementar.
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="adjustment-motivo">Motivo</Label>
                                        <textarea
                                            id="adjustment-motivo"
                                            className={fieldTextareaClassName}
                                            value={adjustmentForm.motivo}
                                            onChange={handleAdjustmentMotivoChange}
                                            placeholder="Describe el motivo del ajuste"
                                        />
                                        <p className="text-xs text-muted-foreground">Opcional, visible en el historial de ajustes.</p>
                                    </div>

                                    {adjustmentFormError ? (
                                        <p className="text-sm text-destructive">{adjustmentFormError}</p>
                                    ) : null}

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button type="button" variant="outline">
                                                Cancelar
                                            </Button>
                                        </DialogClose>
                                        <Button type="submit" disabled={isSubmittingAdjustment} className="gap-2">
                                            {isSubmittingAdjustment ? (
                                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                            ) : null}
                                            Guardar ajuste
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Card className="border bg-background/95 shadow-lg">
                    <CardHeader className="pb-4">
                        <CardTitle>Resumen financiero</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {summaryItems.map((item) => (
                                <div key={item.label} className="rounded-lg border bg-muted/20 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {item.label}
                                    </p>
                                    <p className="mt-2 text-xl font-semibold text-foreground">
                                        {item.formatter(item.value)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {adjustmentFeedback ? (
                    <Card
                        className={
                            adjustmentFeedback.type === "success"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                                : "border border-destructive/40 bg-destructive/10 text-destructive"
                        }
                    >
                        <CardContent className="py-4 text-sm">{adjustmentFeedback.message}</CardContent>
                    </Card>
                ) : null}

                <Card className="border bg-background/95 shadow-lg">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Historial de ajustes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sortedAdjustments.length ? (
                            <div className="space-y-4">
                                {sortedAdjustments.map((adjustment) => {
                                    const signedAmount =
                                        adjustment.variant === "porcentaje"
                                            ? 0
                                            : adjustment.type === "descuento"
                                              ? -adjustment.amount
                                              : adjustment.amount
                                    const signedPercentage =
                                        adjustment.variant === "porcentaje"
                                            ? (adjustment.type === "descuento" ? -1 : 1) * (adjustment.percentage ?? 0)
                                            : 0

                                    return (
                                        <div
                                            key={
                                                adjustment.id ??
                                                `${adjustment.staffId ?? "general"}-${
                                                    adjustment.createdAt?.toMillis?.() ?? Math.random()
                                                }`
                                            }
                                            className="rounded-lg border bg-muted/20 p-4 text-sm"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {adjustment.staffName ?? "Ajuste"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatAdjustmentTimestamp(adjustment.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            "text-xs" +
                                                            (adjustment.variant === "porcentaje"
                                                                ? signedPercentage < 0
                                                                    ? " text-destructive border-destructive/60"
                                                                    : " text-emerald-700 border-emerald-400/70"
                                                                : signedAmount < 0
                                                                    ? " text-destructive border-destructive/60"
                                                                    : " text-emerald-700 border-emerald-400/70")
                                                        }
                                                    >
                                                        {adjustment.variant === "porcentaje"
                                                            ? `${signedPercentage >= 0 ? "+" : ""}${signedPercentage.toFixed(2)}%`
                                                            : formatSignedCurrency(signedAmount)}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] uppercase">
                                                        {adjustment.variant === "porcentaje" ? "Porcentaje" : "Monto"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {adjustment.motivo ? (
                                                <p className="mt-3 text-xs text-muted-foreground">
                                                    Motivo: <span className="text-foreground">{adjustment.motivo}</span>
                                                </p>
                                            ) : null}
                                            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Registrado por: {adjustment.createdBy ?? "Usuario"}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No hay ajustes registrados para este cierre.</p>
                        )}
                    </CardContent>
                </Card>

                {assignmentSections.length ? (
                    <Card className="border bg-background/95 shadow-lg">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-5 w-5 text-muted-foreground" /> Desglose por integrante
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {assignmentSections.map((section, index) => (
                                <div key={section.key} className="space-y-4">
                                    {index > 0 ? <Separator /> : null}

                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className="text-lg font-semibold">{section.title}</h2>
                                        <Badge variant="outline" className="text-xs">
                                            {section.data.length} integrante{section.data.length === 1 ? "" : "s"}
                                        </Badge>
                                    </div>

                                    <div className="grid gap-3 lg:grid-cols-2">
                                        {section.data.map((assignment) => {
                                            const bruto = assignment.assignedAmount
                                            const totalDescuentos = assignment.penaltyAmount + assignment.deductionAmount
                                            const identifier = buildMemberIdentifier(
                                                assignment.staffId,
                                                assignment.nombre,
                                                assignment.role,
                                            )
                                            const adjustmentData = adjustmentsByIdentifier.get(identifier)
                                            const porcentajeAcumulado = adjustmentData?.percentageTotal ?? 0
                                            const deltaPorcentaje = assignment.netAmount * (porcentajeAcumulado / 100)
                                            const netoConAjustes =
                                                assignment.netAmount +
                                                (adjustmentData?.amountTotal ?? 0) +
                                                deltaPorcentaje

                                            return (
                                                <div
                                                    key={`${section.key}-${assignment.staffId ?? assignment.nombre}`}
                                                    className="rounded-lg border bg-muted/20 p-4"
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-foreground">{assignment.nombre}</p>
                                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                                {assignment.role ?? "Sin rol"}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <Badge variant="secondary" className="text-xs">
                                                                Neto snapshot: {formatCurrency(assignment.netAmount)}
                                                            </Badge>
                                                            {adjustmentData && (adjustmentData.amountTotal !== 0 || porcentajeAcumulado !== 0) ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        "text-xs" +
                                                                        (netoConAjustes < assignment.netAmount
                                                                            ? " text-destructive border-destructive/60"
                                                                            : " text-emerald-700 border-emerald-400/70")
                                                                    }
                                                                >
                                                                    Neto ajustado: {formatCurrency(netoConAjustes)}
                                                                </Badge>
                                                            ) : null}
                                                            {adjustmentData && adjustmentData.percentageTotal !== 0 ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        "text-xs" +
                                                                        (adjustmentData.percentageTotal < 0
                                                                            ? " text-destructive border-destructive/60"
                                                                            : " text-emerald-700 border-emerald-400/70")
                                                                    }
                                                                >
                                                                    % ajustes: {adjustmentData.percentageTotal.toFixed(2)}%
                                                                </Badge>
                                                            ) : null}
                                                            {adjustmentData && adjustmentData.amountTotal !== 0 ? (
                                                                <Badge variant="default" className="text-xs">
                                                                    Neto ajustado: {formatCurrency(netoConAjustes)}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                                                        <li className="flex justify-between">
                                                            <span>Monto asignado</span>
                                                            <span className="font-medium text-foreground">{formatCurrency(bruto)}</span>
                                                        </li>
                                                        <li className="flex justify-between">
                                                            <span>Penalización ({assignment.penaltyPercentage}% )</span>
                                                            <span>{formatCurrency(assignment.penaltyAmount)}</span>
                                                        </li>
                                                        <li className="flex justify-between">
                                                            <span>Deducciones directas</span>
                                                            <span>{formatCurrency(assignment.deductionAmount)}</span>
                                                        </li>
                                                        <Separator className="my-2" />
                                                        <li className="flex justify-between text-foreground">
                                                            <span>Total neto</span>
                                                            <span className="font-semibold">{formatCurrency(assignment.netAmount)}</span>
                                                        </li>
                                                        {adjustmentData && (adjustmentData.amountTotal !== 0 || porcentajeAcumulado !== 0) ? (
                                                            <li className="flex justify-between text-foreground">
                                                                <span>Total ajustes (monto + %)</span>
                                                                <span className="font-semibold">
                                                                    {formatSignedCurrency(
                                                                        (adjustmentData?.amountTotal ?? 0) + deltaPorcentaje,
                                                                    )}
                                                                </span>
                                                            </li>
                                                        ) : null}
                                                        {adjustmentData && (adjustmentData.amountTotal !== 0 || porcentajeAcumulado !== 0) ? (
                                                            <li className="flex justify-between text-foreground">
                                                                <span>Neto ajustado</span>
                                                                <span className="font-semibold">
                                                                    {formatCurrency(netoConAjustes)}
                                                                </span>
                                                            </li>
                                                        ) : null}
                                                        {adjustmentData && adjustmentData.percentageTotal !== 0 ? (
                                                            <li className="text-[11px] text-muted-foreground">
                                                                Ajuste porcentual acumulado: {adjustmentData.percentageTotal.toFixed(2)}%
                                                            </li>
                                                        ) : null}
                                                        {totalDescuentos > 0 ? (
                                                            <li className="text-[11px] text-muted-foreground">
                                                                Descuentos totales: {formatCurrency(totalDescuentos)}
                                                            </li>
                                                        ) : null}
                                                    </ul>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            Este cierre no tiene integrantes registrados.
                        </CardContent>
                    </Card>
                )}
            </section>
        </main>
    )
}

export default ClosureDetailPage
