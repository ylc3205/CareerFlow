import { request } from './client.js'

// Backend career direction contract:
//   GET    /api/career-directions                      -> { success, data: { careerDirections, pagination } }
//   GET    /api/career-directions/:id                  -> { success, data: { careerDirection } }
//   POST   /api/career-directions                      -> { success, data: { careerDirection } }  (201)
//   PATCH  /api/career-directions/:id                  -> { success, data: { careerDirection } }
//   DELETE /api/career-directions/:id                  -> { success, message }

export const listCareerDirectionsApi = (params = {}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  const qs = query.toString()
  return request({ path: `/career-directions${qs ? `?${qs}` : ''}`, method: 'GET' })
}

export const getCareerDirectionApi = (id) =>
  request({ path: `/career-directions/${id}`, method: 'GET' })

export const createCareerDirectionApi = (data) =>
  request({ path: '/career-directions', method: 'POST', body: data })

export const updateCareerDirectionApi = (id, data) =>
  request({ path: `/career-directions/${id}`, method: 'PATCH', body: data })

export const deleteCareerDirectionApi = (id) =>
  request({ path: `/career-directions/${id}`, method: 'DELETE' })
