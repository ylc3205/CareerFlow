// Centralized API client for the CareerFlow backend.
//
// Contract (source of truth is the backend):
//   Success: { success: true, data: {...} }
//   Error:   { success: false, message: "...", errors?: {...} }
//
// - Base URL comes from VITE_API_URL (defaults to the local backend /api).
// - All requests use the /api prefix.
// - Credentials are always included so the HttpOnly refresh-token cookie is sent.
// - accessToken lives in memory (module scope) only. It is never persisted.
// - On a 401 from a protected request, refresh is attempted ONCE and the original
//   request is retried with the new token. Refresh itself never re-triggers refresh.

const DEFAULT_API_URL = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : 'https://careerflow-api-nkke.onrender.com/api'

const normalizeApiUrl = (raw) => {
  let val = raw || DEFAULT_API_URL
  if (typeof val === 'string' && val.includes('careerflow-api-mkke')) {
    val = val.replace('careerflow-api-mkke', 'careerflow-api-nkke')
  }
  const trimmed = String(val).replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL)

let accessToken = null
let refreshPromise = null
let sessionExpiredHandler = null
let tokenChangedHandler = null

export class ApiError extends Error {
  constructor(status, message, errors, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors || null
    this.data = data ?? null
  }
}

export const getAccessToken = () => accessToken

export const setAccessToken = (token) => {
  accessToken = token || null
  if (tokenChangedHandler) tokenChangedHandler(accessToken)
}

export const clearAccessToken = () => setAccessToken(null)

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler
}

export const setTokenChangedHandler = (handler) => {
  tokenChangedHandler = handler
}

const isAuthRoute = (path) =>
  path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh')

const parseResponse = async (res) => {
  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.ok && body && body.success === true) {
    return { status: res.status, data: body.data ?? null, message: body.message ?? null }
  }

  const message =
    (body && body.message) || (body && body.error) || 'Something went wrong. Please try again.'
  const errors = body && body.errors ? body.errors : null
  throw new ApiError(res.status, message, errors, body)
}

const readMessageFrom = async (res) => {
  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return (body && body.message) || (body && body.error) || 'Session refresh failed'
}

const doRefresh = async () => {
  const url = `${API_URL}/auth/refresh`
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    clearAccessToken()
    if (sessionExpiredHandler) sessionExpiredHandler()
    throw new ApiError(0, 'Network error while refreshing your session')
  }

  if (!res.ok) {
    const message = await readMessageFrom(res)
    clearAccessToken()
    if (sessionExpiredHandler) sessionExpiredHandler()
    throw new ApiError(res.status, message)
  }

  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  const token = body && body.data && body.data.accessToken
  if (!token) {
    clearAccessToken()
    if (sessionExpiredHandler) sessionExpiredHandler()
    throw new ApiError(res.status, 'Refresh returned no access token')
  }

  setAccessToken(token)
  return token
}

// Single-flight refresh: concurrent 401s share one refresh call.
const refreshOnce = () => {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export const request = async ({ path, method = 'GET', body, headers = {}, skipAuthRefresh = false } = {}) => {
  const url = `${API_URL}${path}`
  const options = { method, credentials: 'include', headers: { ...headers } }

  if (accessToken) {
    options.headers.Authorization = `Bearer ${accessToken}`
  }

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Please check your connection.')
  }

  if (res.status === 401 && !skipAuthRefresh && !isAuthRoute(path)) {
    await refreshOnce()
    // Retry the original request ONCE with the fresh token.
    options.headers.Authorization = `Bearer ${accessToken}`
    res = await fetch(url, options)
  }

  return parseResponse(res)
}