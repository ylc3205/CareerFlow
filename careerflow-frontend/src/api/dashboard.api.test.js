import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardOverviewApi } from './dashboard.api.js'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./client.js', () => ({
  request: mocks.request,
}))

describe('dashboard.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDashboardOverviewApi sends GET to /dashboard/overview', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { overview: {}, pipeline: {}, nextInterview: null, practice: {} } })
    await getDashboardOverviewApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/dashboard/overview',
      method: 'GET',
    })
  })
})
