import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import {
  setAccessToken,
  clearAccessToken,
  setSessionExpiredHandler,
  setTokenChangedHandler,
} from '../api/client.js'
import { registerApi, loginApi, refreshApi, logoutApi, meApi } from '../api/auth.api.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessTokenState] = useState(null)
  const [loading, setLoading] = useState(true)

  const applyToken = useCallback((token) => {
    setAccessToken(token)
    setAccessTokenState(token)
  }, [])

  const clearAuth = useCallback(() => {
    clearAccessToken()
    setAccessTokenState(null)
    setUser(null)
  }, [])

  const loadCurrentUser = useCallback(async () => {
    const res = await meApi()
    setUser(res.data.user)
    return res.data.user
  }, [])

  const login = useCallback(
    async (email, password) => {
      const res = await loginApi({ email, password })
      applyToken(res.data.accessToken)
      if (res.data.user) {
        setUser(res.data.user)
      } else {
        await loadCurrentUser()
      }
      return res.data.user
    },
    [applyToken, loadCurrentUser]
  )

  const register = useCallback(
    async (email, password) => {
      const res = await registerApi({ email, password })
      applyToken(res.data.accessToken)
      if (res.data.user) {
        setUser(res.data.user)
      } else {
        await loadCurrentUser()
      }
      return res.data.user
    },
    [applyToken, loadCurrentUser]
  )

  const refresh = useCallback(async () => {
    const res = await refreshApi()
    applyToken(res.data.accessToken)
    return res.data.accessToken
  }, [applyToken])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      // Best-effort: the local session must be cleared regardless.
    }
    clearAuth()
  }, [clearAuth])

  // Restore the session on first load:
  //   refresh (HttpOnly cookie) -> new accessToken -> /me -> user state.
  const restoreSession = useCallback(async () => {
    setLoading(true)
    try {
      await refresh()
      await loadCurrentUser()
    } catch {
      clearAuth()
    } finally {
      setLoading(false)
    }
  }, [refresh, loadCurrentUser, clearAuth])

  useEffect(() => {
    setSessionExpiredHandler(() => clearAuth())
    setTokenChangedHandler((token) => setAccessTokenState(token))
    restoreSession()
    return () => {
      setSessionExpiredHandler(null)
      setTokenChangedHandler(null)
    }
  }, [restoreSession, clearAuth])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      refresh,
      loadCurrentUser,
    }),
    [user, accessToken, loading, login, register, logout, refresh, loadCurrentUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext