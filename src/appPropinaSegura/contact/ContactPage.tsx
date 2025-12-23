import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useAuth } from "@/context/AuthContext"
import { getApiBaseUrl } from "@/appPropinaSegura/cierre/services/closuresApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, CheckCircle2 } from "lucide-react"

type ContactFormValues = {
    name: string
    email: string
    subject: string
    message: string
}

const ContactPage = () => {
    const { user, displayName, email } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const [isTurnstileReady, setIsTurnstileReady] = useState(false)
    const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
    const turnstileWidgetIdRef = useRef<string | null>(null)

    const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || ""

    const canSubmit = useMemo(() => {
        return Boolean(turnstileSiteKey && turnstileToken)
    }, [turnstileSiteKey, turnstileToken])

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactFormValues>({
        defaultValues: {
            name: displayName || "",
            email: email || "",
            subject: "",
            message: "",
        },
    })

    useEffect(() => {
        if (!turnstileSiteKey) {
            setIsTurnstileReady(false)
            return
        }

        if (typeof window === "undefined") {
            return
        }

        const existing = document.querySelector(
            'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
        ) as HTMLScriptElement | null

        const markReadyIfAvailable = () => {
            if (window.turnstile?.render) {
                setIsTurnstileReady(true)
            }
        }

        if (!existing) {
            const script = document.createElement("script")
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
            script.async = true
            script.defer = true
            script.onload = () => markReadyIfAvailable()
            script.onerror = () => setIsTurnstileReady(false)
            document.body.appendChild(script)
        } else {
            markReadyIfAvailable()

            const handleLoad = () => markReadyIfAvailable()
            const handleError = () => setIsTurnstileReady(false)

            existing.addEventListener("load", handleLoad)
            existing.addEventListener("error", handleError)

            return () => {
                existing.removeEventListener("load", handleLoad)
                existing.removeEventListener("error", handleError)
            }
        }
    }, [turnstileSiteKey])

    useEffect(() => {
        if (!isTurnstileReady) {
            return
        }

        if (!turnstileContainerRef.current) {
            return
        }

        if (!window.turnstile?.render) {
            return
        }

        if (turnstileWidgetIdRef.current) {
            return
        }

        const widgetId = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: turnstileSiteKey,
            callback: (token) => {
                setTurnstileToken(token)
            },
            "expired-callback": () => {
                setTurnstileToken(null)
            },
            "error-callback": () => {
                setTurnstileToken(null)
            },
        })

        turnstileWidgetIdRef.current = widgetId
    }, [isTurnstileReady, turnstileSiteKey])

    const handleFormSubmit = async (data: ContactFormValues) => {
        setIsSubmitting(true)
        setSubmitError(null)

        try {
            if (!turnstileSiteKey) {
                throw new Error("TURNSTILE_SITE_KEY_MISSING")
            }

            if (!turnstileToken) {
                throw new Error("TURNSTILE_TOKEN_MISSING")
            }

            const baseUrl = getApiBaseUrl()
            const response = await fetch(`${baseUrl}/contactSubmit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    userId: user?.uid || null,
                    turnstileToken,
                }),
            })

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as { message?: string } | null
                throw new Error(body?.message ?? "Hubo un error al enviar tu mensaje. Por favor intenta nuevamente.")
            }

            setIsSuccess(true)
            reset()
            setTurnstileToken(null)
            if (turnstileWidgetIdRef.current && window.turnstile?.reset) {
                window.turnstile.reset(turnstileWidgetIdRef.current)
            }
            
            setTimeout(() => {
                setIsSuccess(false)
            }, 5000)

        } catch (err) {
            console.error("Error sending message:", err)
            setSubmitError(err instanceof Error ? err.message : "Hubo un error al enviar tu mensaje. Por favor intenta nuevamente.")

            setTurnstileToken(null)
            if (turnstileWidgetIdRef.current && window.turnstile?.reset) {
                window.turnstile.reset(turnstileWidgetIdRef.current)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSendAnother = () => {
        setIsSuccess(false)
    }

    if (isSuccess) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Card className="border-white/10 bg-[rgba(21,24,40,0.7)] backdrop-blur-xl shadow-[0_20px_45px_rgba(5,8,25,0.55)]">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-500">
                            <div className="mb-4 rounded-full bg-emerald-500/20 p-3 text-emerald-400">
                                <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">¡Mensaje enviado!</h2>
                            <p className="mt-2 text-white/70">
                                Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos pronto.
                            </p>
                            <Button 
                                className="mt-6" 
                                variant="outline"
                                onClick={handleSendAnother}
                                aria-label="Enviar otro mensaje de contacto"
                            >
                                Enviar otro mensaje
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Contáctanos</h1>
                <p className="mt-4 text-lg text-white/70">
                    ¿Tienes dudas, sugerencias o necesitas ayuda? Envíanos un mensaje y te responderemos lo antes posible.
                </p>
            </div>

            <Card className="border-white/10 bg-[rgba(21,24,40,0.7)] backdrop-blur-xl shadow-[0_20px_45px_rgba(5,8,25,0.55)]">
                <CardHeader>
                    <CardTitle className="text-white">Envíanos un mensaje</CardTitle>
                    <CardDescription className="text-white/60">
                        Completa el formulario a continuación.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="contact-name" className="text-white">Nombre</Label>
                                <Input
                                    id="contact-name"
                                    placeholder="Tu nombre"
                                    aria-describedby={errors.name ? "name-error" : undefined}
                                    aria-invalid={errors.name ? "true" : "false"}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                                    {...register("name", { required: "El nombre es requerido" })}
                                />
                                {errors.name && (
                                    <p id="name-error" role="alert" className="text-xs text-red-400">
                                        {errors.name.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-email" className="text-white">Email</Label>
                                <Input
                                    id="contact-email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    aria-invalid={errors.email ? "true" : "false"}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                                    {...register("email", { 
                                        required: "El email es requerido",
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: "Email inválido"
                                        }
                                    })}
                                />
                                {errors.email && (
                                    <p id="email-error" role="alert" className="text-xs text-red-400">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact-subject" className="text-white">Asunto</Label>
                            <Input
                                id="contact-subject"
                                placeholder="¿Sobre qué quieres hablarnos?"
                                aria-describedby={errors.subject ? "subject-error" : undefined}
                                aria-invalid={errors.subject ? "true" : "false"}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                                {...register("subject", { required: "El asunto es requerido" })}
                            />
                            {errors.subject && (
                                <p id="subject-error" role="alert" className="text-xs text-red-400">
                                    {errors.subject.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact-message" className="text-white">Mensaje</Label>
                            <Textarea
                                id="contact-message"
                                placeholder="Escribe tu mensaje aquí..."
                                aria-describedby={errors.message ? "message-error" : undefined}
                                aria-invalid={errors.message ? "true" : "false"}
                                className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                                {...register("message", { required: "El mensaje es requerido" })}
                            />
                            {errors.message && (
                                <p id="message-error" role="alert" className="text-xs text-red-400">
                                    {errors.message.message}
                                </p>
                            )}
                        </div>

                        {submitError && (
                            <div role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                                {submitError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-white">Verificación</Label>
                            {!turnstileSiteKey ? (
                                <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                                    El captcha no está configurado.
                                </div>
                            ) : (
                                <div ref={turnstileContainerRef} />
                            )}
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isSubmitting || !canSubmit}
                            aria-label={isSubmitting ? "Enviando mensaje..." : "Enviar mensaje de contacto"}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Enviar Mensaje
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default ContactPage
