import type { Request } from "firebase-functions/v1"
import { defineSecret } from "firebase-functions/params"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { z } from "zod"

import { firestoreAdmin } from "../config/firebaseAdmin"

export const TURNSTILE_SECRET = defineSecret("TURNSTILE_SECRET")
export const RESEND_KEY = defineSecret("RESEND_KEY")
export const RESEND_FROM = defineSecret("RESEND_FROM")
export const RESEND_TO = defineSecret("RESEND_TO")

const contactSubmitSchema = z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(180),
    subject: z.string().min(1).max(180),
    message: z.string().min(1).max(4000),
    userId: z.string().min(1).nullable().optional(),
    turnstileToken: z.string().min(10),
})

type ContactSubmitInput = z.infer<typeof contactSubmitSchema>

type TurnstileVerificationResponse = {
    success: boolean
    "error-codes"?: string[]
    challenge_ts?: string
    hostname?: string
    action?: string
    cdata?: string
}

const truncateForLog = (value: string, maxLength: number) => {
    if (value.length <= maxLength) {
        return value
    }

    return `${value.slice(0, maxLength)}…`
}

const getClientIp = (req: Request) => {
    const forwardedFor = req.headers["x-forwarded-for"]
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor

    if (typeof raw === "string" && raw.trim()) {
        return raw.split(",")[0]?.trim() ?? null
    }

    return req.ip ?? null
}

const verifyTurnstile = async (params: { token: string; remoteip: string | null }) => {
    const secret = TURNSTILE_SECRET.value().trim()

    if (!secret) {
        throw new Error("TURNSTILE_NOT_CONFIGURED")
    }

    const body = new URLSearchParams({
        secret,
    })
    body.set("response", params.token)

    if (params.remoteip) {
        body.set("remoteip", params.remoteip)
    }

    let response: Response
    try {
        response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
        })
    } catch (error) {
        console.error("[turnstile] siteverify network error", {
            message: error instanceof Error ? error.message : String(error),
        })
        throw new Error("TURNSTILE_UNAVAILABLE:NETWORK_ERROR")
    }

    if (!response.ok) {
        let responseText = ""
        try {
            responseText = await response.text()
        } catch {
            responseText = ""
        }

        const details = {
            status: response.status,
            statusText: response.statusText,
            cfRay: response.headers.get("cf-ray"),
            body: truncateForLog(responseText, 500),
        }

        console.error("[turnstile] siteverify non-2xx", details)
        throw new Error(`TURNSTILE_UNAVAILABLE:${JSON.stringify(details)}`)
    }

    const data = (await response.json()) as TurnstileVerificationResponse

    if (!data.success) {
        console.error("[turnstile] verification failed", {
            errorCodes: data["error-codes"],
            hostname: data.hostname,
            action: data.action,
        })
        const details = {
            errorCodes: data["error-codes"] ?? [],
            hostname: data.hostname ?? null,
            action: data.action ?? null,
        }
        throw new Error(`TURNSTILE_FAILED:${JSON.stringify(details)}`)
    }

    return data
}

const assertRateLimit = async (params: { ip: string | null }) => {
    const windowMinutes = 5
    const maxRequests = 3

    const key = params.ip ? `contact:${params.ip}` : `contact:anonymous`
    const docRef = firestoreAdmin.collection("rate_limits").doc(key)

    await firestoreAdmin.runTransaction(async (tx) => {
        const snapshot = await tx.get(docRef)
        const now = Timestamp.now()

        if (!snapshot.exists) {
            tx.set(docRef, {
                count: 1,
                windowStart: now,
                updatedAt: now,
            })
            return
        }

        const data = snapshot.data() as {
            count?: number
            windowStart?: Timestamp
        }

        const windowStart = data.windowStart instanceof Timestamp ? data.windowStart : now
        const elapsedMs = now.toMillis() - windowStart.toMillis()

        if (elapsedMs > windowMinutes * 60 * 1000) {
            tx.set(
                docRef,
                {
                    count: 1,
                    windowStart: now,
                    updatedAt: now,
                },
                { merge: true },
            )
            return
        }

        const count = typeof data.count === "number" ? data.count : 0
        if (count >= maxRequests) {
            throw new Error("RATE_LIMITED")
        }

        tx.set(
            docRef,
            {
                count: count + 1,
                updatedAt: now,
            },
            { merge: true },
        )
    })
}

const sendEmailWithResend = async (params: { input: ContactSubmitInput }) => {
    const resendKey = RESEND_KEY.value().trim()
    const from = (RESEND_FROM.value() || "onboarding@resend.dev").trim()
    const to = (RESEND_TO.value() || "contacto@repartejusto.xyz").trim()

    if (!resendKey) {
        throw new Error("RESEND_NOT_CONFIGURED")
    }

    const payload = {
        from,
        to: [to],
        subject: `[Contacto] ${params.input.subject}`,
        reply_to: params.input.email,
        text: `Nombre: ${params.input.name}\nEmail: ${params.input.email}\n\nMensaje:\n${params.input.message}`,
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        throw new Error("RESEND_FAILED")
    }
}

export const contactSubmitHandler = async (params: {
    payload: unknown
    req: Request
}): Promise<{ status: "sent" }> => {
    const input = contactSubmitSchema.parse(params.payload)
    const ip = getClientIp(params.req)

    await verifyTurnstile({ token: input.turnstileToken, remoteip: ip })
    await assertRateLimit({ ip })

    const now = FieldValue.serverTimestamp()

    const docRef = await firestoreAdmin.collection("contact_messages").add({
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        userId: input.userId ?? null,
        createdAt: now,
        status: "unread",
        source: "web_contact_form",
        ip,
    })

    await sendEmailWithResend({ input })

    await docRef.set(
        {
            emailedAt: now,
        },
        { merge: true },
    )

    return { status: "sent" }
}
