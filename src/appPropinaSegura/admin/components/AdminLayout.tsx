import { Fragment, useMemo } from "react"
import { Outlet, Link, useLocation, Navigate } from "react-router"
import type { LucideIcon } from "lucide-react"
import { Building2, Gauge, Users, Menu, Loader2, HelpCircle } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"

type AdminNavigationItem = {
  id: string
  label: string
  description: string
  icon?: LucideIcon
  to: string
}

const adminSections: AdminNavigationItem[] = [
  {
    id: "overview",
    label: "Visión general",
    description: "Indicadores principales y actividad reciente",
    icon: Gauge,
    to: "/admin/overview",
  },
  {
    id: "restaurants",
    label: "Restaurantes",
    description: "Sucursales, modos y cierres",
    icon: Building2,
    to: "/admin/restaurants",
  },
  {
    id: "users",
    label: "Usuarios",
    description: "Administradores y operadores",
    icon: Users,
    to: "/admin/users",
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Gestión de preguntas frecuentes",
    icon: HelpCircle,
    to: "/admin/faq",
  },
]

const AdminLayout = () => {
  const location = useLocation()
  const { isAuthenticated, isLoading, displayName, email } = useAuth()

  const activeSection = useMemo(() => {
    const match = adminSections.find((section) => {
      if (section.to === "/admin/overview") {
        return location.pathname === "/admin" || location.pathname.startsWith(section.to)
      }

      return location.pathname.startsWith(section.to)
    })

    return match ?? adminSections[0]
  }, [location.pathname])

  const userDisplayName = displayName ?? email ?? "Administrador"
  const userInitials = useMemo(() => {
    const source = displayName || email || ""

    if (!source) {
      return "AD"
    }

    const parts = source.trim().split(/[\s@._-]+/).filter(Boolean)

    if (parts.length === 0) {
      return "AD"
    }

    const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("")

    return initials || "AD"
  }, [displayName, email])

  const renderNavLink = (section: AdminNavigationItem, shouldClose = false) => {
    const Icon = section.icon
    const isActive = activeSection.id === section.id
    const linkContent = (
      <Button
        asChild
        variant={isActive ? "secondary" : "ghost"}
        className="justify-start gap-3 px-3 py-2 text-left"
      >
        <Link to={section.to} aria-label={section.label}>
          <span className="flex items-start gap-3">
            {Icon ? <Icon className="mt-0.5 h-4 w-4" aria-hidden /> : null}
            <span className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">{section.label}</span>
              <span className="text-xs text-muted-foreground">{section.description}</span>
            </span>
          </span>
        </Link>
      </Button>
    )

    if (!shouldClose) {
      return linkContent
    }

    return <SheetClose asChild>{linkContent}</SheetClose>
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Cargando panel administrativo…
        </div>
      </div>
    )
  }

  const renderUserCard = () => (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-[0_25px_60px_rgba(3,6,23,0.45)]">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{userDisplayName}</span>
          <span className="text-xs text-white/70">Sesión activa</span>
        </div>
      </div>
      <div className="h-px w-full bg-white/10" aria-hidden />
      <Button
        asChild
        size="sm"
        variant="secondary"
        className="h-9 justify-center gap-2 bg-white/15 text-[#cdd9ff] hover:bg-white/25"
      >
        <Link to="/" aria-label="Volver al inicio">
          ← Volver al inicio
        </Link>
      </Button>
    </div>
  )

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:gap-10 lg:px-10 lg:py-12">
        <aside className="block w-full md:w-64 xl:w-72 md:border-r md:border-white/10 md:pr-8">
          <div className="sticky top-20 flex flex-col gap-6">
            {renderUserCard()}
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Panel administrativo
              </p>
              <h2 className="text-base font-semibold tracking-tight">Navegación</h2>
            </div>
            <ScrollArea className="max-h-[calc(100vh-8rem)] pr-1">
              <nav className="flex flex-col gap-1.5" aria-label="Secciones del panel administrativo">
                {adminSections.map((section) => (
                  <Fragment key={section.id}>{renderNavLink(section)}</Fragment>
                ))}
              </nav>
            </ScrollArea>
          </div>
        </aside>

        <main className="flex-1 pb-16 xl:pb-20">
          <div className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Administración</p>
              <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{activeSection.label}</h1>
              <p className="text-sm text-muted-foreground lg:max-w-2xl">{activeSection.description}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 lg:hidden sticky top-4 z-30 shadow-sm bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80"
                    aria-label="Abrir navegación"
                  >
                    <Menu className="h-4 w-4" aria-hidden />
                    Navegación
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0">
                  <SheetHeader className="border-b px-6 py-4 text-left">
                    <SheetTitle>Panel administrativo</SheetTitle>
                    <SheetDescription>Selecciona una sección para gestionar la plataforma.</SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
                      {renderUserCard()}
                      <nav className="flex flex-col gap-1.5" aria-label="Secciones del panel administrativo">
                        {adminSections.map((section) => (
                          <Fragment key={section.id}>{renderNavLink(section, true)}</Fragment>
                        ))}
                      </nav>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:gap-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
