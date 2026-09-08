import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import JobsPage from './JobsPage.jsx'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../api/jobs.api.js', () => ({
  listJobsApi: mocks.list,
  deleteJobApi: mocks.delete,
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const jobA = { _id: 'job_1', title: 'Backend Developer', company: 'VNG', status: 'saved', location: 'HCM' }
const jobB = { _id: 'job_2', title: 'Frontend Engineer', company: 'Shopee', status: 'applied' }

const pagination = (page = 1, totalPages = 1, total = 2) => ({ page, totalPages, total })

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/jobs']}>
      <Routes>
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/new" element={<div>new job route</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  )

describe('JobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({ data: { jobs: [jobA, jobB], pagination: pagination() } })
    mocks.delete.mockResolvedValue({ data: null, message: 'deleted' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows a loading state while fetching', () => {
    mocks.list.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading jobs...')).toBeInTheDocument()
  })

  it('renders the job list on success', async () => {
    renderPage()
    expect(await screen.findByText('Backend Developer')).toBeInTheDocument()
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('VNG')).toBeInTheDocument()
  })

  it('shows an empty state when there are no jobs and no filters', async () => {
    mocks.list.mockResolvedValue({ data: { jobs: [], pagination: pagination(1, 0, 0) } })
    renderPage()
    expect(await screen.findByText('No jobs yet')).toBeInTheDocument()
    expect(screen.getByText(/Add a job posting to start tracking/)).toBeInTheDocument()
  })

  it('shows a filtered empty state with a clear-filters action', async () => {
    mocks.list.mockResolvedValue({ data: { jobs: [], pagination: pagination(1, 0, 0) } })
    renderPage()
    const search = screen.getByLabelText('Search jobs')
    await userEvent.type(search, 'zzz')
    expect(await screen.findByText('No matching jobs')).toBeInTheDocument()
    const clearBtn = screen.getByRole('button', { name: 'Clear filters' })
    await userEvent.click(clearBtn)
    expect(search).toHaveValue('')
    expect(screen.getByText('No jobs yet')).toBeInTheDocument()
  })

  it('debounces the search before issuing an API call', async () => {
    // Initial load runs under real timers (RTL findBy* relies on real timers).
    renderPage()
    await screen.findByText('Backend Developer')
    mocks.list.mockClear()

    // Switch to fake timers to control the 350ms search debounce.
    vi.useFakeTimers()
    try {
      fireEvent.change(screen.getByLabelText('Search jobs'), { target: { value: 'backend' } })
      // The debounce window has not elapsed, so no new list call should fire.
      expect(mocks.list).not.toHaveBeenCalled()

      await act(() => vi.advanceTimersByTimeAsync(400))
      expect(mocks.list).toHaveBeenCalledWith({ status: '', search: 'backend', page: 1 })
    } finally {
      vi.useRealTimers()
    }
  })

  it('filters by status', async () => {
    renderPage()
    await screen.findByText('Backend Developer')
    mocks.list.mockClear()
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'applied')
    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledWith({ status: 'applied', search: '', page: 1 })
    })
  })

  it('shows a pagination control and triggers a page change', async () => {
    mocks.list.mockResolvedValue({ data: { jobs: [jobA, jobB], pagination: pagination(1, 2, 2) } })
    renderPage()
    await screen.findByText('Backend Developer')
    expect(screen.getByText('Page 1 of 2 · 2 total')).toBeInTheDocument()
    mocks.list.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledWith({ status: '', search: '', page: 2 })
    })
  })

  it('deletes a job after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.list.mockResolvedValue({ data: { jobs: [jobA], pagination: pagination() } })
    renderPage()
    await screen.findByText('Backend Developer')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(mocks.delete).toHaveBeenCalledWith('job_1')
    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledTimes(2)
    })
    confirmSpy.mockRestore()
  })

  it('does not delete when confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mocks.list.mockResolvedValue({ data: { jobs: [jobA], pagination: pagination() } })
    renderPage()
    await screen.findByText('Backend Developer')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(mocks.delete).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows a delete error message on failure', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.delete.mockRejectedValue(new Error('Delete failed'))
    mocks.list.mockResolvedValue({ data: { jobs: [jobA], pagination: pagination() } })
    renderPage()
    await screen.findByText('Backend Developer')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Delete failed')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('steps back one page when the last item on the last page is deleted', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    // Page 2 with a single job.
    mocks.list.mockResolvedValue({
      data: { jobs: [jobA], pagination: pagination(2, 2, 1) },
    })
    renderPage()
    await screen.findByText('Backend Developer')
    mocks.list.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledWith({ status: '', search: '', page: 1 })
    })
    confirmSpy.mockRestore()
  })

  it('shows an error state with a retry button on load failure', async () => {
    mocks.list.mockRejectedValue(new Error('Network down'))
    renderPage()
    expect(await screen.findByText('Network down')).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'Retry' })
    mocks.list.mockClear()
    mocks.list.mockResolvedValue({ data: { jobs: [jobA], pagination: pagination() } })
    await userEvent.click(retry)
    expect(await screen.findByText('Backend Developer')).toBeInTheDocument()
  })

  it('links to the create page via the Add job button', async () => {
    renderPage()
    await screen.findByText('Backend Developer')
    await userEvent.click(screen.getByRole('link', { name: 'Add job' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/jobs/new')
  })
})
