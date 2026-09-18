import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ApplicationsPage from './ApplicationsPage.jsx'

const mocks = vi.hoisted(() => ({
  listApplications: vi.fn(),
  deleteApplication: vi.fn(),
}))

vi.mock('../api/applications.api.js', () => ({
  listApplicationsApi: mocks.listApplications,
  deleteApplicationApi: mocks.deleteApplication,
}))

const sampleApp = {
  _id: 'app_1',
  status: 'applied',
  appliedAt: '2026-09-10T00:00:00.000Z',
  job: {
    _id: 'job_1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
    location: 'Remote',
  },
  notes: 'Referred by team member',
}

const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <ApplicationsPage />
    </MemoryRouter>
  )
}

describe('ApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading indicator while fetching', () => {
    mocks.listApplications.mockReturnValue(new Promise(() => {}))
    renderWithRouter()
    expect(screen.getByText(/Loading applications/i)).toBeInTheDocument()
  })

  it('renders application list successfully', async () => {
    mocks.listApplications.mockResolvedValue({
      data: {
        applications: [sampleApp],
        pagination: { page: 1, totalPages: 1, total: 1, limit: 10 },
      },
    })

    renderWithRouter()

    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getAllByText('TechCorp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('applied').length).toBeGreaterThanOrEqual(1)
  })

  it('renders empty state when there are no applications', async () => {
    mocks.listApplications.mockResolvedValue({
      data: {
        applications: [],
        pagination: { page: 1, totalPages: 0, total: 0, limit: 10 },
      },
    })

    renderWithRouter()

    expect(await screen.findByText('No applications yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Browse jobs/i })).toHaveAttribute('href', '/jobs')
  })

  it('filters applications by status', async () => {
    const user = userEvent.setup()
    mocks.listApplications.mockResolvedValue({
      data: {
        applications: [sampleApp],
        pagination: { page: 1, totalPages: 1, total: 1, limit: 10 },
      },
    })

    renderWithRouter()
    await screen.findByText('Senior Frontend Engineer')

    const statusSelect = screen.getByLabelText(/Filter by status/i)
    await user.selectOptions(statusSelect, 'interviewing')

    await waitFor(() => {
      expect(mocks.listApplications).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'interviewing', page: 1 })
      )
    })
  })

  it('renders filtered empty state with clear filters button', async () => {
    const user = userEvent.setup()
    mocks.listApplications.mockResolvedValue({
      data: {
        applications: [],
        pagination: { page: 1, totalPages: 0, total: 0, limit: 10 },
      },
    })

    renderWithRouter()

    const searchInput = await screen.findByPlaceholderText(/Search by job title or company/i)
    await user.type(searchInput, 'Nonexistent')

    expect(await screen.findByText('No matching applications')).toBeInTheDocument()
    const clearBtn = screen.getByRole('button', { name: /Clear filters/i })
    expect(clearBtn).toBeInTheDocument()

    await user.click(clearBtn)
    expect(searchInput).toHaveValue('')
  })

  it('handles application deletion', async () => {
    const user = userEvent.setup()
    mocks.listApplications.mockResolvedValue({
      data: {
        applications: [sampleApp],
        pagination: { page: 1, totalPages: 1, total: 1, limit: 10 },
      },
    })
    mocks.deleteApplication.mockResolvedValue({ status: 200 })

    renderWithRouter()
    await screen.findByText('Senior Frontend Engineer')

    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await user.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalled()
    expect(mocks.deleteApplication).toHaveBeenCalledWith('app_1')
  })

  it('renders load error and allows retry', async () => {
    const user = userEvent.setup()
    mocks.listApplications.mockRejectedValueOnce(new Error('Network failure'))
    renderWithRouter()

    expect(await screen.findByText('Network failure')).toBeInTheDocument()

    mocks.listApplications.mockResolvedValueOnce({
      data: {
        applications: [sampleApp],
        pagination: { page: 1, totalPages: 1, total: 1, limit: 1 },
      },
    })

    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument()
  })
})
