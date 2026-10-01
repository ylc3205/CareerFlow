import { request } from './client.js'

// Backend job contract:
//   GET    /api/jobs?status=&search=&page=&limit= -> { success, data: { jobs, pagination } }
//   GET    /api/jobs/:id                          -> { success, data: { job } }
//   POST   /api/jobs                              -> { success, data: { job } }  (201)
//   PATCH  /api/jobs/:id                          -> { success, data: { job } }
//   DELETE /api/jobs/:id                          -> { success, message }
//   POST   /api/jobs/:id/match                    -> { success, data: { match } } (cached per user+job)

export const listJobsApi = (params = {}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  const qs = query.toString()
  return request({ path: `/jobs${qs ? `?${qs}` : ''}`, method: 'GET' })
}

export const getJobApi = (jobId) => request({ path: `/jobs/${jobId}`, method: 'GET' })

export const createJobApi = (data) => request({ path: '/jobs', method: 'POST', body: data })

export const updateJobApi = (jobId, data) => request({ path: `/jobs/${jobId}`, method: 'PATCH', body: data })

export const deleteJobApi = (jobId) => request({ path: `/jobs/${jobId}`, method: 'DELETE' })

export const getJobContextApi = (jobId) => request({ path: `/jobs/${jobId}/context`, method: 'GET' })

export const matchJobApi = (jobId, body = {}) => request({ path: `/jobs/${jobId}/match`, method: 'POST', body })
