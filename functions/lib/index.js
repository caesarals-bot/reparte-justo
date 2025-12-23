"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapOnboarding = exports.liquidarPeriodo = exports.eliminarCierreDiario = exports.contactSubmit = exports.guardarCierreDiario = exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const zod_1 = require("zod");
const guardarCierreDiario_1 = require("./handlers/guardarCierreDiario");
const liquidarPeriodo_1 = require("./handlers/liquidarPeriodo");
const eliminarCierreDiario_1 = require("./handlers/eliminarCierreDiario");
const contactSubmit_1 = require("./handlers/contactSubmit");
const bootstrapOnboarding_1 = require("./handlers/bootstrapOnboarding");
// Triggers
var onUserCreate_1 = require("./triggers/onUserCreate");
Object.defineProperty(exports, "onUserCreate", { enumerable: true, get: function () { return onUserCreate_1.onUserCreate; } });
const allowedOrigins = new Set([
    "http://localhost:5173",
    "https://repartejusto.netlify.app",
    "https://repartejusto.xyz",
    "https://www.repartejusto.xyz",
]);
const resolveOrigin = (incomingOrigin) => {
    if (!incomingOrigin) {
        return "*";
    }
    return allowedOrigins.has(incomingOrigin) ? incomingOrigin : "*";
};
const setCorsHeaders = (req, res) => {
    const origin = resolveOrigin(req.headers.origin);
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
};
const handlePreflight = (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    if (req.method !== "POST") {
        res.status(405).json({
            code: "METHOD_NOT_ALLOWED",
            message: "Este endpoint solo permite solicitudes POST.",
        });
        return true;
    }
    return false;
};
const safeLogError = (label, error) => {
    // Usar console.error que es más robusto y Firebase también lo captura
    console.error(`[${label}]`);
    if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        if (error.stack) {
            console.error("Stack trace:");
            console.error(error.stack);
        }
        return;
    }
    try {
        console.error("Error data:", JSON.stringify(error, null, 2));
    }
    catch {
        console.error("Error (string):", String(error));
    }
};
exports.guardarCierreDiario = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("guardarCierreDiario request", { method: req.method, origin: req.headers.origin });
    setCorsHeaders(req, res);
    if (handlePreflight(req, res)) {
        return;
    }
    try {
        const result = await (0, guardarCierreDiario_1.guardarCierreDiarioHandler)(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, body } = mapHandlerError(error);
        safeLogError("guardarCierreDiario error", error);
        res.status(status).json(body);
    }
});
exports.contactSubmit = functions
    .runWith({ secrets: [contactSubmit_1.TURNSTILE_SECRET, contactSubmit_1.RESEND_KEY, contactSubmit_1.RESEND_FROM, contactSubmit_1.RESEND_TO] })
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("contactSubmit request", { method: req.method, origin: req.headers.origin });
    setCorsHeaders(req, res);
    if (handlePreflight(req, res)) {
        return;
    }
    try {
        const result = await (0, contactSubmit_1.contactSubmitHandler)({ payload: req.body, req });
        res.status(200).json(result);
    }
    catch (error) {
        const { status, body } = mapHandlerError(error);
        safeLogError("contactSubmit error", error);
        res.status(status).json(body);
    }
});
exports.eliminarCierreDiario = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("eliminarCierreDiario request", { method: req.method, origin: req.headers.origin });
    setCorsHeaders(req, res);
    if (handlePreflight(req, res)) {
        return;
    }
    try {
        const result = await (0, eliminarCierreDiario_1.eliminarCierreDiarioHandler)(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, body } = mapHandlerError(error);
        safeLogError("eliminarCierreDiario error", error);
        res.status(status).json(body);
    }
});
exports.liquidarPeriodo = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("liquidarPeriodo request", { method: req.method, origin: req.headers.origin });
    setCorsHeaders(req, res);
    if (handlePreflight(req, res)) {
        return;
    }
    try {
        const result = await (0, liquidarPeriodo_1.liquidarPeriodoHandler)(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, body } = mapHandlerError(error);
        safeLogError("liquidarPeriodo error", error);
        res.status(status).json(body);
    }
});
/**
 * Bootstrap Onboarding
 * Crea restaurante + asigna closure_editor en una sola operación.
 * Requiere autenticación (ID token en header Authorization).
 */
exports.bootstrapOnboarding = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("bootstrapOnboarding request", { method: req.method, origin: req.headers.origin });
    setCorsHeaders(req, res);
    if (handlePreflight(req, res)) {
        return;
    }
    try {
        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({
                code: "UNAUTHORIZED",
                message: "Se requiere autenticación.",
            });
            return;
        }
        const idToken = authHeader.split("Bearer ")[1];
        const { getAuth } = await Promise.resolve().then(() => __importStar(require("firebase-admin/auth")));
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const callerUid = decodedToken.uid;
        const result = await (0, bootstrapOnboarding_1.bootstrapOnboardingHandler)(req.body, callerUid);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, body } = mapHandlerError(error);
        safeLogError("bootstrapOnboarding error", error);
        res.status(status).json(body);
    }
});
const mapHandlerError = (error) => {
    if (error instanceof zod_1.ZodError) {
        return {
            status: 400,
            body: {
                code: "INVALID_PAYLOAD",
                message: "El payload enviado no es válido.",
                issues: error.issues,
            },
        };
    }
    if (error instanceof Error) {
        const rawCode = error.message;
        const normalizedCode = rawCode.toUpperCase();
        if (normalizedCode === "RATE_LIMITED") {
            return {
                status: 429,
                body: {
                    code: normalizedCode,
                    message: "Has enviado demasiados mensajes. Intenta nuevamente en unos minutos.",
                },
            };
        }
        if (normalizedCode.startsWith("TURNSTILE_FAILED") || normalizedCode.startsWith("TURNSTILE_UNAVAILABLE")) {
            let details = undefined;
            if (rawCode.includes(":")) {
                const [, tail] = rawCode.split(/:(.+)/);
                if (tail) {
                    try {
                        details = JSON.parse(tail);
                    }
                    catch {
                        details = tail;
                    }
                }
            }
            const normalizedBaseCode = normalizedCode.startsWith("TURNSTILE_FAILED")
                ? "TURNSTILE_FAILED"
                : "TURNSTILE_UNAVAILABLE";
            return {
                status: 400,
                body: {
                    code: normalizedBaseCode,
                    message: "No pudimos verificar el captcha. Intenta nuevamente.",
                    ...(details ? { details } : {}),
                },
            };
        }
        if (normalizedCode === "TURNSTILE_NOT_CONFIGURED") {
            return {
                status: 500,
                body: {
                    code: normalizedCode,
                    message: "El captcha no está configurado en el servidor.",
                },
            };
        }
        if (normalizedCode === "RESEND_FAILED") {
            return {
                status: 502,
                body: {
                    code: normalizedCode,
                    message: "No pudimos enviar el correo en este momento. Intenta nuevamente.",
                },
            };
        }
        if (normalizedCode === "RESEND_NOT_CONFIGURED") {
            return {
                status: 500,
                body: {
                    code: normalizedCode,
                    message: "El servicio de correo no está configurado en el servidor.",
                },
            };
        }
        if (normalizedCode === "DUPLICATED_CLOSURE") {
            return {
                status: 409,
                body: {
                    code: normalizedCode,
                    message: "Ya existe un cierre con la fecha seleccionada.",
                },
            };
        }
        if (normalizedCode === "INVALID_REFERENCE_DATE") {
            return {
                status: 400,
                body: {
                    code: normalizedCode,
                    message: "Debes enviar referenceDateKey para continuar.",
                },
            };
        }
        // Bootstrap onboarding errors
        if (normalizedCode.startsWith("UNAUTHORIZED")) {
            return {
                status: 403,
                body: {
                    code: "UNAUTHORIZED",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "No tienes permisos para esta acción.",
                },
            };
        }
        if (normalizedCode.startsWith("INVALID_INPUT")) {
            return {
                status: 400,
                body: {
                    code: "INVALID_INPUT",
                    message: rawCode.includes(":") ? rawCode.split(": ")[1] : "Datos de entrada inválidos.",
                },
            };
        }
    }
    return {
        status: 500,
        body: {
            code: "INTERNAL_ERROR",
            message: "Ocurrió un error inesperado.",
        },
    };
};
