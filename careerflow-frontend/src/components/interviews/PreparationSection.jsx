import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import Loading from '../Loading.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import EmptyState from '../EmptyState.jsx'
import QuestionList from './QuestionList.jsx'
import { getPreparationApi, generatePreparationApi } from '../../api/interviews.api.js'
import { Button } from '../ui/button.jsx'

// Backend contract (source of truth):
//   GET  /api/interviews/:id/preparation -> { data: { preparation: { questions } } }
//     preparation is null when none exists yet. Never triggers AI.
//   POST /api/interviews/:id/preparation -> { data: { preparation: { questions } } }
//   questions: [{ question, category, difficulty }], 5-10 items.
//   400 when no Profile/Resume (or interview has no linked job)
//   404 when interview missing/not owned
//   502/503 on AI/provider failure
//   500 when the preparation could not be persisted
//
// Preparation is CACHED per user + interview on the backend, so a successful
// generation is final — there is deliberately no "regenerate" action.
// The frontend loads any existing preparation on mount via GET; the Generate
// button only triggers the POST (AI) when no preparation exists.

const validationErrorMessage = 'The interview questions could not be loaded. Please try again.'

const isQuestionValid = (item) =>
  Boolean(
    item &&
      typeof item.question === 'string' &&
      item.question.trim() &&
      typeof item.category === 'string' &&
      typeof item.difficulty === 'string'
  )

function QuestionSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-sm bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PreparationSection({ interviewId }) {
  const [status, setStatus] = useState('idle') // idle | generating | success | error
  const [questions, setQuestions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true) // initial GET in flight
  const [loadError, setLoadError] = useState(null)

  const loadExisting = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await getPreparationApi(interviewId)
      const items = res.data?.preparation?.questions
      if (Array.isArray(items) && items.length > 0 && items.every(isQuestionValid)) {
        setQuestions(items)
        setStatus('success')
      } else {
        // No existing preparation (or it is unusable) -> show the Generate CTA.
        setStatus('idle')
      }
    } catch (err) {
      setLoadError({ message: err.message })
    } finally {
      setLoading(false)
    }
  }, [interviewId])

  useEffect(() => {
    loadExisting()
  }, [loadExisting])

  const handleGenerate = async () => {
    setStatus('generating')
    setError(null)
    try {
      const res = await generatePreparationApi(interviewId)
      const items = res.data?.preparation?.questions
      if (!Array.isArray(items) || items.length === 0 || !items.every(isQuestionValid)) {
        setError({ message: validationErrorMessage })
        setStatus('error')
        return
      }
      setQuestions(items)
      setStatus('success')
    } catch (err) {
      setError({
        message: err.message,
        errors: err.errors,
        missingProfileResume: err.status === 400 && /profile|resume/i.test(err.message || ''),
      })
      setStatus('error')
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">AI Preparation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === 'success'
              ? `${questions.length} personalized question${questions.length === 1 ? '' : 's'}`
              : 'Generate customized questions for this interview based on the job and your profile/resume.'}
          </p>
        </div>
        {status === 'idle' && (
          <Button size="sm" onClick={handleGenerate}>
            <Sparkles />
            Generate questions
          </Button>
        )}
      </header>

      <div aria-live="polite">
        {loading && (
          <div className="flex items-center gap-2">
            <Loading label="Checking for existing preparation…" />
          </div>
        )}

        {!loading && loadError && (
          <div className="flex gap-3">
            <ErrorMessage title="Could not load interview preparation" message={loadError.message} />
            <Button variant="outline" size="sm" onClick={loadExisting}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !loadError && (
          <>
            {status === 'idle' && (
              <EmptyState
                icon={<Sparkles className="h-6 w-6" />}
                title="No preparation yet"
                description="Generate personalized questions for this interview and start studying."
              />
            )}

            {status === 'generating' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Loading label="Generating personalized interview questions…" />
                </div>
                <QuestionSkeleton />
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <QuestionList questions={questions} />
                <p className="text-sm text-muted-foreground">Answer these questions in the Interview Practice section below.</p>
              </div>
            )}

            {status === 'error' && error && (
              <div className="space-y-3">
                {error.missingProfileResume ? (
                  <>
                    <ErrorMessage
                      title="Profile or resume required"
                      message="Create a profile or add a resume before generating interview questions."
                    />
                    <div className="flex flex-wrap gap-2">
                      <Link to="/profile">
                        <Button variant="default" size="sm">Go to Profile</Button>
                      </Link>
                      <Link to="/resume">
                        <Button variant="outline" size="sm">Go to Resume</Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <ErrorMessage title="Unable to generate interview questions right now." message={error.message} errors={error.errors} />
                    <Button variant="outline" size="sm" onClick={handleGenerate}>
                      Try again
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}