import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sparkles, ChevronDown, ChevronRight } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import { getCareerDirectionApi, deleteCareerDirectionApi } from '../api/careerDirections.api.js'
import { formatDisplayDate } from '../utils/format.js'

const baseTypeVariant = (baseType) => {
  switch (baseType) {
    case 'profile':
      return 'primary'
    case 'resume':
      return 'secondary'
    default:
      return 'default'
  }
}

const careerLevelLabel = (level) => {
  const labels = { intern: 'Intern', junior: 'Junior', mid: 'Mid-level', senior: 'Senior', unspecified: 'Not specified' }
  return labels[level] || level
}

const focusAreaLabel = (area) => {
  const labels = {
    backend: 'Backend', frontend: 'Frontend', apis: 'APIs', databases: 'Databases', cloud: 'Cloud',
    system_design: 'System Design', ai: 'AI', devops: 'DevOps', mobile: 'Mobile', data: 'Data',
    security: 'Security', qa: 'QA',
  }
  return labels[area] || area
}

export default function CareerDirectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [direction, setDirection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await getCareerDirectionApi(id)
        if (cancelled) return
        setDirection(res.data.careerDirection)
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

  const handleDeleteConfirm = async () => {
    setDeleteDialogOpen(false)
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteCareerDirectionApi(id)
      navigate('/career-directions', { replace: true })
    } catch (err) {
      setDeleteError({ message: err.message })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Loading label="Loading career direction..." />
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Career Direction" subtitle="Could not load this direction." />
        <div className="flex gap-3">
          <ErrorMessage title="Could not load direction" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!direction) {
    return <ErrorMessage title="Direction not found" message="This career direction may have been deleted." />
  }

  const skills = direction.focusSkills || []
  const roles = direction.targetRoles || []
  const hasAIDetails = Boolean(direction.generationMetadata)

  return (
    <div className="space-y-6">
      <PageHeader
        title={direction.title}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Badge variant={baseTypeVariant(direction.baseType)}>{direction.baseType}</Badge>
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost">
              <Link to={`/career-directions/${id}/edit`}>Edit</Link>
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => setDeleteDialogOpen(true)}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      />

      {deleteError && <ErrorMessage title="Could not delete direction" message={deleteError.message} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {direction.description && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{direction.description}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focus Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="outline">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No focus skills defined.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Roles</CardTitle>
            </CardHeader>
            <CardContent>
              {roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge key={role} variant="outline">{role}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No target roles defined.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3">
                <div className="space-y-1">
                  <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Base Type</dt>
                  <dd className="text-sm text-foreground">
                    <Badge variant={baseTypeVariant(direction.baseType)}>{direction.baseType}</Badge>
                  </dd>
                </div>
                {direction.createdAt && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</dt>
                    <dd className="text-sm text-foreground">{formatDisplayDate(direction.createdAt)}</dd>
                  </div>
                )}
                {direction.updatedAt && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</dt>
                    <dd className="text-sm text-foreground">{formatDisplayDate(direction.updatedAt)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {hasAIDetails && (
            <Card>
              <button
                type="button"
                className="flex w-full items-center justify-between p-5 text-left"
                onClick={() => setAiDetailsOpen((prev) => !prev)}
                aria-expanded={aiDetailsOpen}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                  AI Details
                </span>
                {aiDetailsOpen
                  ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              </button>
              {aiDetailsOpen && (
                <CardContent className="space-y-4 border-t border-border pt-4">
                  {direction.careerLevel && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Career Level</dt>
                      <dd className="text-sm text-foreground">{careerLevelLabel(direction.careerLevel)}</dd>
                    </div>
                  )}

                  {direction.primaryFocus?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Primary Focus</h4>
                      <div className="flex flex-wrap gap-2">
                        {direction.primaryFocus.map((area) => (
                          <Badge key={area} variant="outline">{focusAreaLabel(area)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {direction.secondaryFocus?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Secondary Focus</h4>
                      <div className="flex flex-wrap gap-2">
                        {direction.secondaryFocus.map((area) => (
                          <Badge key={area} variant="outline">{focusAreaLabel(area)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {direction.learningPriorities?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Learning Priorities</h4>
                      <div className="flex flex-wrap gap-2">
                        {direction.learningPriorities.map((p) => (
                          <Badge key={p} variant="secondary">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {direction.suggestedNextSteps?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Next Steps</h4>
                      <ol className="space-y-1">
                        {direction.suggestedNextSteps.map((step, index) => (
                          <li key={index} className="text-sm text-foreground flex items-start gap-2">
                            <span className="flex-shrink-0 text-muted-foreground">{index + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {direction.rationale && (
                    <div className="space-y-1.5 rounded-xl border border-primary/10 bg-primary/[0.03] p-4">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Rationale</h4>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{direction.rationale}</p>
                    </div>
                  )}

                  <div className="rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                    <p><strong>Generation Mode:</strong> {direction.generationMetadata.mode}</p>
                    {direction.generationMetadata.userIdea && (
                      <p><strong>User Idea:</strong> {direction.generationMetadata.userIdea.substring(0, 100)}{direction.generationMetadata.userIdea.length > 100 ? '...' : ''}</p>
                    )}
                    {direction.generationMetadata.contextSources?.length > 0 && (
                      <p><strong>Context Sources:</strong> {direction.generationMetadata.contextSources.join(', ')}</p>
                    )}
                    {direction.generationMetadata.modelVersion && <p><strong>Model:</strong> {direction.generationMetadata.modelVersion}</p>}
                    {direction.generationMetadata.generatedAt && <p><strong>Generated:</strong> {new Date(direction.generationMetadata.generatedAt).toLocaleString()}</p>}
                    {direction.generationMetadata.requestId && <p><strong>Request ID:</strong> {direction.generationMetadata.requestId}</p>}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete this career direction?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        loadingLabel="Deleting..."
      />
    </div>
  )
}