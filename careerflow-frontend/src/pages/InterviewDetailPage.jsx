import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
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

      <div className="space-y-6">
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
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={INTERVIEW_TYPE_VARIANT[interview.type] || 'default'}>
                    {interview.type}
                  </Badge>
                  <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'}>
                    {interview.status}
                  </Badge>
                </div>

                {metaItems.length > 0 && (
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metaItems.map((item) => (
                      <div key={item.label} className="space-y-1">
                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="text-sm text-foreground break-all">
                          {item.url ? (
                            <a href={item.value} target="_blank" rel="noreferrer" className="hover:underline">
                              {item.value}
                            </a>
                          ) : item.applicationUrl ? (
                            <Link to={item.applicationUrl} className="hover:underline">
                              {item.value}
                            </Link>
                          ) : (
                            item.value
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {interview.notes && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> {interview.notes}
                  </p>
                )}
                {interview.feedback && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Feedback:</strong> {interview.feedback}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-0">
                <PreparationSection interviewId={interview._id} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-0">
                <PracticeSection interviewId={interview._id} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}