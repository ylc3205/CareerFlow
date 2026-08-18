import { request } from './client.js'

// Backend profile contract:
//   GET   /api/profile  -> { success, data: { profile } }
//   PATCH /api/profile  -> { success, data: { profile } }  (body validated, 422 on bad fields)

export const getProfileApi = () => request({ path: '/profile', method: 'GET' })

export const updateProfileApi = (data) => request({ path: '/profile', method: 'PATCH', body: data })