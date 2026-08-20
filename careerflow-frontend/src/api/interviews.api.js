import { request } from './client.js'

// Backend interview contract:
//   GET    /api/interviews?status=&search=&application=&page=&limit= -> { success, data: { interviews, pagination } }
//   GET    /api/interviews/:id           -> { success, data: { interview } }
//   POST   /api/interviews               -> { success, data: { interview } }  (201)
//   PATCH  /api/interviews/:id           -> { success, data: { interview } }
//   DELETE /api/interviews/:id           -> { success, message }
//   POST   /api/interviews/:id/preparation -> { success, data: { preparation } }
//   GET    /api/interviews/:id/preparation -> { success, data: { preparation } }
//     preparation may be null when none exists yet.
//     interview items have `application` populated, whose `job` is populated too.
//     preparation.questions = [{ question, category, difficulty }] (5-10 items).
//     Preparation is cached per user + interview; repeated POST returns the same result.

export const listInterviewsApi = (params = {}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  const qs = query.toString()
  return request({ path: `/interviews${qs ? `?${qs}` : ''}`, method: 'GET' })
}

export const getInterviewApi = (interviewId) => request({ path: `/interviews/${interviewId}`, method: 'GET' })

export const createInterviewApi = (data) => request({ path: '/interviews', method: 'POST', body: data })

export const updateInterviewApi = (interviewId, data) => request({ path: `/interviews/${interviewId}`, method: 'PATCH', body: data })

export const deleteInterviewApi = (interviewId) => request({ path: `/interviews/${interviewId}`, method: 'DELETE' })

export const getPreparationApi = (interviewId) =>
  request({ path: `/interviews/${interviewId}/preparation`, method: 'GET' })

export const generatePreparationApi = (interviewId) =>
  request({ path: `/interviews/${interviewId}/preparation`, method: 'POST' })