import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table"
import type { AdminMetric } from "@/data/admin"
import type { AdminRestaurantOverview } from "../hooks/useAdminOverview"
import { type AdminSectionProps } from "./section-types"
import { Link } from "react-router"

type AdminOverviewProps = AdminSectionProps & {
  metrics: AdminMetric[]
  restaurants: AdminRestaurantOverview[]
}

const AdminOverview = ({ sectionId, metrics, restaurants }: AdminOverviewProps) => {
  const headingId = sectionId ? `${sectionId}-heading` : undefined
  const highlightedMetrics = metrics.slice(0, 3)
  
  // Estadísticas de restaurantes
  const totalRestaurants = restaurants.length
  const restaurantsWithPending = restaurants.filter((r) => r.pendingClosures > 0).length
  const restaurantsUpToDate = totalRestaurants - restaurantsWithPending
  
  // Top 5 restaurantes para mostrar
  const topRestaurants = restaurants.slice(0, 5)

  const getTrendPillClass = (trend: AdminMetric["trend"]) => {
    if (trend === "up") {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    }

    if (trend === "down") {
      return "bg-red-500/10 text-red-600 dark:text-red-400"
    }

    return "bg-muted text-muted-foreground"
  }

  const renderTrendIcon = (trend: AdminMetric["trend"]) => {
    if (trend === "up") {
      return <ArrowUpRight className="h-4 w-4" aria-hidden />
    }

    if (trend === "down") {
      return <ArrowDownRight className="h-4 w-4" aria-hidden />
    }

    return <Minus className="h-4 w-4" aria-hidden />
  }

  return (
    <section id={sectionId} aria-labelledby={headingId} className="space-y-8">
      <Card className="border border-white/10 bg-linear-to-br from-card/90 via-card/80 to-background/90 text-white shadow-[0_25px_60px_rgba(3,6,23,0.5)]">
        <CardHeader className="flex flex-col gap-4 border-white/5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">Panel administrativo</CardTitle>
            <CardDescription className="text-white/70">
              Revisa la salud operativa y coordina acciones prioritarias en un mismo lugar.
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" className="self-start text-background">
            Gestionar restaurantes
          </Button>
        </CardHeader>
        <CardContent className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlightedMetrics.map((metric) => (
            <div key={metric.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
              <p className="text-xs text-white/60">{metric.deltaLabel}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">Restaurantes</p>
            <dl className="mt-2 space-y-1 text-sm text-white">
              <div className="flex items-center justify-between">
                <dt className="text-white/70">Total</dt>
                <dd className="font-semibold">{totalRestaurants}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-white/70">Con pendientes</dt>
                <dd className="font-semibold">{restaurantsWithPending}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-white/70">Al día</dt>
                <dd className="font-semibold">{restaurantsUpToDate}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="h-full">
          <CardHeader className="border-b">
            <CardTitle id={headingId}>Visión general</CardTitle>
            <CardDescription>
              Indicadores clave del ecosistema de propinas y salud operativa de ReparteJusto.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6">
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay métricas disponibles aún. Conecta el backend para visualizar actividad en tiempo real.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {metrics.map((metric) => {
                  const pillClasses = getTrendPillClass(metric.trend)
                  const deltaLabel = metric.delta > 0 ? `+${metric.delta}` : `${metric.delta}`

                  return (
                    <div key={metric.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-5">
                      <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-semibold tracking-tight">{metric.value}</span>
                        <span
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                            pillClasses,
                          )}
                        >
                          {renderTrendIcon(metric.trend)}
                          {deltaLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{metric.deltaLabel}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="border-b">
            <CardTitle>Restaurantes recientes</CardTitle>
            <CardDescription>Últimos restaurantes registrados en la plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {topRestaurants.length === 0 ? (
              <p className="px-6 py-6 text-sm text-muted-foreground">
                Aún no hay restaurantes registrados.
              </p>
            ) : (
              <>
                <Table>
                  <TableCaption className="px-6">Mostrando {topRestaurants.length} de {totalRestaurants} restaurantes.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Restaurante</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Pendientes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRestaurants.map((restaurant) => (
                      <TableRow key={restaurant.id}>
                        <TableCell className="px-6 text-sm font-medium text-foreground">{restaurant.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{restaurant.staffCount} personas</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={restaurant.pendingClosures > 0 ? "destructive" : "secondary"}>
                            {restaurant.pendingClosures}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-6 py-4">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/admin/restaurants">Ver todos los restaurantes</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default AdminOverview
