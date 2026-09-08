import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import CareerDirectionCreatePage from '../../pages/CareerDirectionCreatePage.jsx'
import { mockGenerationResponse, mockCreateResponse, mockMetadata } from '../../test/fixtures.js'

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  create: vi.fn(),
}))

vi.mock('../../api/careerDirections.api.js', () => ({
  generateCareerDirectionApi: mocks.generate,
  createCareerDirectionApi: mocks.create,
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/career-directions/create']}>
      <CareerDirectionCreatePage />
      <LocationDisplay />
    </MemoryRouter>
  )

const clickMode = async (user, label) => {
  await user.click(screen.getByRole('radio', { name: new RegExp(label) }))
}

describe('CareerDirectionCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generate.mockResolvedValue({ data: mockGenerationResponse })
    mocks.create.mockResolvedValue({ data: mockCreateResponse })
  })

  it('shows the mode selector on first render', () => {
    renderPage()
    expect(screen.getByRole('radiogroup', { name: 'Creation mode' })).toBeInTheDocument()
    for (const label of ['Manual', 'AI from Idea', 'AI from Background', 'From Role Template']) {
      expect(screen.getByRole('radio', { name: new RegExp(label) })).toBeInTheDocument()
    }
  })

  it('manual mode redirects to the manual create form', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'Manual')
    expect(screen.getByTestId('location')).toHaveTextContent('/career-directions/new')
  })

  it('AI from Idea navigates to the idea input step', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Idea')
    expect(screen.getByText('AI from Idea')).toBeInTheDocument()
    expect(screen.getByLabelText('Describe your career goal *')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate direction' })).toBeInTheDocument()
  })

  it('AI from Background navigates to the background input step', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Background')
    expect(screen.getByText('AI from Background')).toBeInTheDocument()
    expect(screen.getByLabelText(/Guiding preference \(optional\)/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Resume/ })).toBeInTheDocument()
  })

  it('From Role Template navigates to the template input step', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'From Role Template')
    expect(screen.getByText('From Role Template')).toBeInTheDocument()
    expect(screen.getByLabelText('Starting role template *')).toBeInTheDocument()
  })

  it('blocks generate while AI idea input is empty and does not call the API', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Idea')
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(screen.getByText('Please describe your career goal')).toBeInTheDocument()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(screen.queryByText('AI Generated Draft')).not.toBeInTheDocument()
  })

  it('blocks generate when template role is empty', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'From Role Template')
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(screen.getByText('Please select or enter a starting role')).toBeInTheDocument()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('blocks generate for background mode without context or a preference', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Background')
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(
      screen.getByText('Select at least one context source or provide a guiding preference')
    ).toBeInTheDocument()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('generates from an AI idea and renders the preview', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Idea')
    await user.type(
      screen.getByLabelText('Describe your career goal *'),
      'I want to become a Node.js backend developer'
    )
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(await screen.findByText('AI Generated Draft')).toBeInTheDocument()
    expect(screen.getAllByText(mockGenerationResponse.generatedDirection.title).length).toBeGreaterThan(0)

    const called = mocks.generate.mock.calls[0][0]
    expect(called.mode).toBe('ai_from_idea')
    expect(called.userIdea).toBe('I want to become a Node.js backend developer')
  })

  it('generates from background mode with a selected context source', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Background')
    await user.click(screen.getByRole('checkbox', { name: /Resume/ }))
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(await screen.findByText('AI Generated Draft')).toBeInTheDocument()

    const called = mocks.generate.mock.calls[0][0]
    expect(called.mode).toBe('ai_from_background')
    expect(called.contextSources.resume).toBe(true)
    expect(called.contextSources.profile).toBe(false)
    expect(called.contextSources.existingDirections).toBe(false)
  })

  it('generates from a role template', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'From Role Template')
    await user.click(screen.getByRole('button', { name: 'Backend Developer' }))
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(await screen.findByText('AI Generated Draft')).toBeInTheDocument()

    const called = mocks.generate.mock.calls[0][0]
    expect(called.mode).toBe('template_based')
    expect(called.templateRole).toBe('Backend Developer')
  })

  it('keeps the user on the input step and shows an error when generation fails', async () => {
    const user = userEvent.setup()
    mocks.generate.mockRejectedValue({ message: 'Provider unavailable', errors: null })
    renderPage()
    await clickMode(user, 'AI from Idea')
    await user.type(
      screen.getByLabelText('Describe your career goal *'),
      'I want to become a Node.js backend developer'
    )
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(await screen.findByText('Provider unavailable')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Describe your career goal *')).toBeInTheDocument()
    expect(screen.queryByText('AI Generated Draft')).not.toBeInTheDocument()
  })

  it('re-generates after confirming the regenerate dialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Idea')
    const ideaInput = screen.getByLabelText('Describe your career goal *')
    await user.type(ideaInput, 'I want to become a Node.js backend developer')
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    expect(await screen.findByText('AI Generated Draft')).toBeInTheDocument()
    expect(mocks.generate).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Back to Inputs' }))
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    const dialog = await screen.findByRole('dialog', { name: 'Generate again?' })
    await user.click(within(dialog).getByRole('button', { name: 'Generate' }))

    await screen.findByText('AI Generated Draft')
    expect(mocks.generate).toHaveBeenCalledTimes(2)
  })

  it('edit flow: Save changes updates the preview and keeps metadata intact', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Idea')
    await user.type(
      screen.getByLabelText('Describe your career goal *'),
      'I want to become a Node.js backend developer'
    )
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    await screen.findByText('AI Generated Draft')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByText('Edit AI Draft')).toBeInTheDocument()
    const titleInput = screen.getByLabelText('Title *')
    expect(titleInput).toHaveValue(mockGenerationResponse.generatedDirection.title)
    await user.clear(titleInput)
    await user.type(titleInput, 'Senior Backend Developer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('AI Generated Draft')).toBeInTheDocument()
    expect(screen.getByText('Senior Backend Developer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    const saveDialog = await screen.findByRole('dialog', { name: 'Save this Career Direction?' })
    await user.click(within(saveDialog).getByRole('button', { name: 'Save' }))

    const createBody = mocks.create.mock.calls[0][0]
    expect(createBody.title).toBe('Senior Backend Developer')
    expect(createBody.generationMetadata).toEqual(mockMetadata)
  })

  it('an invalid edited title is blocked at the form and never reaches the preview', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Idea')
    await user.type(
      screen.getByLabelText('Describe your career goal *'),
      'I want to become a Node.js backend developer'
    )
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    await screen.findByText('AI Generated Draft')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const titleInput = screen.getByLabelText('Title *')
    await user.clear(titleInput)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Edit AI Draft')).toBeInTheDocument()
    expect(screen.queryByText('AI Generated Draft')).not.toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('confirm persists generationMetadata and navigates to the detail page', async () => {
    const user = userEvent.setup()
    renderPage()
    await clickMode(user, 'AI from Idea')
    await user.type(
      screen.getByLabelText('Describe your career goal *'),
      'I want to become a Node.js backend developer'
    )
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    await screen.findByText('AI Generated Draft')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    const saveDialog = await screen.findByRole('dialog', { name: 'Save this Career Direction?' })
    await user.click(within(saveDialog).getByRole('button', { name: 'Save' }))

    expect(mocks.create).toHaveBeenCalledTimes(1)
    const createBody = mocks.create.mock.calls[0][0]
    expect(createBody.generationMetadata).toEqual(mockMetadata)
    expect(createBody.title).toBe(mockGenerationResponse.generatedDirection.title)

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/career-directions/${mockCreateResponse.careerDirection._id}`
      )
    )
  })

  it('keeps the user on the preview and shows an error when persistence fails', async () => {
    const user = userEvent.setup()
    mocks.create.mockRejectedValue({ message: 'Could not save', errors: null })
    renderPage()
    await clickMode(user, 'AI from Idea')
    await user.type(
      screen.getByLabelText('Describe your career goal *'),
      'I want to become a Node.js backend developer'
    )
    await user.click(screen.getByRole('button', { name: 'Generate direction' }))

    await screen.findByText('AI Generated Draft')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    const saveDialog = await screen.findByRole('dialog', { name: 'Save this Career Direction?' })
    await user.click(within(saveDialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not save')).toBeInTheDocument()
    expect(screen.getByText('AI Generated Draft')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/career-directions/create')
  })
})