import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Loading from '../Loading.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import EmptyState from '../EmptyState.jsx'
import Pagination from '../Pagination.jsx'
import Badge from '../Badge.jsx'
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
    <section className="history">
      <div className="card__header">
        <div>
          <h2 className="job-detail__section-title">Practice history</h2>
          <p className="history__subtitle">All of your practice sessions across every interview.</p>
        </div>
        <select
          className="form__input"
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
        <div className="page__error">
          <ErrorMessage title="Could not load practice history" message={loadError.message} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && sessions.length === 0 && (
        <EmptyState
          title="No practice sessions yet"
          description="Complete a practice session from an interview page and it will show up here."
        />
      )}

      {!loading && !loadError && sessions.length > 0 && (
        <ul className="history-list">
          {sessions.map((session) => {
            const answered = session.answeredCount ?? 0
            const total = session.totalQuestions ?? 0
            return (
              <li key={session._id} className="history-list__item">
                <div className="history-list__main">
                  <div className="history-list__heading">
                    {session.interview ? (
                      <Link to={`/interviews/${session.interview._id}`} className="history-list__title">
                        {session.interview.title}
                      </Link>
                    ) : (
                      <span className="history-list__title">Interview removed</span>
                    )}
                    <Badge variant={PRACTICE_STATUS_VARIANT[session.status] || 'default'}>
                      {PRACTICE_STATUS_LABEL[session.status] || session.status}
                    </Badge>
                  </div>
                  <div className="history-list__meta">
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
                  <div className="history-list__score">
                    <span className="history-list__score-value">{session.summary.overallScore}</span>
                    <span className="history-list__score-label">Overall</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
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