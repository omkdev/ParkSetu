import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokenStore } from '../lib/api'
import type { User } from '../lib/types'
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!tokenStore.get())

  useEffect(() => {
    if (!tokenStore.get()) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback<AuthState['login']>(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    tokenStore.set(res.data.data.token)
    setUser(res.data.data.user)
  }, [])

  const register = useCallback<AuthState['register']>(async (input) => {
    const res = await api.post('/auth/register', input)
    tokenStore.set(res.data.data.token)
    setUser(res.data.data.user)
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
