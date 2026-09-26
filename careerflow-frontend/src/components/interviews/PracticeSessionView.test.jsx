import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PracticeSessionView from './PracticeSessionView.jsx'
import { getInitialActiveIndex } from '../../utils/practiceSession.js'

vi.mock('../../api/practice.api.js', () => ({
  submitPracticeAnswerApi: vi.fn(),
  completePracticeSessionApi: vi.fn(),
}))

describe('getInitialActiveIndex', () => {
  it('returns 0 for a new session where all evaluations are null', () => {
    const answers = [
      { questionIndex: 0, question: 'Q0', evaluation: null },
      { questionIndex: 1, question: 'Q1', evaluation: null },
      { questionIndex: 2, question: 'Q2', evaluation: null },
      { questionIndex: 3, question: 'Q3', evaluation: null },
      { questionIndex: 4, question: 'Q4', evaluation: null },
      { questionIndex: 5, question: 'Q5', evaluation: null },
    ]
    expect(getInitialActiveIndex(answers)).toBe(0)
  })

  it('returns 2 for a resumed session where Q0 and Q1 are evaluated, Q2 is unanswered', () => {
    const answers = [
      { questionIndex: 0, question: 'Q0', evaluation: { score: 85 } },
      { questionIndex: 1, question: 'Q1', evaluation: { score: 70 } },
      { questionIndex: 2, question: 'Q2', evaluation: null },
      { questionIndex: 3, question: 'Q3', evaluation: null },
      { questionIndex: 4, question: 'Q4', evaluation: null },
      { questionIndex: 5, question: 'Q5', evaluation: null },
    ]
    expect(getInitialActiveIndex(answers)).toBe(2)
  })

  it('returns 0 when the first question is unanswered even if subsequent questions are evaluated', () => {
    const answers = [
      { questionIndex: 0, question: 'Q0', evaluation: null },
      { questionIndex: 1, question: 'Q1', evaluation: { score: 90 } },
    ]
    expect(getInitialActiveIndex(answers)).toBe(0)
  })

  it('falls back to 0 when all questions are evaluated', () => {
    const answers = [
      { questionIndex: 0, question: 'Q0', evaluation: { score: 85 } },
      { questionIndex: 1, question: 'Q1', evaluation: { score: 90 } },
    ]
    expect(getInitialActiveIndex(answers)).toBe(0)
  })

  it('returns 0 for empty or undefined answers', () => {
    expect(getInitialActiveIndex([])).toBe(0)
    expect(getInitialActiveIndex(undefined)).toBe(0)
  })
})

describe('PracticeSessionView Component', () => {
  const onSessionUpdate = vi.fn()
  const onBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Test 1 — New session: opens Q0 (Question 1) when all evaluations are null', () => {
    const session = {
      _id: 'session_new',
      status: 'not_started',
      answers: [
        { questionIndex: 0, question: 'What is React?', category: 'technical', difficulty: 'easy', evaluation: null },
        { questionIndex: 1, question: 'Tell me about yourself.', category: 'behavioral', difficulty: 'easy', evaluation: null },
      ],
    }

    render(
      <PracticeSessionView
        interviewId="int_1"
        session={session}
        onSessionUpdate={onSessionUpdate}
        onBack={onBack}
      />
    )

    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('What is React?')).toBeInTheDocument()
    expect(screen.getByText('Unanswered')).toBeInTheDocument()
    expect(screen.getByText('0 of 2 questions answered')).toBeInTheDocument()
    // No evaluation score gauge should be rendered
    expect(screen.queryByText(/Areas to improve/i)).not.toBeInTheDocument()
  })

  it('Test 2 — Resumed session: opens Q2 (Question 3) when Q0 and Q1 are evaluated', () => {
    const session = {
      _id: 'session_in_prog',
      status: 'in_progress',
      answers: [
        {
          questionIndex: 0,
          question: 'What is React?',
          category: 'technical',
          difficulty: 'easy',
          evaluation: { score: 85, technicalScore: 90, strengths: ['Good'], weaknesses: [] },
        },
        {
          questionIndex: 1,
          question: 'What is Node.js?',
          category: 'technical',
          difficulty: 'medium',
          evaluation: { score: 70, technicalScore: 75, strengths: ['Okay'], weaknesses: [] },
        },
        {
          questionIndex: 2,
          question: 'Describe an architectural trade-off you made.',
          category: 'technical',
          difficulty: 'hard',
          evaluation: null,
        },
        {
          questionIndex: 3,
          question: 'How do you handle conflict?',
          category: 'behavioral',
          difficulty: 'medium',
          evaluation: null,
        },
        {
          questionIndex: 4,
          question: 'Why this company?',
          category: 'behavioral',
          difficulty: 'easy',
          evaluation: null,
        },
        {
          questionIndex: 5,
          question: 'Do you have questions for us?',
          category: 'communication',
          difficulty: 'easy',
          evaluation: null,
        },
      ],
    }

    render(
      <PracticeSessionView
        interviewId="int_1"
        session={session}
        onSessionUpdate={onSessionUpdate}
        onBack={onBack}
      />
    )

    // Automatically opened Q2 (Question 3 of 6)
    expect(screen.getByText('Question 3 of 6')).toBeInTheDocument()
    expect(screen.getByText('Describe an architectural trade-off you made.')).toBeInTheDocument()
    expect(screen.getByText('Unanswered')).toBeInTheDocument()

    // No evaluation score gauge for Q2
    expect(screen.queryByText('Areas to improve')).not.toBeInTheDocument()
    // Input textarea is clean and ready
    expect(screen.getByPlaceholderText('Type your answer here…')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeInTheDocument()

    // Step 3 button in nav is active
    const step3Btn = screen.getByRole('button', { name: 'Question 3, unanswered' })
    expect(step3Btn).toHaveAttribute('aria-current', 'step')
  })

  it('Test 3 — First question unanswered: opens Q0 (Question 1) when Q0 is unanswered and Q1 is evaluated', () => {
    const session = {
      _id: 'session_q0_unanswered',
      status: 'in_progress',
      answers: [
        {
          questionIndex: 0,
          question: 'Unanswered first question',
          category: 'technical',
          difficulty: 'medium',
          evaluation: null,
        },
        {
          questionIndex: 1,
          question: 'Evaluated second question',
          category: 'behavioral',
          difficulty: 'easy',
          evaluation: { score: 90, strengths: ['Great'], weaknesses: [] },
        },
      ],
    }

    render(
      <PracticeSessionView
        interviewId="int_1"
        session={session}
        onSessionUpdate={onSessionUpdate}
        onBack={onBack}
      />
    )

    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Unanswered first question')).toBeInTheDocument()
    expect(screen.getByText('Unanswered')).toBeInTheDocument()
  })

  it('Test 4 — All evaluated: falls back to activeIndex = 0 (Question 1)', () => {
    const session = {
      _id: 'session_all_done',
      status: 'completed',
      summary: {
        overallScore: 88,
        technicalScore: 85,
        communicationScore: 90,
        behavioralScore: 89,
        strongAreas: ['React'],
        weakAreas: [],
      },
      answers: [
        {
          questionIndex: 0,
          question: 'Question 1 Title',
          category: 'technical',
          difficulty: 'easy',
          evaluation: { score: 85, technicalScore: 85, strengths: ['Good'], weaknesses: [] },
        },
        {
          questionIndex: 1,
          question: 'Question 2 Title',
          category: 'behavioral',
          difficulty: 'medium',
          evaluation: { score: 91, technicalScore: 90, strengths: ['Solid'], weaknesses: [] },
        },
      ],
    }

    render(
      <PracticeSessionView
        interviewId="int_1"
        session={session}
        onSessionUpdate={onSessionUpdate}
        onBack={onBack}
      />
    )

    // Fallback to Question 1
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Question 1 Title')).toBeInTheDocument()
    expect(screen.getByText('Evaluated')).toBeInTheDocument()
    expect(screen.getByText('Session summary')).toBeInTheDocument()
  })

  it('Test 5 — Progress/score distinction: progress is clearly labeled and not conflated with evaluation score', async () => {
    const user = userEvent.setup()
    const session = {
      _id: 'session_distinction',
      status: 'in_progress',
      answers: [
        {
          questionIndex: 0,
          question: 'Evaluated Q0',
          category: 'technical',
          difficulty: 'easy',
          answer: 'I answered Q0',
          evaluation: {
            score: 75,
            technicalScore: 80,
            communicationScore: 70,
            behavioralScore: 75,
            strengths: ['Clear explanation'],
            weaknesses: ['Add more metrics'],
          },
        },
        {
          questionIndex: 1,
          question: 'Evaluated Q1',
          category: 'technical',
          difficulty: 'easy',
          answer: 'I answered Q1',
          evaluation: {
            score: 85,
            technicalScore: 85,
            communicationScore: 85,
            behavioralScore: 85,
            strengths: ['Great'],
            weaknesses: [],
          },
        },
        {
          questionIndex: 2,
          question: 'Unanswered Q2',
          category: 'technical',
          difficulty: 'medium',
          answer: '',
          evaluation: null,
        },
      ],
    }

    render(
      <PracticeSessionView
        interviewId="int_1"
        session={session}
        onSessionUpdate={onSessionUpdate}
        onBack={onBack}
      />
    )

    // Resumes at Q2 (first unanswered)
    expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    expect(screen.getByText('Unanswered Q2')).toBeInTheDocument()
    expect(screen.getByText('Unanswered')).toBeInTheDocument()

    // Header shows progress: 2 of 3 questions answered
    expect(screen.getByText('2 of 3 questions answered')).toBeInTheDocument()

    // For Q2 (unanswered), NO evaluation score is rendered
    expect(screen.queryByText('Clear explanation')).not.toBeInTheDocument()
    expect(screen.queryByText('Add more metrics')).not.toBeInTheDocument()

    // User navigates back to Question 1 to inspect previous answer
    const q1Btn = screen.getByRole('button', { name: 'Question 1, score 75' })
    await user.click(q1Btn)

    // Now Q0 is active: shows Evaluated badge and evaluation details
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('Evaluated Q0')).toBeInTheDocument()
    expect(screen.getByText('Evaluated')).toBeInTheDocument()
    expect(screen.getByText('Clear explanation')).toBeInTheDocument()
    expect(screen.getByText('Add more metrics')).toBeInTheDocument()

    // Progress in the header is still 2 of 3 questions answered
    expect(screen.getByText('2 of 3 questions answered')).toBeInTheDocument()
  })
})
