import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  Send,
  Target,
  Video,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth.js'
import { getAnalyticsDashboardApi } from '../api/analytics.api.js'
import { listJobsApi } from '../api/jobs.api.js'
import { listApplicationsApi } from '../api/applications.api.js'
import { listInterviewsApi } from '../api/interviews.api.js'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import TheFlowLine from '../components/interviews/TheFlowLine.jsx'
import { APPLICATION_PROGRESS } from '../utils/constants.js'
import { formatDisplayDate } from '../utils/format.js'

const FLOW_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offer', label: 'Offer' },
]

const TYPE_ICON = {
  phone: Phone,
  video: Video,
  onsite: MapPin,
  'take-home': FileText,
  other: CalendarDays,
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />
        <div className="h-8 w-72 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="h-56 animate-pulse rounded-sm border border-border bg-card lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-sm border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-sm border border-border bg-card lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-sm border border-border bg-card" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [overview, setOverview] = useState({ jobs: null, applications: null, interviews: null, offers: null })
  const [applications, setApplications] = useState([])
  const [counts, setCounts] = useState({ applied: 0, screening: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 })
  const [nextInterview, setNextInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [dashRes, jobsRes, appsRes, intsRes, schedRes, offerRes] = await Promise.allSettled([
          getAnalyticsDashboardApi(),
          listJobsApi({ page: 1, limit: 1 }),
          listApplicationsApi({ page: 1, limit: 200 }),
          listInterviewsApi({ page: 1, limit: 1 }),
          listInterviewsApi({ status: 'scheduled', page: 1, limit: 50 }),
          listApplicationsApi({ status: 'offer', page: 1, limit: 1 }),
        ])
        if (cancelled) return

        const apps = appsRes.status === 'fulfilled' ? appsRes.value.data.applications : []
        const next = { applied: 0, screening: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 }
        for (const app of apps) {
          if (app.status in next) next[app.status] += 1
        }

        const scheduled = schedRes.status === 'fulfilled' ? schedRes.value.data.interviews : []
        const now = Date.now()
        const upcoming = scheduled
          .filter((interview) => interview.scheduledDate && new Date(interview.scheduledDate).getTime() >= now)
          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))

        setDashboard(dashRes.status === 'fulfilled' ? dashRes.value.data.dashboard : null)
        setOverview({
          jobs: jobsRes.status === 'fulfilled' ? jobsRes.value.data.pagination.total : null,
          applications: appsRes.status === 'fulfilled' ? appsRes.value.data.pagination.total : null,
          interviews: intsRes.status === 'fulfilled' ? intsRes.value.data.pagination.total : null,
          offers: offerRes.status === 'fulfilled' ? offerRes.value.data.pagination.total : null,
        })
        setApplications(apps)
        setCounts(next)
        setNextInterview(upcoming[0] || null)
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
    return <DashboardSkeleton />
  }

  if (loadError || !dashboard) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-8">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium">Could not load your dashboard</p>
              <p className="mt-1 text-sm text-muted-foreground">{loadError?.message || 'No data returned.'}</p>
            </div>
            <Button size="sm" onClick={() => setReloadKey((key) => key + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { totals, averages, recentSessions, trend, strongAreas, weakAreas } = dashboard
  const hasSessions = totals.totalSessions > 0

  const activeStages = APPLICATION_PROGRESS.filter((stage) => counts[stage] > 0)
  const currentKey = activeStages.length ? activeStages[activeStages.length - 1] : null
  const hasApplications = applications.length > 0
  const terminal = counts.rejected + counts.withdrawn
  const flowStages = FLOW_STAGES.map((stage) => ({
    ...stage,
    meta: counts[stage.key] > 0 ? counts[stage.key] : undefined,
  }))

  const metrics = [
    { key: 'jobs', label: 'Jobs saved', value: overview.jobs, icon: Briefcase, accent: false },
    { key: 'applications', label: 'Applications', value: overview.applications, icon: Send, accent: false },
    { key: 'interviews', label: 'Interviews', value: overview.interviews, icon: CalendarDays, accent: false },
    { key: 'offers', label: 'Offers', value: overview.offers, icon: CheckCircle2, accent: true },
  ]

  const TypeIcon = TYPE_ICON[nextInterview?.type] || CalendarDays

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Career Command Center</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your pipeline at a glance{user?.email ? ` — signed in as ${user.email}` : ''}.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild>
            <Link to="/jobs">
              <Briefcase />
              Browse jobs
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/analytics">
              <BarChart3 />
              View analytics
            </Link>
          </Button>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Career metrics</CardTitle>
            <CardDescription>Your current positions across jobs, applications, interviews, and offers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {metrics.map((metric) => (
                <div key={metric.key}>
                  <div className="flex items-center gap-2">
                    <metric.icon
                      className={metric.accent ? 'h-3.5 w-3.5 text-success' : 'h-3.5 w-3.5 text-muted-foreground'}
                    />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {metric.label}
                    </span>
                  </div>
                  <div
                    className={
                      metric.accent && metric.value > 0
                        ? 'mt-2 font-mono text-3xl leading-none tabular-nums text-success'
                        : 'mt-2 font-mono text-3xl leading-none tabular-nums'
                    }
                  >
                    {metric.value ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next interview</CardTitle>
          </CardHeader>
          <CardContent>
            {nextInterview ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {nextInterview.application?.job?.company || 'Interview'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug">{nextInterview.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Scheduled</Badge>
                  <span className="flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
                    <TypeIcon className="h-3.5 w-3.5" />
                    {nextInterview.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-medium text-foreground">{formatDisplayDate(nextInterview.scheduledDate)}</span>
                </div>
                {nextInterview.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{nextInterview.location}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm">
                    <Link to={`/interviews/${nextInterview._id}`}>View interview</Link>
                  </Button>
                  {nextInterview.meetingLink && (
                    <Button asChild size="sm" variant="outline">
                      <a href={nextInterview.meetingLink} target="_blank" rel="noopener noreferrer">
                        Join call
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-sm border border-dashed border-border p-4">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">No upcoming interview</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Schedule interviews for your applications and they will appear here.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/interviews">Go to interviews</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Career flow</CardTitle>
              <CardDescription>Where your applications stand right now.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/applications">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {hasApplications ? (
              <div className="space-y-4">
                <TheFlowLine stages={flowStages} currentKey={currentKey} ariaLabel="Application pipeline" />
                {terminal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {terminal} application{terminal > 1 ? 's' : ''} in a closed state (rejected or withdrawn).
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-sm border border-dashed border-border p-4">
                <Send className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">No applications yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Apply to a job to start building your pipeline.</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/jobs">Browse jobs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice</CardTitle>
            <CardDescription>Interview prep analytics.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSessions ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overall score</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-4xl leading-none tabular-nums">{averages.overallScore ?? '—'}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <dl className="mt-4 space-y-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-muted-foreground">Sessions</dt>
                    <dd className="font-mono tabular-nums">{totals.totalSessions}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd className="font-mono tabular-nums">{totals.completedSessions}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-muted-foreground">Answered</dt>
                    <dd className="font-mono tabular-nums">
                      {totals.answeredQuestions}/{totals.totalQuestions}
                    </dd>
                  </div>
                </dl>
                {trend.length >= 2 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Score trend</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{trend.length} sessions</span>
                    </div>
                    <div className="flex h-10 items-end gap-1" aria-hidden="true">
                      {trend.map((point, index) => (
                        <span
                          key={point.sessionId}
                          className={index === trend.length - 1 ? 'w-1.5 flex-1 rounded-t-sm bg-foreground' : 'w-1.5 flex-1 rounded-t-sm bg-success'}
                          style={{ height: `${Math.max(10, point.overallScore)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link to="/analytics">
                    <BarChart3 />
                    View analytics
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-sm border border-dashed border-border p-4">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">No practice sessions yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate questions for an interview and practice to start building your analytics.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/interviews">Go to interviews</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {hasSessions && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>Your latest completed practice sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length ? (
                <ul className="divide-y divide-border">
                  {recentSessions.map((session) => (
                    <li key={session.sessionId} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{session.interview?.title || 'Interview'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[session.job?.company, session.job?.title, session.completedAt && formatDisplayDate(session.completedAt)]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-sm tabular-nums">{session.overallScore}</span>
                        <Badge variant="success">Completed</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        {hasSessions && (
          <Card>
            <CardHeader>
              <CardTitle>Areas</CardTitle>
              <CardDescription>Your strongest and weakest interview skills.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Strong</p>
                {strongAreas.length ? (
                  <div className="flex flex-wrap gap-2">
                    {strongAreas.map((area) => (
                      <Badge key={area.area} variant="success">
                        {area.area}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No strengths recorded yet.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">To improve</p>
                {weakAreas.length ? (
                  <div className="flex flex-wrap gap-2">
                    {weakAreas.map((area) => (
                      <Badge key={area.area} variant="warning">
                        {area.area}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No weaknesses recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}