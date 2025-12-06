import { getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

declare global {
    // eslint-disable-next-line no-var -- Required for global type declaration
    var __reparteJustoAdminApp__: ReturnType<typeof initializeApp> | undefined
}

const app = (() => {
    if (globalThis.__reparteJustoAdminApp__) {
        return globalThis.__reparteJustoAdminApp__
    }

    const instance = getApps().length ? getApps()[0] : initializeApp()
    globalThis.__reparteJustoAdminApp__ = instance
    return instance
})()

export const firestoreAdmin = getFirestore(app)
