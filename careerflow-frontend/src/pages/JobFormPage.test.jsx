import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import JobFormPage from './JobFormPage.jsx'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('../api/jobs.api.js', () => ({
  getJobApi: mocks.get,
  createJobApi: mocks.create,
  updateJobApi: mocks.update,
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const routerHarness = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/jobs/new" element={<JobFormPage />} />
        <Route path="/jobs/:id/edit" element={<JobFormPage />} />
        <Route path="/jobs/:id" element={<div>detail route</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  )

const fillValidForm = async (user) => {
  await user.type(screen.getByLabelText('Title *'), 'Backend Developer')
  await user.type(screen.getByLabelText('Company *'), 'VNG')
}

describe('JobFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockResolvedValue({
      data: { job: { title: 'Existing Job', company: 'Acme', status: 'saved', skills: [] } },
    })
    mocks.create.mockResolvedValue({ data: { job: { _id: 'job_created' } } })
    mocks.update.mockResolvedValue({ data: { job: { _id: 'job_1' } } })
  })

  it('renders an empty form in create mode', () => {
    routerHarness('/jobs/new')
    expect(screen.getByText('Add a job')).toBeInTheDocument()
    expect(screen.getByLabelText('Title *')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Create job' })).toBeEnabled()
  })

  it('hydrates the form in edit mode from the fetched job', async () => {
    routerHarness('/jobs/job_1/edit')
    await screen.findByLabelText('Title *')
    expect(mocks.get).toHaveBeenCalledWith('job_1')
    expect(screen.getByLabelText('Title *')).toHaveValue('Existing Job')
    expect(screen.getByLabelText('Company *')).toHaveValue('Acme')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('creates a job and navigates to its detail page', async () => {
    const user = userEvent.setup()
    routerHarness('/jobs/new')
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create job' }))
    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('location')).toHaveTextContent('/jobs/job_created')
    })
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ title: 'Backend Developer', company: 'VNG' })
  })

  it('updates a job and navigates to its detail page', async () => {
    const user = userEvent.setup()
    routerHarness('/jobs/job_1/edit')
    await screen.findByLabelText('Title *')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledWith('job_1', expect.any(Object))
      expect(screen.getByTestId('location')).toHaveTextContent('/jobs/job_1')
    })
  })

  it('create mode does not retain stale initialValues after edit mode', async () => {
    const user = userEvent.setup()
    // Render in edit mode so initialValues is hydrated with 'Existing Job',
    // then navigate to /jobs/new via a real link while the router stays mounted.
    render(
      <MemoryRouter initialEntries={['/jobs/job_1/edit']}>
        <Routes>
          <Route path="/jobs/new" element={<JobFormPage />} />
          <Route path="/jobs/:id/edit" element={<JobFormPage />} />
          <Route path="/jobs/:id" element={<div>detail route</div>} />
        </Routes>
        <nav>
          <Link to="/jobs/new">Add another job</Link>
        </nav>
        <LocationDisplay />
      </MemoryRouter>
    )

    await screen.findByLabelText('Title *')
    expect(screen.getByLabelText('Title *')).toHaveValue('Existing Job')

    await user.click(screen.getByRole('link', { name: 'Add another job' }))

    expect(screen.getByText('Add a job')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Title *')).toHaveValue('')
    })
    expect(screen.getByLabelText('Company *')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Create job' })).toBeEnabled()
  })
})
