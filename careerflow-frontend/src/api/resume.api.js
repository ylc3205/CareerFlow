import { request } from './client.js'

// Backend resume contract:
//   GET    /api/resume  -> { success, data: { resume } }  (404 when none exists yet)
//   PATCH  /api/resume  -> { success, data: { resume } }  (upserts when none exists)
//   DELETE /api/resume  -> { success, message }           (404 when none exists)

export const getResumeApi = () => request({ path: '/resume', method: 'GET' })

export const updateResumeApi = (data) => request({ path: '/resume', method: 'PATCH', body: data })

export const deleteResumeApi = () => request({ path: '/resume', method: 'DELETE' })