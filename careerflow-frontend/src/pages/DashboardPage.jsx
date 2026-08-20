import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import StatCard from '../components/analytics/StatCard.jsx'
import ScoreBreakdown from '../components/analytics/ScoreBreakdown.jsx'
import AreaList from '../components/analytics/AreaList.jsx'
import TrendChart from '../components/analytics/TrendChart.jsx'
import { getAnalyticsDashboardApi } from '../api/analytics.api.js'
import { listJobsApi } from '../api/jobs.api.js'
import { listApplicationsApi } from '../api/applications.api.js'
import { listInterviewsApi } from '../api/interviews.api.js'
import { formatDisplayDate } from '../utils/format.js'

export default function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [overview, setOverview] = useState({ jobs: null, applications: null, interviews: null })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [dashRes, jobsRes, appsRes, intsRes] = await Promise.allSettled([
          getAnalyticsDashboardApi(),
          listJobsApi({ page: 1, limit: 1 }),
          listApplicationsApi({ page: 1, limit: 1 }),
          listInterviewsApi({ page: 1, limit: 1 }),
        ])
        if (cancelled) return
        setDashboard(dashRes.status === 'fulfilled' ? dashRes.value.data.dashboard : null)
        setOverview({
          jobs: jobsRes.status === 'fulfilled' ? jobsRes.value.data.pagination.total : null,
          applications: appsRes.status === 'fulfilled' ? appsRes.value.data.pagination.total : null,
          interviews: intsRes.status === 'fulfilled' ? intsRes.value.data.pagination.total : null,
        })
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
  }, [reloadKey])

  if (loading) {
    return <Loading label="Loading your dashboard…" />
  }

  if (loadError || !dashboard) {
    return (
      <div className="page">
        <header className="page__header">
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtitle">Welcome back{user?.email ? `, ${user.email}` : ''}.</p>
        </header>
        <div className="page__error">
          <ErrorMessage title="Could not load your dashboard" message={loadError?.message || 'No data returned.'} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { totals, averages, bestSession, recentSessions, trend, strongAreas, weakAreas } = dashboard
  const hasSessions = totals.totalSessions > 0

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Dashboard</h1>
        <p className="page__subtitle">Welcome back{user?.email ? `, ${user.email}` : ''}. Here is your interview practice overview.</p>
      </header>

      <div className="dashboard__actions">
        <Link to="/jobs" className="btn btn--primary">
          Browse jobs
        </Link>
        <Link to="/analytics" className="btn btn--ghost">
          View full analytics
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Practice sessions" value={totals.totalSessions} />
        <StatCard label="Completed" value={totals.completedSessions} />
        <StatCard label="In progress" value={totals.inProgressSessions} />
        <StatCard
          label="Questions answered"
          value={`${totals.answeredQuestions}/${totals.totalQuestions}`}
          hint="across all sessions"
        />
      </div>

      <div className="dashboard__overview">
        <h2 className="job-detail__section-title">Careers overview</h2>
        <div className="stat-grid">
          <StatCard label="Jobs saved" value={overview.jobs ?? '—'} />
          <StatCard label="Applications" value={overview.applications ?? '—'} />
          <StatCard label="Interviews" value={overview.interviews ?? '—'} />
        </div>
      </div>

      {!hasSessions && (
        <EmptyState
          title="Get started with interview practice"
          description="Generate interview questions from an interview, then practice answering them to build your analytics."
          action={
            <Link to="/interviews" className="btn btn--primary">
              Go to interviews
            </Link>
          }
        />
      )}

      {hasSessions && (
        <div className="analytics-grid">
          <Card>
            <h2 className="job-detail__section-title">Average scores</h2>
            <p className="analytics__subtitle">Across completed session summaries.</p>
            <ScoreBreakdown
              overall={averages.overallScore ?? null}
              scores={[
                { label: 'Technical', value: averages.technicalScore ?? null },
                { label: 'Communication', value: averages.communicationScore ?? null },
                { label: 'Behavioral', value: averages.behavioralScore ?? null },
              ]}
              emptyText="Complete a practice session to see your average scores."
            />
          </Card>

          <Card>
            <h2 className="job-detail__section-title">Best session</h2>
            {bestSession ? (
              <div className="best-session">
                <div className="best-session__info">
                  <div className="best-session__title">{bestSession.interview?.title || 'Interview'}</div>
                  {bestSession.job && (
                    <div className="best-session__sub">
                      {bestSession.job.title}
                      {bestSession.job.company ? ` — ${bestSession.job.company}` : ''}
                    </div>
                  )}
                  {bestSession.completedAt && (
                    <div className="best-session__date">{formatDisplayDate(bestSession.completedAt)}</div>
                  )}
                  <div className="best-session__score">{bestSession.overallScore} / 100</div>
                </div>
              </div>
            ) : (
              <p className="job-detail__empty">No completed sessions yet.</p>
            )}
          </Card>
        </div>
      )}

      {hasSessions && (
        <>
        <div className="analytics-grid">
          <Card>
            <h2 className="job-detail__section-title">Recent sessions</h2>
            {recentSessions.length > 0 ? (
              <ul className="recent-list">
                {recentSessions.map((session) => (
                  <li key={session.sessionId} className="recent-list__item">
                    <div className="recent-list__main">
                      <div className="recent-list__title">{session.interview?.title || 'Interview'}</div>
                      <div className="recent-list__meta">
                        {session.job?.company || session.job?.title || ''}
                        {session.completedAt ? ` · ${formatDisplayDate(session.completedAt)}` : ''}
                      </div>
                    </div>
                    <span className="recent-list__score">{session.overallScore}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="job-detail__empty">No completed sessions yet.</p>
            )}
          </Card>

          <Card>
            <h2 className="job-detail__section-title">Areas</h2>
            <div className="areas">
              <AreaList title="Strong areas" tone="strong" areas={strongAreas} emptyText="No strengths recorded yet." />
              <AreaList title="Areas to improve" tone="weak" areas={weakAreas} emptyText="No weaknesses recorded yet." />
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="job-detail__section-title">Score trend</h2>
          <TrendChart trend={trend} />
        </Card>
      </>
      )}
    </div>
  )
}