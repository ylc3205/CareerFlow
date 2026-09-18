import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AnalyticsPage from './AnalyticsPage.jsx'
import * as analyticsApi from '../api/analytics.api.js'

vi.mock('../api/analytics.api.js')

describe('AnalyticsPage', () => {
  const mockDashboard = {
    totals: {
      totalSessions: 6,
      completedSessions: 4,
      inProgressSessions: 2,
      answeredQuestions: 24,
      totalQuestions: 30,
    },
    averages: {
      overallScore: 84,
      technicalScore: 86,
      communicationScore: 80,
      behavioralScore: 86,
      sessionsCount: 4,
    },
    bestSession: {
      sessionId: 'sess_best',
      overallScore: 94,
      completedAt: '2026-09-12T14:00:00.000Z',
      interview: { title: 'Staff Systems Architect' },
      job: { title: 'Principal Architect', company: 'Netflix' },
    },
    recentSessions: [
      {
        sessionId: 'sess_1',
        overallScore: 94,
        completedAt: '2026-09-12T14:00:00.000Z',
        interview: { title: 'Staff Systems Architect' },
        job: { title: 'Principal Architect', company: 'Netflix' },
      },
      {
        sessionId: 'sess_2',
        overallScore: 82,
        completedAt: '2026-09-08T10:00:00.000Z',
        interview: { title: 'Frontend Deep Dive' },
        job: { title: 'Staff Frontend Engineer', company: 'Uber' },
      },
    ],
    trend: [
      { sessionId: 's1', overallScore: 75, completedAt: '2026-09-01T00:00:00.000Z' },
      { sessionId: 's2', overallScore: 82, completedAt: '2026-09-08T00:00:00.000Z' },
      { sessionId: 's3', overallScore: 94, completedAt: '2026-09-12T00:00:00.000Z' },
    ],
    strongAreas: [
      { area: 'Distributed Systems', count: 4 },
      { area: 'Component Architecture', count: 3 },
    ],
    weakAreas: [
      { area: 'Live Coding Speed', count: 2 },
    ],
  }

  const mockPerformance = {
    totalEvaluations: 24,
    averages: { overallScore: 84 },
    averageAttemptsPerQuestion: 1.2,
    byCategory: {
      technical: { count: 12, averageScore: 86 },
      behavioral: { count: 8, averageScore: 86 },
      situational: { count: 4, averageScore: 80 },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    analyticsApi.getAnalyticsDashboardApi.mockResolvedValue({
      data: { dashboard: mockDashboard },
    })
    analyticsApi.getAnalyticsPerformanceApi.mockResolvedValue({
      data: { performance: mockPerformance },
    })
    analyticsApi.getAnalyticsHistoryApi.mockResolvedValue({
      data: { sessions: [], pagination: { total: 0 } },
    })
  })

  it('renders loading state on mount', () => {
    analyticsApi.getAnalyticsDashboardApi.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Loading analytics…')).toBeInTheDocument()
  })

  it('renders KPI stat cards and average score breakdown', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    })

    expect(screen.getByText('Practice sessions')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getAllByText('In progress').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('24/30')).toBeInTheDocument()

    expect(screen.getByText('Average scores')).toBeInTheDocument()
    expect(screen.getAllByText('Technical').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Communication').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Behavioral').length).toBeGreaterThanOrEqual(1)
  })

  it('renders best session details and score gauge', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Best session')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Staff Systems Architect').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Principal Architect — Netflix/)).toBeInTheDocument()
  })

  it('renders category performance breakdown and skill areas', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Performance by category')).toBeInTheDocument()
    })

    expect(screen.getByText('Distributed Systems')).toBeInTheDocument()
    expect(screen.getByText('Component Architecture')).toBeInTheDocument()
    expect(screen.getByText('Live Coding Speed')).toBeInTheDocument()
  })

  it('renders error state and allows retry', async () => {
    const user = userEvent.setup()
    let shouldFail = true
    analyticsApi.getAnalyticsDashboardApi.mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Analytics server error'))
      }
      return Promise.resolve({ data: { dashboard: mockDashboard } })
    })

    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Analytics server error')).toBeInTheDocument()
    })

    shouldFail = false
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    })
  })
})
