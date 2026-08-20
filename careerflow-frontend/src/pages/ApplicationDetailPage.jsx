import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Badge from '../components/Badge.jsx'
import Card from '../components/Card.jsx'
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
      <div className="page">
        <PageHeader title="Application" subtitle="Could not load this application." />
        <div className="page__error">
          <ErrorMessage title="Could not load application" message={loadError.message} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
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
    <div className="page">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {!editing && !addingInterview && (
              <>
                <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
                  Edit
                </button>
                <button type="button" className="btn btn--primary" onClick={() => setAddingInterview(true)}>
                  Add interview
                </button>
              </>
            )}
            {(editing || addingInterview) && (
              <button type="button" className="btn btn--ghost" onClick={cancelInline}>
                Cancel
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      />

      {deleteError && <ErrorMessage title="Could not delete application" message={deleteError.message} />}

      <div className="app-detail">
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
              <h2 className="job-detail__section-title">Overview</h2>
              <div className="job-detail__status">
                <Badge variant={APPLICATION_STATUS_VARIANT[application.status] || 'default'}>{application.status}</Badge>
              </div>
              <ApplicationStatusTimeline status={application.status} />

              <dl className="job-detail__grid">
                {application.appliedAt && (
                  <div className="job-detail__cell">
                    <dt className="job-detail__term">Applied</dt>
                    <dd className="job-detail__value">{formatDisplayDate(application.appliedAt)}</dd>
                  </div>
                )}
                {job && (
                  <div className="job-detail__cell">
                    <dt className="job-detail__term">Job</dt>
                    <dd className="job-detail__value">
                      <Link to={`/jobs/${job._id}`}>{job.title}</Link>
                    </dd>
                  </div>
                )}
                {job?.company && (
                  <div className="job-detail__cell">
                    <dt className="job-detail__term">Company</dt>
                    <dd className="job-detail__value">{job.company}</dd>
                  </div>
                )}
                {job?.location && (
                  <div className="job-detail__cell">
                    <dt className="job-detail__term">Location</dt>
                    <dd className="job-detail__value">{job.location}</dd>
                  </div>
                )}
                {job?.sourceUrl && (
                  <div className="job-detail__cell">
                    <dt className="job-detail__term">Source URL</dt>
                    <dd className="job-detail__value">
                      <a href={job.sourceUrl} target="_blank" rel="noreferrer">
                        {job.sourceUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {application.coverLetter && (
                <p className="job-detail__notes">
                  <strong>Cover letter:</strong> {application.coverLetter}
                </p>
              )}
              {application.notes && (
                <p className="job-detail__notes">
                  <strong>Notes:</strong> {application.notes}
                </p>
              )}
            </Card>

            <Card>
              <div className="card__header">
                <h2 className="job-detail__section-title">Interviews</h2>
                {!addingInterview && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddingInterview(true)}>
                    Add interview
                  </button>
                )}
              </div>
              {interviewsLoading && <Loading label="Loading interviews…" />}
              {!interviewsLoading && interviewsError && (
                <div className="page__error">
                  <ErrorMessage title="Could not load interviews" message={interviewsError.message} />
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setInterviewsReloadKey((key) => key + 1)}
                  >
                    Retry
                  </button>
                </div>
              )}
              {!interviewsLoading && !interviewsError && interviews.length === 0 && (
                <EmptyState title="No interviews yet" description="Add an interview to track it here." />
              )}
              {!interviewsLoading && !interviewsError && interviews.length > 0 && (
                <ul className="interview-list">
                  {interviews.map((interview) => (
                    <li key={interview._id} className="interview-list__item">
                      <div className="interview-list__main">
                        <Link to={`/interviews/${interview._id}`} className="interview-list__title">
                          {interview.title}
                        </Link>
                        <div className="interview-list__meta">
                          <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'}>{interview.status}</Badge>
                          {interview.scheduledDate && <span>{formatDisplayDate(interview.scheduledDate)}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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