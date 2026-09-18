import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PracticeSection from './PracticeSection.jsx'

const mocks = vi.hoisted(() => ({
  listPracticeSessions: vi.fn(),
  createPracticeSession: vi.fn(),
  deletePracticeSession: vi.fn(),
}))

vi.mock('../../api/practice.api.js', () => ({
  listPracticeSessionsApi: mocks.listPracticeSessions,
  createPracticeSessionApi: mocks.createPracticeSession,
  deletePracticeSessionApi: mocks.deletePracticeSession,
}))

const sampleSession = {
  _id: 'session_1',
  status: 'in_progress',
  createdAt: '2026-09-18T10:00:00.000Z',
  answers: [
    { questionIndex: 0, answer: 'My answer', evaluation: { score: 85 } },
    { questionIndex: 1, answer: '', evaluation: null },
  ],
}

describe('PracticeSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state on mount', () => {
    mocks.listPracticeSessions.mockReturnValue(new Promise(() => {}))
    render(<PracticeSection interviewId="int_1" />)
    expect(screen.getByText(/Loading practice sessions/i)).toBeInTheDocument()
  })

  it('renders empty state when there are no practice sessions', async () => {
    mocks.listPracticeSessions.mockResolvedValue({ data: { sessions: [] } })
    render(<PracticeSection interviewId="int_1" />)

    expect(await screen.findByText('No practice sessions yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start new practice session/i })).toBeInTheDocument()
  })

  it('renders list of existing practice sessions', async () => {
    mocks.listPracticeSessions.mockResolvedValue({ data: { sessions: [sampleSession] } })
    render(<PracticeSection interviewId="int_1" />)

    expect(await screen.findByText('In progress')).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 questions answered/i)).toBeInTheDocument()
  })

  it('creates a new practice session on click', async () => {
    const user = userEvent.setup()
    mocks.listPracticeSessions.mockResolvedValue({ data: { sessions: [] } })
    const createdSession = {
      _id: 'session_new',
      status: 'not_started',
      answers: [],
    }
    mocks.createPracticeSession.mockResolvedValue({ data: { session: createdSession } })

    render(<PracticeSection interviewId="int_1" />)

    const startBtn = await screen.findByRole('button', { name: /Start new practice session/i })
    await user.click(startBtn)

    expect(mocks.createPracticeSession).toHaveBeenCalledWith('int_1')
  })

  it('deletes a practice session with confirmation', async () => {
    const user = userEvent.setup()
    mocks.listPracticeSessions.mockResolvedValue({ data: { sessions: [sampleSession] } })
    mocks.deletePracticeSession.mockResolvedValue({ status: 200 })

    render(<PracticeSection interviewId="int_1" />)

    const deleteBtn = await screen.findByRole('button', { name: /^Delete$/i })
    await user.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalledWith('Delete this practice session? This cannot be undone.')
    expect(mocks.deletePracticeSession).toHaveBeenCalledWith('int_1', 'session_1')
  })

  it('renders load error and allows retry', async () => {
    const user = userEvent.setup()
    mocks.listPracticeSessions.mockRejectedValueOnce(new Error('Failed to load sessions'))

    render(<PracticeSection interviewId="int_1" />)

    expect(await screen.findByText('Failed to load sessions')).toBeInTheDocument()

    mocks.listPracticeSessions.mockResolvedValueOnce({ data: { sessions: [sampleSession] } })
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    expect(await screen.findByText('In progress')).toBeInTheDocument()
  })
})
