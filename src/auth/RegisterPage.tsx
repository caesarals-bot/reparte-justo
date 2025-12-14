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
import { Link, useNavigate } from "react-router"
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, updateProfile } from "firebase/auth"
import { auth, db, googleProvider } from "@/firebase/config"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"

type RegisterFormValues = {
    name: string
    email: string
    password: string
    confirmPassword: string
    restaurantName: string
}

type RegisterFieldErrors = Partial<Record<keyof RegisterFormValues, string>>

const RegisterPage = () => {
    const [formValues, setFormValues] = useState<RegisterFormValues>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        restaurantName: "",
    })
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
    const [formMessage, setFormMessage] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const navigate = useNavigate()
    const { isAuthenticated, isLoading, userRoles } = useAuth()

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

    const handleInputChange = (field: keyof RegisterFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
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

            // Crear/asegurar documento de usuario SIN roles.
            const userDocument = doc(db, "users", user.uid)
            await setDoc(userDocument, {
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
            }, { merge: true })

            setFormMessage("¡Cuenta creada con Google! Redirigiendo...")
            setTimeout(() => {
                navigate("/setup", { replace: true })
            }, 1500)
        } catch (error) {
            const firebaseError = error as { code?: string }
            
            if (firebaseError.code === "auth/popup-closed-by-user") {
                setFormMessage(null)
                return
            }
            
            if (firebaseError.code === "auth/account-exists-with-different-credential") {
                setFormMessage("Ya existe una cuenta con este correo. Intenta iniciar sesión con email y contraseña.")
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

        const trimmedName = formValues.name.trim()
        const trimmedEmail = formValues.email.trim()
        const trimmedPassword = formValues.password.trim()
        const trimmedConfirmPassword = formValues.confirmPassword.trim()
        const trimmedRestaurantName = formValues.restaurantName.trim()

        const nextErrors: RegisterFieldErrors = {}

        if (!trimmedName) {
            nextErrors.name = "Ingresa tu nombre completo."
        }

        if (!trimmedEmail) {
            nextErrors.email = "Ingresa tu correo electrónico."
        } else if (!trimmedEmail.includes("@")) {
            nextErrors.email = "El correo debe ser válido."
        }

        if (!trimmedPassword) {
            nextErrors.password = "Crea una contraseña."
        } else if (trimmedPassword.length < 8) {
            nextErrors.password = "La contraseña debe tener al menos 8 caracteres."
        } else if (!/[A-Z]/.test(trimmedPassword)) {
            nextErrors.password = "La contraseña debe contener al menos una mayúscula."
        } else if (!/[0-9]/.test(trimmedPassword)) {
            nextErrors.password = "La contraseña debe contener al menos un número."
        }

        if (!trimmedConfirmPassword) {
            nextErrors.confirmPassword = "Repite la contraseña."
        } else if (trimmedConfirmPassword !== trimmedPassword) {
            nextErrors.confirmPassword = "Las contraseñas deben coincidir."
        }

        if (!trimmedRestaurantName) {
            nextErrors.restaurantName = "Ingresa el nombre de tu restaurante."
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors)
            setFormMessage(null)
            return
        }

        setFieldErrors({})
        setIsSubmitting(true)
        setFormMessage(null)

        try {
            const credentials = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)

            if (trimmedName) {
                await updateProfile(credentials.user, { displayName: trimmedName })
            }

            localStorage.setItem("rj_pending_restaurant_name", trimmedRestaurantName)

            // Crear documento de usuario SIN roles (se asignan al crear el restaurante en /setup)
            const userDocument = doc(db, "users", credentials.user.uid)
            await setDoc(userDocument, {
                uid: credentials.user.uid,
                email: trimmedEmail,
                displayName: trimmedName || null,
                
                // Sin roles de sitio (no es admin)
                siteRoles: [],
                
                restaurantRoles: {},
                
                // Timestamps
                createdAt: serverTimestamp(),
                lastLogin: null,
                lastActivity: null,
                
                // Estado de seguridad
                emailVerified: false,
                isActive: true,
                loginAttempts: 0,
                lockedUntil: null,
                
                // Referencia al restaurante principal
                primaryRestaurant: null,
            }, { merge: true })

            // Enviar email de verificación
            try {
                await sendEmailVerification(credentials.user)
                setFormMessage("¡Cuenta creada! Redirigiendo a tu dashboard...")
            } catch (emailError) {
                console.error("Error al enviar email de verificación:", emailError)
                setFormMessage("Cuenta creada. Redirigiendo a tu dashboard...")
            }

            // Redirigir al dashboard
            setTimeout(() => {
                navigate("/setup", { replace: true })
            }, 2000)
        } catch (error) {
            const firebaseError = error as { code?: string }

            if (firebaseError.code === "auth/email-already-in-use") {
                setFieldErrors({ email: "Ya existe una cuenta con este correo." })
                return
            }

            if (firebaseError.code === "auth/weak-password") {
                setFieldErrors({ password: "La contraseña debe ser más segura (mínimo 6 caracteres)." })
                return
            }

            setFormMessage("No se pudo completar el registro. Inténtalo nuevamente más tarde.")
            console.error("Register error", firebaseError)
        } finally {
            setIsSubmitting(false)
        }
    }

    const nameErrorId = fieldErrors.name ? "register-name-error" : undefined
    const emailErrorId = fieldErrors.email ? "register-email-error" : undefined
    const passwordErrorId = fieldErrors.password ? "register-password-error" : undefined
    const confirmPasswordErrorId = fieldErrors.confirmPassword ? "register-confirm-password-error" : undefined
    const restaurantNameErrorId = fieldErrors.restaurantName ? "register-restaurant-name-error" : undefined
    const messageId = formMessage ? "register-form-message" : undefined

    return (
        <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-10">
            <Card className="w-full max-w-md border bg-background/90 shadow-lg backdrop-blur">
                <CardHeader className="space-y-3 text-center">
                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-3"
                            asChild
                        >
                            <Link to="/" aria-label="Volver a la página principal" tabIndex={0}>
                                ← Volver al inicio
                            </Link>
                        </Button>
                    </div>
                    <CardTitle className="text-2xl font-semibold">Crear cuenta</CardTitle>
                    <CardDescription>
                        Completa los datos para comenzar a gestionar la distribución de propinas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-describedby={messageId}>
                        <div className="space-y-2 text-left">
                            <Label htmlFor="name">Nombre del contacto</Label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                placeholder="Ej. María Rojas"
                                value={formValues.name}
                                onChange={handleInputChange("name")}
                                aria-invalid={Boolean(fieldErrors.name)}
                                aria-describedby={nameErrorId}
                                tabIndex={0}
                            />
                            {fieldErrors.name && (
                                <p id={nameErrorId} role="alert" className="text-sm text-destructive">
                                    {fieldErrors.name}
                                </p>
                            )}
                        </div>

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
                                autoComplete="new-password"
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

                        <div className="space-y-2 text-left">
                            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                placeholder="********"
                                value={formValues.confirmPassword}
                                onChange={handleInputChange("confirmPassword")}
                                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                                aria-describedby={confirmPasswordErrorId}
                                tabIndex={0}
                            />
                            {fieldErrors.confirmPassword && (
                                <p id={confirmPasswordErrorId} role="alert" className="text-sm text-destructive">
                                    {fieldErrors.confirmPassword}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 text-left">
                            <Label htmlFor="restaurantName">Nombre del restaurante</Label>
                            <input
                                id="restaurantName"
                                name="restaurantName"
                                type="text"
                                autoComplete="organization"
                                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                placeholder="Ej. Restaurante El Buen Sabor"
                                value={formValues.restaurantName}
                                onChange={handleInputChange("restaurantName")}
                                aria-invalid={Boolean(fieldErrors.restaurantName)}
                                aria-describedby={restaurantNameErrorId}
                                tabIndex={0}
                            />
                            {fieldErrors.restaurantName && (
                                <p id={restaurantNameErrorId} role="alert" className="text-sm text-destructive">
                                    {fieldErrors.restaurantName}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3 text-base"
                            tabIndex={0}
                            disabled={isSubmitting || isLoading || isGoogleLoading}
                        >
                            {isSubmitting || isLoading ? "Creando cuenta..." : "Crear cuenta"}
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
                                "Conectando..."
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
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground">
                    {formMessage && (
                        <p id={messageId} role="status" className="text-sm text-primary">
                            {formMessage}
                        </p>
                    )}
                    <p className="text-center">
                        ¿Ya tienes cuenta?{" "}
                        <Link
                            to="/auth/login"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            aria-label="Ir a la página de inicio de sesión"
                            tabIndex={0}
                        >
                            Inicia sesión
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    )
}

export default RegisterPage
