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
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"

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
    const navigate = useNavigate()
    const { isAuthenticated, isLoading } = useAuth()

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/admin/overview", { replace: true })
        }
    }, [isAuthenticated, isLoading, navigate])

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

        setFieldErrors({})
        setIsSubmitting(true)
        setFormMessage(null)

        try {
            await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
            navigate("/admin/overview", { replace: true })
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

                        <Button
                            type="submit"
                            className="w-full py-3 text-base"
                            tabIndex={0}
                            disabled={isSubmitting || isLoading}
                        >
                            {isSubmitting || isLoading ? "Ingresando..." : "Ingresar"}
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
