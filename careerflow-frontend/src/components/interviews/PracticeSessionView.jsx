import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { Label } from '../ui/label.jsx'
import { Textarea } from '../ui/textarea.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import AnswerEvaluation from './AnswerEvaluation.jsx'
import SessionSummary from './SessionSummary.jsx'
import { cn } from '@/utils/index.js'
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All sessions
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
            {PRACTICE_STATUS_LABEL[session.status] || session.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {answeredCount} of {answers.length} answered
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
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
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

          <p className="mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Question {activeIndex + 1} of {answers.length}
          </p>
          <h3 className="mt-2 text-xl font-semibold leading-relaxed tracking-tight text-foreground sm:text-2xl">
            {activeSlot.question}
          </h3>

          {activeSlot.evaluation && (
            <div className="mt-6 border-t border-border pt-6" aria-live="polite">
              <AnswerEvaluation evaluation={activeSlot.evaluation} />
            </div>
          )}

          {!completed && (
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <Label htmlFor={`answer-${session._id}-${activeIndex}`}>
                {activeSlot.evaluation ? 'Revise your answer' : 'Your answer'}
              </Label>
              <Textarea
                id={`answer-${session._id}-${activeIndex}`}
                rows={8}
                maxLength={4000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your answer here…"
                className="min-h-[160px] px-4 py-3 text-base leading-relaxed md:text-base"
              />
              {submitError && (
                <ErrorMessage title="Could not submit your answer" message={submitError.message} errors={submitError.errors} />
              )}
              <div className="flex justify-end">
                <Button disabled={submitting} onClick={handleSubmit} size="lg" className="w-full sm:w-auto">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {submitting ? 'Evaluating…' : activeSlot.evaluation ? 'Save revision' : 'Submit answer'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {answers.length > 1 && (
        <nav className="space-y-3" aria-label="Questions">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questions</h3>
          <ol className="flex flex-wrap gap-2">
            {answers.map((slot, index) => {
              const isActive = index === activeIndex
              const evaluated = Boolean(slot && slot.evaluation)
              return (
                <li key={slot.questionIndex}>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={
                      evaluated
                        ? `Question ${index + 1}, score ${slot.evaluation.score}`
                        : `Question ${index + 1}`
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-primary bg-primary font-semibold text-primary-foreground'
                        : evaluated
                          ? 'border-success bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {index + 1}
                    {evaluated && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      {!completed && answeredCount > 0 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            {completeError && <ErrorMessage title="Could not complete the session" message={completeError.message} />}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-medium">Finish now</h3>
                <p className="text-sm text-muted-foreground">
                  Summarize your {answeredCount} evaluated answer{answeredCount === 1 ? '' : 's'} without answering the rest.
                </p>
              </div>
              <Button variant="outline" disabled={completing} onClick={handleComplete}>
                {completing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {completing ? 'Completing…' : 'Complete session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}