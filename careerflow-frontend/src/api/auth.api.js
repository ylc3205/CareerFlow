import { request } from './client.js'

// Backend auth contract:
//   POST /api/auth/register -> { success, data: { user, accessToken } }
//   POST /api/auth/login    -> { success, data: { user, accessToken } }
//   POST /api/auth/refresh  -> { success, data: { accessToken } }  (HttpOnly cookie)
//   POST /api/auth/logout   -> { success, message }
//   GET  /api/auth/me       -> { success, data: { user } }

export const registerApi = ({ email, password }) =>
  request({ path: '/auth/register', method: 'POST', body: { email, password }, skipAuthRefresh: true })

export const loginApi = ({ email, password }) =>
  request({ path: '/auth/login', method: 'POST', body: { email, password }, skipAuthRefresh: true })

export const refreshApi = () =>
  request({ path: '/auth/refresh', method: 'POST', skipAuthRefresh: true })

export const logoutApi = () =>
  request({ path: '/auth/logout', method: 'POST', skipAuthRefresh: true })

export const meApi = () => request({ path: '/auth/me', method: 'GET' })