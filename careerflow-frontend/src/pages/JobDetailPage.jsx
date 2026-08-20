import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Badge from '../components/Badge.jsx'
import Card from '../components/Card.jsx'
import JobFitAnalysis from '../components/jobs/JobFitAnalysis.jsx'
import ApplyAction from '../components/jobs/ApplyAction.jsx'
import { getJobApi, deleteJobApi, matchJobApi } from '../api/jobs.api.js'
import { listAnalysesApi } from '../api/aiAnalysis.api.js'
import { createApplicationApi, listApplicationsApi } from '../api/applications.api.js'
import { formatDisplayDate } from '../utils/format.js'

const formatSalary = (salary) => {
  if (!salary) return null
  const { min, max, currency = 'USD', period } = salary
  if (min == null && max == null) return null
  const range = min != null && max != null ? `${min}–${max}` : min != null ? `from ${min}` : `up to ${max}`
  const suffix = period ? ` / ${period}` : ''
  return `${currency} ${range}${suffix}`
}

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [match, setMatch] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [matchError, setMatchError] = useState(null)

  const [applicationId, setApplicationId] = useState(null)
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState(null)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getJobApi(id)
        if (cancelled) return
        setJob(res.data.job)
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

  // Best-effort: surface an existing cached match for THIS job only. Never triggers AI.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await listAnalysesApi()
        if (cancelled) return
        const found = res.data.analyses.find((analysis) => analysis.job && String(analysis.job._id) === String(id))
        if (found) setMatch(found)
      } catch {
        // Ignore: no existing analysis -> the user can trigger Analyze Fit explicitly.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  // Best-effort: if the user already applied to this job, show the Applied state
  // on load instead of waiting for a duplicate-application 409.
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      try {
        const res = await listApplicationsApi({ limit: 100 })
        if (cancelled) return
        const found = res.data.applications.find((app) => app.job && String(app.job._id) === String(id))
        if (found) {
          setApplicationId(found._id)
          setApplied(true)
        }
      } catch {
        // Best-effort only; the Apply flow still handles 409 duplicates.
      }
    }
    resolve()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setMatchError(null)
    try {
      const res = await matchJobApi(id)
      setMatch(res.data.match)
    } catch (err) {
      setMatchError({
        message: err.message,
        errors: err.errors,
        missingProfileResume: err.status === 400 && /profile or resume/i.test(err.message),
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const resolveExistingApplication = async () => {
    try {
      const res = await listApplicationsApi({ limit: 100 })
      const found = res.data.applications.find((app) => app.job && String(app.job._id) === String(id))
      return found ? found._id : null
    } catch {
      return null
    }
  }

  const handleApply = async () => {
    setApplying(true)
    setApplyError(null)
    try {
      const res = await createApplicationApi({ job: id })
      setApplicationId(res.data.application._id)
      setApplied(true)
    } catch (err) {
      if (err.status === 409) {
        // Already applied: try to resolve the existing application id for the View link.
        const existingId = await resolveExistingApplication()
        if (existingId) setApplicationId(existingId)
        setApplied(true)
      } else {
        setApplyError({ message: err.message, errors: err.errors })
      }
    } finally {
      setApplying(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this job? This cannot be undone.')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteJobApi(id)
      navigate('/jobs', { replace: true })
    } catch (err) {
      setDeleteError({ message: err.message })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Loading label="Loading job..." />
  }

  if (loadError) {
    return (
      <div className="page">
        <PageHeader title="Job" subtitle="Could not load this job." />
        <div className="page__error">
          <ErrorMessage title="Could not load job" message={loadError.message} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!job) {
    return <ErrorMessage title="Job not found" message="This job may have been deleted." />
  }

  const salaryText = formatSalary(job.salary)
  const metaItems = [
    job.company ? { label: 'Company', value: job.company } : null,
    job.location ? { label: 'Location', value: job.location } : null,
    job.employmentType ? { label: 'Employment type', value: job.employmentType } : null,
    job.workplaceType ? { label: 'Workplace type', value: job.workplaceType } : null,
    job.postedAt ? { label: 'Posted', value: formatDisplayDate(job.postedAt) } : null,
    job.deadline ? { label: 'Deadline', value: formatDisplayDate(job.deadline) } : null,
    salaryText ? { label: 'Salary', value: salaryText } : null,
    job.source ? { label: 'Source', value: job.source } : null,
    job.sourceUrl
      ? {
          label: 'Source URL',
          value: job.sourceUrl,
          url: true,
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="page">
      <PageHeader
        title={job.title}
        subtitle={job.company}
        actions={
          <>
            <ApplyAction applicationId={applicationId} applied={applied} applying={applying} onApply={handleApply} />
            <Link to={`/jobs/${id}/edit`} className="btn btn--ghost">
              Edit
            </Link>
            <button type="button" className="btn btn--ghost btn--danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      />

      {applyError && <ErrorMessage title="Could not apply to this job" message={applyError.message} errors={applyError.errors} />}
      {deleteError && <ErrorMessage title="Could not delete job" message={deleteError.message} />}

      <div className="job-detail">
        <Card>
          <h2 className="job-detail__section-title">Overview</h2>
          <div className="job-detail__status">
            <Badge variant={job.status === 'applied' || job.status === 'interviewing' || job.status === 'offered' ? 'primary' : 'default'}>
              {job.status}
            </Badge>
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
                    ) : (
                      item.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {job.notes && (
            <p className="job-detail__notes">
              <strong>Notes:</strong> {job.notes}
            </p>
          )}
        </Card>

        {job.description && (
          <Card>
            <h2 className="job-detail__section-title">Description</h2>
            <p className="job-detail__text">{job.description}</p>
          </Card>
        )}

        {job.requirements && (
          <Card>
            <h2 className="job-detail__section-title">Requirements</h2>
            <p className="job-detail__text">{job.requirements}</p>
          </Card>
        )}

        {job.responsibilities && (
          <Card>
            <h2 className="job-detail__section-title">Responsibilities</h2>
            <p className="job-detail__text">{job.responsibilities}</p>
          </Card>
        )}

        {job.skills && job.skills.length > 0 && (
          <Card>
            <h2 className="job-detail__section-title">Skills</h2>
            <div className="job-detail__skills">
              {job.skills.map((skill) => (
                <span key={skill} className="chip chip--default">
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <JobFitAnalysis analysis={match} analyzing={analyzing} error={matchError} onAnalyze={handleAnalyze} />
        </Card>
      </div>
    </div>
  )
}
