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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AdminUserGroups, AdminUserData, AdminUserStatus } from "../hooks/useAdminUsers"
import { type AdminSectionProps } from "./section-types"

type AdminUsersProps = AdminSectionProps & {
  users: AdminUserGroups
}

const statusStyles: Record<AdminUserStatus, { label: string; className: string }> = {
  activo: {
    label: "Activo",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
  suspendido: {
    label: "Suspendido",
    className: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  },
  invitado: {
    label: "Invitación",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
}

const AdminUsers = ({ sectionId, users }: AdminUsersProps) => {
  const headingId = sectionId ? `${sectionId}-heading` : undefined

  const renderTable = (groupUsers: AdminUserData[]) => {
    if (groupUsers.length === 0) {
      return (
        <p className="px-6 py-6 text-sm text-muted-foreground">
          Aún no hay usuarios registrados en este grupo. Agrega personas para gestionar accesos.
        </p>
      )
    }

    return (
      <Table>
        <TableCaption className="px-6">Control de cuentas administrativas y operativas.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6">Usuario</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead className="text-right">Estado</TableHead>
            <TableHead className="text-right">Último acceso</TableHead>
            <TableHead className="text-right" aria-label="Acciones">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupUsers.map((user) => {
            const { label, className } = statusStyles[user.status]

            return (
              <TableRow key={user.id}>
                <TableCell className="px-6 text-sm font-semibold text-foreground">{user.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.role}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={className}>
                    {label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{user.lastAccess}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" aria-label="Abrir acciones">
                        Acciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                      <DropdownMenuItem>Editar permisos</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">
                        {user.status === "suspendido" ? "Reactivar cuenta" : "Suspender acceso"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  return (
    <section id={sectionId} aria-labelledby={headingId} className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle id={headingId}>Gestión de usuarios</CardTitle>
          <CardDescription>
            Administra roles administrativos y operativos, controla accesos y resuelve incidencias rápidamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <Tabs defaultValue="administrators" className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="administrators">Administradores</TabsTrigger>
                <TabsTrigger value="operators">Operativos</TabsTrigger>
              </TabsList>
              <Button size="sm" className="gap-2" aria-label="Invitar usuario">
                Invitar usuario
              </Button>
            </div>

            <TabsContent value="administrators" className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Equipo estratégico</h3>
              <div className="overflow-hidden rounded-lg border border-border bg-card/60">
                {renderTable(users.administrators)}
              </div>
            </TabsContent>

            <TabsContent value="operators" className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Operadores de sucursal</h3>
              <div className="overflow-hidden rounded-lg border border-border bg-card/60">
                {renderTable(users.operators)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  )
}

export default AdminUsers
