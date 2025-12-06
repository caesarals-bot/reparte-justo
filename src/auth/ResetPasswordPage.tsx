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
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/firebase/config"
import { AlertCircle, CheckCircle2, Mail } from "lucide-react"

type ResetPasswordFormValues = {
    email: string
}

type ResetPasswordFieldErrors = Partial<Record<keyof ResetPasswordFormValues, string>>

const ResetPasswordPage = () => {
    const [formValues, setFormValues] = useState<ResetPasswordFormValues>({ email: "" })
    const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({})
    const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [emailSent, setEmailSent] = useState(false)

    const handleInputChange = (field: keyof ResetPasswordFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
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

        const nextErrors: ResetPasswordFieldErrors = {}

        if (!trimmedEmail) {
            nextErrors.email = "Ingresa tu correo electrónico."
        } else if (!trimmedEmail.includes("@")) {
            nextErrors.email = "El correo debe ser válido."
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
            await sendPasswordResetEmail(auth, trimmedEmail, {
                url: window.location.origin + "/auth/login",
                handleCodeInApp: false,
            })

            setEmailSent(true)
            setFormMessage({
                type: "success",
                text: `Hemos enviado un enlace de recuperación a ${trimmedEmail}. Revisa tu bandeja de entrada y spam.`,
            })
        } catch (error) {
            const firebaseError = error as { code?: string }

            if (firebaseError.code === "auth/user-not-found") {
                // Por seguridad, no revelamos si el email existe o no
                setEmailSent(true)
                setFormMessage({
                    type: "success",
                    text: `Si existe una cuenta con ${trimmedEmail}, recibirás un enlace de recuperación.`,
                })
                return
            }

            if (firebaseError.code === "auth/invalid-email") {
                setFieldErrors({ email: "El formato del correo no es válido." })
                return
            }

            if (firebaseError.code === "auth/too-many-requests") {
                setFormMessage({
                    type: "error",
                    text: "Demasiados intentos. Por favor, espera unos minutos antes de intentar nuevamente.",
                })
                return
            }

            setFormMessage({
                type: "error",
                text: "No se pudo enviar el correo de recuperación. Inténtalo nuevamente más tarde.",
            })
            console.error("Password reset error", firebaseError)
        } finally {
            setIsSubmitting(false)
        }
    }

    const emailErrorId = fieldErrors.email ? "reset-email-error" : undefined
    const messageId = formMessage ? "reset-form-message" : undefined

    return (
        <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 py-10">
            <Card className="w-full max-w-md border bg-background/90 shadow-lg backdrop-blur">
                <CardHeader className="space-y-6 text-center">
                    <div className="flex items-center justify-between gap-4">
                        <div className="hidden flex-1 sm:block" />
                        <div className="flex flex-1 flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Mail className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-semibold">Recuperar contraseña</CardTitle>
                        </div>
                        <div className="flex flex-1 justify-end">
                            <Button variant="ghost" size="sm" className="px-3" asChild>
                                <Link to="/auth/login" aria-label="Volver a iniciar sesión" tabIndex={0}>
                                    ← Volver
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <CardDescription>
                        {!emailSent 
                            ? "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
                            : "Revisa tu correo electrónico para continuar."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!emailSent ? (
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
                                    autoFocus
                                />
                                {fieldErrors.email && (
                                    <p id={emailErrorId} role="alert" className="text-sm text-destructive">
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full py-3 text-base"
                                tabIndex={0}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium text-green-900 dark:text-green-100">
                                            Correo enviado exitosamente
                                        </p>
                                        <p className="text-green-700 dark:text-green-300">
                                            Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm text-muted-foreground">
                                <p className="flex items-start gap-2">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>Si no recibes el correo en unos minutos, revisa tu carpeta de spam.</span>
                                </p>
                                <p className="text-center">
                                    ¿No recibiste el correo?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmailSent(false)
                                            setFormMessage(null)
                                        }}
                                        className="font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        Intentar de nuevo
                                    </button>
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground">
                    {formMessage && (
                        <div
                            id={messageId}
                            role="status"
                            className={`w-full rounded-md border p-3 text-sm ${
                                formMessage.type === "success"
                                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
                                    : "border-destructive/50 bg-destructive/10 text-destructive"
                            }`}
                        >
                            {formMessage.text}
                        </div>
                    )}
                    <p className="text-center">
                        ¿Recordaste tu contraseña?{" "}
                        <Link
                            to="/auth/login"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            aria-label="Volver a iniciar sesión"
                            tabIndex={0}
                        >
                            Iniciar sesión
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    )
}

export default ResetPasswordPage
