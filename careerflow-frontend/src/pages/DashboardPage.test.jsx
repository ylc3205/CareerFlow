import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage.jsx'
import * as analyticsApi from '../api/analytics.api.js'
import * as jobsApi from '../api/jobs.api.js'
import * as applicationsApi from '../api/applications.api.js'
import * as interviewsApi from '../api/interviews.api.js'

vi.mock('../api/analytics.api.js')
vi.mock('../api/jobs.api.js')
vi.mock('../api/applications.api.js')
vi.mock('../api/interviews.api.js')
vi.mock('../auth/useAuth.js', () => ({
  useAuth: () => ({ user: { email: 'alex@example.com' } }),
}))

describe('DashboardPage', () => {
  const mockDashboardData = {
    totals: {
      totalSessions: 4,
      completedSessions: 3,
      inProgressSessions: 1,
      notStartedSessions: 0,
      answeredQuestions: 15,
      totalQuestions: 20,
    },
    averages: {
      overallScore: 85,
      technicalScore: 88,
      communicationScore: 82,
      behavioralScore: 85,
      sessionsCount: 3,
    },
    bestSession: {
      sessionId: 'session_1',
      overallScore: 92,
      completedAt: '2026-09-10T12:00:00.000Z',
      interview: { title: 'System Architecture' },
      job: { title: 'Lead Engineer', company: 'Acme Inc' },
    },
    recentSessions: [
      {
        sessionId: 'session_1',
        overallScore: 92,
        completedAt: '2026-09-10T12:00:00.000Z',
        interview: { title: 'System Architecture' },
        job: { title: 'Lead Engineer', company: 'Acme Inc' },
      },
    ],
    trend: [
      { sessionId: 's1', overallScore: 78 },
      { sessionId: 's2', overallScore: 85 },
      { sessionId: 's3', overallScore: 92 },
    ],
    strongAreas: [{ area: 'System Design', count: 3 }],
    weakAreas: [{ area: 'Concurrency', count: 2 }],
  }

  const mockPipelineData = {
    totalApplications: 6,
    byStatus: {
      applied: 2,
      screening: 1,
      interviewing: 1,
      offer: 1,
      rejected: 1,
      withdrawn: 0,
    },
  }

  const futureDate1 = new Date(Date.now() + 86400000 * 2).toISOString() // +2 days
  const futureDate2 = new Date(Date.now() + 86400000 * 5).toISOString() // +5 days
  const pastDate = new Date(Date.now() - 86400000 * 3).toISOString() // -3 days

  const mockScheduledInterviews = [
    {
      _id: 'int_past',
      title: 'Past Screening',
      type: 'phone',
      scheduledDate: pastDate,
      application: { job: { company: 'Old Corp' } },
    },
    {
      _id: 'int_near',
      title: 'Technical Screen',
      type: 'video',
      scheduledDate: futureDate1,
      location: 'Google Meet',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      application: { job: { company: 'VNG Corp' } },
    },
    {
      _id: 'int_far',
      title: 'Final Director Round',
      type: 'onsite',
      scheduledDate: futureDate2,
      location: 'Building A, Floor 5',
      application: { job: { company: 'Meta' } },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    analyticsApi.getAnalyticsDashboardApi.mockResolvedValue({
      data: { dashboard: mockDashboardData },
    })
    analyticsApi.getApplicationPipelineApi.mockResolvedValue({
      data: { pipeline: mockPipelineData },
    })
    jobsApi.listJobsApi.mockResolvedValue({
      data: { pagination: { total: 12 } },
    })
    applicationsApi.listApplicationsApi.mockResolvedValue({
      data: { pagination: { total: 1 } },
    })
    interviewsApi.listInterviewsApi.mockImplementation((params = {}) => {
      if (params.status === 'scheduled') {
        return Promise.resolve({ data: { interviews: mockScheduledInterviews } })
      }
      return Promise.resolve({ data: { pagination: { total: 5 } } })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders KPI metric summary cards correctly', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Career Command Center')).toBeInTheDocument()
    })

    expect(screen.getByText('Jobs saved')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()

    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()

    expect(screen.getByText('Interviews')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    expect(screen.getByText('Offers')).toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
  })

  it('renders application pipeline flow and closed state summary', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Application pipeline')).toBeInTheDocument()
    })

    expect(
      screen.getByText(/1 application in a closed state \(rejected or withdrawn\)/i)
    ).toBeInTheDocument()
  })

  it('selects and displays the nearest upcoming future interview', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Upcoming interview')).toBeInTheDocument()
    })

    expect(screen.getByText('Technical Screen')).toBeInTheDocument()
    expect(screen.getByText('VNG Corp')).toBeInTheDocument()
    expect(screen.getByText('Google Meet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join call' })).toHaveAttribute(
      'href',
      'https://meet.google.com/abc-defg-hij'
    )

    // Ensure past interview and later interview are not selected as the primary card
    expect(screen.queryByText('Past Screening')).not.toBeInTheDocument()
    expect(screen.queryByText('Final Director Round')).not.toBeInTheDocument()
  })

  it('renders practice analytics, recent sessions, and skill areas', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('15/20')).toBeInTheDocument()
    expect(screen.getByText('System Architecture')).toBeInTheDocument()
    expect(screen.getByText(/Acme Inc · Lead Engineer/)).toBeInTheDocument()
    expect(screen.getByText('System Design')).toBeInTheDocument()
    expect(screen.getByText('Concurrency')).toBeInTheDocument()
  })

  it('tolerates non-critical API rejection via Promise.allSettled', async () => {
    // Jobs API and Application Pipeline fail, but dashboard analytics succeeds
    jobsApi.listJobsApi.mockRejectedValue(new Error('Jobs service unavailable'))
    analyticsApi.getApplicationPipelineApi.mockRejectedValue(new Error('Pipeline unavailable'))

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Career Command Center')).toBeInTheDocument()
    })

    // Dashboard continues rendering practice and interview cards
    expect(screen.getByText('Technical Screen')).toBeInTheDocument()
    expect(screen.getByText('System Architecture')).toBeInTheDocument()
  })

  it('renders global error card and allows retry when dashboard endpoint fails', async () => {
    const user = userEvent.setup()
    let shouldFail = true
    analyticsApi.getAnalyticsDashboardApi.mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Dashboard endpoint failed'))
      }
      return Promise.resolve({ data: { dashboard: mockDashboardData } })
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Could not load your dashboard')).toBeInTheDocument()
    })

    shouldFail = false
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('Career Command Center')).toBeInTheDocument()
    })
  })

  it('renders empty states when there are no applications or upcoming interviews', async () => {
    analyticsApi.getApplicationPipelineApi.mockResolvedValue({
      data: {
        pipeline: {
          totalApplications: 0,
          byStatus: { applied: 0, screening: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 },
        },
      },
    })
    interviewsApi.listInterviewsApi.mockResolvedValue({
      data: { interviews: [], pagination: { total: 0 } },
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No applications yet')).toBeInTheDocument()
      expect(screen.getByText('No upcoming interview')).toBeInTheDocument()
    })
  })
})
