import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HistorySection from './HistorySection.jsx'
import * as analyticsApi from '../../api/analytics.api.js'

vi.mock('../../api/analytics.api.js')

describe('HistorySection', () => {
  const mockSessions = [
    {
      _id: 'session_1',
      status: 'completed',
      answeredCount: 5,
      totalQuestions: 5,
      completedAt: '2026-09-15T10:00:00.000Z',
      summary: { overallScore: 88 },
      interview: {
        _id: 'int_1',
        title: 'System Design Interview',
      },
      job: {
        _id: 'job_1',
        title: 'Senior Frontend Engineer',
        company: 'Stripe',
      },
    },
    {
      _id: 'session_2',
      status: 'in_progress',
      answeredCount: 2,
      totalQuestions: 5,
      summary: null,
      interview: null, // deleted interview fallback
      job: {
        _id: 'job_2',
        title: 'Staff Architect',
        company: 'Google',
      },
    },
  ]

  const mockPagination = {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    analyticsApi.getAnalyticsHistoryApi.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <HistorySection />
      </MemoryRouter>
    )
    expect(screen.getByText('Loading practice history…')).toBeInTheDocument()
  })

  it('renders practice history records with interview links, status, and job info', async () => {
    analyticsApi.getAnalyticsHistoryApi.mockResolvedValueOnce({
      data: {
        sessions: mockSessions,
        pagination: mockPagination,
      },
    })

    render(
      <MemoryRouter>
        <HistorySection />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('System Design Interview')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'System Design Interview' })).toHaveAttribute(
      'href',
      '/interviews/int_1'
    )
    expect(screen.getByText('Interview removed')).toBeInTheDocument()
    expect(screen.getByText(/Senior Frontend Engineer/)).toBeInTheDocument()
    expect(screen.getByText(/5\/5 answered/)).toBeInTheDocument()
    expect(screen.getByText(/2\/5 answered/)).toBeInTheDocument()
    expect(screen.getByText('88')).toBeInTheDocument()
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('In progress').length).toBeGreaterThanOrEqual(1)
  })

  it('renders empty state when there are no practice sessions', async () => {
    analyticsApi.getAnalyticsHistoryApi.mockResolvedValueOnce({
      data: {
        sessions: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
    })

    render(
      <MemoryRouter>
        <HistorySection />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No practice sessions yet')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Go to interviews' })).toHaveAttribute('href', '/interviews')
  })

  it('filters history by status and triggers re-fetch', async () => {
    const user = userEvent.setup()
    analyticsApi.getAnalyticsHistoryApi.mockResolvedValue({
      data: {
        sessions: mockSessions,
        pagination: mockPagination,
      },
    })

    render(
      <MemoryRouter>
        <HistorySection />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('System Design Interview')).toBeInTheDocument()
    })

    const filterSelect = screen.getByLabelText('Filter history by status')
    await user.selectOptions(filterSelect, 'completed')

    await waitFor(() => {
      expect(analyticsApi.getAnalyticsHistoryApi).toHaveBeenCalledWith({
        status: 'completed',
        page: 1,
      })
    })
  })

  it('renders error message and allows retry', async () => {
    const user = userEvent.setup()
    let shouldFail = true
    analyticsApi.getAnalyticsHistoryApi.mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Failed to load history'))
      }
      return Promise.resolve({
        data: {
          sessions: mockSessions,
          pagination: mockPagination,
        },
      })
    })

    render(
      <MemoryRouter>
        <HistorySection />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load history')).toBeInTheDocument()
    })

    shouldFail = false
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('System Design Interview')).toBeInTheDocument()
    })
  })
})
