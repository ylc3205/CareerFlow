import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // Reset per-application transient state whenever the route id changes.
  // Without this, stale editing / interview modal / error state from a previously
  // viewed application can leak into the newly navigated application.
  useEffect(() => {
    setApplication(null)
    setLoadError(null)
    setLoading(true)
    setEditing(false)
    setSaving(false)
    setFormError(null)
    setAddingInterview(false)
    setSavingInterview(false)
    setInterviewFormError(null)
    setInterviews([])
    setInterviewsLoading(false)
    setInterviewsError(null)
    setDeleting(false)
    setDeleteError(null)
    setConfirmDeleteOpen(false)
  }, [id])

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

  const handleDelete = () => {
    setConfirmDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setConfirmDeleteOpen(false)
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  {job && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Job</dt>
                      <dd className="mt-0.5 text-sm text-foreground">
                        <Link to={`/jobs/${job._id}`} className="text-primary hover:underline">
                          {job.title}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {job?.company && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</dt>
                      <dd className="mt-0.5 text-sm text-foreground">{job.company}</dd>
                    </div>
                  )}
                  {job?.location && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</dt>
                      <dd className="mt-0.5 text-sm text-foreground">{job.location}</dd>
                    </div>
                  )}
                  {job?.sourceUrl && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source URL</dt>
                      <dd className="mt-0.5 break-all text-sm text-foreground">
                        <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {job.sourceUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                {application.coverLetter && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Cover letter:</strong> {application.coverLetter}
                  </p>
                )}
                {application.notes && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Notes:</strong> {application.notes}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1.5">
                  <CardTitle>{addingInterview ? 'Schedule Interview' : 'Interviews'}</CardTitle>
                </div>
                {!addingInterview ? (
                  <Button variant="ghost" size="sm" onClick={() => setAddingInterview(true)}>
                    Add interview
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={cancelInline}>
                    Cancel
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {addingInterview ? (
                  <div className="pt-2">
                    <InterviewForm
                      key="new-interview"
                      applicationId={application._id}
                      initialValues={emptyInterviewForm()}
                      submitLabel="Add interview"
                      onSubmit={handleInterviewSubmit}
                      submitting={savingInterview}
                      apiError={interviewFormError}
                    />
                  </div>
                ) : (
                  <>
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
                      <EmptyState embedded title="No interviews yet" description="Add an interview to track it here." />
                    )}
                    {!interviewsLoading && !interviewsError && interviews.length > 0 && (
                      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/80 bg-card">
                        {interviews.map((interview) => (
                          <li
                            key={interview._id}
                            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-secondary/30"
                          >
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/interviews/${interview._id}`}
                                className="font-semibold text-foreground transition-colors hover:text-primary"
                              >
                                {interview.title}
                              </Link>
                              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20">
            <Card>
              <CardHeader>
                <CardTitle>Status Progression</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current stage</span>
                  <Badge variant={APPLICATION_STATUS_VARIANT[application.status] || 'default'}>
                    {application.status}
                  </Badge>
                </div>
                <ApplicationStatusTimeline status={application.status} />

                {application.appliedAt && (
                  <dl className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Applied</dt>
                      <dd className="text-sm font-medium text-foreground">
                        {formatDisplayDate(application.appliedAt)}
                      </dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete this application?"
        description="This will delete the application and all associated interview schedules and practice sessions. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
      />
    </div>
  )
}