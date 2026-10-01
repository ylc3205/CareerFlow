import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Search, X } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import CareerDirectionCard from '../components/careerDirections/CareerDirectionCard.jsx'
import { Button } from '../components/ui/button.jsx'
import { Input } from '../components/ui/input.jsx'
import { listCareerDirectionsApi, deleteCareerDirectionApi } from '../api/careerDirections.api.js'

function DirectionsSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading career directions...</span>
      <div className="space-y-4" aria-hidden="true">
        <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-48 max-w-full animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-64 max-w-full animate-pulse rounded-md bg-muted" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2].map((chip) => (
                  <div key={chip} className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                ))}
              </div>
              <div className="flex justify-end gap-1 border-t border-border pt-3">
                <div className="h-8 w-12 animate-pulse rounded-lg bg-muted" />
                <div className="h-8 w-12 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useDebounce } from '../hooks/useDebounce.js'

export default function CareerDirectionsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useDebounce(searchInput, 350)
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [careerDirections, setCareerDirections] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [search])

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value)
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await listCareerDirectionsApi({ search, page })
        if (cancelled) return
        setCareerDirections(res.data.careerDirections)
        setPagination(res.data.pagination)
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
  }, [search, page, reloadKey])

  const handleDelete = async (direction) => {
    setDeleteTarget(direction)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget._id)
    setDeleteTarget(null)
    setActionError(null)
    try {
      await deleteCareerDirectionApi(deleteTarget._id)
      if (careerDirections.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        setReloadKey((key) => key + 1)
      }
    } catch (err) {
      setActionError({ message: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  const hasFilters = Boolean(search)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Directions"
        subtitle="Define focused career paths to tailor your job search."
        actions={
          <Button asChild>
            <Link to="/career-directions/create">Create career direction</Link>
          </Button>
        }
      />

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search directions..."
            aria-label="Search directions"
            value={searchInput}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
              Search: “{search}”
              <button
                type="button"
                onClick={clearFilters}
                aria-label="Clear search"
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          </div>
        )}
      </div>

      {actionError && (
        <ErrorMessage title="Could not delete direction" message={actionError.message} />
      )}

      {loading && <DirectionsSkeleton />}

      {!loading && loadError && (
        <div className="flex gap-3">
          <ErrorMessage title="Could not load career directions" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !loadError && careerDirections.length === 0 && (
        hasFilters ? (
          <EmptyState
            title="No matching directions"
            description="Try adjusting your search."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Compass className="h-6 w-6" aria-hidden="true" />}
            title="No career directions yet"
            description="Add a career direction to start tailoring your job search."
            action={
              <Button asChild>
                <Link to="/career-directions/create">Create career direction</Link>
              </Button>
            }
          />
        )
      )}

      {!loading && !loadError && careerDirections.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {careerDirections.map((direction) => (
            <CareerDirectionCard
              key={direction._id}
              direction={direction}
              deleting={deletingId === direction._id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!loading && !loadError && pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onChange={setPage}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete this career direction?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted. This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  )
}