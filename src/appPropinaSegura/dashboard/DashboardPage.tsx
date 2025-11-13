import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { doc, getDoc } from "firebase/firestore"

import { Dashboard } from "../component/dashboard/dashboard"
import type { DashboardPaymentGroup, DashboardSettlement } from "@/data/dashboard"
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

const DashboardPage = () => {
    const { uid } = useAuth()
    const [restaurantName, setRestaurantName] = useState<string>("Tu restaurante")
    const [liquidacionMode, setLiquidacionMode] = useState<"pool" | "directa">("pool")
    const [isLoadingConfig, setIsLoadingConfig] = useState(true)
    const [configError, setConfigError] = useState<string | null>(null)

    const { historicalClosures, pendingClosures, aggregates, isLoading, error } = useClosuresDashboard({ uid })

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

        const groupedByMode: Record<string, DashboardPaymentGroup> = {}

        pendingClosures.forEach((closure) => {
            const closureLabel = formatClosureLabel(closure.metadata.referenceDate, closure.id)
            const key = closure.mode ?? "pool"

            if (!groupedByMode[key]) {
                groupedByMode[key] = {
                    groupName: key === "directa" ? "Venta directa" : "Pool",
                    description:
                        key === "directa"
                            ? "Propinas registradas por venta directa listadas por integrante."
                            : "Propinas del modo pool acumuladas, distribuidas por integrante.",
                    totalAmount: 0,
                    breakdown: [],
                }
            }

            groupedByMode[key].breakdown.push({
                id: closure.id,
                name: closureLabel,
                amount: closure.totals.netAfterDeductions,
                totalDescuentos: closure.totals.deductionsAmount,
                link: `/dashboard/closures/${closure.id}`,
            })

            groupedByMode[key].totalAmount += closure.totals.netAfterDeductions
        })

        const perPersonGroup: DashboardPaymentGroup = {
            groupName: "Acumulado por integrante",
            description: "Totales netos agrupados por persona considerando todos los cierres pendientes.",
            totalAmount: aggregates.reduce((sum, item) => sum + item.totalNeto, 0),
            breakdown: aggregates.map((item) => ({
                id: item.staffId ?? item.nombre,
                name: item.nombre,
                amount: item.totalNeto,
                totalDescuentos: item.totalDeducciones + item.totalPenalizaciones,
            })),
        }

        return [...Object.values(groupedByMode), perPersonGroup]
    }, [pendingClosures, aggregates])

    const historicalData = useMemo<DashboardSettlement[]>(
        () =>
            historicalClosures.map((closure) => ({
                id: closure.id,
                dateRange: formatClosureLabel(closure.metadata.referenceDate, closure.id),
                totalRepartido: closure.totals.netAfterDeductions,
                totalDescuentos: closure.totals.deductionsAmount,
                link: `/dashboard/closures/${closure.id}`,
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
