import { request } from './client.js'

// Backend AI analysis contract:
//   GET /api/ai-analyses?job= -> { success, data: { analyses } }
//     analyses items have `job` populated with `_id title company` and the match fields.

export const listAnalysesApi = (params = {}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  const qs = query.toString()
  return request({ path: `/ai-analyses${qs ? `?${qs}` : ''}`, method: 'GET' })
}
