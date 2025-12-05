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
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"
import { auth, db } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"

type RegisterFormValues = {
    name: string
    email: string
    password: string
    confirmPassword: string
    restaurantName: string
    accountType: "closure_editor" | "liquidator" | ""
}

type RegisterFieldErrors = Partial<Record<keyof RegisterFormValues, string>>

const RegisterPage = () => {
    const [formValues, setFormValues] = useState<RegisterFormValues>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        restaurantName: "",
        accountType: "",
    })
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
    const [formMessage, setFormMessage] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()
    const { isAuthenticated, isLoading, userRoles } = useAuth()

    useEffect(() => {
        if (!isLoading && isAuthenticated && userRoles) {
            // Solo redirigir si el usuario YA tiene roles asignados
            const hasRoles = userRoles.siteRoles.length > 0 || 
                           Object.keys(userRoles.restaurantRoles).length > 0
            
            if (hasRoles) {
                // Usuario con roles → redirigir al dashboard
                navigate("/admin/overview", { replace: true })
            }
            // Si no tiene roles, se quedará en RegisterPage o irá a /pending después del registro
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

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const trimmedName = formValues.name.trim()
        const trimmedEmail = formValues.email.trim()
        const trimmedPassword = formValues.password.trim()
        const trimmedConfirmPassword = formValues.confirmPassword.trim()
        const trimmedRestaurantName = formValues.restaurantName.trim()
        const accountType = formValues.accountType

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

        if (!accountType) {
            nextErrors.accountType = "Selecciona el tipo de cuenta."
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

            // Crear restaurante automáticamente
            const restaurantId = `rest_${credentials.user.uid}_${Date.now()}`
            const restaurantDoc = doc(db, "restaurants", restaurantId)
            await setDoc(restaurantDoc, {
                id: restaurantId,
                name: trimmedRestaurantName,
                ownerId: credentials.user.uid,
                ownerEmail: trimmedEmail,
                ownerName: trimmedName,
                createdAt: serverTimestamp(),
                isActive: true,
                settings: {
                    timezone: "America/Santiago",
                    currency: "CLP",
                },
            })

            // Crear documento de usuario con rol asignado en el restaurante
            const userDocument = doc(db, "users", credentials.user.uid)
            await setDoc(userDocument, {
                uid: credentials.user.uid,
                email: trimmedEmail,
                displayName: trimmedName || null,
                
                // Sin roles de sitio (no es admin)
                siteRoles: [],
                
                // Rol asignado en el restaurante que acaba de crear
                restaurantRoles: {
                    [restaurantId]: [accountType] // closure_editor o liquidator
                },
                
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
                primaryRestaurant: restaurantId,
            })

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
                navigate("/dashboard", { replace: true })
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
    const accountTypeErrorId = fieldErrors.accountType ? "register-account-type-error" : undefined
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
                            <Label htmlFor="restaurantName">Nombre de tu restaurante</Label>
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

                        <div className="space-y-2 text-left">
                            <Label htmlFor="accountType">Tipo de cuenta</Label>
                            <select
                                id="accountType"
                                name="accountType"
                                className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                value={formValues.accountType}
                                onChange={(e) => {
                                    setFormValues(prev => ({ ...prev, accountType: e.target.value as "closure_editor" | "liquidator" | "" }))
                                    if (fieldErrors.accountType) {
                                        const nextErrors = { ...fieldErrors }
                                        delete nextErrors.accountType
                                        setFieldErrors(nextErrors)
                                    }
                                }}
                                aria-invalid={Boolean(fieldErrors.accountType)}
                                aria-describedby={accountTypeErrorId}
                                tabIndex={0}
                            >
                                <option value="">Selecciona un tipo</option>
                                <option value="closure_editor">Gestor Principal (Crear y editar cierres, gestionar staff)</option>
                                <option value="liquidator">Liquidador (Solo crear liquidaciones)</option>
                            </select>
                            {fieldErrors.accountType && (
                                <p id={accountTypeErrorId} role="alert" className="text-sm text-destructive">
                                    {fieldErrors.accountType}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Como <strong>Gestor Principal</strong> podrás invitar a otros usuarios a tu restaurante.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3 text-base"
                            tabIndex={0}
                            disabled={isSubmitting || isLoading}
                        >
                            {isSubmitting || isLoading ? "Creando cuenta..." : "Crear cuenta"}
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
