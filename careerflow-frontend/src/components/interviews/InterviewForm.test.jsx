import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InterviewForm from './InterviewForm.jsx'
import { emptyInterviewForm } from '../../utils/interviewForm.js'

describe('InterviewForm', () => {
  it('renders form fields with initial values', () => {
    const initial = {
      title: 'Hiring Manager Round',
      type: 'video',
      scheduledDate: '2026-09-25',
      status: 'scheduled',
      interviewerNames: 'Alice, Bob',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      location: 'Remote',
      notes: 'Focus on system design',
      feedback: '',
    }

    render(<InterviewForm initialValues={initial} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/Title \*/i)).toHaveValue('Hiring Manager Round')
    expect(screen.getByLabelText(/Type/i)).toHaveValue('video')
    expect(screen.getByLabelText(/Scheduled date \*/i)).toHaveValue('2026-09-25')
    expect(screen.getByLabelText(/Status/i)).toHaveValue('scheduled')
    expect(screen.getByLabelText(/Interviewers/i)).toHaveValue('Alice, Bob')
    expect(screen.getByLabelText(/Meeting link/i)).toHaveValue('https://meet.google.com/abc-defg-hij')
    expect(screen.getByLabelText(/Location/i)).toHaveValue('Remote')
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('Focus on system design')
  })

  it('validates required fields on empty submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<InterviewForm initialValues={emptyInterviewForm()} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Save interview' }))

    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Scheduled date is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates meeting link format if provided', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<InterviewForm initialValues={emptyInterviewForm()} onSubmit={onSubmit} />)

    const titleInput = screen.getByLabelText(/Title \*/i)
    const dateInput = screen.getByLabelText(/Scheduled date \*/i)
    const linkInput = screen.getByLabelText(/Meeting link/i)

    await user.type(titleInput, 'Technical Screen')
    fireEvent.change(dateInput, { target: { name: 'scheduledDate', value: '2026-09-20' } })
    await user.type(linkInput, 'not-a-valid-url')

    await user.click(screen.getByRole('button', { name: 'Save interview' }))

    expect(screen.getByText('Enter a valid URL')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits valid payload including applicationId when provided', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <InterviewForm
        initialValues={emptyInterviewForm()}
        applicationId="app_456"
        submitLabel="Add interview"
        onSubmit={onSubmit}
      />
    )

    const titleInput = screen.getByLabelText(/Title \*/i)
    const dateInput = screen.getByLabelText(/Scheduled date \*/i)

    await user.type(titleInput, 'Coding Interview')
    fireEvent.change(dateInput, { target: { name: 'scheduledDate', value: '2026-09-20' } })

    await user.click(screen.getByRole('button', { name: 'Add interview' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Coding Interview',
        scheduledDate: '2026-09-20',
        application: 'app_456',
        type: 'video',
        status: 'scheduled',
      })
    )
  })

  it('renders API error message when provided', () => {
    const apiError = { message: 'Conflict with existing interview schedule' }
    render(
      <InterviewForm
        initialValues={emptyInterviewForm()}
        onSubmit={vi.fn()}
        apiError={apiError}
      />
    )

    expect(screen.getByText('Conflict with existing interview schedule')).toBeInTheDocument()
  })
})
