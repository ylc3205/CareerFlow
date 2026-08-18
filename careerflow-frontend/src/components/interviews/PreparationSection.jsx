import { useState } from 'react'
import { Link } from 'react-router-dom'
import Loading from '../Loading.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import QuestionList from './QuestionList.jsx'
import { generatePreparationApi } from '../../api/interviews.api.js'

// Backend contract (source of truth):
//   POST /api/interviews/:id/preparation -> { data: { preparation: { questions } } }
//   questions: [{ question, category, difficulty }], 5-10 items.
//   400 when no Profile/Resume (or interview has no linked job)
//   404 when interview missing/not owned
//   502/503 on AI/provider failure
//   500 when the preparation could not be persisted
//
// Preparation is CACHED per user + interview on the backend, so a successful
// generation is final — there is deliberately no "regenerate" action.
// Because no GET endpoint exists, the frontend cannot know about existing
// preparation on page load, so generation always requires explicit user action.

const validationErrorMessage = 'The interview questions could not be loaded. Please try again.'

const isQuestionValid = (item) =>
  Boolean(
    item &&
      typeof item.question === 'string' &&
      item.question.trim() &&
      typeof item.category === 'string' &&
      typeof item.difficulty === 'string'
  )

export default function PreparationSection({ interviewId }) {
  const [status, setStatus] = useState('idle') // idle | generating | success | error
  const [questions, setQuestions] = useState([])
  const [error, setError] = useState(null)

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
        missingProfileResume: err.status === 400 && /profile or resume/i.test(err.message || ''),
      })
      setStatus('error')
    }
  }

  return (
    <section className="prep">
      <header className="prep__header">
        <h2 className="prep__title">AI Interview Preparation</h2>
        <p className="prep__subtitle">
          {status === 'success'
            ? `${questions.length} personalized question${questions.length === 1 ? '' : 's'}`
            : 'Generate personalized interview questions based on this interview, the job, and your profile/resume.'}
        </p>
      </header>

      {status === 'idle' && (
        <div className="prep__cta">
          <button type="button" className="btn btn--primary" onClick={handleGenerate}>
            Generate Interview Questions
          </button>
        </div>
      )}

      {status === 'generating' && (
        <div className="prep__loading">
          <Loading label="Generating personalized interview questions…" />
        </div>
      )}

      {status === 'success' && (
        <div className="prep__result">
          <QuestionList questions={questions} />
          <p className="prep__next-step">Answer these questions in the Interview Practice section below.</p>
        </div>
      )}

      {status === 'error' && error && (
        <div className="prep__error">
          {error.missingProfileResume ? (
            <>
              <ErrorMessage
                title="Profile or resume required"
                message="Create a profile or add a resume before generating interview questions."
              />
              <div className="prep__error-actions">
                <Link to="/profile" className="btn btn--primary btn--sm">
                  Go to Profile
                </Link>
                <Link to="/resume" className="btn btn--ghost btn--sm">
                  Go to Resume
                </Link>
              </div>
            </>
          ) : (
            <>
              <ErrorMessage title="Unable to generate interview questions right now." message={error.message} errors={error.errors} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleGenerate}>
                Try again
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}