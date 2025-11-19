import * as functions from "firebase-functions"
import { ZodError } from "zod"

import { guardarCierreDiarioHandler } from "./handlers/guardarCierreDiario"
import { liquidarPeriodoHandler } from "./handlers/liquidarPeriodo"

const setCorsHeaders = (res: functions.Response) => {
    res.set("Access-Control-Allow-Origin", "*")
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

export const guardarCierreDiario = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("guardarCierreDiario request", { method: req.method })

        setCorsHeaders(res)

        if (req.method === "OPTIONS") {
            res.status(204).send("")
            return
        }

        if (req.method !== "POST") {
            res.status(405).json({
                code: "METHOD_NOT_ALLOWED",
                message: "Este endpoint solo permite solicitudes POST.",
            })
            return
        }

        try {
            const result = await guardarCierreDiarioHandler(req.body)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            functions.logger.error("guardarCierreDiario error", { error })
            res.status(status).json(body)
        }
    })

export const liquidarPeriodo = functions
    .region("us-central1")
    .https.onRequest(async (req, res): Promise<void> => {
        functions.logger.info("liquidarPeriodo request", { method: req.method })

        setCorsHeaders(res)

        if (req.method === "OPTIONS") {
            res.status(204).send("")
            return
        }

        if (req.method !== "POST") {
            res.status(405).json({
                code: "METHOD_NOT_ALLOWED",
                message: "Este endpoint solo permite solicitudes POST.",
            })
            return
        }

        try {
            const result = await liquidarPeriodoHandler(req.body)
            res.status(200).json(result)
        } catch (error) {
            const { status, body } = mapHandlerError(error)
            functions.logger.error("liquidarPeriodo error", { error })
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
        const normalizedCode = error.message.toUpperCase()
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
    }

    return {
        status: 500,
        body: {
            code: "INTERNAL_ERROR",
            message: "Ocurrió un error inesperado al guardar el cierre.",
        },
    }
}
