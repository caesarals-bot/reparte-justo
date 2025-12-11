import { useState } from "react"
import { useForm } from "react-hook-form"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"
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

    const handleFormSubmit = async (data: ContactFormValues) => {
        setIsSubmitting(true)
        setSubmitError(null)

        try {
            await addDoc(collection(db, "contact_messages"), {
                ...data,
                userId: user?.uid || null,
                createdAt: serverTimestamp(),
                status: "unread",
                source: "web_contact_form"
            })

            setIsSuccess(true)
            reset()
            
            setTimeout(() => {
                setIsSuccess(false)
            }, 5000)

        } catch (err) {
            console.error("Error sending message:", err)
            setSubmitError("Hubo un error al enviar tu mensaje. Por favor intenta nuevamente.")
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

                        <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isSubmitting}
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
