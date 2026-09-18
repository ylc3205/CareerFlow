import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listInterviewsApi,
  getInterviewApi,
  createInterviewApi,
  updateInterviewApi,
  deleteInterviewApi,
  getPreparationApi,
  generatePreparationApi,
} from './interviews.api.js'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./client.js', () => ({
  request: mocks.request,
}))

describe('interviews.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list builds query parameters from defined values only', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { interviews: [], pagination: {} } })
    await listInterviewsApi({ status: 'scheduled', search: 'screen', application: 'app_1', page: 2, limit: 10 })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews?status=scheduled&search=screen&application=app_1&page=2&limit=10',
      method: 'GET',
    })
  })

  it('list omits undefined, null, and empty string parameters', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { interviews: [], pagination: {} } })
    await listInterviewsApi({ status: '', search: undefined, application: null, page: 1 })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews?page=1',
      method: 'GET',
    })
  })

  it('list with no params requests bare /interviews endpoint', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { interviews: [], pagination: {} } })
    await listInterviewsApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews',
      method: 'GET',
    })
  })

  it('get fetches a single interview by id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { interview: {} } })
    await getInterviewApi('int_123')
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews/int_123',
      method: 'GET',
    })
  })

  it('create sends POST with payload to /interviews', async () => {
    mocks.request.mockResolvedValue({ status: 201, data: { interview: {} } })
    const payload = { title: 'Technical Screen', scheduledDate: '2026-09-20', application: 'app_1' }
    await createInterviewApi(payload)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews',
      method: 'POST',
      body: payload,
    })
  })

  it('update sends PATCH with payload to /interviews/:id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { interview: {} } })
    const payload = { status: 'completed', feedback: 'Strong technical performance' }
    await updateInterviewApi('int_123', payload)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews/int_123',
      method: 'PATCH',
      body: payload,
    })
  })

  it('delete sends DELETE to /interviews/:id', async () => {
    mocks.request.mockResolvedValue({ status: 200, message: 'Interview deleted' })
    await deleteInterviewApi('int_123')
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews/int_123',
      method: 'DELETE',
    })
  })

  it('getPreparation sends GET to /interviews/:id/preparation', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { preparation: { questions: [] } } })
    await getPreparationApi('int_123')
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews/int_123/preparation',
      method: 'GET',
    })
  })

  it('generatePreparation sends POST to /interviews/:id/preparation', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { preparation: { questions: [] } } })
    await generatePreparationApi('int_123')
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/interviews/int_123/preparation',
      method: 'POST',
    })
  })
})
