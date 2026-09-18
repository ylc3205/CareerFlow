import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAnalyticsDashboardApi,
  getAnalyticsHistoryApi,
  getAnalyticsTrendsApi,
  getAnalyticsAreasApi,
  getAnalyticsPerformanceApi,
  getApplicationPipelineApi,
} from './analytics.api.js'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('./client.js', () => ({
  request: mocks.request,
}))

describe('analytics.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAnalyticsDashboardApi sends GET to /analytics/dashboard', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { dashboard: {} } })
    await getAnalyticsDashboardApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/dashboard',
      method: 'GET',
    })
  })

  it('getAnalyticsHistoryApi builds query params for status, page, and limit', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { sessions: [], pagination: {} } })
    await getAnalyticsHistoryApi({ status: 'completed', page: 2, limit: 10 })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/history?status=completed&page=2&limit=10',
      method: 'GET',
    })
  })

  it('getAnalyticsHistoryApi omits empty, null, or undefined parameters', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { sessions: [], pagination: {} } })
    await getAnalyticsHistoryApi({ status: '', interview: null, page: 1, limit: undefined })
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/history?page=1',
      method: 'GET',
    })
  })

  it('getAnalyticsHistoryApi sends a bare path when no params are provided', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { sessions: [], pagination: {} } })
    await getAnalyticsHistoryApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/history',
      method: 'GET',
    })
  })

  it('getAnalyticsTrendsApi sends GET to /analytics/trends', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { trends: {} } })
    await getAnalyticsTrendsApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/trends',
      method: 'GET',
    })
  })

  it('getAnalyticsAreasApi defaults to limit=5 and sends query param', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { areas: {} } })
    await getAnalyticsAreasApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/areas?limit=5',
      method: 'GET',
    })
  })

  it('getAnalyticsAreasApi respects custom limit argument', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { areas: {} } })
    await getAnalyticsAreasApi(10)
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/areas?limit=10',
      method: 'GET',
    })
  })

  it('getAnalyticsPerformanceApi sends GET to /analytics/performance', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { performance: {} } })
    await getAnalyticsPerformanceApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/performance',
      method: 'GET',
    })
  })

  it('getApplicationPipelineApi sends GET to /analytics/applications/pipeline', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { pipeline: {} } })
    await getApplicationPipelineApi()
    expect(mocks.request).toHaveBeenCalledWith({
      path: '/analytics/applications/pipeline',
      method: 'GET',
    })
  })
})
