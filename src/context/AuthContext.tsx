import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { auth } from "@/firebase/config"

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  displayName: string | null
  email: string | null
  uid: string | null
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOutUser = useCallback(() => signOut(auth), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      displayName: user?.displayName ?? null,
      email: user?.email ?? null,
      uid: user?.uid ?? null,
      signOutUser,
    }),
    [user, isLoading, signOutUser],
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
