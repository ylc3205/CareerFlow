import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
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

export default function CareerDirectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [direction, setDirection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

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

  const handleDelete = async () => {
    if (!window.confirm('Delete this career direction? This cannot be undone.')) return
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
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      />

      {deleteError && <ErrorMessage title="Could not delete direction" message={deleteError.message} />}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {direction.description && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{direction.description}</p>
            )}
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  )
}
