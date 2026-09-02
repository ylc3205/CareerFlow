import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { Label } from '../ui/label.jsx'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← All sessions
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
            {PRACTICE_STATUS_LABEL[session.status] || session.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {answeredCount}/{answers.length} answered
          </span>
        </div>
      </div>

      {completed && session.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Session summary</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionSummary summary={session.summary} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {answers.map((slot, index) => {
              const isActive = index === activeIndex
              const evaluated = Boolean(slot && slot.evaluation)
              return (
                <li key={slot.questionIndex}>
                  <button
                    type="button"
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-sm border border-border bg-background transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                    }${evaluated ? ' border-success' : ''}`}
                    onClick={() => setActiveIndex(index)}
                  >
                    <span className="font-mono tabular-nums text-sm">{index + 1}</span>
                    <span className="flex-1 truncate">{slot.question}</span>
                    <span className="text-sm text-muted-foreground">
                      {evaluated ? `Score ${slot.evaluation.score}` : 'Pending'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={PRACTICE_CATEGORY_VARIANT[activeSlot.category] || 'default'}>
              {PRACTICE_CATEGORY_LABEL[activeSlot.category] || activeSlot.category}
            </Badge>
            <Badge variant={PRACTICE_DIFFICULTY_VARIANT[activeSlot.difficulty] || 'default'}>
              {PRACTICE_DIFFICULTY_LABEL[activeSlot.difficulty] || activeSlot.difficulty}
            </Badge>
            {activeSlot.attemptCount > 0 && (
              <span className="text-xs text-muted-foreground">Attempt {activeSlot.attemptCount}</span>
            )}
          </div>
          <h3 className="text-lg font-semibold">{activeSlot.question}</h3>

          {activeSlot.evaluation && (
            <div className="border-t border-border pt-4">
              <AnswerEvaluation evaluation={activeSlot.evaluation} />
            </div>
          )}

{!completed && (
              <div className="space-y-4">
                <Label className="block text-sm font-medium">
                  {activeSlot.evaluation ? 'Revise your answer' : 'Your answer'}
                </Label>
                <textarea
                id={`answer-${session._id}-${activeIndex}`}
                className="flex h-32 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                rows={6}
                maxLength={4000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your answer here…"
              />
              {submitError && (
                <ErrorMessage title="Could not submit your answer" message={submitError.message} errors={submitError.errors} />
              )}
              <Button disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Evaluating…' : activeSlot.evaluation ? 'Save revision' : 'Submit answer'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!completed && answeredCount > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium">Finish now</h3>
              <p className="text-sm text-muted-foreground">
                Summarize your {answeredCount} evaluated answer{answeredCount === 1 ? '' : 's'} without answering the rest.
              </p>
            </div>
            <div className="flex gap-2">
              {completeError && <ErrorMessage title="Could not complete the session" message={completeError.message} />}
              <Button variant="ghost" disabled={completing} onClick={handleComplete}>
                {completing ? 'Completing…' : 'Complete session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}