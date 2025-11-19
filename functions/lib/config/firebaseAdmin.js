"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestoreAdmin = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const app = (() => {
    if (globalThis.__reparteJustoAdminApp__) {
        return globalThis.__reparteJustoAdminApp__;
    }
    const instance = (0, app_1.getApps)().length ? (0, app_1.getApps)()[0] : (0, app_1.initializeApp)();
    globalThis.__reparteJustoAdminApp__ = instance;
    return instance;
})();
exports.firestoreAdmin = (0, firestore_1.getFirestore)(app);
