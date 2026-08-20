import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Badge from '../components/Badge.jsx'
import Card from '../components/Card.jsx'
import InterviewForm from '../components/interviews/InterviewForm.jsx'
import PreparationSection from '../components/interviews/PreparationSection.jsx'
import PracticeSection from '../components/interviews/PracticeSection.jsx'
import { hydrateInterviewForm } from '../utils/interviewForm.js'
import { getInterviewApi, updateInterviewApi, deleteInterviewApi } from '../api/interviews.api.js'
import { INTERVIEW_TYPE_VARIANT, INTERVIEW_STATUS_VARIANT } from '../utils/constants.js'
import { formatDisplayDate } from '../utils/format.js'

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
      <div className="page">
        <PageHeader title="Interview" subtitle="Could not load this interview." />
        <div className="page__error">
          <ErrorMessage title="Could not load interview" message={loadError.message} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
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

  const metaItems = [
    interview.type ? { label: 'Type', value: interview.type } : null,
    interview.status ? { label: 'Status', value: interview.status } : null,
    interview.scheduledDate ? { label: 'Scheduled', value: formatDisplayDate(interview.scheduledDate) } : null,
    interview.interviewerNames ? { label: 'Interviewers', value: interview.interviewerNames } : null,
    interview.location ? { label: 'Location', value: interview.location } : null,
    interview.meetingLink ? { label: 'Meeting link', value: interview.meetingLink, url: true } : null,
    application
      ? {
          label: 'Application',
          value: job ? `${job.title}${job.company ? ` — ${job.company}` : ''}` : 'Linked job removed',
          applicationUrl: `/applications/${application._id}`,
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="page">
      <PageHeader
        title={interview.title}
        subtitle={company}
        actions={
          <>
            {editing ? (
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      />

      {deleteError && <ErrorMessage title="Could not delete interview" message={deleteError.message} />}

      <div className="interview-detail">
        {editing ? (
          <InterviewForm
            key="edit"
            initialValues={hydrateInterviewForm(interview)}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
            submitting={saving}
            apiError={formError}
          />
        ) : (
          <>
            <Card>
              <h2 className="job-detail__section-title">Overview</h2>
              <div className="job-detail__status">
                <Badge variant={INTERVIEW_TYPE_VARIANT[interview.type] || 'default'}>{interview.type}</Badge>
                <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'}>{interview.status}</Badge>
              </div>

              {metaItems.length > 0 && (
                <dl className="job-detail__grid">
                  {metaItems.map((item) => (
                    <div key={item.label} className="job-detail__cell">
                      <dt className="job-detail__term">{item.label}</dt>
                      <dd className="job-detail__value">
                        {item.url ? (
                          <a href={item.value} target="_blank" rel="noreferrer">
                            {item.value}
                          </a>
                        ) : item.applicationUrl ? (
                          <Link to={item.applicationUrl}>{item.value}</Link>
                        ) : (
                          item.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {interview.notes && (
                <p className="job-detail__notes">
                  <strong>Notes:</strong> {interview.notes}
                </p>
              )}
              {interview.feedback && (
                <p className="job-detail__notes">
                  <strong>Feedback:</strong> {interview.feedback}
                </p>
              )}
            </Card>

            <Card>
              <PreparationSection interviewId={interview._id} />
            </Card>

            <Card>
              <PracticeSection interviewId={interview._id} />
            </Card>
          </>
        )}
      </div>
    </div>
  )
}