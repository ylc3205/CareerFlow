import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import JobDetailPage from './JobDetailPage.jsx'

const mocks = vi.hoisted(() => ({
  getJob: vi.fn(),
  deleteJob: vi.fn(),
  matchJob: vi.fn(),
  listAnalyses: vi.fn(),
  createApplication: vi.fn(),
  listApplications: vi.fn(),
  listDirections: vi.fn(),
}))

vi.mock('../api/jobs.api.js', () => ({
  getJobApi: mocks.getJob,
  deleteJobApi: mocks.deleteJob,
  matchJobApi: mocks.matchJob,
}))
vi.mock('../api/aiAnalysis.api.js', () => ({
  listAnalysesApi: mocks.listAnalyses,
}))
vi.mock('../api/applications.api.js', () => ({
  createApplicationApi: mocks.createApplication,
  listApplicationsApi: mocks.listApplications,
}))
vi.mock('../api/careerDirections.api.js', () => ({
  listCareerDirectionsApi: mocks.listDirections,
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const jobA = {
  _id: 'job_1',
  title: 'Backend Developer',
  company: 'VNG',
  status: 'saved',
  location: 'HCM',
  employmentType: 'full-time',
  workplaceType: 'hybrid',
  description: 'Build REST APIs',
  requirements: 'Node.js, MongoDB',
  responsibilities: 'Write and review code',
  skills: ['Node.js', 'MongoDB'],
  salary: { min: 1500, max: 2500, currency: 'USD', period: 'monthly' },
  notes: 'Great opportunity',
}

const jobB = {
  _id: 'job_2',
  title: 'Frontend Engineer',
  company: 'Shopee',
  status: 'applied',
  skills: ['React'],
}

const matchFixture = {
  matchScore: 88,
  matchedSkills: ['Node.js'],
  missingSkills: ['Kubernetes'],
  strengths: ['Backend fundamentals'],
  weaknesses: ['No cloud'],
  recommendations: ['Learn Docker'],
  careerDirectionTitle: null,
}

const direction = { _id: 'cd_1', title: 'Backend Developer' }

const analysisFor = (jobId, overrides = {}) => ({
  _id: 'an_1',
  job: { _id: jobId },
  matchScore: 88,
  matchedSkills: ['Node.js'],
  missingSkills: [],
  strengths: [],
  weaknesses: [],
  recommendations: [],
  careerDirectionTitle: null,
  ...overrides,
})

const appFor = (jobId) => ({ _id: 'app_1', job: { _id: jobId } })

const routerHarness = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/jobs/:id/edit" element={<div>edit route</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  )

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getJob.mockResolvedValue({ data: { job: jobA } })
    mocks.listDirections.mockResolvedValue({ data: { careerDirections: [] } })
    mocks.listAnalyses.mockResolvedValue({ data: { analyses: [] } })
    mocks.listApplications.mockResolvedValue({ data: { applications: [] } })
    mocks.matchJob.mockResolvedValue({ data: { match: matchFixture } })
    mocks.deleteJob.mockResolvedValue({ data: null, message: 'deleted' })
    mocks.createApplication.mockResolvedValue({ data: { application: appFor('job_1') } })
  })

  it('shows a loading state while fetching', () => {
    mocks.getJob.mockReturnValue(new Promise(() => {}))
    routerHarness('/jobs/job_1')
    expect(screen.getByText('Loading job...')).toBeInTheDocument()
  })

  it('renders the job to a successful load', async () => {
    routerHarness('/jobs/job_1')
    expect(await screen.findByRole('heading', { name: 'Backend Developer' })).toBeInTheDocument()
    expect(screen.getAllByText('VNG').length).toBeGreaterThan(0)
    expect(screen.getByText('saved')).toBeInTheDocument()
    expect(screen.getByText('Build REST APIs')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('USD 1500–2500 / monthly')).toBeInTheDocument()
    expect(screen.getByText('Great opportunity')).toBeInTheDocument()
  })

  it('shows a load error with a retry button on API failure', async () => {
    mocks.getJob.mockRejectedValue(new Error('Could not load'))
    routerHarness('/jobs/job_1')
    expect(await screen.findByText('Could not load')).toBeInTheDocument()
    expect(screen.getByText('Could not load this job.')).toBeInTheDocument()
  })

  it('shows a not-found message when the job is null', async () => {
    mocks.getJob.mockResolvedValue({ data: { job: null } })
    routerHarness('/jobs/job_1')
    expect(await screen.findByText('This job may have been deleted.')).toBeInTheDocument()
  })

  it('renders the career direction selector when directions exist', async () => {
    mocks.listDirections.mockResolvedValue({ data: { careerDirections: [direction] } })
    routerHarness('/jobs/job_1')
    await screen.findByRole('heading', { name: 'Backend Developer' })
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Backend Developer' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'General / Base Resume' })).toBeInTheDocument()
  })

  it('analyzes fit without a career direction and renders the result', async () => {
    const user = userEvent.setup()
    routerHarness('/jobs/job_1')
    await screen.findByRole('heading', { name: 'Backend Developer' })
    await user.click(screen.getByRole('button', { name: 'Analyze Fit' }))
    await waitFor(() => {
      expect(mocks.matchJob).toHaveBeenCalledWith('job_1', {})
    })
    expect(screen.getByLabelText('Score 88 out of 100')).toBeInTheDocument()
  })

  it('passes the selected careerDirectionId to the matching API', async () => {
    mocks.listDirections.mockResolvedValue({ data: { careerDirections: [direction] } })
    const user = userEvent.setup()
    routerHarness('/jobs/job_1')
    await screen.findByRole('heading', { name: 'Backend Developer' })
    await user.selectOptions(screen.getByRole('combobox'), 'cd_1')
    await user.click(screen.getByRole('button', { name: 'Analyze Fit' }))
    await waitFor(() => {
      expect(mocks.matchJob).toHaveBeenCalledWith('job_1', { careerDirectionId: 'cd_1' })
    })
  })

  it('shows a loading state while analyzing', async () => {
    mocks.matchJob.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    routerHarness('/jobs/job_1')
    await screen.findByRole('heading', { name: 'Backend Developer' })
    await user.click(screen.getByRole('button', { name: 'Analyze Fit' }))
    expect(screen.getByText('Analyzing job fit…')).toBeInTheDocument()
  })

  it('shows a match error and recovers via Try again', async () => {
    mocks.matchJob
      .mockRejectedValueOnce(new Error('AI unavailable'))
      .mockResolvedValue({ data: { match: matchFixture } })
    const user = userEvent.setup()
    routerHarness('/jobs/job_1')
    await screen.findByRole('heading', { name: 'Backend Developer' })
    await user.click(screen.getByRole('button', { name: 'Analyze Fit' }))
    expect(await screen.findByText('AI unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Score 88 out of 100')).toBeInTheDocument()
  })

  it('displays a cached match on load', async () => {
    mocks.listAnalyses.mockResolvedValue({ data: { analyses: [analysisFor('job_1')] } })
    routerHarness('/jobs/job_1')
    expect(await screen.findByLabelText('Score 88 out of 100')).toBeInTheDocument()
  })

  it('re-analyzes via the Re-analyze Fit button', async () => {
    mocks.listAnalyses.mockResolvedValue({ data: { analyses: [analysisFor('job_1')] } })
    const user = userEvent.setup()
    routerHarness('/jobs/job_1')
    await screen.findByLabelText('Score 88 out of 100')
    mocks.matchJob.mockClear()
    await user.click(screen.getByRole('button', { name: 'Re-analyze Fit' }))
    await waitFor(() => {
      expect(mocks.matchJob).toHaveBeenCalledWith('job_1', {})
    })
  })

  it('shows the existing application state on load', async () => {
    mocks.listApplications.mockResolvedValue({ data: { applications: [appFor('job_1')] } })
    routerHarness('/jobs/job_1')
    expect(await screen.findByText('Applied')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Application' })).toHaveAttribute(
      'href',
      '/applications/app_1'
    )
  })

  it('applies via the Apply button and shows the applied state', async () => {
    const user = userEvent.setup()
    routerHarness('/jobs/job_1')
    await screen.findByText('Backend Developer')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('Applied')).toBeInTheDocument()
    expect(mocks.createApplication).toHaveBeenCalledWith({ job: 'job_1' })
  })

  it('navigates to the edit route via the Edit link', async () => {
    const user = userEvent.setup()
    routerHarness('/jobs/job_1')
    await screen.findByText('Backend Developer')
    await user.click(screen.getByRole('link', { name: 'Edit' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/jobs/job_1/edit')
  })

  it('regression: does not leak stale match/application state when the route id changes', async () => {
    const user = userEvent.setup()
    // job_1 has a cached match + a prior application.
    mocks.listAnalyses.mockResolvedValue({ data: { analyses: [analysisFor('job_1')] } })
    mocks.listApplications.mockResolvedValue({ data: { applications: [appFor('job_1')] } })

    // job_2 has NO cached match and NO application.
    mocks.getJob.mockResolvedValue({ data: { job: jobA } })

    render(
      <MemoryRouter initialEntries={['/jobs/job_1']}>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs/:id/edit" element={<div>edit route</div>} />
        </Routes>
        <nav>
          <Link to="/jobs/job_2">Go to job 2</Link>
        </nav>
        <LocationDisplay />
      </MemoryRouter>
    )

    expect(await screen.findByLabelText('Score 88 out of 100')).toBeInTheDocument()
    expect(screen.getByText('Applied')).toBeInTheDocument()

    mocks.getJob.mockResolvedValue({ data: { job: jobB } })

    await user.click(screen.getByRole('link', { name: 'Go to job 2' }))

    await screen.findByText('Frontend Engineer')
    // job_1's stale match must NOT remain visible.
    expect(screen.queryByLabelText('Score 88 out of 100')).not.toBeInTheDocument()
    // job_1's stale applied state must NOT remain visible.
    expect(screen.queryByText('Applied')).not.toBeInTheDocument()
    // Instead the fresh job_2 exposes the initial actions.
    expect(screen.getByRole('button', { name: 'Analyze Fit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })
})
