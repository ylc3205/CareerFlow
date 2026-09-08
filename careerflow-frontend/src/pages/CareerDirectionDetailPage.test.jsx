import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import CareerDirectionDetailPage from './CareerDirectionDetailPage.jsx'
import { mockSavedDirection } from '../test/fixtures.js'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../api/careerDirections.api.js', () => ({
  getCareerDirectionApi: mocks.get,
  deleteCareerDirectionApi: mocks.delete,
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/career-directions/cd_1']}>
      <Routes>
        <Route path="/career-directions/:id" element={<CareerDirectionDetailPage />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  )

describe('CareerDirectionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockResolvedValue({ data: { careerDirection: mockSavedDirection } })
    mocks.delete.mockResolvedValue({ data: null, message: 'deleted' })
  })

  it('shows a loading state while fetching', () => {
    let resolveLoad
    mocks.get.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      })
    )
    renderDetail()
    expect(screen.getByText('Loading career direction...')).toBeInTheDocument()
    resolveLoad({ data: { careerDirection: mockSavedDirection } })
  })

  it('renders the persisted direction', async () => {
    renderDetail()

    expect(await screen.findByRole('heading', { name: mockSavedDirection.title })).toBeInTheDocument()
    expect(screen.getByText(mockSavedDirection.description)).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Focus Skills')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('Target Roles')).toBeInTheDocument()
    expect(screen.getByText('API Engineer')).toBeInTheDocument()
    expect(screen.getAllByText('resume').length).toBeGreaterThan(0)
  })

  it('renders a load error with a retry button when fetch fails', async () => {
    mocks.get.mockRejectedValue({ message: 'Not found' })
    renderDetail()

    expect(await screen.findByText('Not found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows the AI Details section only when generationMetadata exists', async () => {
    renderDetail()
    const aiButton = await screen.findByRole('button', { name: 'AI Details' })
    expect(aiButton).toBeInTheDocument()
    expect(aiButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('hides the AI Details section when generationMetadata is absent', async () => {
    const noMetadata = { ...mockSavedDirection, generationMetadata: undefined }
    mocks.get.mockResolvedValue({ data: { careerDirection: noMetadata } })
    renderDetail()

    await screen.findByRole('heading', { name: mockSavedDirection.title })
    expect(screen.queryByRole('button', { name: 'AI Details' })).not.toBeInTheDocument()
  })

  it('expands AI Details and renders the metadata fields', async () => {
    const user = userEvent.setup()
    renderDetail()

    const aiButton = await screen.findByRole('button', { name: 'AI Details' })
    await user.click(aiButton)
    expect(aiButton).toHaveAttribute('aria-expanded', 'true')

    expect(screen.getByText('Career Level')).toBeInTheDocument()
    expect(screen.getByText('Junior')).toBeInTheDocument()
    expect(screen.getByText('Primary Focus')).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('Secondary Focus')).toBeInTheDocument()
    expect(screen.getByText('System Design')).toBeInTheDocument()
    expect(screen.getByText('Learning Priorities')).toBeInTheDocument()
    expect(screen.getByText('Database optimization')).toBeInTheDocument()
    expect(screen.getByText('Suggested Next Steps')).toBeInTheDocument()
    expect(screen.getByText('Build a REST API with Node.js/Express')).toBeInTheDocument()
    expect(screen.getByText('AI Rationale')).toBeInTheDocument()

    const metaBlock = screen.getByText(/Generation Mode:/).closest('div')
    expect(within(metaBlock).getByText(mockSavedDirection.generationMetadata.mode)).toBeInTheDocument()
    expect(within(metaBlock).getByText(/Model:/)).toBeInTheDocument()
    expect(within(metaBlock).getByText(mockSavedDirection.generationMetadata.modelVersion)).toBeInTheDocument()
    expect(within(metaBlock).getByText(/Request ID:/)).toBeInTheDocument()
    expect(within(metaBlock).getByText(mockSavedDirection.generationMetadata.requestId)).toBeInTheDocument()
  })

  it('collapses AI Details on a second click', async () => {
    const user = userEvent.setup()
    renderDetail()

    const aiButton = await screen.findByRole('button', { name: 'AI Details' })
    await user.click(aiButton)
    expect(aiButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Generation Mode:/)).toBeInTheDocument()

    await user.click(aiButton)
    expect(aiButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/Generation Mode:/)).not.toBeInTheDocument()
  })

  it('deletes the direction and navigates back to the list', async () => {
    const user = userEvent.setup()
    renderDetail()

    await screen.findByRole('heading', { name: mockSavedDirection.title })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this career direction?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(mocks.delete).toHaveBeenCalledTimes(1)
    expect(mocks.delete).toHaveBeenCalledWith('cd_1')
    expect(screen.getByTestId('location')).toHaveTextContent('/career-directions')
  })
})