import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { Menu, X } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"
import { usePermissions } from "@/hooks/usePermissions"
import { db } from "@/firebase/config"

const NAV_LINKS = [
    { label: "Inicio", path: "/" },
    { label: "Contacto", path: "/contact" },
    { label: "Ajustes", path: "/setup" },
    { label: "Cierres", path: "/cierre" },
    { label: "Dashboard", path: "/dashboard" },
    { label: "Configuración", path: "/settings" },
    { label: "Admin", path: "/admin" },
]

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [setupCompleted, setSetupCompleted] = useState(false)
    const { isAuthenticated, isLoading, displayName, email, signOutUser, user } = useAuth()
    const { hasSiteRole } = usePermissions()
    const navigate = useNavigate()
    const location = useLocation()

    // Verificar si el usuario tiene roles administrativos
    const isAdmin = hasSiteRole("super_admin") || hasSiteRole("admin") || hasSiteRole("support") || hasSiteRole("viewer")

    // Consultar si el setup está completado
    useEffect(() => {
        const checkSetupStatus = async () => {
            if (!user?.uid) return
            
            try {
                // Consultar el documento del usuario para obtener primaryRestaurant
                const userDocRef = doc(db, "users", user.uid)
                const userSnapshot = await getDoc(userDocRef)
                
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.data()
                    const restaurantId = userData.primaryRestaurant || user.uid
                    
                    // Consultar el restaurante para ver si setupCompleted es true
                    const restaurantDocRef = doc(db, "restaurants", restaurantId)
                    const restaurantSnapshot = await getDoc(restaurantDocRef)
                    
                    if (restaurantSnapshot.exists()) {
                        const restaurantData = restaurantSnapshot.data()
                        setSetupCompleted(restaurantData.setupCompleted === true)
                    }
                }
            } catch (error) {
                console.error("Error checking setup status:", error)
            }
        }
        
        checkSetupStatus()
    }, [user])

    // Filtrar links según permisos
    const visibleNavLinks = useMemo(() => {
        return NAV_LINKS.filter(link => {
            // Mostrar link "Admin" solo si tiene roles administrativos
            if (link.path === "/admin") {
                return isAdmin
            }
            // Ocultar link "Ajustes" si el setup ya está completado
            if (link.path === "/setup") {
                return !setupCompleted
            }
            return true
        })
    }, [isAdmin, setupCompleted])

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

    const isActivePath = (path: string) => {
        if (path === "/") {
            return location.pathname === "/"
        }

        return location.pathname.startsWith(path)
    }

    const desktopLinkClassName = (path: string) =>
        `group relative text-base font-semibold tracking-wide text-white/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:rounded-full after:bg-white after:opacity-0 after:transition ${
            isActivePath(path)
                ? "text-white after:opacity-100"
                : "hover:text-white hover:after:opacity-100"
        }`

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
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-linear-to-r from-slate-950/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(8,15,40,0.55)]">
            <div className="container mx-auto flex h-[72px] items-center justify-between px-4">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
                    aria-label="Ir al inicio"
                    tabIndex={0}
                >
                    <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-slate-900">RJ</span>
                    <span className="text-xl font-bold text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.35)]">
                        ReparteJusto
                    </span>
                </Link>
                <nav className="hidden items-center gap-6 md:flex">
                    {visibleNavLinks.map((link) => (
                        <Link key={link.path} to={link.path} className={desktopLinkClassName(link.path)} tabIndex={0}>
                            {link.label}
                        </Link>
                    ))}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                {isAdmin && (
                                    <Link
                                        to="/admin/overview"
                                        className="hidden text-sm font-medium text-white/70 transition hover:text-white lg:inline"
                                        aria-label="Ir al panel administrativo"
                                    >
                                        Panel
                                    </Link>
                                )}
                                <div className="group relative flex items-center">
                                    <div className="flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-1">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>{userInitials}</AvatarFallback>
                                        </Avatar>
                                        <span className="sr-only">{displayName || email}</span>
                                    </div>
                                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded-md border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white opacity-0 backdrop-blur group-hover:opacity-100">
                                        <p>{displayName || email}</p>
                                        <p className="text-[11px] font-normal text-white/80">Sesión activa</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white/80 hover:text-white"
                                    onClick={handleSignOut}
                                    aria-label="Cerrar sesión"
                                >
                                    Salir
                                </Button>
                            </>
                        ) : (
                            !isLoading && (
                                <>
                                    <Button variant="ghost" className="px-4 text-white/70 hover:text-white" asChild>
                                        <Link to="/auth/login" aria-label="Ir a iniciar sesión" tabIndex={0}>
                                            Ingresar
                                        </Link>
                                    </Button>
                                    <Button className="px-4 bg-linear-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40" asChild>
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
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white shadow-lg shadow-black/30 transition hover:border-primary/60 md:hidden"
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
                    <nav className="fixed inset-x-0 top-16 z-50 border-b border-t border-white/10 bg-slate-950/95 pb-6 pt-4 shadow-2xl md:hidden">
                        <div className="container mx-auto flex flex-col gap-2 px-4">
                            {visibleNavLinks.map((link) => (
                                <Button
                                    key={link.path}
                                    variant="ghost"
                                    className={`justify-start px-4 text-base ${
                                        isActivePath(link.path)
                                            ? "text-primary"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    asChild
                                >
                                    <Link
                                        to={link.path}
                                        aria-label={`Ir a ${link.label.toLowerCase()}`}
                                        tabIndex={0}
                                        onClick={handleCloseMenu}
                                    >
                                        {link.label}
                                    </Link>
                                </Button>
                            ))}
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
                                    <Button
                                        size="sm"
                                        className="bg-linear-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40"
                                        onClick={() => {
                                            handleCloseMenu()
                                            void handleSignOut()
                                        }}
                                    >
                                        Cerrar sesión
                                    </Button>
                                </div>
                            ) : (
                                !isLoading && (
                                    <>
                                        <Button variant="ghost" className="justify-start px-4 text-muted-foreground" asChild>
                                            <Link
                                                to="/auth/login"
                                                aria-label="Ir a iniciar sesión"
                                                tabIndex={0}
                                                onClick={handleCloseMenu}
                                            >
                                                Ingresar
                                            </Link>
                                        </Button>
                                        <Button
                                            className="justify-start px-4 bg-linear-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40"
                                            asChild
                                        >
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
