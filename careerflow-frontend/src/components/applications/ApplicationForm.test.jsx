import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApplicationForm from './ApplicationForm.jsx'
import { emptyApplicationForm } from '../../utils/applicationForm.js'

describe('ApplicationForm', () => {
  it('renders form fields with initial values', () => {
    const initialValues = {
      status: 'interviewing',
      appliedAt: '2026-09-15',
      coverLetter: 'Hello team',
      notes: 'Round 1 completed',
    }

    render(<ApplicationForm initialValues={initialValues} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/Status/i)).toHaveValue('interviewing')
    expect(screen.getByLabelText(/Applied date/i)).toHaveValue('2026-09-15')
    expect(screen.getByLabelText(/Cover letter/i)).toHaveValue('Hello team')
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('Round 1 completed')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('updates form fields on user typing and select change', async () => {
    const user = userEvent.setup()
    render(<ApplicationForm initialValues={emptyApplicationForm()} onSubmit={vi.fn()} />)

    const statusSelect = screen.getByLabelText(/Status/i)
    const notesInput = screen.getByLabelText(/Notes/i)

    await user.selectOptions(statusSelect, 'offer')
    await user.type(notesInput, 'Received written offer')

    expect(statusSelect).toHaveValue('offer')
    expect(notesInput).toHaveValue('Received written offer')
  })

  it('calls onSubmit with normalized payload when submitted', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    const initialValues = {
      status: 'applied',
      appliedAt: '2026-09-10',
      coverLetter: '  Draft cover letter  ',
      notes: '  Initial notes  ',
    }

    render(<ApplicationForm initialValues={initialValues} onSubmit={handleSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(handleSubmit).toHaveBeenCalledWith({
      status: 'applied',
      appliedAt: '2026-09-10',
      coverLetter: 'Draft cover letter',
      notes: 'Initial notes',
    })
  })

  it('renders API error message when provided', () => {
    const apiError = {
      message: 'Failed to update application status',
      errors: [{ field: 'status', message: 'Invalid status transition' }],
    }

    render(
      <ApplicationForm
        initialValues={emptyApplicationForm()}
        onSubmit={vi.fn()}
        apiError={apiError}
      />
    )

    expect(screen.getByText('Failed to update application status')).toBeInTheDocument()
    expect(screen.getByText(/Invalid status transition/i)).toBeInTheDocument()
  })

  it('disables submit button and shows loading label during submission', () => {
    render(
      <ApplicationForm
        initialValues={emptyApplicationForm()}
        onSubmit={vi.fn()}
        submitting={true}
      />
    )

    const submitBtn = screen.getByRole('button', { name: 'Saving...' })
    expect(submitBtn).toBeDisabled()
  })
})
