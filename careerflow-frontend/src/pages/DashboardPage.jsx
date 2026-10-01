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
import { getDashboardOverviewApi } from '../api/dashboard.api.js'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { cn } from '../utils/index.js'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ScoreGauge from '../components/ScoreGauge.jsx'
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
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-sm bg-muted" />
        <div className="h-8 w-72 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl border border-border bg-card shadow-sm" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-border bg-card shadow-sm" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card shadow-sm" />
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card shadow-sm" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [overview, setOverview] = useState({ jobs: null, applications: null, interviews: null, offers: null })
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
        const res = await getDashboardOverviewApi()
        if (cancelled) return

        const { overview: ov, pipeline, nextInterview: nextInt, practice } = res.data
        const next = pipeline?.byStatus || { applied: 0, screening: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 }

        setDashboard(practice || null)
        setOverview({
          jobs: ov?.jobs ?? null,
          applications: ov?.applications ?? null,
          interviews: ov?.interviews ?? null,
          offers: ov?.offers ?? null,
        })
        setCounts(next)
        setNextInterview(nextInt || null)
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
    )
  }

  const { totals, averages, recentSessions, trend, strongAreas, weakAreas } = dashboard
  const hasSessions = totals.totalSessions > 0

  const activeStages = APPLICATION_PROGRESS.filter((stage) => counts[stage] > 0)
  const currentKey = activeStages.length ? activeStages[activeStages.length - 1] : null
  const hasApplications = Object.values(counts).some((count) => count > 0)
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
    <div className="space-y-6">
      <PageHeader
        title="Career Command Center"
        subtitle={`Your pipeline at a glance${user?.email ? ` — signed in as ${user.email}` : ''}.`}
        actions={
          <>
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
          </>
        }
      />

      <section aria-label="Career summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.key} className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                <p
                  className={cn(
                    'mt-2 truncate font-mono text-3xl leading-none tabular-nums',
                    metric.accent && metric.value > 0 && 'text-success'
                  )}
                >
                  {metric.value ?? '—'}
                </p>
              </div>
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  metric.accent && metric.value > 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                )}
              >
                <metric.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Application pipeline</CardTitle>
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
            <EmptyState
              embedded
              icon={<Send className="h-6 w-6" />}
              title="No applications yet"
              description="Apply to a job to start building your pipeline."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="/jobs">Browse jobs</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming interview</CardTitle>
          </CardHeader>
          <CardContent>
            {nextInterview ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">Scheduled</Badge>
                  <span className="flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
                    <TypeIcon className="h-4 w-4" />
                    {nextInterview.type}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {nextInterview.application?.job?.company || 'Interview'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug text-foreground">{nextInterview.title}</h3>
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
                <div className="flex flex-wrap gap-2 pt-1">
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
              <EmptyState
                embedded
                icon={<CalendarClock className="h-6 w-6" />}
                title="No upcoming interview"
                description="Schedule interviews for your applications and they will appear here."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/interviews">Go to interviews</Link>
                  </Button>
                }
              />
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
              <div className="space-y-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {averages.overallScore != null ? (
                    <ScoreGauge score={averages.overallScore} size={96} caption="Overall" />
                  ) : (
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-border">
                      <span className="font-mono text-2xl leading-none tabular-nums text-muted-foreground">—</span>
                      <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Overall</span>
                    </div>
                  )}
                  <dl className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">Sessions</dt>
                      <dd className="font-mono tabular-nums">{totals.totalSessions}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">Completed</dt>
                      <dd className="font-mono tabular-nums">{totals.completedSessions}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <dt className="text-muted-foreground">Answered</dt>
                      <dd className="font-mono tabular-nums">
                        {totals.answeredQuestions}/{totals.totalQuestions}
                      </dd>
                    </div>
                  </dl>
                </div>
                {trend.length >= 2 && (
                  <div className="border-t border-border pt-4">
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
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                  <Link to="/analytics">
                    <BarChart3 />
                    View analytics
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                embedded
                icon={<Target className="h-6 w-6" />}
                title="No practice sessions yet"
                description="Generate questions for an interview and practice to start building your analytics."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/interviews">Go to interviews</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {hasSessions && (
        <div className="grid gap-6 lg:grid-cols-3">
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
                        <span className="font-mono text-sm tabular-nums font-medium">{session.overallScore}</span>
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
        </div>
      )}
    </div>
  )
}