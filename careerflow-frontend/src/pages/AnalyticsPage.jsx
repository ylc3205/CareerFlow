import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Card from '../components/Card.jsx'
import ScoreGauge from '../components/ScoreGauge.jsx'
import StatCard from '../components/analytics/StatCard.jsx'
import ScoreBreakdown from '../components/analytics/ScoreBreakdown.jsx'
import AreaList from '../components/analytics/AreaList.jsx'
import TrendChart from '../components/analytics/TrendChart.jsx'
import CategoryPerformance from '../components/analytics/CategoryPerformance.jsx'
import HistorySection from '../components/analytics/HistorySection.jsx'
import {
  getAnalyticsDashboardApi,
  getAnalyticsPerformanceApi,
} from '../api/analytics.api.js'
import { formatDisplayDate } from '../utils/format.js'

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [dashboardRes, performanceRes] = await Promise.all([
          getAnalyticsDashboardApi(),
          getAnalyticsPerformanceApi(),
        ])
        if (cancelled) return
        setDashboard(dashboardRes.data.dashboard)
        setPerformance(performanceRes.data.performance)
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
    return <Loading label="Loading analytics…" fullscreen={false} />
  }

  if (loadError || !dashboard) {
    return (
      <div className="page">
        <PageHeader title="Analytics" subtitle="Track your interview practice performance." />
        <div className="page__error">
          <ErrorMessage title="Could not load analytics" message={loadError?.message || 'No data returned.'} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { totals, averages, bestSession, recentSessions, trend, strongAreas, weakAreas } = dashboard

  return (
    <div className="page">
      <PageHeader title="Analytics" subtitle="Track your interview practice performance." />

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

      <div className="analytics-grid">
        <Card>
          <h2 className="job-detail__section-title">Average scores</h2>
          <p className="analytics__subtitle">Averages across completed session summaries.</p>
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
              <div className="best-session__score">
                <ScoreGauge score={bestSession.overallScore} size={104} caption="Best" />
              </div>
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
              </div>
            </div>
          ) : (
            <p className="job-detail__empty">No completed sessions yet.</p>
          )}
        </Card>
      </div>

      <div className="analytics-grid">
        <Card>
          <h2 className="job-detail__section-title">Recent sessions</h2>
          {recentSessions.length > 0 ? (
            <ul className="recent-list">
              {recentSessions.map((session) => (
                <li key={session.sessionId} className="recent-list__item">
                  <div className="recent-list__main">
                    <div className="recent-list__title">
                      {session.interview?.title || 'Interview'}
                    </div>
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
          <h2 className="job-detail__section-title">Performance by category</h2>
          <CategoryPerformance performance={performance} />
        </Card>
      </div>

      <div className="analytics-grid">
        <Card>
          <h2 className="job-detail__section-title">Score trend</h2>
          <TrendChart trend={trend} />
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
        <HistorySection />
      </Card>

      <div className="analytics__quick-links">
        <Link to="/interviews" className="btn btn--ghost">
          Go to interviews
        </Link>
        <Link to="/jobs" className="btn btn--ghost">
          Browse jobs
        </Link>
      </div>
    </div>
  )
}