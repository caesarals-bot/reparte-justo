import * as functions from "firebase-functions/v1"
import { ZodError } from "zod"

import { guardarCierreDiarioHandler } from "./handlers/guardarCierreDiario"
import { liquidarPeriodoHandler } from "./handlers/liquidarPeriodo"
import { eliminarCierreDiarioHandler } from "./handlers/eliminarCierreDiario"
import { contactSubmitHandler, RESEND_FROM, RESEND_KEY, RESEND_TO, TURNSTILE_SECRET } from "./handlers/contactSubmit"
import { bootstrapOnboardingHandler } from "./handlers/bootstrapOnboarding"
import { acceptInvitationHandler, rejectInvitationHandler } from "./handlers/acceptInvitation"

// Triggers
export { onUserCreate } from "./triggers/onUserCreate"

const allowedOrigins = new Set([
    "http://localhost:5173",
    "https://repartejusto.netlify.app",
    "https://repartejusto.xyz",
    "https://www.repartejusto.xyz",
])

const resolveOrigin = (incomingOrigin: string | undefined) => {
    if (!incomingOrigin) {
        return "*"
    }

    return allowedOrigins.has(incomingOrigin) ? incomingOrigin : "*"
}

const setCorsHeaders = (req: functions.Request, res: functions.Response) => {
    const origin = resolveOrigin(req.headers.origin)
    res.set("Access-Control-Allow-Origin", origin)
    res.set("Vary", "Origin")
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.set("Access-Control-Max-Age", "3600")
}

const handlePreflight = (req: functions.Request, res: functions.Response) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("")
        return true
    }

    if (req.method !== "POST") {
        res.status(405).json({
            code: "METHOD_NOT_ALLOWED",
            message: "Este endpoint solo permite solicitudes POST.",
        })
        return true
    }

    return false
}

const safeLogError = (label: string, error: unknown) => {
    // Usar console.error que es más robusto y Firebase también lo captura
    console.error(`[${label}]`)
    
    if (error instanceof Error) {
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
        if (error.stack) {
            console.error("Stack trace:")
            console.error(error.stack)
        }
        return
    }

    try {
        console.error("Error data:", JSON.stringify(error, null, 2))
    } catch {
        console.error("Error (string):", String(error))
    }
}

export const guardarCierreDiario = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("guardarCierreDiario request", { method: req.method, origin: req.headers.origin })

        setCorsHeaders(req, res)
        if (handlePreflight(req, res)) {
            return
        }

        try {
            const result = await guardarCierreDiarioHandler(req.body)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            safeLogError("guardarCierreDiario error", error)
            res.status(status).json(body)
        }
    })

export const contactSubmit = functions
    .runWith({ secrets: [TURNSTILE_SECRET, RESEND_KEY, RESEND_FROM, RESEND_TO] })
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("contactSubmit request", { method: req.method, origin: req.headers.origin })

        setCorsHeaders(req, res)
        if (handlePreflight(req, res)) {
            return
        }

        try {
            const result = await contactSubmitHandler({ payload: req.body, req })
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            safeLogError("contactSubmit error", error)
            res.status(status).json(body)
        }
    })

export const eliminarCierreDiario = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("eliminarCierreDiario request", { method: req.method, origin: req.headers.origin })

        setCorsHeaders(req, res)
        if (handlePreflight(req, res)) {
            return
        }

        try {
            const result = await eliminarCierreDiarioHandler(req.body)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            safeLogError("eliminarCierreDiario error", error)
            res.status(status).json(body)
        }
    })

export const liquidarPeriodo = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("liquidarPeriodo request", { method: req.method, origin: req.headers.origin })

        setCorsHeaders(req, res)
        if (handlePreflight(req, res)) {
            return
        }

        try {
            const result = await liquidarPeriodoHandler(req.body)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            safeLogError("liquidarPeriodo error", error)
            res.status(status).json(body)
        }
    })

/**
 * Bootstrap Onboarding
 * Crea restaurante + asigna closure_editor en una sola operación.
 * Requiere autenticación (ID token en header Authorization).
 */
export const bootstrapOnboarding = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("bootstrapOnboarding request", { method: req.method, origin: req.headers.origin })

        setCorsHeaders(req, res)
        if (handlePreflight(req, res)) {
            return
        }

        try {
            // Verificar autenticación
            const authHeader = req.headers.authorization
            if (!authHeader?.startsWith("Bearer ")) {
                res.status(401).json({
                    code: "UNAUTHORIZED",
                    message: "Se requiere autenticación.",
                })
                return
            }

            const idToken = authHeader.split("Bearer ")[1]
            const { getAuth } = await import("firebase-admin/auth")
            const decodedToken = await getAuth().verifyIdToken(idToken)
            const callerUid = decodedToken.uid

            const result = await bootstrapOnboardingHandler(req.body, callerUid)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            safeLogError("bootstrapOnboarding error", error)
            res.status(status).json(body)
        }
    })

/**
 * Accept Invitation
 * Permite a un usuario aceptar una invitación y recibir el rol closure_editor.
 * Valida límite de 2 closure_editor por restaurante.
 */
export const acceptInvitation = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("acceptInvitation request", { method: req.method, origin: req.headers.origin })

        setCorsHeaders(req, res)
        if (handlePreflight(req, res)) {
            return
        }

        try {
            const authHeader = req.headers.authorization
            if (!authHeader?.startsWith("Bearer ")) {
                res.status(401).json({
                    code: "UNAUTHORIZED",
                    message: "Se requiere autenticación.",
                })
                return
            }

            const idToken = authHeader.split("Bearer ")[1]
            const { getAuth } = await import("firebase-admin/auth")
            const decodedToken = await getAuth().verifyIdToken(idToken)
            const callerUid = decodedToken.uid
            const callerEmail = decodedToken.email

            const result = await acceptInvitationHandler(req.body, callerUid, callerEmail)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            safeLogError("acceptInvitation error", error)
            res.status(status).json(body)
        }
    })

/**
 * Reject Invitation
 * Permite a un usuario rechazar una invitación.
 */
export const rejectInvitation = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("rejectInvitation request", { method: req.method, origin: req.headers.origin })

        setCorsHeaders(req, res)
        if (handlePreflight(req, res)) {
            return
        }

        try {
            const authHeader = req.headers.authorization
            if (!authHeader?.startsWith("Bearer ")) {
                res.status(401).json({
                    code: "UNAUTHORIZED",
                    message: "Se requiere autenticación.",
                })
                return
            }

            const idToken = authHeader.split("Bearer ")[1]
            const { getAuth } = await import("firebase-admin/auth")
            const decodedToken = await getAuth().verifyIdToken(idToken)
            const callerUid = decodedToken.uid
            const callerEmail = decodedToken.email

            const result = await rejectInvitationHandler(req.body, callerUid, callerEmail)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            safeLogError("rejectInvitation error", error)
            res.status(status).json(body)
        }
    })

const mapHandlerError = (error: unknown): { status: number; body: Record<string, unknown> } => {
    if (error instanceof ZodError) {
        return {
            status: 400,
            body: {
                code: "INVALID_PAYLOAD",
                message: "El payload enviado no es válido.",
                issues: error.issues,
            },
        }
    }

    if (error instanceof Error) {
        const rawCode = error.message
        const normalizedCode = rawCode.toUpperCase()
        if (normalizedCode === "RATE_LIMITED") {
            return {
                status: 429,
                body: {
                    code: normalizedCode,
                    message: "Has enviado demasiados mensajes. Intenta nuevamente en unos minutos.",
                },
            }
        }

        if (normalizedCode.startsWith("TURNSTILE_FAILED") || normalizedCode.startsWith("TURNSTILE_UNAVAILABLE")) {
            let details: unknown = undefined
            if (rawCode.includes(":")) {
                const [, tail] = rawCode.split(/:(.+)/)
                if (tail) {
                    try {
                        details = JSON.parse(tail)
                    } catch {
                        details = tail
                    }
                }
            }

            const normalizedBaseCode = normalizedCode.startsWith("TURNSTILE_FAILED")
                ? "TURNSTILE_FAILED"
                : "TURNSTILE_UNAVAILABLE"
            return {
                status: 400,
                body: {
                    code: normalizedBaseCode,
                    message: "No pudimos verificar el captcha. Intenta nuevamente.",
                    ...(details ? { details } : {}),
                },
            }
        }

        if (normalizedCode === "TURNSTILE_NOT_CONFIGURED") {
            return {
                status: 500,
                body: {
                    code: normalizedCode,
                    message: "El captcha no está configurado en el servidor.",
                },
            }
        }

        if (normalizedCode === "RESEND_FAILED") {
            return {
                status: 502,
                body: {
                    code: normalizedCode,
                    message: "No pudimos enviar el correo en este momento. Intenta nuevamente.",
                },
            }
        }

        if (normalizedCode === "RESEND_NOT_CONFIGURED") {
            return {
                status: 500,
                body: {
                    code: normalizedCode,
                    message: "El servicio de correo no está configurado en el servidor.",
                },
            }
        }

        if (normalizedCode === "DUPLICATED_CLOSURE") {
            return {
                status: 409,
                body: {
                    code: normalizedCode,
                    message: "Ya existe un cierre con la fecha seleccionada.",
                },
            }
        }

        if (normalizedCode === "INVALID_REFERENCE_DATE") {
            return {
                status: 400,
                body: {
                    code: normalizedCode,
                    message: "Debes enviar referenceDateKey para continuar.",
                },
            }
        }

        // Bootstrap onboarding errors
        if (normalizedCode.startsWith("UNAUTHORIZED")) {
            return {
                status: 403,
                body: {
                    code: "UNAUTHORIZED",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "No tienes permisos para esta acción.",
                },
            }
        }

        if (normalizedCode.startsWith("INVALID_INPUT")) {
            return {
                status: 400,
                body: {
                    code: "INVALID_INPUT",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "Datos de entrada inválidos.",
                },
            }
        }

        // Invitation errors
        if (normalizedCode.startsWith("NOT_FOUND")) {
            return {
                status: 404,
                body: {
                    code: "NOT_FOUND",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "Recurso no encontrado.",
                },
            }
        }

        if (normalizedCode.startsWith("INVALID_STATE")) {
            return {
                status: 409,
                body: {
                    code: "INVALID_STATE",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "Estado inválido.",
                },
            }
        }

        if (normalizedCode.startsWith("EXPIRED")) {
            return {
                status: 410,
                body: {
                    code: "EXPIRED",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "El recurso ha expirado.",
                },
            }
        }

        if (normalizedCode.startsWith("LIMIT_REACHED")) {
            return {
                status: 409,
                body: {
                    code: "LIMIT_REACHED",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "Se alcanzó el límite permitido.",
                },
            }
        }

        if (normalizedCode.startsWith("ALREADY_HAS_ROLE")) {
            return {
                status: 409,
                body: {
                    code: "ALREADY_HAS_ROLE",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "Ya tienes este rol.",
                },
            }
        }

        if (normalizedCode.startsWith("INVALID_ROLE")) {
            return {
                status: 400,
                body: {
                    code: "INVALID_ROLE",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "Rol inválido.",
                },
            }
        }
    }

    return {
        status: 500,
        body: {
            code: "INTERNAL_ERROR",
            message: "Ocurrió un error inesperado.",
        },
    }
}
