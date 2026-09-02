import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
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
      <div className="space-y-6">
        <PageHeader title="Analytics" subtitle="Track your interview practice performance." />
        <div className="flex gap-3">
          <ErrorMessage title="Could not load analytics" message={loadError?.message || 'No data returned.'} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { totals, averages, bestSession, recentSessions, trend, strongAreas, weakAreas } = dashboard

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Track your interview practice performance." />

      {/* LEVEL 1: KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Practice sessions" value={totals.totalSessions} />
        <StatCard label="Completed" value={totals.completedSessions} />
        <StatCard label="In progress" value={totals.inProgressSessions} />
        <StatCard
          label="Questions answered"
          value={`${totals.answeredQuestions}/${totals.totalQuestions}`}
          hint="across all sessions"
        />
      </div>

      {/* LEVEL 2: Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Average scores</CardTitle>
            <CardDescription>Averages across completed session summaries.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreBreakdown
              overall={averages.overallScore ?? null}
              scores={[
                { label: 'Technical', value: averages.technicalScore ?? null },
                { label: 'Communication', value: averages.communicationScore ?? null },
                { label: 'Behavioral', value: averages.behavioralScore ?? null },
              ]}
              emptyText="Complete a practice session to see your average scores."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best session</CardTitle>
          </CardHeader>
          <CardContent>
            {bestSession ? (
              <div className="flex items-center gap-6 flex-wrap">
                <ScoreGauge score={bestSession.overallScore} size={104} caption="Best" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium truncate">{bestSession.interview?.title || 'Interview'}</p>
                  {bestSession.job && (
                    <p className="text-sm text-muted-foreground truncate">
                      {bestSession.job.title}
                      {bestSession.job.company ? ` — ${bestSession.job.company}` : ''}
                    </p>
                  )}
                  {bestSession.completedAt && (
                    <p className="text-xs text-muted-foreground">{formatDisplayDate(bestSession.completedAt)}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/interviews">Start practicing</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LEVEL 3-4: Recent Sessions + Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <ul className="space-y-3">
                {recentSessions.map((session) => (
                  <li key={session.sessionId} className="flex items-center justify-between gap-4 rounded-sm border border-border bg-card p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{session.interview?.title || 'Interview'}</p>
                      <p className="mt-1 text-sm text-muted-foreground truncate">
                        {session.job?.company || session.job?.title || ''}
                        {session.completedAt ? ` · ${formatDisplayDate(session.completedAt)}` : ''}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-lg shrink-0">{session.overallScore}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/interviews">Start practicing</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPerformance performance={performance} />
          </CardContent>
        </Card>
      </div>

      {/* LEVEL 4-5: Score Trend + Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Score trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart trend={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <AreaList title="Strong areas" tone="strong" areas={strongAreas} emptyText="No strengths recorded yet." />
            <AreaList title="Areas to improve" tone="weak" areas={weakAreas} emptyText="No weaknesses recorded yet." />
          </CardContent>
        </Card>
      </div>

      {/* LEVEL 5: Practice History */}
      <Card>
        <CardContent className="pt-0">
          <HistorySection />
        </CardContent>
      </Card>

      {/* Primary CTA */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Button asChild>
          <Link to="/interviews">Start practicing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </div>
    </div>
  )
}