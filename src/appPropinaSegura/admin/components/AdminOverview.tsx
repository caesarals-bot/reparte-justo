import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { AdminEvent, AdminMetric } from "@/data/admin"
import { type AdminSectionProps } from "./section-types"

type AdminOverviewProps = AdminSectionProps & {
  metrics: AdminMetric[]
  events: AdminEvent[]
}

const AdminOverview = ({ sectionId, metrics, events }: AdminOverviewProps) => {
  const headingId = sectionId ? `${sectionId}-heading` : undefined

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

  const getStatusBadgeStyles = (status: AdminEvent["status"]) => {
    if (status === "completado") {
      return {
        label: "Completado",
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
      }
    }

    if (status === "en_progreso") {
      return {
        label: "En progreso",
        className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
      }
    }

    return {
      label: "Pendiente",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    }
  }

  const getEventInitials = (actor: string) => {
    if (!actor?.trim()) {
      return "?"
    }

    const [first = "", second = ""] = actor.split(" ")
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
  }

  return (
    <section id={sectionId} aria-labelledby={headingId} className="space-y-6">
      <Card>
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Eventos importantes registrados en los últimos cierres.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {events.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Aún no hay actividad registrada. Comienza realizando cierres diarios para ver actualizaciones aquí.
            </p>
          ) : (
            <Table>
              <TableCaption className="px-6">Últimas acciones del panel administrativo.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Evento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const { label, className } = getStatusBadgeStyles(event.status)

                  return (
                    <TableRow key={event.id}>
                      <TableCell className="px-6 text-sm font-medium text-foreground">{event.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{event.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[11px] font-semibold uppercase">
                              {getEventInitials(event.actor)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{event.actor}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={className}>
                          {label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export default AdminOverview
