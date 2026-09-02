import { request, API_URL, getAccessToken, ApiError } from './client.js'

// Backend resume contract:
//   GET    /api/resume         -> { success, data: { resume } }  (404 when none exists yet)
//   PATCH  /api/resume         -> { success, data: { resume } }  (upserts when none exists)
//   DELETE /api/resume         -> { success, message }           (404 when none exists)
//   POST   /api/resume/upload  -> { success, data: { resume } }  (multipart, field: "file")
//   POST   /api/resume/parse   -> { success, data: { resume, draft } }
//   POST   /api/resume/confirm -> { success, data: { resume } }
//   POST   /api/resume/discard -> { success, data: { resume } }

export const getResumeApi = () => request({ path: '/resume', method: 'GET' })

export const updateResumeApi = (data) => request({ path: '/resume', method: 'PATCH', body: data })

export const deleteResumeApi = () => request({ path: '/resume', method: 'DELETE' })

// File upload requires raw fetch because the request() wrapper always sets
// Content-Type: application/json which is incompatible with multipart/form-data.
export const uploadResumeApi = async (file) => {
  const url = `${API_URL}/resume/upload`
  const formData = new FormData()
  formData.append('file', file)

  const headers = {}
  const token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    })
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Please check your connection.')
  }

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
    (body && body.message) || (body && body.error) || 'Upload failed. Please try again.'
  const errors = body && body.errors ? body.errors : null
  throw new ApiError(res.status, message, errors, body)
}

export const parseResumeApi = () => request({ path: '/resume/parse', method: 'POST' })

export const confirmResumeApi = (data) => request({ path: '/resume/confirm', method: 'POST', body: data })

export const discardResumeApi = () => request({ path: '/resume/discard', method: 'POST' })