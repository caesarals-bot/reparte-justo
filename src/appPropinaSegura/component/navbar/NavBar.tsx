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
    { label: "Quiénes somos", path: "/about" },
    { label: "FAQ", path: "/faq" },
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
    const { hasSiteRole, accessibleRestaurants } = usePermissions()
    const navigate = useNavigate()
    const location = useLocation()

    // Estilos inline para elementos críticos
    const headerStyles = {
        position: 'sticky' as const,
        top: 0,
        zIndex: 50,
        width: '100%',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(to right,rgba(15,23,42,0.9),rgba(30,41,59,0.8),rgba(15,23,42,0.9))',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 35px rgba(8,15,40,0.55)'
    }

    const containerStyles = {
        display: 'flex',
        height: '72px',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem'
    }

    // Verificar si el usuario tiene roles administrativos
    const isAdmin = hasSiteRole("super_admin") || hasSiteRole("admin") || hasSiteRole("support") || hasSiteRole("viewer")

    // Determina si el usuario tiene un restaurante definido/accesible
    // (si no, está en onboarding y no debería ver navegación operativa)
    const hasRestaurantDefined = accessibleRestaurants.length > 0

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
            if (!isAuthenticated) {
                return link.path === "/" || link.path === "/contact" || link.path === "/about"
            }

            // Mostrar link "Admin" solo si tiene roles administrativos
            if (link.path === "/admin") {
                return isAdmin
            }

            // Si el usuario está autenticado pero aún no tiene restaurante, ocultar navegación operativa
            // y dejar solo /setup para completar onboarding.
            if (isAuthenticated && !isAdmin && !hasRestaurantDefined) {
                if (link.path === "/cierre" || link.path === "/dashboard" || link.path === "/settings") {
                    return false
                }
            }

            // Ocultar link "Ajustes" si el setup ya está completado
            if (link.path === "/setup") {
                return !setupCompleted
            }
            return true
        })
    }, [isAdmin, setupCompleted, isAuthenticated, hasRestaurantDefined])

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
        <header className="header-container" style={headerStyles}>
            <div className="container" style={containerStyles}>
                <Link
                    to="/"
                    className="logo-link"
                    aria-label="Ir al inicio"
                    tabIndex={0}
                >
                    <span className="logo-badge">RJ</span>
                    <span className="logo-text">
                        ReparteJusto
                    </span>
                </Link>
                <nav className="nav-desktop">
                    {visibleNavLinks.map((link) => (
                        <Link key={link.path} to={link.path} className="nav-link" tabIndex={0}>
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
                    className="nav-mobile-btn"
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
