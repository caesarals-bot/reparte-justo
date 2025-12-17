"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactSubmitHandler = exports.RESEND_TO = exports.RESEND_FROM = exports.RESEND_KEY = exports.TURNSTILE_SECRET = void 0;
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
exports.TURNSTILE_SECRET = (0, params_1.defineSecret)("TURNSTILE_SECRET");
exports.RESEND_KEY = (0, params_1.defineSecret)("RESEND_KEY");
exports.RESEND_FROM = (0, params_1.defineSecret)("RESEND_FROM");
exports.RESEND_TO = (0, params_1.defineSecret)("RESEND_TO");
const contactSubmitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    email: zod_1.z.string().email().max(180),
    subject: zod_1.z.string().min(1).max(180),
    message: zod_1.z.string().min(1).max(4000),
    userId: zod_1.z.string().min(1).nullable().optional(),
    turnstileToken: zod_1.z.string().min(10),
});
const truncateForLog = (value, maxLength) => {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, maxLength)}…`;
};
const getClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    if (typeof raw === "string" && raw.trim()) {
        return raw.split(",")[0]?.trim() ?? null;
    }
    return req.ip ?? null;
};
const verifyTurnstile = async (params) => {
    const secret = exports.TURNSTILE_SECRET.value().trim();
    if (!secret) {
        throw new Error("TURNSTILE_NOT_CONFIGURED");
    }
    const body = new URLSearchParams({
        secret,
    });
    body.set("response", params.token);
    if (params.remoteip) {
        body.set("remoteip", params.remoteip);
    }
    let response;
    try {
        response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
        });
    }
    catch (error) {
        console.error("[turnstile] siteverify network error", {
            message: error instanceof Error ? error.message : String(error),
        });
        throw new Error("TURNSTILE_UNAVAILABLE:NETWORK_ERROR");
    }
    if (!response.ok) {
        let responseText = "";
        try {
            responseText = await response.text();
        }
        catch {
            responseText = "";
        }
        const details = {
            status: response.status,
            statusText: response.statusText,
            cfRay: response.headers.get("cf-ray"),
            body: truncateForLog(responseText, 500),
        };
        console.error("[turnstile] siteverify non-2xx", details);
        throw new Error(`TURNSTILE_UNAVAILABLE:${JSON.stringify(details)}`);
    }
    const data = (await response.json());
    if (!data.success) {
        console.error("[turnstile] verification failed", {
            errorCodes: data["error-codes"],
            hostname: data.hostname,
            action: data.action,
        });
        const details = {
            errorCodes: data["error-codes"] ?? [],
            hostname: data.hostname ?? null,
            action: data.action ?? null,
        };
        throw new Error(`TURNSTILE_FAILED:${JSON.stringify(details)}`);
    }
    return data;
};
const assertRateLimit = async (params) => {
    const windowMinutes = 5;
    const maxRequests = 3;
    const key = params.ip ? `contact:${params.ip}` : `contact:anonymous`;
    const docRef = firebaseAdmin_1.firestoreAdmin.collection("rate_limits").doc(key);
    await firebaseAdmin_1.firestoreAdmin.runTransaction(async (tx) => {
        const snapshot = await tx.get(docRef);
        const now = firestore_1.Timestamp.now();
        if (!snapshot.exists) {
            tx.set(docRef, {
                count: 1,
                windowStart: now,
                updatedAt: now,
            });
            return;
        }
        const data = snapshot.data();
        const windowStart = data.windowStart instanceof firestore_1.Timestamp ? data.windowStart : now;
        const elapsedMs = now.toMillis() - windowStart.toMillis();
        if (elapsedMs > windowMinutes * 60 * 1000) {
            tx.set(docRef, {
                count: 1,
                windowStart: now,
                updatedAt: now,
            }, { merge: true });
            return;
        }
        const count = typeof data.count === "number" ? data.count : 0;
        if (count >= maxRequests) {
            throw new Error("RATE_LIMITED");
        }
        tx.set(docRef, {
            count: count + 1,
            updatedAt: now,
        }, { merge: true });
    });
};
const sendEmailWithResend = async (params) => {
    const resendKey = exports.RESEND_KEY.value().trim();
    const from = (exports.RESEND_FROM.value() || "onboarding@resend.dev").trim();
    const to = (exports.RESEND_TO.value() || "contacto@repartejusto.xyz").trim();
    if (!resendKey) {
        throw new Error("RESEND_NOT_CONFIGURED");
    }
    const payload = {
        from,
        to: [to],
        subject: `[Contacto] ${params.input.subject}`,
        reply_to: params.input.email,
        text: `Nombre: ${params.input.name}\nEmail: ${params.input.email}\n\nMensaje:\n${params.input.message}`,
    };
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error("RESEND_FAILED");
    }
};
const contactSubmitHandler = async (params) => {
    const input = contactSubmitSchema.parse(params.payload);
    const ip = getClientIp(params.req);
    await verifyTurnstile({ token: input.turnstileToken, remoteip: ip });
    await assertRateLimit({ ip });
    const now = firestore_1.FieldValue.serverTimestamp();
    const docRef = await firebaseAdmin_1.firestoreAdmin.collection("contact_messages").add({
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        userId: input.userId ?? null,
        createdAt: now,
        status: "unread",
        source: "web_contact_form",
        ip,
    });
    await sendEmailWithResend({ input });
    await docRef.set({
        emailedAt: now,
    }, { merge: true });
    return { status: "sent" };
};
exports.contactSubmitHandler = contactSubmitHandler;
