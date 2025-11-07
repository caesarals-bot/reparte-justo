import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const handleToggleMenu = () => {
        setIsMenuOpen((previousState) => !previousState)
    }

    const handleCloseMenu = () => {
        setIsMenuOpen(false)
    }

    const handleDismissOverlay = () => {
        handleCloseMenu()
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
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                    <div className="flex items-center gap-3">
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
                        </div>
                    </nav>
                </>
            )}
        </header>
    )
}

export default NavBar
