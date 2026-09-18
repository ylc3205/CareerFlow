import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import ApplicationDetailPage from './ApplicationDetailPage.jsx'

const mocks = vi.hoisted(() => ({
  getApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
  listInterviews: vi.fn(),
  createInterview: vi.fn(),
}))

vi.mock('../api/applications.api.js', () => ({
  getApplicationApi: mocks.getApplication,
  updateApplicationApi: mocks.updateApplication,
  deleteApplicationApi: mocks.deleteApplication,
}))

vi.mock('../api/interviews.api.js', () => ({
  listInterviewsApi: mocks.listInterviews,
  createInterviewApi: mocks.createInterview,
}))

const appA = {
  _id: 'app_1',
  status: 'applied',
  appliedAt: '2026-09-01T00:00:00.000Z',
  coverLetter: 'Cover letter for App A',
  notes: 'Notes for App A',
  job: {
    _id: 'job_1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
  },
}

const appB = {
  _id: 'app_2',
  status: 'interviewing',
  appliedAt: '2026-09-05T00:00:00.000Z',
  coverLetter: 'Cover letter for App B',
  notes: 'Notes for App B',
  job: {
    _id: 'job_2',
    title: 'Staff Backend Engineer',
    company: 'CloudFlow',
  },
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderComponent(initialRoute = '/applications/app_1') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/applications" element={<div>Applications list page</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  )
}

describe('ApplicationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.listInterviews.mockResolvedValue({ data: { interviews: [] } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state while fetching', () => {
    mocks.getApplication.mockReturnValue(new Promise(() => {}))
    renderComponent()
    expect(screen.getByText(/Loading application.../i)).toBeInTheDocument()
  })

  it('renders application details on successful fetch', async () => {
    mocks.getApplication.mockResolvedValue({ data: { application: appA } })
    renderComponent()

    expect(await screen.findByRole('heading', { name: 'Senior Frontend Engineer' })).toBeInTheDocument()
    expect(screen.getAllByText('TechCorp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('applied').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Cover letter for App A')).toBeInTheDocument()
    expect(screen.getByText('Notes for App A')).toBeInTheDocument()
  })

  it('toggles edit mode and saves application updates', async () => {
    const user = userEvent.setup()
    mocks.getApplication.mockResolvedValue({ data: { application: appA } })
    mocks.updateApplication.mockResolvedValue({
      data: {
        application: { ...appA, status: 'interviewing', notes: 'Status updated to interviewing' },
      },
    })

    renderComponent()
    await screen.findByRole('heading', { name: 'Senior Frontend Engineer' })

    const editBtn = screen.getByRole('button', { name: 'Edit' })
    await user.click(editBtn)

    const statusSelect = screen.getByLabelText(/Status/i)
    await user.selectOptions(statusSelect, 'interviewing')

    const saveBtn = screen.getByRole('button', { name: 'Save changes' })
    await user.click(saveBtn)

    expect(mocks.updateApplication).toHaveBeenCalledWith(
      'app_1',
      expect.objectContaining({ status: 'interviewing' })
    )
  })

  it('toggles add interview mode and submits new interview', async () => {
    const user = userEvent.setup()
    mocks.getApplication.mockResolvedValue({ data: { application: appA } })
    mocks.createInterview.mockResolvedValue({ data: { interview: { _id: 'int_1' } } })

    renderComponent()
    await screen.findByRole('heading', { name: 'Senior Frontend Engineer' })

    const addInterviewBtns = screen.getAllByRole('button', { name: /Add interview/i })
    await user.click(addInterviewBtns[0])

    const titleInput = screen.getByLabelText(/Title \*/i)
    const dateInput = screen.getByLabelText(/Scheduled date \*/i)

    await user.type(titleInput, 'Technical Screen')
    fireEvent.change(dateInput, { target: { name: 'scheduledDate', value: '2026-09-20' } })

    const form = titleInput.closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mocks.createInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Technical Screen',
          scheduledDate: '2026-09-20',
          application: 'app_1',
        })
      )
    })
  })

  it('deletes application and navigates back to list', async () => {
    const user = userEvent.setup()
    mocks.getApplication.mockResolvedValue({ data: { application: appA } })
    mocks.deleteApplication.mockResolvedValue({ status: 200 })

    renderComponent()
    await screen.findByRole('heading', { name: 'Senior Frontend Engineer' })

    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    await user.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalledWith('Delete this application? This cannot be undone.')
    expect(mocks.deleteApplication).toHaveBeenCalledWith('app_1')
    expect(await screen.findByTestId('location')).toHaveTextContent('/applications')
  })

  it('renders load error and allows retry', async () => {
    const user = userEvent.setup()
    mocks.getApplication.mockRejectedValueOnce(new Error('Failed to load'))

    renderComponent()

    expect(await screen.findByText('Failed to load')).toBeInTheDocument()

    mocks.getApplication.mockResolvedValueOnce({ data: { application: appA } })
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    expect(await screen.findByRole('heading', { name: 'Senior Frontend Engineer' })).toBeInTheDocument()
  })

  it('regression: resets transient editing and modal state when route id changes', async () => {
    const user = userEvent.setup()
    mocks.getApplication.mockResolvedValueOnce({ data: { application: appA } })

    render(
      <MemoryRouter initialEntries={['/applications/app_1']}>
        <Routes>
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        </Routes>
        <nav>
          <Link to="/applications/app_2">Go to App 2</Link>
        </nav>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Senior Frontend Engineer' })).toBeInTheDocument()

    // Enter edit mode for app_1
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()

    // Prepare app_2 response and navigate to app_2
    mocks.getApplication.mockResolvedValueOnce({ data: { application: appB } })
    await user.click(screen.getByRole('link', { name: 'Go to App 2' }))

    // App 2 must load fresh; edit mode from App 1 must NOT persist
    expect(await screen.findByRole('heading', { name: 'Staff Backend Engineer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Add interview/i })[0]).toBeInTheDocument()
  })
})
