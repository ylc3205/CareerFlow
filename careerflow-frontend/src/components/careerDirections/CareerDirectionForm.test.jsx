import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CareerDirectionForm from './CareerDirectionForm.jsx'
import { mockGeneratedDirection as draft } from '../../test/fixtures.js'

const renderAIEdit = (props = {}) => {
  const onSubmit = vi.fn()
  const onDirtyChange = vi.fn()
  const onCancel = vi.fn()
  render(
    <CareerDirectionForm
      initialValues={draft}
      submitLabel="Save changes"
      isAIEdit
      onSubmit={onSubmit}
      onCancel={onCancel}
      onDirtyChange={onDirtyChange}
      submitting={false}
      apiError={null}
      {...props}
    />
  )
  return { onSubmit, onDirtyChange, onCancel }
}

describe('CareerDirectionForm (AI-edit path)', () => {
  it('hydrates the form from the generated draft', () => {
    renderAIEdit()

    expect(screen.getByLabelText('Title *')).toHaveValue('Backend Developer')
    expect(screen.getByLabelText(/Focus skills/)).toHaveValue('Node.js, Express.js, MongoDB, PostgreSQL, REST APIs')
    expect(screen.getByLabelText(/Target roles/)).toHaveValue('Backend Developer, Node.js Developer, API Engineer')
    expect(screen.getByLabelText(/Learning priorities/)).toHaveValue('Node.js internals\nDatabase optimization\nCloud deployment')
    expect(screen.getByLabelText(/Suggested next steps/)).toHaveValue('Build a REST API with Node.js/Express\nLearn PostgreSQL')

    expect(screen.getByText(draft.rationale)).toBeInTheDocument()
    expect(screen.getByText(/Base type/)).toBeInTheDocument()
    expect(screen.getByText('resume')).toBeInTheDocument()
  })

  it('submits the edited title while keeping the generated AI fields intact', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderAIEdit()

    const titleInput = screen.getByLabelText('Title *')
    await user.clear(titleInput)
    await user.type(titleInput, 'Senior Backend Developer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]

    expect(payload.title).toBe('Senior Backend Developer')
    // Generated fields preserved and normalized.
    expect(payload.focusSkills).toEqual(['Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'REST APIs'])
    expect(payload.targetRoles).toEqual(['Backend Developer', 'Node.js Developer', 'API Engineer'])
    expect(payload.careerLevel).toBe('junior')
    expect(payload.primaryFocus).toEqual(['backend', 'apis', 'databases'])
    expect(payload.secondaryFocus).toEqual(['cloud', 'system_design'])
    expect(payload.learningPriorities).toEqual(['Node.js internals', 'Database optimization', 'Cloud deployment'])
    expect(payload.suggestedNextSteps).toEqual(['Build a REST API with Node.js/Express', 'Learn PostgreSQL'])
    expect(payload.rationale).toBe(draft.rationale)
  })

  it('starts clean (Save disabled) and becomes dirty after editing', async () => {
    const user = userEvent.setup()
    const { onDirtyChange } = renderAIEdit()

    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeDisabled()

    await user.type(screen.getByLabelText('Title *'), '2')
    expect(onDirtyChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('blocks submission with an empty title', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderAIEdit()

    const titleInput = screen.getByLabelText('Title *')
    await user.clear(titleInput)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onCancel from the Cancel button', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderAIEdit()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})