import { type ChangeEvent, type FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Link, useNavigate } from "react-router"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { auth, db, googleProvider } from "@/firebase/config"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import { useTurnstile } from "@/hooks/useTurnstile"

type LoginFormValues = {
    email: string
    password: string
}

type LoginFieldErrors = Partial<Record<keyof LoginFormValues, string>>

const LoginPage = () => {
    const [formValues, setFormValues] = useState<LoginFormValues>({ email: "", password: "" })
    const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
    const [formMessage, setFormMessage] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const navigate = useNavigate()
    const { isAuthenticated, isLoading, userRoles } = useAuth()
    
    const { containerRef: turnstileRef, isVerified: isTurnstileVerified } = useTurnstile()
    const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || ""
    const requireTurnstile = Boolean(turnstileSiteKey)

    useEffect(() => {
        if (!isLoading && isAuthenticated && userRoles) {
            // Verificar si el usuario tiene roles de sitio (admin)
            const hasSiteRoles = userRoles.siteRoles.length > 0
            const hasRestaurantRoles = Object.keys(userRoles.restaurantRoles).length > 0
            
            if (hasSiteRoles) {
                // Usuario administrador → panel admin
                navigate("/admin/overview", { replace: true })
            } else if (hasRestaurantRoles) {
                // Usuario normal con roles de restaurante → dashboard
                navigate("/dashboard", { replace: true })
            } else {
                // Usuario sin roles → flujo de setup para crear restaurante
                navigate("/setup", { replace: true })
            }
        }
    }, [isAuthenticated, isLoading, userRoles, navigate])

    const handleInputChange = (field: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target

        setFormValues((previousValues) => ({
            ...previousValues,
            [field]: value,
        }))

        setFieldErrors((previousErrors) => {
            if (!previousErrors[field]) {
                return previousErrors
            }

            const nextErrors = { ...previousErrors }
            delete nextErrors[field]
            return nextErrors
        })

        setFormMessage(null)
    }

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true)
        setFormMessage(null)

        try {
            const result = await signInWithPopup(auth, googleProvider)
            const user = result.user

            // Verificar si el usuario ya existe en Firestore
            const userDocRef = doc(db, "users", user.uid)
            const userSnapshot = await getDoc(userDocRef)

            if (!userSnapshot.exists()) {
                // Usuario nuevo - crear documento de usuario sin roles.
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || null,
                    siteRoles: [],
                    restaurantRoles: {},
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    lastActivity: null,
                    emailVerified: user.emailVerified,
                    isActive: true,
                    loginAttempts: 0,
                    lockedUntil: null,
                    primaryRestaurant: null,
                    authProvider: "google",
                })

                setFormMessage("¡Cuenta creada! Redirigiendo...")
                setTimeout(() => {
                    navigate("/setup", { replace: true })
                }, 1500)
            }
            // Si el usuario ya existe, el useEffect se encarga de la redirección
        } catch (error) {
            const firebaseError = error as { code?: string }
            
            if (firebaseError.code === "auth/popup-closed-by-user") {
                setFormMessage(null)
                return
            }

            console.error("Google sign-in error:", firebaseError)
            setFormMessage("Error al iniciar sesión con Google. Inténtalo nuevamente.")
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const trimmedEmail = formValues.email.trim()
        const trimmedPassword = formValues.password.trim()

        const nextErrors: LoginFieldErrors = {}

        if (!trimmedEmail) {
            nextErrors.email = "Ingresa tu correo electrónico."
        } else if (!trimmedEmail.includes("@")) {
            nextErrors.email = "El correo debe ser válido."
        }

        if (!trimmedPassword) {
            nextErrors.password = "Ingresa tu contraseña."
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors)
            setFormMessage(null)
            return
        }

        // Validar Turnstile si está configurado
        if (requireTurnstile && !isTurnstileVerified) {
            setFormMessage("Completa la verificación de seguridad.")
            return
        }

        setFieldErrors({})
        setIsSubmitting(true)
        setFormMessage(null)

        try {
            await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
            // La redirección se maneja automáticamente en el useEffect
            // según los roles del usuario (dashboard o pending)
        } catch (error) {
            const firebaseError = error as { code?: string }

            if (firebaseError.code === "auth/invalid-credential") {
                setFieldErrors({ password: "Credenciales inválidas. Revisa correo y contraseña." })
                return
            }

            if (firebaseError.code === "auth/user-not-found") {
                setFieldErrors({ email: "No existe una cuenta con este correo." })
                return
            }

            if (firebaseError.code === "auth/wrong-password") {
                setFieldErrors({ password: "Contraseña incorrecta." })
                return
            }

            setFormMessage("No se pudo iniciar sesión. Inténtalo nuevamente más tarde.")
            console.error("Login error", firebaseError)
        } finally {
            setIsSubmitting(false)
        }
    }

    const emailErrorId = fieldErrors.email ? "login-email-error" : undefined
    const passwordErrorId = fieldErrors.password ? "login-password-error" : undefined
    const messageId = formMessage ? "login-form-message" : undefined

    return (
        <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-10">
            <Card className="w-full max-w-md border bg-background/90 shadow-lg backdrop-blur">
                <CardHeader className="space-y-6 text-center">
                    <div className="flex items-center justify-between gap-4">
                        <div className="hidden flex-1 sm:block" />
                        <CardTitle className="flex-1 text-center text-2xl font-semibold">Iniciar sesión</CardTitle>
                        <div className="flex flex-1 justify-end">
                            <Button variant="ghost" size="sm" className="px-3" asChild>
                                <Link to="/" aria-label="Volver a la página principal" tabIndex={0}>
                                    ← Inicio
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <CardDescription>
                        Ingresa tus credenciales para acceder al panel de ReparteJusto.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-describedby={messageId}>
                        <div className="space-y-2 text-left">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                placeholder="nombre@ejemplo.com"
                                value={formValues.email}
                                onChange={handleInputChange("email")}
                                aria-invalid={Boolean(fieldErrors.email)}
                                aria-describedby={emailErrorId}
                                tabIndex={0}
                            />
                            {fieldErrors.email && (
                                <p id={emailErrorId} role="alert" className="text-sm text-destructive">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 text-left">
                            <Label htmlFor="password">Contraseña</Label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                placeholder="********"
                                value={formValues.password}
                                onChange={handleInputChange("password")}
                                aria-invalid={Boolean(fieldErrors.password)}
                                aria-describedby={passwordErrorId}
                                tabIndex={0}
                            />
                            {fieldErrors.password && (
                                <p id={passwordErrorId} role="alert" className="text-sm text-destructive">
                                    {fieldErrors.password}
                                </p>
                            )}
                        </div>

                        {requireTurnstile && (
                            <div className="flex justify-center">
                                <div ref={turnstileRef} />
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full py-3 text-base"
                            tabIndex={0}
                            disabled={isSubmitting || isLoading || isGoogleLoading || (requireTurnstile && !isTurnstileVerified)}
                        >
                            {isSubmitting || isLoading ? (
                                <span className="inline-flex items-center justify-center gap-2">
                                    <Spinner className="size-5" />
                                    Ingresando...
                                </span>
                            ) : (
                                "Ingresar"
                            )}
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full py-3 text-base"
                            onClick={handleGoogleSignIn}
                            disabled={isSubmitting || isLoading || isGoogleLoading}
                            tabIndex={0}
                        >
                            {isGoogleLoading ? (
                                <span className="inline-flex items-center justify-center gap-2">
                                    <Spinner className="size-5" />
                                    Conectando...
                                </span>
                            ) : (
                                <>
                                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continuar con Google
                                </>
                            )}
                        </Button>

                        <div className="text-center">
                            <Link
                                to="/auth/reset-password"
                                className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                                aria-label="Recuperar contraseña"
                                tabIndex={0}
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground">
                    {formMessage && (
                        <p id={messageId} role="status" className="text-sm text-primary">
                            {formMessage}
                        </p>
                    )}
                    <p className="text-center">
                        ¿No tienes cuenta?{" "}
                        <Link
                            to="/auth/register"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            aria-label="Ir a la página de registro"
                            tabIndex={0}
                        >
                            Crea una cuenta
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    )
}

export default LoginPage
