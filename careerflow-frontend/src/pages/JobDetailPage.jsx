import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import { Select } from '../components/ui/select.jsx'
import JobFitAnalysis from '../components/jobs/JobFitAnalysis.jsx'
import ApplyAction from '../components/jobs/ApplyAction.jsx'
import { getJobContextApi, deleteJobApi, matchJobApi } from '../api/jobs.api.js'
import { createApplicationApi, listApplicationsApi } from '../api/applications.api.js'
import { formatDisplayDate, formatSalary } from '../utils/format.js'

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // Reset per-job state whenever the route id changes. Without this, stale
  // match / application / error state from a previously viewed job can leak
  // into the newly navigated job (e.g. /jobs/job-A -> /jobs/job-B).
  useEffect(() => {
    setJob(null)
    setLoadError(null)
    setLoading(true)
    setMatch(null)
    setMatchError(null)
    setAnalyzing(false)
    setSelectedCareerDirectionId(null)
    setApplicationId(null)
    setApplied(false)
    setApplying(false)
    setApplyError(null)
  }, [id])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getJobContextApi(id)
        if (cancelled) return
        const { job: jobDoc, application, match: matchDoc, careerDirections } = res.data
        setJob(jobDoc)
        if (application) {
          setApplicationId(application._id)
          setApplied(true)
        }
        if (matchDoc) {
          setMatch(matchDoc)
        }
        if (Array.isArray(careerDirections)) {
          setDirections(careerDirections)
        }
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
        missingProfileResume: err.status === 400 && /profile|resume/i.test(err.message || ''),
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const resolveExistingApplication = async () => {
    try {
      const res = await listApplicationsApi({ job: id, limit: 1 })
      const found = res.data.applications?.find((app) => app.job && String(app.job._id || app.job) === String(id)) || res.data.applications?.[0]
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

  const handleDelete = () => {
    setConfirmDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setConfirmDeleteOpen(false)
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
  const statusVariant =
    job.status === 'interviewing'
      ? 'warning'
      : job.status === 'offered'
        ? 'success'
        : job.status === 'rejected' || job.status === 'closed'
          ? 'destructive'
          : job.status === 'applied'
            ? 'primary'
            : 'default'

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {(job.description || job.requirements || job.responsibilities || (job.skills && job.skills.length > 0) || job.notes) && (
            <Card className="divide-y divide-border/60">
              {job.description && (
                <div className="space-y-2 p-5">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Description</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{job.description}</p>
                </div>
              )}

              {job.requirements && (
                <div className="space-y-2 p-5">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Requirements</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{job.requirements}</p>
                </div>
              )}

              {job.responsibilities && (
                <div className="space-y-2 p-5">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Responsibilities</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{job.responsibilities}</p>
                </div>
              )}

              {job.skills && job.skills.length > 0 && (
                <div className="space-y-2 p-5">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="rounded-full">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {job.notes && (
                <div className="space-y-2 p-5">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Notes</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Notes:</strong> {job.notes}
                  </p>
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <JobFitAnalysis analysis={match} analyzing={analyzing} error={matchError} onAnalyze={handleAnalyze} />
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Job Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant}>{job.status}</Badge>
              </div>
              {metaItems.length > 0 && (
                <dl className="space-y-3">
                  {metaItems.map((item) => (
                    <div key={item.label}>
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="mt-0.5 break-all text-sm text-foreground">
                        {item.url ? (
                          <a href={item.value} target="_blank" rel="noreferrer" className="text-primary hover:underline">
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
            </CardContent>
          </Card>

          {directions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="text-sm font-medium text-foreground" htmlFor="job-fit-direction">
                  Analyze fit for
                </label>
                <Select
                  id="job-fit-direction"
                  value={selectedCareerDirectionId ?? ''}
                  onChange={(e) => setSelectedCareerDirectionId(e.target.value || null)}
                  disabled={analyzing}
                >
                  <option value="">General / Base Resume</option>
                  {directions.map((dir) => (
                    <option key={dir._id} value={dir._id}>
                      {dir.title}
                    </option>
                  ))}
                  </Select>
                <p className="text-xs text-muted-foreground">
                  Select which version of your resume to use for this analysis. The base resume uses your full profile.
                  A career direction emphasizes specific skills and summary for that focus.
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete this job?"
        description="This will permanently delete this job and any associated data. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
      />
    </div>
  )
}