import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ApplicationForm from '../components/applications/ApplicationForm.jsx'
import ApplicationStatusTimeline from '../components/applications/ApplicationStatusTimeline.jsx'
import InterviewForm from '../components/interviews/InterviewForm.jsx'
import { hydrateApplicationForm } from '../utils/applicationForm.js'
import { emptyInterviewForm } from '../utils/interviewForm.js'
import { getApplicationApi, updateApplicationApi, deleteApplicationApi } from '../api/applications.api.js'
import { listInterviewsApi, createInterviewApi } from '../api/interviews.api.js'
import { APPLICATION_STATUS_VARIANT, INTERVIEW_STATUS_VARIANT } from '../utils/constants.js'
import { formatDisplayDate } from '../utils/format.js'

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [addingInterview, setAddingInterview] = useState(false)
  const [savingInterview, setSavingInterview] = useState(false)
  const [interviewFormError, setInterviewFormError] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [interviewsLoading, setInterviewsLoading] = useState(false)
  const [interviewsError, setInterviewsError] = useState(null)
  const [interviewsReloadKey, setInterviewsReloadKey] = useState(0)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await getApplicationApi(id)
        if (cancelled) return
        setApplication(res.data.application)
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

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setInterviewsLoading(true)
      setInterviewsError(null)
      try {
        const res = await listInterviewsApi({ application: id })
        if (cancelled) return
        setInterviews(res.data.interviews)
      } catch (err) {
        if (!cancelled) setInterviewsError({ message: err.message })
      } finally {
        if (!cancelled) setInterviewsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, interviewsReloadKey])

  const handleApplicationSubmit = async (payload) => {
    setSaving(true)
    setFormError(null)
    try {
      await updateApplicationApi(id, payload)
      setEditing(false)
      setReloadKey((key) => key + 1)
    } catch (err) {
      setFormError({ message: err.message, errors: err.errors })
    } finally {
      setSaving(false)
    }
  }

  const handleInterviewSubmit = async (payload) => {
    setSavingInterview(true)
    setInterviewFormError(null)
    try {
      await createInterviewApi(payload)
      setAddingInterview(false)
      setInterviewsReloadKey((key) => key + 1)
    } catch (err) {
      setInterviewFormError({ message: err.message, errors: err.errors })
    } finally {
      setSavingInterview(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this application? This cannot be undone.')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteApplicationApi(id)
      navigate('/applications', { replace: true })
    } catch (err) {
      setDeleteError({ message: err.message })
    } finally {
      setDeleting(false)
    }
  }

  const cancelInline = () => {
    setEditing(false)
    setAddingInterview(false)
  }

  if (loading) {
    return <Loading label="Loading application..." />
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Application" subtitle="Could not load this application." />
        <div className="flex gap-3">
          <ErrorMessage title="Could not load application" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!application) {
    return <ErrorMessage title="Application not found" message="This application may have been deleted." />
  }

  const job = application.job
  const title = job ? job.title : 'Application'
  const subtitle = job ? job.company : 'Linked job removed'

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {!editing && !addingInterview && (
              <>
                <Button variant="ghost" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button onClick={() => setAddingInterview(true)}>
                  Add interview
                </Button>
              </>
            )}
            {(editing || addingInterview) && (
              <Button variant="ghost" onClick={cancelInline}>
                Cancel
              </Button>
            )}
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      />

      {deleteError && <ErrorMessage title="Could not delete application" message={deleteError.message} />}

      <div className="space-y-6">
        {editing ? (
          <ApplicationForm
            key="edit"
            initialValues={hydrateApplicationForm(application)}
            submitLabel="Save changes"
            onSubmit={handleApplicationSubmit}
            submitting={saving}
            apiError={formError}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={APPLICATION_STATUS_VARIANT[application.status] || 'default'}>
                    {application.status}
                  </Badge>
                </div>
                <ApplicationStatusTimeline status={application.status} />

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {application.appliedAt && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Applied</dt>
                      <dd className="text-sm text-foreground">{formatDisplayDate(application.appliedAt)}</dd>
                    </div>
                  )}
                  {job && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Job</dt>
                      <dd className="text-sm text-foreground">
                        <Link to={`/jobs/${job._id}`} className="hover:underline">
                          {job.title}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {job?.company && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</dt>
                      <dd className="text-sm text-foreground">{job.company}</dd>
                    </div>
                  )}
                  {job?.location && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</dt>
                      <dd className="text-sm text-foreground">{job.location}</dd>
                    </div>
                  )}
                  {job?.sourceUrl && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source URL</dt>
                      <dd className="text-sm text-foreground">
                        <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          {job.sourceUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                {application.coverLetter && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Cover letter:</strong> {application.coverLetter}
                  </p>
                )}
                {application.notes && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> {application.notes}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1.5">
                  <CardTitle>Interviews</CardTitle>
                </div>
                {!addingInterview && (
                  <Button variant="ghost" size="sm" onClick={() => setAddingInterview(true)}>
                    Add interview
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {interviewsLoading && <Loading label="Loading interviews…" />}
                {!interviewsLoading && interviewsError && (
                  <div className="flex gap-3">
                    <ErrorMessage title="Could not load interviews" message={interviewsError.message} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInterviewsReloadKey((key) => key + 1)}
                    >
                      Retry
                    </Button>
                  </div>
                )}
                {!interviewsLoading && !interviewsError && interviews.length === 0 && (
                  <EmptyState title="No interviews yet" description="Add an interview to track it here." />
                )}
                {!interviewsLoading && !interviewsError && interviews.length > 0 && (
                  <ul className="space-y-3">
                    {interviews.map((interview) => (
                      <li key={interview._id} className="flex items-center justify-between gap-4 rounded-sm border border-border bg-card p-4">
                        <div className="min-w-0 flex-1">
                          <Link to={`/interviews/${interview._id}`} className="font-medium hover:underline">
                            {interview.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                            <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'}>
                              {interview.status}
                            </Badge>
                            {interview.scheduledDate && <span>{formatDisplayDate(interview.scheduledDate)}</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {addingInterview && (
          <InterviewForm
            key="new-interview"
            applicationId={application._id}
            initialValues={emptyInterviewForm()}
            submitLabel="Add interview"
            onSubmit={handleInterviewSubmit}
            submitting={savingInterview}
            apiError={interviewFormError}
          />
        )}
      </div>
    </div>
  )
}