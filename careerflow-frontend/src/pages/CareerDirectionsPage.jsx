import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import CareerDirectionCard from '../components/careerDirections/CareerDirectionCard.jsx'
import { Button } from '../components/ui/button.jsx'
import { listCareerDirectionsApi, deleteCareerDirectionApi } from '../api/careerDirections.api.js'

export default function CareerDirectionsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [careerDirections, setCareerDirections] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

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
    if (!window.confirm(`Delete "${direction.title}"? This cannot be undone.`)) return
    setDeletingId(direction._id)
    setActionError(null)
    try {
      await deleteCareerDirectionApi(direction._id)
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
            <Link to="/career-directions/new">Add direction</Link>
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <input
          type="text"
          placeholder="Search directions..."
          value={searchInput}
          onChange={handleSearchChange}
          className="flex h-9 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        />
      </div>

      {actionError && <ErrorMessage title="Could not delete direction" message={actionError.message} />}

      {loading && <Loading label="Loading career directions..." />}

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
            icon="🧭"
            title="No career directions yet"
            description="Add a career direction to start tailoring your job search."
            action={
              <Button asChild>
                <Link to="/career-directions/new">Add direction</Link>
              </Button>
            }
          />
        )
      )}

      {!loading && !loadError && careerDirections.length > 0 && (
        <div className="space-y-4">
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
    </div>
  )
}
