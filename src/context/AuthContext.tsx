import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { auth, db } from "@/firebase/config"
import type { UserRoles } from "@/types/user"

type AuthContextValue = {
  user: User | null
  userRoles: UserRoles | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string | null
  email: string | null
  uid: string | null
  signOutUser: () => Promise<void>
  refreshUserRoles: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Consulta los roles del usuario desde Firestore
   */
  const fetchUserRoles = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const data = userDocSnap.data()
        setUserRoles({
          siteRoles: data.siteRoles || [],
          restaurantRoles: data.restaurantRoles || {},
        })

        // Actualizar lastLogin si es la primera carga
        await updateDoc(userDocRef, {
          lastLogin: serverTimestamp(),
          lastActivity: serverTimestamp(),
        })
      } else {
        console.warn(`No existe documento para usuario ${uid}`)
        setUserRoles(null)
      }
    } catch (error) {
      console.error("Error al obtener roles del usuario:", error)
      setUserRoles(null)
    }
  }, [])

  /**
   * Función pública para refrescar roles (útil después de cambios)
   */
  const refreshUserRoles = useCallback(async () => {
    if (user?.uid) {
      await fetchUserRoles(user.uid)
    }
  }, [user?.uid, fetchUserRoles])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)

      if (nextUser) {
        // Usuario autenticado → consultar roles
        await fetchUserRoles(nextUser.uid)
      } else {
        // Usuario no autenticado → limpiar roles
        setUserRoles(null)
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [fetchUserRoles])

  /**
   * Actualizar lastActivity cada 5 minutos mientras el usuario está activo
   */
  useEffect(() => {
    if (!user?.uid) return

    const interval = setInterval(async () => {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          lastActivity: serverTimestamp(),
        })
      } catch (error) {
        console.error("Error al actualizar lastActivity:", error)
      }
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [user?.uid])

  const signOutUser = useCallback(async () => {
    // Limpiar sessionId del localStorage
    localStorage.removeItem("rj_session_id")
    await signOut(auth)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userRoles,
      isLoading,
      isAuthenticated: Boolean(user),
      displayName: user?.displayName ?? null,
      email: user?.email ?? null,
      uid: user?.uid ?? null,
      signOutUser,
      refreshUserRoles,
    }),
    [user, userRoles, isLoading, signOutUser, refreshUserRoles],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }

  return context
}
