import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listApplicationsApi,
  getApplicationApi,
  createApplicationApi,
  updateApplicationApi,
  deleteApplicationApi,
} from './applications.api.js'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./client.js', () => ({
  request: mocks.request,
}))

describe('applications.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list builds query parameters from defined values only', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { applications: [], pagination: {} } })
    await listApplicationsApi({ status: 'applied', search: 'google', page: 2, limit: 10 })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/applications?status=applied&search=google&page=2&limit=10',
      method: 'GET',
    })
  })

  it('list omits undefined, null, and empty string parameters', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { applications: [], pagination: {} } })
    await listApplicationsApi({ status: '', search: undefined, page: null, limit: 15 })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/applications?limit=15',
      method: 'GET',
    })
  })

  it('list with no params requests bare /applications endpoint', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { applications: [], pagination: {} } })
    await listApplicationsApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/applications',
      method: 'GET',
    })
  })

  it('get fetches a single application by id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { application: {} } })
    await getApplicationApi('app_123')
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/applications/app_123',
      method: 'GET',
    })
  })

  it('create sends POST with payload to /applications', async () => {
    mocks.request.mockResolvedValue({ status: 201, data: { application: {} } })
    const payload = { job: 'job_123' }
    await createApplicationApi(payload)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/applications',
      method: 'POST',
      body: payload,
    })
  })

  it('update sends PATCH with payload to /applications/:id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { application: {} } })
    const payload = { status: 'interviewing', notes: 'Scheduled round 1' }
    await updateApplicationApi('app_123', payload)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/applications/app_123',
      method: 'PATCH',
      body: payload,
    })
  })

  it('delete sends DELETE to /applications/:id', async () => {
    mocks.request.mockResolvedValue({ status: 200, message: 'Application deleted' })
    await deleteApplicationApi('app_123')
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/applications/app_123',
      method: 'DELETE',
    })
  })
})
