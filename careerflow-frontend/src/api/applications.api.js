import { request } from './client.js'

// Backend application contract:
//   POST   /api/applications                    -> { success, data: { application } } (201; 409 when duplicate)
//   GET    /api/applications?status=&search=&page=&limit= -> { success, data: { applications, pagination } }
//   GET    /api/applications/:id                -> { success, data: { application } }
//   PATCH  /api/applications/:id                -> { success, data: { application } }
//   DELETE /api/applications/:id                -> { success, message }
//     application items have `job` populated (includes _id).

export const createApplicationApi = (data) =>
  request({ path: '/applications', method: 'POST', body: data })

export const listApplicationsApi = (params = {}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  const qs = query.toString()
  return request({ path: `/applications${qs ? `?${qs}` : ''}`, method: 'GET' })
}

export const getApplicationApi = (applicationId) => request({ path: `/applications/${applicationId}`, method: 'GET' })

export const updateApplicationApi = (applicationId, data) =>
  request({ path: `/applications/${applicationId}`, method: 'PATCH', body: data })

export const deleteApplicationApi = (applicationId) => request({ path: `/applications/${applicationId}`, method: 'DELETE' })
