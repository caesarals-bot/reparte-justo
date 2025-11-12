import { MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table"
import type { AdminRestaurant } from "@/data/admin"
import { type AdminSectionProps } from "./section-types"

type AdminRestaurantsProps = AdminSectionProps & {
  restaurants: AdminRestaurant[]
}

const statusStyles: Record<AdminRestaurant["status"], { label: string; className: string }> = {
  activo: {
    label: "Activo",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
  en_revision: {
    label: "En revisión",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
}

const modeLabels: Record<AdminRestaurant["mode"], string> = {
  pool: "Pocillo",
  directa: "Venta directa",
}

const AdminRestaurants = ({ sectionId, restaurants }: AdminRestaurantsProps) => {
  const headingId = sectionId ? `${sectionId}-heading` : undefined

  const hasRestaurants = restaurants.length > 0

  return (
    <section id={sectionId} aria-labelledby={headingId} className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-2 @container/card-header:gap-3 @container/card-header:has-[data-slot=card-action]:flex-row @container/card-header:has-[data-slot=card-action]:items-start @container/card-header:has-[data-slot=card-action]:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle id={headingId}>Gestión de restaurantes</CardTitle>
              <CardDescription>
                Revisa el estado de cada sucursal, su modo de liquidación y última actualización registrada.
              </CardDescription>
            </div>
            <CardAction>
              <Button size="sm" className="gap-2" aria-label="Agregar nuevo restaurante">
                Agregar restaurante
              </Button>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {!hasRestaurants ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Aún no hay restaurantes creados. Añade uno para comenzar a gestionar cierres y equipos.
            </p>
          ) : (
            <Table>
              <TableCaption className="px-6">
                Listado general de restaurantes registrados en la plataforma.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Restaurante</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Último cierre</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                  <TableHead className="text-right" aria-label="Acciones">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant) => {
                  const { label, className } = statusStyles[restaurant.status]

                  return (
                    <TableRow key={restaurant.id}>
                      <TableCell className="px-6 text-sm font-semibold text-foreground">
                        {restaurant.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{restaurant.location}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{restaurant.staffCount} personas</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {modeLabels[restaurant.mode]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{restaurant.lastSettlement}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={className}>
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              aria-label="Abrir acciones"
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                            <DropdownMenuItem>Configurar integraciones</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive">Marcar en revisión</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

export default AdminRestaurants
