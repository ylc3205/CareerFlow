import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listJobsApi,
  getJobApi,
  createJobApi,
  updateJobApi,
  deleteJobApi,
  getJobContextApi,
  matchJobApi,
} from './jobs.api.js'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./client.js', () => ({
  request: mocks.request,
}))

describe('jobs.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list builds a query string from defined params only', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { jobs: [], pagination: {} } })
    await listJobsApi({ status: 'applied', search: 'backend', page: 2 })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/jobs?status=applied&search=backend&page=2',
      method: 'GET',
    })
  })

  it('list omits undefined/null/empty parameters', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { jobs: [], pagination: {} } })
    await listJobsApi({ status: '', search: undefined, page: null, limit: 20 })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/jobs?limit=20',
      method: 'GET',
    })
  })

  it('list with no params sends a bare /jobs path', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { jobs: [], pagination: {} } })
    await listJobsApi()
    expect(mocks.request).toHaveBeenCalledWith({ path: '/jobs', method: 'GET' })
  })

  it('get fetches a single job by id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { job: {} } })
    await getJobApi('job_1')
    expect(mocks.request).toHaveBeenCalledWith({ path: '/jobs/job_1', method: 'GET' })
  })

  it('create sends POST to /jobs with the job payload', async () => {
    mocks.request.mockResolvedValue({ status: 201, data: { job: {} } })
    const payload = { title: 'Backend Developer', company: 'VNG' }
    await createJobApi(payload)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/jobs',
      method: 'POST',
      body: payload,
    })
  })

  it('update sends PATCH to /jobs/:id with the payload', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { job: {} } })
    const payload = { status: 'applied' }
    await updateJobApi('job_1', payload)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/jobs/job_1',
      method: 'PATCH',
      body: payload,
    })
  })

  it('delete sends DELETE to /jobs/:id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: null, message: 'deleted' })
    await deleteJobApi('job_1')
    expect(mocks.request).toHaveBeenCalledWith({ path: '/jobs/job_1', method: 'DELETE' })
  })

  it('matchJobApi sends POST to /jobs/:id/match with an empty body when no direction is provided', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { match: {} } })
    await matchJobApi('job_1', {})
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/jobs/job_1/match',
      method: 'POST',
      body: {},
    })
  })

  it('matchJobApi sends the careerDirectionId in the body when provided', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { match: {} } })
    await matchJobApi('job_1', { careerDirectionId: 'cd_1' })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/jobs/job_1/match',
      method: 'POST',
      body: { careerDirectionId: 'cd_1' },
    })
  })

  it('matchJobApi defaults to an empty body when called without one', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { match: {} } })
    await matchJobApi('job_1')
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/jobs/job_1/match',
      method: 'POST',
      body: {},
    })
  })

  it('getJobContextApi fetches job context by id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { job: {}, application: null, match: null, careerDirections: [] } })
    await getJobContextApi('job_1')
    expect(mocks.request).toHaveBeenCalledWith({ path: '/jobs/job_1/context', method: 'GET' })
  })

  it('does not make real HTTP requests (client.request is mocked)', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { jobs: [] } })
    const result = await listJobsApi({})
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith({ path: '/jobs', method: 'GET' })
    expect(result).toEqual({ status: 200, data: { jobs: [] } })
  })
})
