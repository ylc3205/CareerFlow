import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import InterviewCard from '../components/interviews/InterviewCard.jsx'
import { Button } from '../components/ui/button.jsx'
import { listInterviewsApi, deleteInterviewApi } from '../api/interviews.api.js'
import { INTERVIEW_STATUSES } from '../utils/constants.js'

export default function InterviewsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [interviews, setInterviews] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Lightweight debounce (no library).
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

  const handleStatusChange = (value) => {
    setStatus(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setPage(1)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await listInterviewsApi({ status, search, page })
        if (cancelled) return
        setInterviews(res.data.interviews)
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
  }, [status, search, page, reloadKey])

  const handleDelete = async (interview) => {
    if (!window.confirm(`Delete interview "${interview.title}"? This cannot be undone.`)) return
    setDeletingId(interview._id)
    setActionError(null)
    try {
      await deleteInterviewApi(interview._id)
      // Deleting the last item on the last page would leave `page` past
      // totalPages; step back one page instead of reloading the stale page.
      if (interviews.length === 1 && page > 1) {
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

  const hasFilters = Boolean(search || status)

  return (
    <div className="space-y-6">
      <PageHeader title="Interviews" subtitle="Keep track of your upcoming and past interviews." />

      <div className="flex gap-3 mb-6">
        <input
          type="search"
          className="flex h-9 w-full flex-1 rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          placeholder="Search by job title or company..."
          aria-label="Search interviews"
          value={searchInput}
          onChange={handleSearchChange}
        />
        <select
          className="flex h-9 w-[200px] rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
        >
          <option value="">All statuses</option>
          {INTERVIEW_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {actionError && <ErrorMessage title="Could not delete interview" message={actionError.message} />}

      {loading && <Loading label="Loading interviews..." />}

      {!loading && loadError && (
        <div className="flex gap-3">
          <ErrorMessage title="Could not load interviews" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !loadError && interviews.length === 0 && (
        hasFilters ? (
          <EmptyState
            title="No matching interviews"
            description="Try adjusting your search or filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No interviews yet"
            description="Add an interview from an application detail page to keep track of it."
            action={
              <Button asChild>
                <Link to="/applications">Go to applications</Link>
              </Button>
            }
          />
        )
      )}

      {!loading && !loadError && interviews.length > 0 && (
        <div className="space-y-4">
          {interviews.map((interview) => (
            <InterviewCard
              key={interview._id}
              interview={interview}
              deleting={deletingId === interview._id}
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