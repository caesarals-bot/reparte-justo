import { type ChangeEvent, type FormEvent, useState } from "react"
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
import { Link } from "react-router"

type RegisterFormValues = {
    name: string
    email: string
    password: string
    confirmPassword: string
}

type RegisterFieldErrors = Partial<Record<keyof RegisterFormValues, string>>

const RegisterPage = () => {
    const [formValues, setFormValues] = useState<RegisterFormValues>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    })
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
    const [formMessage, setFormMessage] = useState<string | null>(null)

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

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const trimmedName = formValues.name.trim()
        const trimmedEmail = formValues.email.trim()
        const trimmedPassword = formValues.password.trim()
        const trimmedConfirmPassword = formValues.confirmPassword.trim()

        const nextErrors: RegisterFieldErrors = {}

        if (!trimmedName) {
            nextErrors.name = "Ingresa el nombre del contacto."
        }

        if (!trimmedEmail) {
            nextErrors.email = "Ingresa tu correo electrónico."
        } else if (!trimmedEmail.includes("@")) {
            nextErrors.email = "El correo debe ser válido."
        }

        if (!trimmedPassword) {
            nextErrors.password = "Crea una contraseña."
        } else if (trimmedPassword.length < 6) {
            nextErrors.password = "La contraseña debe tener al menos 6 caracteres."
        }

        if (!trimmedConfirmPassword) {
            nextErrors.confirmPassword = "Repite la contraseña."
        } else if (trimmedConfirmPassword !== trimmedPassword) {
            nextErrors.confirmPassword = "Las contraseñas deben coincidir."
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors)
            setFormMessage(null)
            return
        }

        setFieldErrors({})
        setFormMessage("Registro simulado correctamente. Continúa integrando la API cuando esté lista.")
        console.info("Register submitted", {
            name: trimmedName,
            email: trimmedEmail,
            passwordLength: trimmedPassword.length,
        })
    }

    const nameErrorId = fieldErrors.name ? "register-name-error" : undefined
    const emailErrorId = fieldErrors.email ? "register-email-error" : undefined
    const passwordErrorId = fieldErrors.password ? "register-password-error" : undefined
    const confirmPasswordErrorId = fieldErrors.confirmPassword ? "register-confirm-password-error" : undefined
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

                        <Button type="submit" className="w-full py-3 text-base" tabIndex={0}>
                            Crear cuenta
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
