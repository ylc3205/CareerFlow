import { useEffect, useState } from 'react'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
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
      <div className="space-y-6">
        <Loading label="Loading practice sessions…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <ErrorMessage title="Could not load practice sessions" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">Interview Practice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
          <div className="flex gap-2">
            <Button disabled={creating} onClick={handleCreate}>
              {creating ? 'Starting…' : 'Start new practice session'}
            </Button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              title="No practice sessions yet"
              description="Start a session to answer the prepared questions and receive AI feedback."
            />
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const answered = answeredCountOf(session)
                const total = (session.answers || []).length
                return (
                  <Card key={session._id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
                          {PRACTICE_STATUS_LABEL[session.status] || session.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDisplayDate(session.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {answered}/{total} answered
                        {session.summary && session.summary.overallScore != null
                          ? ` · Overall ${session.summary.overallScore}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setActiveSession(session)}>
                        {session.status === 'completed'
                          ? 'View results'
                          : session.status === 'not_started'
                            ? 'Start'
                            : 'Continue'}
                      </Button>
                      <Button variant="destructive" size="sm" disabled={deletingId === session._id} onClick={() => handleDelete(session)}>
                        {deletingId === session._id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}