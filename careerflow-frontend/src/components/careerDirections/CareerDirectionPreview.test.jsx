import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CareerDirectionPreview from './CareerDirectionPreview.jsx'
import { mockGeneratedDirection as direction, mockMetadata } from '../../test/fixtures.js'

const baseProps = {
  draft: direction,
  metadata: mockMetadata,
  isConfirming: false,
  confirmError: null,
  onEdit: vi.fn(),
  onConfirm: vi.fn(),
  onBackToInput: vi.fn(),
  onCancel: vi.fn(),
  validationErrors: null,
  canConfirm: true,
}

const renderPreview = (props = {}) => {
  const handlers = {
    onEdit: vi.fn(),
    onConfirm: vi.fn(),
    onBackToInput: vi.fn(),
    onCancel: vi.fn(),
  }
  const merged = { ...baseProps, ...handlers, ...props }
  render(<CareerDirectionPreview {...merged} />)
  return handlers
}

describe('CareerDirectionPreview', () => {
  it('renders the generated draft content', () => {
    render(<CareerDirectionPreview {...baseProps} />)

    expect(screen.getByText('AI Generated Draft')).toBeInTheDocument()
    expect(screen.getAllByText('Backend Developer').length).toBeGreaterThan(0)
    expect(screen.getByText(direction.description)).toBeInTheDocument()

    expect(screen.getByText('Career Level')).toBeInTheDocument()
    expect(screen.getByText('Junior')).toBeInTheDocument()

    expect(screen.getByText('Primary Focus (3/5)')).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('Secondary Focus (2/3)')).toBeInTheDocument()
    expect(screen.getByText('System Design')).toBeInTheDocument()

    const skillsBlock = screen.getByText('Focus Skills (5)')
    expect(skillsBlock).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()

    expect(screen.getByText('Target Roles (3)')).toBeInTheDocument()
    expect(screen.getByText('API Engineer')).toBeInTheDocument()

    expect(screen.getByText('Learning Priorities (3)')).toBeInTheDocument()
    expect(screen.getByText('Database optimization')).toBeInTheDocument()

    expect(screen.getByText('Suggested Next Steps (2)')).toBeInTheDocument()
    const stepsList = screen.getByText('Build a REST API with Node.js/Express')
    expect(stepsList).toBeInTheDocument()

    expect(screen.getByText('AI Rationale')).toBeInTheDocument()
    expect(screen.getByText(direction.rationale)).toBeInTheDocument()
  })

  it('renders the generation metadata block', () => {
    render(<CareerDirectionPreview {...baseProps} />)

    expect(screen.getByText(/Generation Mode:/)).toBeInTheDocument()
    expect(screen.getByText(mockMetadata.mode)).toBeInTheDocument()
    expect(screen.getByText(/User Idea:/)).toBeInTheDocument()
    expect(screen.getByText(mockMetadata.userIdea)).toBeInTheDocument()
    expect(screen.getByText(/Model:/)).toBeInTheDocument()
    expect(screen.getByText(mockMetadata.modelVersion)).toBeInTheDocument()
    expect(screen.getByText(/Request ID:/)).toBeInTheDocument()
    expect(screen.getByText(mockMetadata.requestId)).toBeInTheDocument()
  })

  it('does not render the metadata block when metadata is absent', () => {
    const props = { ...baseProps, metadata: null }
    render(<CareerDirectionPreview {...props} />)
    expect(screen.queryByText(/Generation Mode:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Request ID:/)).not.toBeInTheDocument()
  })

  it('shows the invalid-fields warning when validationErrors are present', () => {
    const props = { ...baseProps, validationErrors: { title: 'Title is required' } }
    render(<CareerDirectionPreview {...props} />)
    expect(screen.getByText('Some fields have issues that should be fixed:')).toBeInTheDocument()
    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText(/Click Edit to fix these issues/)).toBeInTheDocument()
  })

  it('does not show the invalid-fields warning when there are no errors', () => {
    render(<CareerDirectionPreview {...baseProps} />)
    expect(screen.queryByText('Some fields have issues that should be fixed:')).not.toBeInTheDocument()
  })

  it('calls onEdit when Edit is pressed', async () => {
    const user = userEvent.setup()
    const handlers = renderPreview()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(handlers.onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onBackToInput when Back to Inputs is pressed', async () => {
    const user = userEvent.setup()
    const handlers = renderPreview()
    await user.click(screen.getByRole('button', { name: 'Back to Inputs' }))
    expect(handlers.onBackToInput).toHaveBeenCalledTimes(1)
  })

  it('confirm flow opens the save dialog and calls onConfirm via Save', async () => {
    const user = userEvent.setup()
    const handlers = renderPreview()
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    const dialog = await screen.findByRole('dialog', { name: 'Save this Career Direction?' })
    expect(within(dialog).getByText('Save this Career Direction?')).toBeInTheDocument()
    expect(handlers.onConfirm).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('confirm is disabled when canConfirm is false', () => {
    const props = { ...baseProps, canConfirm: false }
    render(<CareerDirectionPreview {...props} />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })

  it('confirm button shows Saving... while isConfirming', () => {
    const props = { ...baseProps, isConfirming: true }
    render(<CareerDirectionPreview {...props} />)
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('cancel flow opens the discard dialog and calls onCancel via Discard', async () => {
    const user = userEvent.setup()
    const handlers = renderPreview()
    await user.click(screen.getByRole('button', { name: 'Cancel Creation' }))

    const dialog = await screen.findByRole('dialog', { name: 'Discard this draft?' })
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }))
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders the confirm error message with field errors when provided', () => {
    const props = {
      ...baseProps,
      confirmError: {
        message: 'Validation failed',
        errors: { title: 'Title is required' },
      },
    }
    render(<CareerDirectionPreview {...props} />)
    expect(screen.getByText('Validation failed')).toBeInTheDocument()
    expect(screen.getByText('title:')).toBeInTheDocument()
    expect(screen.getByText('Title is required')).toBeInTheDocument()
  })
})