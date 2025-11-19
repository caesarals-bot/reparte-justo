import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { doc, getDoc } from "firebase/firestore"

import { Dashboard } from "../component/dashboard/dashboard"
import type { DashboardMember, DashboardPaymentGroup, DashboardSettlement } from "@/data/dashboard"
import { useClosuresDashboard } from "./hooks/useClosuresDashboard"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/firebase/config"
import { Card, CardContent } from "@/components/ui/card"

const formatReferenceDate = (value?: string | null) => {
    if (!value) {
        return "Sin fecha definida"
    }

    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
        return "Fecha no válida"
    }

    return format(parsedDate, "d 'de' MMMM yyyy", { locale: es })
}

const formatClosureLabel = (referenceDate?: string | null, fallbackId?: string) => {
    const formattedDate = formatReferenceDate(referenceDate)

    if (formattedDate === "Sin fecha definida" && fallbackId) {
        return `Cierre ${fallbackId.slice(0, 6)}`
    }

    return `Cierre del ${formattedDate}`
}

const buildMemberIdentifier = (staffId?: string, name?: string, role?: string | null) =>
    staffId ?? `${name ?? ""}|${role ?? ""}`

const DashboardPage = () => {
    const { uid } = useAuth()
    const [restaurantName, setRestaurantName] = useState<string>("Tu restaurante")
    const [liquidacionMode, setLiquidacionMode] = useState<"pool" | "directa">("pool")
    const [isLoadingConfig, setIsLoadingConfig] = useState(true)
    const [configError, setConfigError] = useState<string | null>(null)

    const { historicalClosures, pendingClosures, isLoading, error } = useClosuresDashboard({ uid })

    useEffect(() => {
        if (!uid) {
            setConfigError("Inicia sesión para acceder al dashboard.")
            setIsLoadingConfig(false)
            return
        }

        const fetchConfiguration = async () => {
            try {
                setIsLoadingConfig(true)
                const restaurantReference = doc(db, "restaurants", uid)
                const snapshot = await getDoc(restaurantReference)

                if (!snapshot.exists()) {
                    setConfigError("Aún no completas la configuración inicial. Configúrala para ver el dashboard.")
                    return
                }

                const data = snapshot.data() as { restaurantName?: string; settlementMode?: "pool" | "directa" }

                if (data.restaurantName) {
                    setRestaurantName(data.restaurantName)
                }

                if (data.settlementMode === "directa") {
                    setLiquidacionMode("directa")
                } else {
                    setLiquidacionMode("pool")
                }

                setConfigError(null)
            } catch (fetchError) {
                console.error("Error al cargar la configuración para el dashboard", fetchError)
                setConfigError("No pudimos cargar la configuración guardada. Intenta nuevamente en unos segundos.")
            } finally {
                setIsLoadingConfig(false)
            }
        }

        void fetchConfiguration()
    }, [uid])

    const pendingData = useMemo<DashboardPaymentGroup[]>(() => {
        if (!pendingClosures.length) {
            return []
        }

        const servicioMembersMap = new Map<string, DashboardMember>()
        const cocinaMembersMap = new Map<string, DashboardMember>()
        const ajustesRows: DashboardMember[] = []

        const accumulateAssignment = (
            assignment: {
                present: boolean
                staffId?: string
                nombre: string
                role?: string | null
                netAmount: number
                netAmountAdjusted?: number
                deductionAmount: number
                penaltyAmount: number
            },
            map: Map<string, DashboardMember>,
        ) => {
            if (!assignment.present) {
                return
            }

            const identifier = buildMemberIdentifier(assignment.staffId, assignment.nombre, assignment.role)
            const netAmount = assignment.netAmountAdjusted ?? assignment.netAmount
            const totalDescuentos = assignment.deductionAmount + assignment.penaltyAmount
            const existing = map.get(identifier)

            if (existing) {
                existing.amount += netAmount
                existing.totalDescuentos += totalDescuentos
            } else {
                map.set(identifier, {
                    id: identifier,
                    name: assignment.nombre,
                    amount: netAmount,
                    totalDescuentos,
                })
            }
        }

        let transbankTotal = 0
        let ajustesTotal = 0

        pendingClosures.forEach((closure) => {
            closure.assignments.servicio.forEach((assignment) => accumulateAssignment(assignment, servicioMembersMap))
            closure.assignments.cocina.forEach((assignment) => accumulateAssignment(assignment, cocinaMembersMap))

            const transbankAmount = Math.max(0, closure.totals.transbankAmount)
            transbankTotal += transbankAmount

            const findBaseNetForAdjustment = (staffId?: string, staffName?: string): number => {
                if (!staffId && !staffName) {
                    return 0
                }

                const matches = (assignment: { staffId?: string; nombre: string; netAmount: number }) => {
                    if (staffId && assignment.staffId) {
                        return assignment.staffId === staffId
                    }

                    if (!staffId && staffName) {
                        return assignment.nombre === staffName
                    }

                    return false
                }

                const pools = [
                    ...closure.assignments.servicio,
                    ...closure.assignments.cocina,
                    ...closure.assignments.ventaDirecta,
                    ...closure.assignments.pocilloSecundario,
                ]

                const found = pools.find(matches)
                return found?.netAmount ?? 0
            }

            closure.adjustments.forEach((adjustment) => {
                const hasAmount = adjustment.variant === "monto" && adjustment.amount !== 0
                const hasPercentage = adjustment.variant === "porcentaje" && (adjustment.percentage ?? 0) !== 0

                if (!hasAmount && !hasPercentage) {
                    return
                }

                const percentageDelta = hasPercentage
                    ? (() => {
                          const baseNet = findBaseNetForAdjustment(adjustment.staffId, adjustment.staffName)
                          if (!baseNet) return 0
                          const signedPercent =
                              (adjustment.type === "descuento" ? -1 : 1) * ((adjustment.percentage ?? 0) / 100)
                          return baseNet * signedPercent
                      })()
                    : 0

                const amountDelta = hasAmount
                    ? adjustment.type === "descuento"
                        ? -adjustment.amount
                        : adjustment.amount
                    : 0

                const totalDelta = amountDelta + percentageDelta

                // Para la card queremos ver el total de descuentos en CLP (solo valores negativos)
                const descuentoEnPesos = totalDelta < 0 ? -totalDelta : 0

                if (descuentoEnPesos <= 0) {
                    // Ajustes que solo aumentan propina no se cuentan en "Ajustes registrados" (card de descuentos)
                    return
                }

                ajustesTotal += descuentoEnPesos

                const percentageLabel = hasPercentage
                    ? `${adjustment.type === "descuento" ? "-" : "+"}${(adjustment.percentage ?? 0).toFixed(2)}%`
                    : null

                const motivoLabel = adjustment.motivo
                    ? adjustment.motivo.split(" ").slice(0, 3).join(" ")
                    : undefined

                const pieces = [percentageLabel, motivoLabel].filter(Boolean) as string[]
                const deductionLabel =
                    pieces.join(" • ") || (hasAmount ? "Ajuste por monto" : "Ajuste porcentual sobre neto")

                ajustesRows.push({
                    id: adjustment.id,
                    name: adjustment.staffName ?? "Ajuste general",
                    amount: descuentoEnPesos,
                    totalDescuentos: 0,
                    deductionLabel,
                })
            })
        })

        const servicioMembers = Array.from(servicioMembersMap.values()).sort((a, b) => b.amount - a.amount)
        const cocinaMembers = Array.from(cocinaMembersMap.values()).sort((a, b) => b.amount - a.amount)

        const servicioTotal = servicioMembers.reduce((sum, member) => sum + member.amount, 0)
        const cocinaTotal = cocinaMembers.reduce((sum, member) => sum + member.amount, 0)

        const nextGroups: DashboardPaymentGroup[] = []

        if (servicioMembers.length) {
            nextGroups.push({
                groupName: "Pool Garzones",
                description: "Total neto acumulado por cada integrante del staff de servicio.",
                totalAmount: servicioTotal,
                breakdown: servicioMembers,
                category: "distribution",
            })
        }

        if (cocinaMembers.length) {
            nextGroups.push({
                groupName: "Pool Cocina",
                description: "Total neto acumulado por cada integrante del staff de cocina.",
                totalAmount: cocinaTotal,
                breakdown: cocinaMembers,
                category: "distribution",
            })
        }

        if (transbankTotal > 0) {
            nextGroups.push({
                groupName: "Transbank y descuentos",
                description: "Cargos automáticos.",
                totalAmount: transbankTotal,
                breakdown: [
                    {
                        id: "transbank",
                        name: "Transbank",
                        amount: transbankTotal,
                        totalDescuentos: 0,
                        deductionLabel: "Cargo transaccional",
                    },
                ],
                category: "deduction",
            })
        }

        if (ajustesRows.length) {
            nextGroups.push({
                groupName: "Ajustes registrados",
                description: "Ajustes por cierre.",
                totalAmount: ajustesTotal,
                breakdown: ajustesRows,
                category: "deduction",
            })
        }

        return nextGroups
    }, [pendingClosures])

    const historicalData = useMemo<DashboardSettlement[]>(
        () =>
            historicalClosures.map((closure) => ({
                id: closure.id,
                dateRange: formatClosureLabel(closure.metadata.referenceDate, closure.id),
                totalRepartido: closure.totals.netAfterDeductions,
                totalDescuentos: closure.totals.deductionsAmount,
                link: `/dashboard/closures/${closure.id}`,
                status: closure.estado,
            })),
        [historicalClosures],
    )

    const isLoadingDashboard = isLoadingConfig || isLoading

    if (isLoadingDashboard) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="py-12 text-center text-sm text-muted-foreground" aria-busy="true">
                            Cargando resumen de cierres...
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    if (configError || error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-12">
                <section className="w-full max-w-3xl">
                    <Card className="border bg-background/95 shadow-lg">
                        <CardContent className="space-y-4 py-12 text-center text-sm">
                            {configError ? <p className="text-destructive">{configError}</p> : null}
                            {error && !configError ? <p className="text-destructive">{error}</p> : null}
                        </CardContent>
                    </Card>
                </section>
            </main>
        )
    }

    return (
        <Dashboard
            restaurantName={restaurantName}
            liquidacionMode={liquidacionMode}
            pendingData={pendingData}
            historicalData={historicalData}
        />
    )
}

export default DashboardPage
