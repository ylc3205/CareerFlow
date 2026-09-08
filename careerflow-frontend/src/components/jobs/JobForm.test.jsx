import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JobForm from './JobForm.jsx'
import { emptyJobForm, hydrateJobForm } from '../../utils/jobForm.js'

const renderForm = (props = {}) => {
  const onSubmit = vi.fn()
  render(
    <JobForm
      initialValues={emptyJobForm()}
      submitLabel="Create job"
      onSubmit={onSubmit}
      submitting={false}
      apiError={null}
      {...props}
    />
  )
  return { onSubmit }
}

describe('JobForm', () => {
  it('renders an empty form in create mode', () => {
    renderForm()
    expect(screen.getByLabelText('Title *')).toHaveValue('')
    expect(screen.getByLabelText('Company *')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Create job' })).toBeEnabled()
  })

  it('hydrates form values in edit mode', () => {
    const job = {
      title: 'Backend Developer',
      company: 'VNG',
      skills: ['Node.js', 'MongoDB'],
      salary: { min: 1500, max: 2500, currency: 'USD', period: 'monthly' },
    }
    renderForm({
      initialValues: hydrateJobForm(job),
      submitLabel: 'Save changes',
      isEdit: true,
    })
    expect(screen.getByLabelText('Title *')).toHaveValue('Backend Developer')
    expect(screen.getByLabelText('Company *')).toHaveValue('VNG')
    expect(screen.getByLabelText(/Skills/)).toHaveValue('Node.js, MongoDB')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('flags an empty title as required and does not submit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Create job' }))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('flags an empty company as required', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('Title *'), 'Backend Developer')
    await user.click(screen.getByRole('button', { name: 'Create job' }))
    expect(screen.getByText('Company is required')).toBeInTheDocument()
  })

  it('flags an invalid source URL', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('Title *'), 'Backend Developer')
    await user.type(screen.getByLabelText('Company *'), 'VNG')
    await user.type(screen.getByLabelText('Source URL'), 'not-a-url')
    await user.click(screen.getByRole('button', { name: 'Create job' }))
    expect(screen.getByText('Enter a valid URL')).toBeInTheDocument()
  })

  it('submits the built payload on a valid form', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()
    await user.type(screen.getByLabelText('Title *'), '  Backend Developer ')
    await user.type(screen.getByLabelText('Company *'), ' VNG ')
    await user.type(screen.getByLabelText(/Skills/), 'Node.js, MongoDB')
    await user.click(screen.getByRole('button', { name: 'Create job' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.title).toBe('Backend Developer')
    expect(payload.company).toBe('VNG')
    expect(payload.skills).toEqual(['Node.js', 'MongoDB'])
  })

  it('clears a field error once the field is corrected', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Create job' }))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title *'), 'Backend Developer')
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument()
  })

  it('disables the submit button while submitting and shows Saving...', () => {
    renderForm({ submitting: true, submitLabel: 'Save changes' })
    const button = screen.getByRole('button', { name: 'Saving...' })
    expect(button).toBeDisabled()
  })

  it('renders an apiError message when provided', () => {
    renderForm({ apiError: { message: 'Could not save job', errors: null } })
    expect(screen.getByText('Could not save job')).toBeInTheDocument()
  })
})
