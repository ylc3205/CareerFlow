import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGeneratedDirection, mockMetadata } from '../test/fixtures.js'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./client.js', () => ({
  request: mocks.request,
}))

import {
  listCareerDirectionsApi,
  getCareerDirectionApi,
  createCareerDirectionApi,
  updateCareerDirectionApi,
  deleteCareerDirectionApi,
  generateCareerDirectionApi,
} from './careerDirections.api.js'

describe('careerDirections.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list builds a query string from defined params only', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { careerDirections: [], pagination: {} } })
    await listCareerDirectionsApi({ search: 'backend', page: 2, limit: 10 })
    await listCareerDirectionsApi({ page: 1 })

    expect(mocks.request).toHaveBeenNthCalledWith(1, {
      path: '/career-directions?search=backend&page=2&limit=10',
      method: 'GET',
    })
    expect(mocks.request).toHaveBeenNthCalledWith(2, {
      path: '/career-directions?page=1',
      method: 'GET',
    })
  })

  it('get fetches a single direction by id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { careerDirection: {} } })
    await getCareerDirectionApi('cd_1')
    expect(mocks.request).toHaveBeenCalledWith({ path: '/career-directions/cd_1', method: 'GET' })
  })

  it('create sends draft data to POST /career-directions', async () => {
    mocks.request.mockResolvedValue({ status: 201, data: { careerDirection: {} } })
    const draft = { title: 'Backend Developer', focusSkills: ['Node.js'] }
    await createCareerDirectionApi(draft)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/career-directions',
      method: 'POST',
      body: draft,
    })
  })

  it('create sends generationMetadata alongside the draft (confirm/ persist boundary)', async () => {
    mocks.request.mockResolvedValue({ status: 201, data: { careerDirection: {} } })
    const draft = { ...mockGeneratedDirection }
    const body = {
      ...draft,
      generationMetadata: mockMetadata,
    }
    await createCareerDirectionApi(body)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/career-directions',
      method: 'POST',
      body,
    })
    expect(mocks.request.mock.calls[0][0].body.generationMetadata).toEqual(mockMetadata)
    expect(mocks.request.mock.calls[0][0].body.title).toBe('Backend Developer')
  })

  it('update sends PATCH to /career-directions/:id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { careerDirection: {} } })
    await updateCareerDirectionApi('cd_1', { title: 'Senior Backend Developer' })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/career-directions/cd_1',
      method: 'PATCH',
      body: { title: 'Senior Backend Developer' },
    })
  })

  it('delete sends DELETE to /career-directions/:id', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: null, message: 'deleted' })
    await deleteCareerDirectionApi('cd_1')
    expect(mocks.request).toHaveBeenCalledWith({ path: '/career-directions/cd_1', method: 'DELETE' })
  })

  it('generate sends the full mode payload to POST /career-directions/generate', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { generatedDirection: {}, metadata: {} } })
    const payload = {
      mode: 'ai_from_idea',
      userIdea: 'I want to become a Node.js backend developer',
      targetRole: 'Backend Developer',
      careerLevel: 'junior',
      primaryFocus: ['backend'],
      secondaryFocus: [],
      contextSources: { resume: false, profile: false, existingDirections: false },
    }
    await generateCareerDirectionApi(payload)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/career-directions/generate',
      method: 'POST',
      body: payload,
    })
  })

  it('does not make real HTTP requests (client.request is mocked)', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { careerDirections: [] } })
    const result = await listCareerDirectionsApi({})
    // The only code under test is the request boundary; the network layer is fully mocked.
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith({
      path: '/career-directions',
      method: 'GET',
    })
    expect(result).toEqual({ status: 200, data: { careerDirections: [] } })
  })
})