import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import ApplicationCard from '../components/applications/ApplicationCard.jsx'
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
    <div className="page">
      <PageHeader title="Applications" subtitle="Track the jobs you've applied to." />

      <div className="job-filters">
        <input
          type="search"
          className="form__input"
          placeholder="Search by job title or company..."
          aria-label="Search applications"
          value={searchInput}
          onChange={handleSearchChange}
        />
        <select
          className="form__input"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {actionError && <ErrorMessage title="Could not delete application" message={actionError.message} />}

      {loading && <Loading label="Loading applications..." />}

      {!loading && loadError && (
        <div className="page__error">
          <ErrorMessage title="Could not load applications" message={loadError.message} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && applications.length === 0 && (
        hasFilters ? (
          <EmptyState
            title="No matching applications"
            description="Try adjusting your search or filters."
            action={
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title="No applications yet"
            description="Apply to a saved job to start tracking your applications."
            action={
              <Link to="/jobs" className="btn btn--primary">
                Browse jobs
              </Link>
            }
          />
        )
      )}

      {!loading && !loadError && applications.length > 0 && (
        <div className="app-list">
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