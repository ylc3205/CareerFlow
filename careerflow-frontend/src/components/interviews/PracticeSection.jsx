import { useEffect, useState } from 'react'
import Badge from '../Badge.jsx'
import Card from '../Card.jsx'
import Loading from '../Loading.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import EmptyState from '../EmptyState.jsx'
import PracticeSessionView from './PracticeSessionView.jsx'
import {
  listPracticeSessionsApi,
  createPracticeSessionApi,
  deletePracticeSessionApi,
} from '../../api/practice.api.js'
import {
  PRACTICE_STATUS_LABEL,
  PRACTICE_STATUS_VARIANT,
} from '../../utils/constants.js'
import { formatDisplayDate } from '../../utils/format.js'

// Backend contract (source of truth):
//   GET  /api/interviews/:id/practice -> { data: { sessions } } (newest-first)
//   POST /api/interviews/:id/practice -> { data: { session } } (201)
//   DELETE /api/interviews/:id/practice/:pid -> { success, message }
// A practice session snapshots the generated preparation questions; multiple
// sessions per interview are allowed.

const answeredCountOf = (session) =>
  (session.answers || []).filter((answer) => answer && answer.evaluation).length

export default function PracticeSection({ interviewId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const [activeSession, setActiveSession] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await listPracticeSessionsApi(interviewId)
        if (cancelled) return
        setSessions(res.data.sessions)
      } catch (err) {
        if (!cancelled) setLoadError({ message: err.message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [interviewId, reloadKey])

  const handleCreate = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await createPracticeSessionApi(interviewId)
      const created = res.data.session
      setSessions((prev) => [created, ...prev])
      setActiveSession(created)
    } catch (err) {
      setCreateError({ message: err.message, errors: err.errors })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (session) => {
    if (!window.confirm('Delete this practice session? This cannot be undone.')) return
    setDeletingId(session._id)
    setDeleteError(null)
    try {
      await deletePracticeSessionApi(interviewId, session._id)
      if (activeSession && activeSession._id === session._id) setActiveSession(null)
      setSessions((prev) => prev.filter((item) => item._id !== session._id))
    } catch (err) {
      setDeleteError({ message: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  const handleSessionUpdate = (updated) => {
    setActiveSession(updated)
    setSessions((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
  }

  if (loading) {
    return (
      <div className="practice">
        <Loading label="Loading practice sessions…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="practice">
        <div className="page__error">
          <ErrorMessage title="Could not load practice sessions" message={loadError.message} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="practice">
      <header className="prep__header">
        <h2 className="prep__title">Interview Practice</h2>
        <p className="prep__subtitle">
          Answer the prepared questions and get AI feedback on each answer.
        </p>
      </header>

      {createError && (
        <ErrorMessage
          title="Could not start a practice session"
          message={createError.message}
          errors={createError.errors}
        />
      )}
      {deleteError && <ErrorMessage title="Could not delete the session" message={deleteError.message} />}

      {activeSession ? (
        <PracticeSessionView
          interviewId={interviewId}
          session={activeSession}
          onSessionUpdate={handleSessionUpdate}
          onBack={() => setActiveSession(null)}
        />
      ) : (
        <>
          <div className="practice__actions">
            <button type="button" className="btn btn--primary" disabled={creating} onClick={handleCreate}>
              {creating ? 'Starting…' : 'Start new practice session'}
            </button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              title="No practice sessions yet"
              description="Start a session to answer the prepared questions and receive AI feedback."
            />
          ) : (
            <ul className="practice-list">
              {sessions.map((session) => {
                const answered = answeredCountOf(session)
                const total = (session.answers || []).length
                return (
                  <li key={session._id}>
                    <Card className="practice-session-card">
                      <div className="practice-session-card__main">
                        <div className="practice-session-card__heading">
                          <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
                            {PRACTICE_STATUS_LABEL[session.status] || session.status}
                          </Badge>
                          <span className="practice-session-card__date">
                            {formatDisplayDate(session.createdAt)}
                          </span>
                        </div>
                        <p className="practice-session-card__meta">
                          {answered}/{total} answered
                          {session.summary && session.summary.overallScore != null
                            ? ` · Overall ${session.summary.overallScore}`
                            : ''}
                        </p>
                      </div>
                      <div className="practice-session-card__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setActiveSession(session)}>
                          {session.status === 'completed'
                            ? 'View results'
                            : session.status === 'not_started'
                              ? 'Start'
                              : 'Continue'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--danger btn--sm"
                          disabled={deletingId === session._id}
                          onClick={() => handleDelete(session)}
                        >
                          {deletingId === session._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}