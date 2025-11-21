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
exports.liquidarPeriodo = exports.guardarCierreDiario = void 0;
const functions = __importStar(require("firebase-functions"));
const zod_1 = require("zod");
const guardarCierreDiario_1 = require("./handlers/guardarCierreDiario");
const liquidarPeriodo_1 = require("./handlers/liquidarPeriodo");
const allowedOrigins = new Set([
    "http://localhost:5173",
    "https://repartejusto.netlify.app",
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
exports.guardarCierreDiario = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("guardarCierreDiario request", { method: req.method, origin: req.headers.origin });
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({
            code: "METHOD_NOT_ALLOWED",
            message: "Este endpoint solo permite solicitudes POST.",
        });
        return;
    }
    try {
        const result = await (0, guardarCierreDiario_1.guardarCierreDiarioHandler)(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, body } = mapHandlerError(error);
        functions.logger.error("guardarCierreDiario error", { error });
        res.status(status).json(body);
    }
});
exports.liquidarPeriodo = functions
    .region("us-central1")
    .https.onRequest(async (req, res) => {
    functions.logger.info("liquidarPeriodo request", { method: req.method, origin: req.headers.origin });
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({
            code: "METHOD_NOT_ALLOWED",
            message: "Este endpoint solo permite solicitudes POST.",
        });
        return;
    }
    try {
        const result = await (0, liquidarPeriodo_1.liquidarPeriodoHandler)(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, body } = mapHandlerError(error);
        functions.logger.error("liquidarPeriodo error", { error });
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
        const normalizedCode = error.message.toUpperCase();
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
    }
    return {
        status: 500,
        body: {
            code: "INTERNAL_ERROR",
            message: "Ocurrió un error inesperado al guardar el cierre.",
        },
    };
};
