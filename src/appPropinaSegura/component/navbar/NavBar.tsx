import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { isAuthenticated, isLoading, displayName, email, signOutUser } = useAuth()
    const navigate = useNavigate()

    const userInitials = useMemo(() => {
        const source = displayName || email || ""

        if (!source) {
            return "US"
        }

        const parts = source.trim().split(/[\s@._-]+/).filter(Boolean)
        if (parts.length === 0) {
            return "US"
        }

        const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("")
        return initials || "US"
    }, [displayName, email])

    const handleToggleMenu = () => {
        setIsMenuOpen((previousState) => !previousState)
    }

    const handleCloseMenu = () => {
        setIsMenuOpen(false)
    }

    const handleDismissOverlay = () => {
        handleCloseMenu()
    }

    const handleSignOut = async () => {
        try {
            await signOutUser()
            navigate("/", { replace: true })
        } catch (error) {
            console.error("Error al cerrar sesión", error)
        }
    }

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }

        const handleResize = () => {
            if (window.innerWidth >= 768) {
                handleCloseMenu()
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [])

    useEffect(() => {
        if (typeof document === "undefined") {
            return
        }

        if (isMenuOpen) {
            document.body.style.overflow = "hidden"
            return () => {
                document.body.style.removeProperty("overflow")
            }
        }

        document.body.style.removeProperty("overflow")
        return
    }, [isMenuOpen])

    useEffect(() => {
        if (!isMenuOpen) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleCloseMenu()
            }
        }

        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [isMenuOpen])

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <a
                    href="#hero"
                    className="font-bold text-xl tracking-tight"
                    aria-label="Ir a la sección principal"
                    tabIndex={0}
                >
                    ReparteJusto
                </a>
                <nav className="hidden items-center gap-6 md:flex">
                    <Link
                        to="/"
                        className="text-sm font-medium text-muted-foreground transition hover:text-primary"
                        aria-label="Ir al inicio"
                        tabIndex={0}
                    >
                        Inicio
                    </Link>
                    <Link
                        to="/setup"
                        className="text-sm font-medium text-muted-foreground transition hover:text-primary"
                        aria-label="Ir a ajustes"
                        tabIndex={0}
                    >
                        Ajustes
                    </Link>
                    <Link
                        to="/cierre"
                        className="text-sm font-medium text-muted-foreground transition hover:text-primary"
                        aria-label="Ir a cierres diarios"
                        tabIndex={0}
                    >
                        Cierres
                    </Link>
                    <Link
                        to="/dashboard"
                        className="text-sm font-medium text-muted-foreground transition hover:text-primary"
                        aria-label="Ir al dashboard"
                        tabIndex={0}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/admin"
                        className="text-sm font-medium text-muted-foreground transition hover:text-primary"
                        aria-label="Ir al panel administrativo"
                        tabIndex={0}
                    >
                        Admin
                    </Link>
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/admin/overview"
                                    className="hidden text-sm font-medium text-muted-foreground transition hover:text-primary lg:inline"
                                    aria-label="Ir al panel administrativo"
                                >
                                    Panel
                                </Link>
                                <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{userInitials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-foreground">
                                            {displayName || email}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">Sesión activa</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Cerrar sesión">
                                    Salir
                                </Button>
                            </>
                        ) : (
                            !isLoading && (
                                <>
                                    <Button variant="ghost" className="px-4" asChild>
                                        <Link to="/auth/login" aria-label="Ir a iniciar sesión" tabIndex={0}>
                                            Ingresar
                                        </Link>
                                    </Button>
                                    <Button className="px-4" asChild>
                                        <Link to="/auth/register" aria-label="Ir a registrarse" tabIndex={0}>
                                            Registrar
                                        </Link>
                                    </Button>
                                </>
                            )
                        )}
                    </div>
                </nav>
                <button
                    type="button"
                    onClick={handleToggleMenu}
                    aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                    aria-expanded={isMenuOpen}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border md:hidden"
                    tabIndex={0}
                >
                    {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {isMenuOpen && (
                <>
                    <button
                        type="button"
                        onClick={handleDismissOverlay}
                        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
                        aria-label="Cerrar menú"
                    />
                    <nav className="fixed inset-x-0 top-16 z-50 border-b border-t bg-background/95 pb-6 pt-4 shadow-md md:hidden">
                        <div className="container mx-auto flex flex-col gap-4 px-4">
                            <Button variant="ghost" className="justify-start px-4" asChild>
                                <Link
                                    to="/"
                                    aria-label="Ir al inicio"
                                    tabIndex={0}
                                    onClick={handleCloseMenu}
                                >
                                    Inicio
                                </Link>
                            </Button>
                            <Button variant="ghost" className="justify-start px-4" asChild>
                                <Link
                                    to="/setup"
                                    aria-label="Ir a ajustes"
                                    tabIndex={0}
                                    onClick={handleCloseMenu}
                                >
                                    Ajustes
                                </Link>
                            </Button>
                            <Button variant="ghost" className="justify-start px-4" asChild>
                                <Link
                                    to="/cierre"
                                    aria-label="Ir a cierres diarios"
                                    tabIndex={0}
                                    onClick={handleCloseMenu}
                                >
                                    Cierres
                                </Link>
                            </Button>
                            <Button variant="ghost" className="justify-start px-4" asChild>
                                <Link
                                    to="/dashboard"
                                    aria-label="Ir al dashboard"
                                    tabIndex={0}
                                    onClick={handleCloseMenu}
                                >
                                    Dashboard
                                </Link>
                            </Button>
                            <Button variant="ghost" className="justify-start px-4" asChild>
                                <Link
                                    to="/admin"
                                    aria-label="Ir al panel administrativo"
                                    tabIndex={0}
                                    onClick={handleCloseMenu}
                                >
                                    Admin
                                </Link>
                            </Button>
                            {isAuthenticated ? (
                                <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/90 p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{userInitials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-foreground">{displayName || email}</span>
                                            <span className="text-xs text-muted-foreground">Sesión activa</span>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => { handleCloseMenu(); handleSignOut() }}>
                                        Cerrar sesión
                                    </Button>
                                </div>
                            ) : (
                                !isLoading && (
                                    <>
                                        <Button variant="ghost" className="justify-start px-4" asChild>
                                            <Link
                                                to="/auth/login"
                                                aria-label="Ir a iniciar sesión"
                                                tabIndex={0}
                                                onClick={handleCloseMenu}
                                            >
                                                Ingresar
                                            </Link>
                                        </Button>
                                        <Button className="justify-start px-4" asChild>
                                            <Link
                                                to="/auth/register"
                                                aria-label="Ir a registrarse"
                                                tabIndex={0}
                                                onClick={handleCloseMenu}
                                            >
                                                Registrar
                                            </Link>
                                        </Button>
                                    </>
                                )
                            )}
                        </div>
                    </nav>
                </>
            )}
        </header>
    )
}

export default NavBar
