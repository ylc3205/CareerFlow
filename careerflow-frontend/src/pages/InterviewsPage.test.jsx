import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import InterviewsPage from './InterviewsPage.jsx'
import * as interviewsApi from '../api/interviews.api.js'

vi.mock('../api/interviews.api.js')

describe('InterviewsPage', () => {
  const mockInterviews = [
    {
      _id: 'int_1',
      title: 'Technical Screen',
      type: 'video',
      status: 'scheduled',
      scheduledDate: '2026-10-15T14:00:00.000Z',
      interviewerNames: 'Alice Smith',
      application: {
        _id: 'app_1',
        job: { title: 'Senior Frontend Engineer', company: 'Acme Corp' },
      },
    },
    {
      _id: 'int_2',
      title: 'Culture Fit',
      type: 'phone',
      status: 'completed',
      scheduledDate: '2026-09-10T10:00:00.000Z',
      application: {
        _id: 'app_2',
        job: { title: 'React Developer', company: 'Beta Labs' },
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
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('renders interview cards when data is loaded', async () => {
    interviewsApi.listInterviewsApi.mockResolvedValueOnce({
      data: {
        interviews: mockInterviews,
        pagination: mockPagination,
      },
    })

    render(
      <MemoryRouter>
        <InterviewsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Loading interviews...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Technical Screen')).toBeInTheDocument()
      expect(screen.getByText('Culture Fit')).toBeInTheDocument()
    })

    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument()
    expect(screen.getByText(/Beta Labs/)).toBeInTheDocument()
  })

  it('renders empty state when no interviews exist', async () => {
    interviewsApi.listInterviewsApi.mockResolvedValueOnce({
      data: {
        interviews: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
    })

    render(
      <MemoryRouter>
        <InterviewsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No interviews yet')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: 'Go to applications' })).toHaveAttribute('href', '/applications')
  })

  it('filters by status and updates api call', async () => {
    const user = userEvent.setup()
    interviewsApi.listInterviewsApi.mockResolvedValue({
      data: {
        interviews: mockInterviews,
        pagination: mockPagination,
      },
    })

    render(
      <MemoryRouter>
        <InterviewsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Technical Screen')).toBeInTheDocument()
    })

    const statusSelect = screen.getByLabelText('Filter by status')
    await user.selectOptions(statusSelect, 'completed')

    await waitFor(() => {
      expect(interviewsApi.listInterviewsApi).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      )
    })
  })

  it('renders empty filtered state and clears filters', async () => {
    const user = userEvent.setup()
    interviewsApi.listInterviewsApi.mockImplementation(({ status }) => {
      if (status === 'canceled') {
        return Promise.resolve({
          data: {
            interviews: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          },
        })
      }
      return Promise.resolve({
        data: {
          interviews: mockInterviews,
          pagination: mockPagination,
        },
      })
    })

    render(
      <MemoryRouter>
        <InterviewsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Technical Screen')).toBeInTheDocument()
    })

    const statusSelect = screen.getByLabelText('Filter by status')
    await user.selectOptions(statusSelect, 'canceled')

    await waitFor(() => {
      expect(screen.getByText('No matching interviews')).toBeInTheDocument()
    })

    const clearButton = screen.getByRole('button', { name: 'Clear filters' })
    await user.click(clearButton)

    await waitFor(() => {
      expect(statusSelect).toHaveValue('')
    })
  })

  it('handles delete interview flow', async () => {
    const user = userEvent.setup()
    interviewsApi.listInterviewsApi.mockResolvedValue({
      data: {
        interviews: mockInterviews,
        pagination: mockPagination,
      },
    })
    interviewsApi.deleteInterviewApi.mockResolvedValue({ success: true })

    render(
      <MemoryRouter>
        <InterviewsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Technical Screen')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(interviewsApi.deleteInterviewApi).toHaveBeenCalledWith('int_1')
    })
  })

  it('renders load error and allows retry', async () => {
    const user = userEvent.setup()
    let shouldFail = true
    interviewsApi.listInterviewsApi.mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({
        data: {
          interviews: mockInterviews,
          pagination: mockPagination,
        },
      })
    })

    render(
      <MemoryRouter>
        <InterviewsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    shouldFail = false
    const retryButton = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Technical Screen')).toBeInTheDocument()
    })
  })
})
