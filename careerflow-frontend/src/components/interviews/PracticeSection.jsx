import { useEffect, useState } from 'react'
import { ArrowRight, Loader2, PenLine, Trash2 } from 'lucide-react'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
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

function SessionListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
              </div>
              <div className="h-3 w-2/5 animate-pulse rounded-sm bg-muted" />
              <div className="h-3 w-1/4 animate-pulse rounded-sm bg-muted" />
            </div>
            <div className="hidden h-8 w-20 shrink-0 animate-pulse rounded-lg bg-muted sm:block" />
          </div>
        </div>
      ))}
    </div>
  )
}

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

  const header = (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Interview Practice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer these interview questions and receive AI feedback on each answer.
        </p>
      </div>
      {!loading && !loadError && !activeSession && sessions.length > 0 && (
        <Button size="sm" disabled={creating} onClick={handleCreate}>
          {creating ? 'Starting…' : 'Start new practice session'}
          {!creating && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </Button>
      )}
    </header>
  )

  if (loading) {
    return (
      <section className="space-y-6">
        {header}
        <div role="status">
          <span className="sr-only">Loading practice sessions…</span>
          <SessionListSkeleton />
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="space-y-6">
        {header}
        <div className="flex gap-3">
          <ErrorMessage title="Could not load practice sessions" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {header}

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
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<PenLine className="h-6 w-6" />}
          title="No practice sessions yet"
          description="Practice has not started yet. Start a session to answer the prepared questions and receive AI feedback."
          action={
            <Button disabled={creating} onClick={handleCreate}>
              {creating ? 'Starting…' : 'Start new practice session'}
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const answered = answeredCountOf(session)
            const total = (session.answers || []).length
            const hasScore = session.summary && session.summary.overallScore != null
            return (
              <li key={session._id}>
                <Card className="p-4 transition-shadow hover:shadow-md sm:p-5">
                  <div className="flex items-start justify-between gap-4 sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
                          {PRACTICE_STATUS_LABEL[session.status] || session.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDisplayDate(session.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {answered} of {total} questions answered
                      </p>
                      {hasScore && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Overall score {session.summary.overallScore}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" onClick={() => setActiveSession(session)}>
                        {session.status === 'completed'
                          ? 'View results'
                          : session.status === 'not_started'
                            ? 'Start'
                            : 'Continue'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deletingId === session._id}
                        onClick={() => handleDelete(session)}
                      >
                        {deletingId === session._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>{deletingId === session._id ? 'Deleting…' : 'Delete'}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}