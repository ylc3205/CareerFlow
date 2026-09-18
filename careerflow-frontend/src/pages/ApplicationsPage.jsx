import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, X } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import ApplicationCard from '../components/applications/ApplicationCard.jsx'
import { Input } from '../components/ui/input.jsx'
import { Select } from '../components/ui/select.jsx'
import { Button } from '../components/ui/button.jsx'
import { listApplicationsApi, deleteApplicationApi } from '../api/applications.api.js'
import { APPLICATION_STATUSES } from '../utils/constants.js'

export default function ApplicationsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [applications, setApplications] = useState([])
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
        const res = await listApplicationsApi({ status, search, page })
        if (cancelled) return
        setApplications(res.data.applications)
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

  const handleDelete = async (application) => {
    if (!window.confirm(`Delete this application for "${application.job ? application.job.title : 'a removed job'}"? This cannot be undone.`)) {
      return
    }
    setDeletingId(application._id)
    setActionError(null)
    try {
      await deleteApplicationApi(application._id)
      // Deleting the last item on the last page would leave `page` past
      // totalPages; step back one page instead of reloading the stale page.
      if (applications.length === 1 && page > 1) {
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
      <PageHeader title="Applications" subtitle="Track the jobs you've applied to." />

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder="Search by job title or company..."
            aria-label="Search applications"
            value={searchInput}
            onChange={handleSearchChange}
            className="flex-1"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
            className="sm:w-44"
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>

        {(searchInput || status) && (
          <div className="flex flex-wrap items-center gap-2">
            {searchInput && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
                Search: “{searchInput}”
                <button
                  type="button"
                  onClick={clearFilters}
                  aria-label="Clear search"
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
                Status: {status}
                <button
                  type="button"
                  onClick={clearFilters}
                  aria-label="Clear status"
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {actionError && <ErrorMessage title="Could not delete application" message={actionError.message} />}

      {loading && <Loading label="Loading applications..." />}

      {!loading && loadError && (
        <div className="flex gap-3">
          <ErrorMessage title="Could not load applications" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !loadError && applications.length === 0 && (
        hasFilters ? (
          <EmptyState
            title="No matching applications"
            description="Try adjusting your search or filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Send className="h-6 w-6" />}
            title="No applications yet"
            description="Apply to a saved job to start tracking your applications."
            action={
              <Button asChild>
                <Link to="/jobs">Browse jobs</Link>
              </Button>
            }
          />
        )
      )}

      {!loading && !loadError && applications.length > 0 && (
        <div className="space-y-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application._id}
              application={application}
              deleting={deletingId === application._id}
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