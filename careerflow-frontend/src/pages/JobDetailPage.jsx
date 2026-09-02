import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import JobFitAnalysis from '../components/jobs/JobFitAnalysis.jsx'
import ApplyAction from '../components/jobs/ApplyAction.jsx'
import { getJobApi, deleteJobApi, matchJobApi } from '../api/jobs.api.js'
import { listAnalysesApi } from '../api/aiAnalysis.api.js'
import { createApplicationApi, listApplicationsApi } from '../api/applications.api.js'
import { listCareerDirectionsApi } from '../api/careerDirections.api.js'
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

  const [directions, setDirections] = useState([])

  const [match, setMatch] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [matchError, setMatchError] = useState(null)

  const [selectedCareerDirectionId, setSelectedCareerDirectionId] = useState(null)

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

  // Load career directions for the selector
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await listCareerDirectionsApi({ limit: 100 })
        if (cancelled) return
        setDirections(res.data.careerDirections)
      } catch {
        if (!cancelled) setDirections([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
      const body = selectedCareerDirectionId ? { careerDirectionId: selectedCareerDirectionId } : {}
      const res = await matchJobApi(id, body)
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
      <div className="space-y-6">
        <PageHeader title="Job" subtitle="Could not load this job." />
        <div className="flex gap-3">
          <ErrorMessage title="Could not load job" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
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

  const statusVariant = job.status === 'applied' || job.status === 'interviewing' || job.status === 'offered' ? 'primary' : 'default'

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.title}
        subtitle={job.company}
        actions={
          <>
            <ApplyAction applicationId={applicationId} applied={applied} applying={applying} onApply={handleApply} />
            <Link to={`/jobs/${id}/edit`}>
              <Button variant="ghost">Edit</Button>
            </Link>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      />

      {applyError && <ErrorMessage title="Could not apply to this job" message={applyError.message} errors={applyError.errors} />}
      {deleteError && <ErrorMessage title="Could not delete job" message={deleteError.message} />}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant}>{job.status}</Badge>
            </div>
            {metaItems.length > 0 && (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metaItems.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</dt>
                    <dd className="text-sm text-foreground break-all">
                      {item.url ? (
                        <a href={item.value} target="_blank" rel="noreferrer" className="hover:underline">
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
              <p className="text-sm text-muted-foreground">
                <strong>Notes:</strong> {job.notes}
              </p>
            )}
          </CardContent>
        </Card>

        {job.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.description}</p>
            </CardContent>
          </Card>
        )}

        {job.requirements && (
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.requirements}</p>
            </CardContent>
          </Card>
        )}

        {job.responsibilities && (
          <Card>
            <CardHeader>
              <CardTitle>Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.responsibilities}</p>
            </CardContent>
          </Card>
        )}

        {job.skills && job.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="outline">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-0">
            <JobFitAnalysis analysis={match} analyzing={analyzing} error={matchError} onAnalyze={handleAnalyze} />
          </CardContent>
        </Card>

        {directions.length > 0 && (
          <Card>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Analyze fit for</label>
                <select
                  value={selectedCareerDirectionId ?? ''}
                  onChange={(e) => setSelectedCareerDirectionId(e.target.value || null)}
                  disabled={analyzing}
                  className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">General / Base Resume</option>
                  {directions.map((dir) => (
                    <option key={dir._id} value={dir._id}>
                      {dir.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Select which version of your resume to use for this analysis. The base resume uses your full profile.
                  A career direction emphasizes specific skills and summary for that focus.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}