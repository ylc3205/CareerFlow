import { useEffect, useState } from 'react'
import Badge from '../Badge.jsx'
import Card from '../Card.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import AnswerEvaluation from './AnswerEvaluation.jsx'
import SessionSummary from './SessionSummary.jsx'
import { submitPracticeAnswerApi, completePracticeSessionApi } from '../../api/practice.api.js'
import {
  PRACTICE_STATUS_LABEL,
  PRACTICE_STATUS_VARIANT,
  PRACTICE_CATEGORY_LABEL,
  PRACTICE_CATEGORY_VARIANT,
  PRACTICE_DIFFICULTY_LABEL,
  PRACTICE_DIFFICULTY_VARIANT,
} from '../../utils/constants.js'

// Backend contract (source of truth):
//   POST /api/interviews/:id/practice/:pid/answers { questionIndex, answer }
//     -> { data: { session } } — same answer is short-circuited; a changed answer
//        is re-evaluated and replaces the slot (attemptCount +1). Answering every
//        slot auto-completes the session with a summary.
//   POST /api/interviews/:id/practice/:pid/complete (idempotent) -> { data: { session } }

export default function PracticeSessionView({ interviewId, session, onSessionUpdate, onBack }) {
  const answers = session.answers || []
  const answeredCount = answers.filter((answer) => answer && answer.evaluation).length
  const completed = session.status === 'completed'

  const [activeIndex, setActiveIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState(null)

  const activeSlot = answers[activeIndex] || {}
  const currentAnswer = (activeSlot && activeSlot.answer) || ''

  // Prefill the textarea with the current answer whenever the target question
  // or the stored answer changes (e.g. after a submit returns the session).
  useEffect(() => {
    setDraft(currentAnswer)
    setSubmitError(null)
  }, [activeIndex, currentAnswer])

  const handleSubmit = async () => {
    const trimmed = String(draft || '').trim()
    if (!trimmed) {
      setSubmitError({ message: 'Answer is required' })
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await submitPracticeAnswerApi(interviewId, session._id, activeIndex, trimmed)
      onSessionUpdate(res.data.session)
    } catch (err) {
      setSubmitError({ message: err.message, errors: err.errors })
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    setCompleteError(null)
    try {
      const res = await completePracticeSessionApi(interviewId, session._id)
      onSessionUpdate(res.data.session)
    } catch (err) {
      setCompleteError({ message: err.message, errors: err.errors })
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="practice-view">
      <div className="practice-view__header">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}>
          ← All sessions
        </button>
        <div className="practice-view__progress">
          <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
            {PRACTICE_STATUS_LABEL[session.status] || session.status}
          </Badge>
          <span>
            {answeredCount}/{answers.length} answered
          </span>
        </div>
      </div>

      {completed && session.summary && (
        <Card>
          <h2 className="job-detail__section-title">Session summary</h2>
          <SessionSummary summary={session.summary} />
        </Card>
      )}

      <Card>
        <h2 className="job-detail__section-title">Questions</h2>
        <ol className="practice-nav">
          {answers.map((slot, index) => {
            const isActive = index === activeIndex
            const evaluated = Boolean(slot && slot.evaluation)
            return (
              <li key={slot.questionIndex}>
                <button
                  type="button"
                  className={`practice-nav__item${isActive ? ' practice-nav__item--active' : ''}${evaluated ? ' practice-nav__item--done' : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className="practice-nav__number">{index + 1}</span>
                  <span className="practice-nav__title">{slot.question}</span>
                  <span className="practice-nav__state">
                    {evaluated ? `Score ${slot.evaluation.score}` : 'Pending'}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </Card>

      <Card>
        <div className="practice-question">
          <div className="practice-question__meta">
            <Badge variant={PRACTICE_CATEGORY_VARIANT[activeSlot.category] || 'default'}>
              {PRACTICE_CATEGORY_LABEL[activeSlot.category] || activeSlot.category}
            </Badge>
            <Badge variant={PRACTICE_DIFFICULTY_VARIANT[activeSlot.difficulty] || 'default'}>
              {PRACTICE_DIFFICULTY_LABEL[activeSlot.difficulty] || activeSlot.difficulty}
            </Badge>
            {activeSlot.attemptCount > 0 && (
              <span className="practice-question__attempts">
                Attempt {activeSlot.attemptCount}
              </span>
            )}
          </div>
          <h3 className="practice-question__text">{activeSlot.question}</h3>

          {activeSlot.evaluation && (
            <div className="practice-question__evaluation">
              <AnswerEvaluation evaluation={activeSlot.evaluation} />
            </div>
          )}

          {!completed && (
            <div className="practice-question__answer">
              <label className="form__label" htmlFor={`answer-${session._id}-${activeIndex}`}>
                {activeSlot.evaluation ? 'Revise your answer' : 'Your answer'}
              </label>
              <textarea
                id={`answer-${session._id}-${activeIndex}`}
                className="form__input form__textarea"
                rows={6}
                maxLength={4000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your answer here…"
              />
              {submitError && (
                <ErrorMessage title="Could not submit your answer" message={submitError.message} errors={submitError.errors} />
              )}
              <div className="practice-question__actions">
                <button type="button" className="btn btn--primary" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? 'Evaluating…' : activeSlot.evaluation ? 'Save revision' : 'Submit answer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {!completed && answeredCount > 0 && (
        <Card className="practice-view__finish">
          <div className="practice-view__finish-text">
            <h3 className="practice-view__finish-title">Finish now</h3>
            <p className="practice-view__finish-subtitle">
              Summarize your {answeredCount} evaluated answer{answeredCount === 1 ? '' : 's'} without answering the rest.
            </p>
          </div>
          <div className="practice-view__finish-actions">
            {completeError && <ErrorMessage title="Could not complete the session" message={completeError.message} />}
            <button type="button" className="btn btn--ghost" disabled={completing} onClick={handleComplete}>
              {completing ? 'Completing…' : 'Complete session'}
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}