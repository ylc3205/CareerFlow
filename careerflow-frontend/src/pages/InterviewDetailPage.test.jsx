import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import InterviewDetailPage from './InterviewDetailPage.jsx'
import * as interviewsApi from '../api/interviews.api.js'

vi.mock('../api/interviews.api.js')

describe('InterviewDetailPage', () => {
  const mockInterview = {
    _id: 'int_1',
    title: 'Technical Screen',
    type: 'video',
    status: 'scheduled',
    scheduledDate: '2026-10-15T14:00:00.000Z',
    interviewerNames: 'Alice Smith',
    location: 'Zoom',
    meetingLink: 'https://zoom.us/j/123456',
    notes: 'Prepare system design',
    feedback: 'Great communication',
    application: {
      _id: 'app_1',
      job: { title: 'Senior Frontend Engineer', company: 'Acme Corp' },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('renders interview details and metadata', async () => {
    interviewsApi.getInterviewApi.mockResolvedValueOnce({
      data: { interview: mockInterview },
    })

    render(
      <MemoryRouter initialEntries={['/interviews/int_1']}>
        <Routes>
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Loading interview...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Technical Screen' })).toBeInTheDocument()
    })

    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Zoom')).toBeInTheDocument()
    expect(screen.getByText('Prepare system design')).toBeInTheDocument()
    expect(screen.getByText('Great communication')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View application' })).toHaveAttribute('href', '/applications/app_1')
    expect(screen.getByRole('link', { name: 'https://zoom.us/j/123456' })).toHaveAttribute('href', 'https://zoom.us/j/123456')
  })

  it('toggles edit mode and updates interview', async () => {
    const user = userEvent.setup()
    interviewsApi.getInterviewApi.mockResolvedValue({
      data: { interview: mockInterview },
    })
    interviewsApi.updateInterviewApi.mockResolvedValueOnce({
      data: { interview: { ...mockInterview, title: 'Updated Technical Screen' } },
    })

    render(
      <MemoryRouter initialEntries={['/interviews/int_1']}>
        <Routes>
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Technical Screen' })).toBeInTheDocument()
    })

    const editBtn = screen.getByRole('button', { name: 'Edit' })
    await user.click(editBtn)

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Technical Screen')

    const saveBtn = screen.getByRole('button', { name: 'Save changes' })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(interviewsApi.updateInterviewApi).toHaveBeenCalledWith('int_1', expect.any(Object))
    })
  })

  it('handles interview deletion and navigation via ConfirmDialog', async () => {
    const user = userEvent.setup()
    interviewsApi.getInterviewApi.mockResolvedValueOnce({
      data: { interview: mockInterview },
    })
    interviewsApi.deleteInterviewApi.mockResolvedValueOnce({ success: true })

    render(
      <MemoryRouter initialEntries={['/interviews/int_1']}>
        <Routes>
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />
          <Route path="/interviews" element={<div>Interviews List Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Technical Screen' })).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteBtn)

    const dialog = screen.getByRole('dialog', { name: 'Delete this interview?' })
    expect(dialog).toBeInTheDocument()

    const dialogConfirmBtn = dialog.querySelector('button.bg-destructive, button:last-child')
    await user.click(dialogConfirmBtn)

    await waitFor(() => {
      expect(interviewsApi.deleteInterviewApi).toHaveBeenCalledWith('int_1')
      expect(screen.getByText('Interviews List Page')).toBeInTheDocument()
    })
  })

  it('renders load error with retry button', async () => {
    const user = userEvent.setup()
    interviewsApi.getInterviewApi
      .mockRejectedValueOnce(new Error('Failed to load interview'))
      .mockResolvedValueOnce({
        data: { interview: mockInterview },
      })

    render(
      <MemoryRouter initialEntries={['/interviews/int_1']}>
        <Routes>
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load interview')).toBeInTheDocument()
    })

    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Technical Screen' })).toBeInTheDocument()
    })
  })

  it('resets state when route id changes (route hardening)', async () => {
    const user = userEvent.setup()
    const interview2 = {
      _id: 'int_2',
      title: 'Final Round Director Interview',
      type: 'onsite',
      status: 'scheduled',
      application: {
        _id: 'app_2',
        job: { title: 'Lead Engineer', company: 'Global Tech' },
      },
    }

    interviewsApi.getInterviewApi.mockImplementation((id) => {
      if (id === 'int_1') {
        return Promise.resolve({ data: { interview: mockInterview } })
      }
      if (id === 'int_2') {
        return Promise.resolve({ data: { interview: interview2 } })
      }
      return Promise.reject(new Error('Not found'))
    })

    function NavigatorComponent() {
      const navigate = useNavigate()
      return (
        <div>
          <button onClick={() => navigate('/interviews/int_2')}>Go to Interview 2</button>
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={['/interviews/int_1']}>
        <NavigatorComponent />
        <Routes>
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Technical Screen' })).toBeInTheDocument()
    })

    // Open edit mode on interview 1
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()

    // Navigate to interview 2
    await user.click(screen.getByRole('button', { name: 'Go to Interview 2' }))

    // Expect edit mode to be closed and interview 2 heading displayed
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Final Round Director Interview' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})
