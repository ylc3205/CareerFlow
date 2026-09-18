import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  MapPin,
  Users,
  Video,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import InterviewForm from '../components/interviews/InterviewForm.jsx'
import PreparationSection from '../components/interviews/PreparationSection.jsx'
import PracticeSection from '../components/interviews/PracticeSection.jsx'
import { hydrateInterviewForm } from '../utils/interviewForm.js'
import { getInterviewApi, updateInterviewApi, deleteInterviewApi } from '../api/interviews.api.js'
import { INTERVIEW_TYPE_VARIANT, INTERVIEW_STATUS_VARIANT } from '../utils/constants.js'
import { formatDisplayDate } from '../utils/format.js'

const TYPE_ICON = {
  phone: { icon: Users, label: 'Phone' },
  video: { icon: Video, label: 'Video' },
  onsite: { icon: Building2, label: 'Onsite' },
  'take-home': { icon: FileText, label: 'Take-home' },
  other: { icon: CalendarDays, label: 'Other' },
}

export default function InterviewDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Reset per-interview transient state whenever the route id changes.
  // Without this, stale editing / error state from a previously viewed
  // interview can leak into the newly navigated interview.
  useEffect(() => {
    setInterview(null)
    setLoadError(null)
    setLoading(true)
    setEditing(false)
    setSaving(false)
    setFormError(null)
    setDeleting(false)
    setDeleteError(null)
  }, [id])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await getInterviewApi(id)
        if (cancelled) return
        setInterview(res.data.interview)
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
  }, [id, reloadKey])

  const handleSubmit = async (payload) => {
    setSaving(true)
    setFormError(null)
    try {
      await updateInterviewApi(id, payload)
      setEditing(false)
      setReloadKey((key) => key + 1)
    } catch (err) {
      setFormError({ message: err.message, errors: err.errors })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this interview? This cannot be undone.')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteInterviewApi(id)
      navigate('/interviews', { replace: true })
    } catch (err) {
      setDeleteError({ message: err.message })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Loading label="Loading interview..." />
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Interview" subtitle="Could not load this interview." />
        <div className="flex gap-3">
          <ErrorMessage title="Could not load interview" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!interview) {
    return <ErrorMessage title="Interview not found" message="This interview may have been deleted." />
  }

  const application = interview.application
  const job = application?.job
  const company = job?.company

  const facts = [
    interview.scheduledDate ? { label: 'Scheduled', value: formatDisplayDate(interview.scheduledDate), icon: CalendarDays } : null,
    interview.interviewerNames ? { label: 'Interviewers', value: interview.interviewerNames, icon: Users } : null,
    interview.location ? { label: 'Location', value: interview.location, icon: MapPin } : null,
  ].filter(Boolean)

  const typeMeta = TYPE_ICON[interview.type] || { icon: CalendarDays, label: interview.type || 'Interview' }

  return (
    <div className="space-y-6">
      <PageHeader
        title={interview.title}
        subtitle={company}
        actions={
          <>
            {editing ? (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      />

      {deleteError && <ErrorMessage title="Could not delete interview" message={deleteError.message} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {editing ? (
            <Card>
              <CardContent className="p-5">
                <InterviewForm
                  key="edit"
                  initialValues={hydrateInterviewForm(interview)}
                  submitLabel="Save changes"
                  onSubmit={handleSubmit}
                  submitting={saving}
                  apiError={formError}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>Interview context and key details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'}>
                      {interview.status}
                    </Badge>
                    <Badge variant={INTERVIEW_TYPE_VARIANT[interview.type] || 'default'}>
                      {typeMeta.label}
                    </Badge>
                  </div>

                  {facts.length > 0 && (
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {facts.map((item) => (
                        <div key={item.label} className="flex items-start gap-3">
                          <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <div className="min-w-0">
                            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              {item.label}
                            </dt>
                            <dd className="mt-0.5 break-all text-sm text-foreground">{item.value}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  )}

                  {interview.notes && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Notes:</strong> {interview.notes}
                    </p>
                  )}
                  {interview.feedback && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Feedback:</strong> {interview.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <PreparationSection interviewId={interview._id} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <PracticeSection interviewId={interview._id} />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Job and meeting information.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {application && job && (
                  <>
                    {company && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</dt>
                        <dd className="mt-1 flex items-center gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <span className="text-lg font-semibold leading-tight text-foreground">{company}</span>
                        </dd>
                      </div>
                    )}
                    {job.title && (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Job title</dt>
                        <dd className="mt-0.5 flex items-center gap-2 text-sm text-foreground">
                          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {job.title}
                        </dd>
                      </div>
                    )}
                  </>
                )}

                {application && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Application</dt>
                    <dd className="mt-0.5 text-sm">
                      <Link to={`/applications/${application._id}`} className="text-primary hover:underline">
                        {job ? 'View application' : 'Linked job removed'}
                      </Link>
                    </dd>
                  </div>
                )}

                {interview.meetingLink && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Meeting link</dt>
                    <dd className="mt-0.5 flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
                        {interview.meetingLink}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}