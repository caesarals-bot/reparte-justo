import { useCallback, useEffect, useMemo, useState } from "react"
import {
    collection,
    collectionGroup,
    getDocs,
    limit,
    query,
    type DocumentData,
    type QueryDocumentSnapshot,
    type Timestamp,
} from "firebase/firestore"
import { differenceInCalendarDays, format } from "date-fns"
import { es } from "date-fns/locale"

import type { AdminEvent, AdminMetric, AdminRestaurant } from "@/data/admin"
import { adminEvents as seedEvents, adminMetrics as seedMetrics, adminRestaurants as seedRestaurants } from "@/data/admin"
import { db } from "@/firebase/config"

export type AdminHeroStat = {
    id: string
    label: string
    value: string
    helper: string
}

export type AdminRestaurantOverview = AdminRestaurant & {
    lastSettlementDate: Date | null
    daysWithoutSettlement: number
    pendingClosures: number
    contactName?: string
    contactEmail?: string
}

const MAX_CLOSURE_SAMPLE = 120

const mapSeedRestaurantToOverview = (restaurant: AdminRestaurant): AdminRestaurantOverview => ({
    ...restaurant,
    lastSettlementDate: null,
    daysWithoutSettlement: 0,
    pendingClosures: 0,
    contactName: undefined,
    contactEmail: undefined,
})

const seedRestaurantOverview: AdminRestaurantOverview[] = seedRestaurants.map(mapSeedRestaurantToOverview)

const formatDateLabel = (value?: Date | null) => {
    if (!value) {
        return "Sin registros"
    }

    try {
        return format(value, "dd MMM yyyy", { locale: es })
    } catch {
        return "Sin registros"
    }
}

const toDateOrNull = (value: unknown): Date | null => {
    if (!value) {
        return null
    }

    if (value instanceof Date) {
        return value
    }

    if (typeof value === "string") {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    if (typeof value === "object" && value !== null && typeof (value as Timestamp).toDate === "function") {
        return (value as Timestamp).toDate()
    }

    return null
}

type RestaurantDocument = AdminRestaurantOverview & {
    serviceStaffCount: number
    supportStaffCount: number
}

type ClosureOverview = {
    id: string
    restaurantId: string
    estado: string
    referenceDate: Date | null
    createdAt: Date | null
    netAmount: number
}

type StaffTotals = {
    service: number
    support: number
}

const buildHeroStats = (metrics: AdminMetric[]): AdminHeroStat[] =>
    metrics.slice(0, 3).map((metric) => ({
        id: metric.id,
        label: metric.label,
        value: metric.value,
        helper: metric.deltaLabel,
    }))

const computeMetrics = (
    restaurants: RestaurantDocument[],
    closures: ClosureOverview[],
    staffTotals: StaffTotals,
): AdminMetric[] => {
    const totalRestaurants = restaurants.length
    const totalStaff = staffTotals.service + staffTotals.support

    const pendingRestaurantIds = new Set(
        closures.filter((closure) => closure.estado !== "pagado").map((closure) => closure.restaurantId),
    )

    const now = new Date()
    const closuresLastThirtyDays = closures.filter((closure) => {
        const reference = closure.referenceDate ?? closure.createdAt
        if (!reference) {
            return true
        }

        return differenceInCalendarDays(now, reference) <= 30
    })

    const pendingClosures = closures.filter((closure) => closure.estado !== "pagado").length

    const restaurantsMetric: AdminMetric = {
        id: "restaurants",
        label: "Restaurantes activos",
        value: totalRestaurants.toString(),
        delta: pendingRestaurantIds.size,
        deltaLabel: pendingRestaurantIds.size ? `${pendingRestaurantIds.size} con pendientes` : "Todos al día",
        trend: pendingRestaurantIds.size ? "down" : "up",
    }

    const staffMetric: AdminMetric = {
        id: "staff",
        label: "Colaboradores registrados",
        value: totalStaff.toString(),
        delta: staffTotals.service,
        deltaLabel: `${staffTotals.service} servicio • ${staffTotals.support} cocina`,
        trend: totalStaff ? "neutral" : "down",
    }

    const settlementsMetric: AdminMetric = {
        id: "settlements",
        label: "Cierres procesados (30 días)",
        value: closuresLastThirtyDays.length.toString(),
        delta: pendingClosures,
        deltaLabel: pendingClosures ? `${pendingClosures} pendientes` : "Sin pendientes",
        trend: pendingClosures ? "down" : "up",
    }

    return [restaurantsMetric, staffMetric, settlementsMetric]
}

const mapRestaurantDoc = (doc: QueryDocumentSnapshot<DocumentData>): RestaurantDocument => {
    const data = doc.data() ?? {}
    const serviceStaff = Array.isArray(data.serviceStaff) ? data.serviceStaff : []
    const supportStaff = Array.isArray(data.supportStaff) ? data.supportStaff : []

    const location = typeof data.location === "string" && data.location.trim().length ? data.location : "Sin ubicación"
    const mode = data.settlementMode === "directa" ? "directa" : "pool"
    const status = data.status === "en_revision" ? "en_revision" : "activo"
    const contactName = typeof data.responsibleName === "string" ? data.responsibleName : undefined
    const contactEmail = typeof data.contactEmail === "string" ? data.contactEmail : undefined

    return {
        id: doc.id,
        name: typeof data.restaurantName === "string" && data.restaurantName.trim().length ? data.restaurantName : doc.id,
        location,
        staffCount: serviceStaff.length + supportStaff.length,
        serviceStaffCount: serviceStaff.length,
        supportStaffCount: supportStaff.length,
        mode,
        status,
        lastSettlement: "Sin registros",
        lastSettlementDate: null,
        daysWithoutSettlement: 0,
        pendingClosures: 0,
        contactName,
        contactEmail,
    }
}

const mapClosureDoc = (doc: QueryDocumentSnapshot<DocumentData>): ClosureOverview => {
    const data = doc.data() ?? {}
    const metadata = (data.metadata ?? {}) as Record<string, unknown>

    const referenceDate = toDateOrNull(metadata.referenceDate) ?? toDateOrNull(metadata.referenceDateKey)
    const createdAt = toDateOrNull(data.createdAt) ?? toDateOrNull(data.submittedAt)

    const estado = typeof data.estado === "string" ? data.estado : "pendiente"
    const restaurantId = doc.ref.parent.parent?.id ?? (data.restaurantId as string) ?? "desconocido"

    return {
        id: doc.id,
        restaurantId,
        estado,
        referenceDate,
        createdAt,
        netAmount: Number(data.totals?.netAfterDeductions ?? 0) || 0,
    }
}

const buildEvents = (closures: ClosureOverview[], restaurantMap: Map<string, AdminRestaurant>): AdminEvent[] => {
    return closures.slice(0, 8).map((closure) => {
        const reference = closure.referenceDate ?? closure.createdAt
        const titleDate = reference ? format(reference, "dd MMM", { locale: es }) : closure.id
        const actor = restaurantMap.get(closure.restaurantId)?.name ?? closure.restaurantId

        const status: AdminEvent["status"] = closure.estado === "pagado" ? "completado" : closure.estado === "pendiente" ? "pendiente" : "en_progreso"

        return {
            id: closure.id,
            title: `Cierre ${titleDate}`,
            date: reference ? format(reference, "dd MMM, HH:mm", { locale: es }) : "Sin fecha",
            actor,
            status,
        }
    })
}

export const useAdminOverview = () => {
    const [restaurants, setRestaurants] = useState<AdminRestaurantOverview[]>(seedRestaurantOverview)
    const [metrics, setMetrics] = useState<AdminMetric[]>(seedMetrics)
    const [events, setEvents] = useState<AdminEvent[]>(seedEvents)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const heroStats = useMemo(() => buildHeroStats(metrics), [metrics])

    const fetchOverview = useCallback(async () => {
        setIsLoading(true)
        try {
            const [restaurantsSnapshot, closuresSnapshot] = await Promise.all([
                getDocs(collection(db, "restaurants")),
                getDocs(query(collectionGroup(db, "registros_diarios"), limit(MAX_CLOSURE_SAMPLE))),
            ])

            const restaurantDocuments = restaurantsSnapshot.docs.map(mapRestaurantDoc)
            const staffTotals = restaurantDocuments.reduce<StaffTotals>(
                (totals, restaurant) => ({
                    service: totals.service + restaurant.serviceStaffCount,
                    support: totals.support + restaurant.supportStaffCount,
                }),
                { service: 0, support: 0 },
            )

            const closures = closuresSnapshot.docs.map(mapClosureDoc)

            const closureStats = new Map<
                string,
                {
                    lastReference: Date | null
                    pendingCount: number
                }
            >()

            closures.forEach((closure) => {
                const reference = closure.referenceDate ?? closure.createdAt
                const stats = closureStats.get(closure.restaurantId) ?? { lastReference: null, pendingCount: 0 }

                if (closure.estado !== "pagado") {
                    stats.pendingCount += 1
                }

                if (reference && (!stats.lastReference || reference > stats.lastReference)) {
                    stats.lastReference = reference
                }

                closureStats.set(closure.restaurantId, stats)
            })

            const lastClosureByRestaurant = new Map<string, Date>()
            closures.forEach((closure) => {
                const reference = closure.referenceDate ?? closure.createdAt
                if (!reference) {
                    return
                }

                const current = lastClosureByRestaurant.get(closure.restaurantId)
                if (!current || reference > current) {
                    lastClosureByRestaurant.set(closure.restaurantId, reference)
                }
            })

            const normalizedRestaurants: AdminRestaurantOverview[] = restaurantDocuments.map((restaurant) => {
                const stats = closureStats.get(restaurant.id)
                const lastReference = stats?.lastReference ?? lastClosureByRestaurant.get(restaurant.id) ?? null
                const daysWithoutSettlement = lastReference
                    ? Math.max(differenceInCalendarDays(new Date(), lastReference), 0)
                    : 0

                return {
                    ...restaurant,
                    lastSettlement: formatDateLabel(lastReference),
                    lastSettlementDate: lastReference,
                    daysWithoutSettlement,
                    pendingClosures: stats?.pendingCount ?? 0,
                }
            })

            const restaurantMap = new Map<string, AdminRestaurantOverview>(
                normalizedRestaurants.map((restaurant) => [restaurant.id, restaurant]),
            )

            const computedMetrics = computeMetrics(restaurantDocuments, closures, staffTotals)
            const computedEvents = buildEvents(closures, restaurantMap)

            setRestaurants(normalizedRestaurants)
            setMetrics(computedMetrics)
            setEvents(computedEvents)
            setError(null)
        } catch (caughtError) {
            console.error("[useAdminOverview] Error al cargar la vista general", caughtError)
            setError("No pudimos cargar los datos administrativos. Intenta nuevamente.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchOverview()
    }, [fetchOverview])

    return {
        restaurants,
        metrics,
        events,
        heroStats,
        isLoading,
        error,
        refresh: fetchOverview,
    }
}
