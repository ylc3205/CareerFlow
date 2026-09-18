import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PreparationSection from './PreparationSection.jsx'

const mocks = vi.hoisted(() => ({
  getPreparation: vi.fn(),
  generatePreparation: vi.fn(),
}))

vi.mock('../../api/interviews.api.js', () => ({
  getPreparationApi: mocks.getPreparation,
  generatePreparationApi: mocks.generatePreparation,
}))

const sampleQuestions = [
  {
    question: 'How do you optimize React rendering performance?',
    category: 'technical',
    difficulty: 'hard',
  },
  {
    question: 'Tell me about a challenging conflict in a team project.',
    category: 'behavioral',
    difficulty: 'medium',
  },
]

const renderSection = (interviewId = 'int_1') => {
  return render(
    <MemoryRouter>
      <PreparationSection interviewId={interviewId} />
    </MemoryRouter>
  )
}

describe('PreparationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading indicator while checking existing preparation', () => {
    mocks.getPreparation.mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(screen.getByText(/Checking for existing preparation/i)).toBeInTheDocument()
  })

  it('renders idle empty state with Generate button when no preparation exists', async () => {
    mocks.getPreparation.mockResolvedValue({ data: { preparation: null } })
    renderSection()

    expect(await screen.findByText('No preparation yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate questions/i })).toBeInTheDocument()
  })

  it('renders existing questions when preparation is found on mount', async () => {
    mocks.getPreparation.mockResolvedValue({
      data: { preparation: { questions: sampleQuestions } },
    })

    renderSection()

    expect(await screen.findByText('How do you optimize React rendering performance?')).toBeInTheDocument()
    expect(screen.getByText('Tell me about a challenging conflict in a team project.')).toBeInTheDocument()
    expect(screen.getByText('2 personalized questions')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Generate questions/i })).not.toBeInTheDocument()
  })

  it('generates questions on button click', async () => {
    const user = userEvent.setup()
    mocks.getPreparation.mockResolvedValue({ data: { preparation: null } })
    mocks.generatePreparation.mockResolvedValue({
      data: { preparation: { questions: sampleQuestions } },
    })

    renderSection()
    const generateBtn = await screen.findByRole('button', { name: /Generate questions/i })
    await user.click(generateBtn)

    expect(mocks.generatePreparation).toHaveBeenCalledWith('int_1')
    expect(await screen.findByText('How do you optimize React rendering performance?')).toBeInTheDocument()
  })

  it('handles general generation error and allows retry', async () => {
    const user = userEvent.setup()
    mocks.getPreparation.mockResolvedValue({ data: { preparation: null } })
    mocks.generatePreparation.mockRejectedValueOnce(new Error('AI generation timed out'))

    renderSection()
    const generateBtn = await screen.findByRole('button', { name: /Generate questions/i })
    await user.click(generateBtn)

    expect(await screen.findByText('AI generation timed out')).toBeInTheDocument()
    const tryAgainBtn = screen.getByRole('button', { name: 'Try again' })

    mocks.generatePreparation.mockResolvedValueOnce({
      data: { preparation: { questions: sampleQuestions } },
    })
    await user.click(tryAgainBtn)

    expect(await screen.findByText('How do you optimize React rendering performance?')).toBeInTheDocument()
  })

  it('handles missing profile/resume error with CTA links', async () => {
    const user = userEvent.setup()
    mocks.getPreparation.mockResolvedValue({ data: { preparation: null } })
    const err = new Error('Profile or resume required')
    err.status = 400
    mocks.generatePreparation.mockRejectedValueOnce(err)

    renderSection()
    const generateBtn = await screen.findByRole('button', { name: /Generate questions/i })
    await user.click(generateBtn)

    expect(
      await screen.findByText('Create a profile or add a resume before generating interview questions.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: 'Go to Resume' })).toHaveAttribute('href', '/resume')
  })
})
