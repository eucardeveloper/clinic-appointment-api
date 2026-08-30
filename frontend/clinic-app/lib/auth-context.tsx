'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type UserRole = 'ROLE_ADMIN' | 'ROLE_DOCTOR' | 'ROLE_PATIENT'

interface AuthUser {
  username: string
  role: UserRole
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  setUser: (u: AuthUser | null) => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser({ username: data.username, role: data.role })
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
