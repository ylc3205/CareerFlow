import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Loading from '../Loading.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import EmptyState from '../EmptyState.jsx'
import Pagination from '../Pagination.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { getAnalyticsHistoryApi } from '../../api/analytics.api.js'
import { PRACTICE_STATUSES, PRACTICE_STATUS_LABEL, PRACTICE_STATUS_VARIANT } from '../../utils/constants.js'
import { formatDisplayDate } from '../../utils/format.js'

export default function HistorySection() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [sessions, setSessions] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await getAnalyticsHistoryApi({ status, page })
        if (cancelled) return
        setSessions(res.data.sessions)
        setPagination(res.data.pagination)
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
  }, [status, page, reloadKey])

  const handleStatusChange = (value) => {
    setStatus(value)
    setPage(1)
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Practice history</h2>
          <p className="mt-1 text-sm text-muted-foreground">All of your practice sessions across every interview.</p>
        </div>
        <select
          className="flex h-9 w-[200px] rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          aria-label="Filter history by status"
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
        >
          <option value="">All statuses</option>
          {PRACTICE_STATUSES.map((item) => (
            <option key={item} value={item}>
              {PRACTICE_STATUS_LABEL[item] || item}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loading label="Loading practice history…" />}

      {!loading && loadError && (
        <div className="flex gap-3">
          <ErrorMessage title="Could not load practice history" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !loadError && sessions.length === 0 && (
        <EmptyState
          title="No practice sessions yet"
          description="Complete a practice session from an interview page and it will show up here."
          action={
            <Button asChild>
              <Link to="/interviews">Go to interviews</Link>
            </Button>
          }
        />
      )}

      {!loading && !loadError && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => {
            const answered = session.answeredCount ?? 0
            const total = session.totalQuestions ?? 0
            return (
              <div key={session._id} className="flex items-start justify-between gap-4 rounded-sm border border-border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {session.interview ? (
                      <Link to={`/interviews/${session.interview._id}`} className="font-medium hover:underline">
                        {session.interview.title}
                      </Link>
                    ) : (
                      <span className="font-medium">Interview removed</span>
                    )}
                    <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
                      {PRACTICE_STATUS_LABEL[session.status] || session.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {session.job && (
                      <span>
                        {session.job.title}
                        {session.job.company ? ` — ${session.job.company}` : ''}
                      </span>
                    )}
                    <span>
                      {answered}/{total} answered
                    </span>
                    {session.completedAt && <span>{formatDisplayDate(session.completedAt)}</span>}
                  </div>
                </div>
                {session.summary && session.summary.overallScore != null && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono tabular-nums text-lg">{session.summary.overallScore}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Overall</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && !loadError && pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onChange={setPage}
        />
      )}
    </section>
  )
}