import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Loading from '../components/Loading.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import JobCard from '../components/jobs/JobCard.jsx'
import JobFilters from '../components/jobs/JobFilters.jsx'
import { Button } from '../components/ui/button.jsx'
import { listJobsApi, deleteJobApi } from '../api/jobs.api.js'

export default function JobsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [jobs, setJobs] = useState([])
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
        const res = await listJobsApi({ status, search, page })
        if (cancelled) return
        setJobs(res.data.jobs)
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

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return
    setDeletingId(job._id)
    setActionError(null)
    try {
      await deleteJobApi(job._id)
      // Deleting the last item on the last page would leave `page` past
      // totalPages; step back one page instead of reloading the stale page.
      if (jobs.length === 1 && page > 1) {
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
      <PageHeader
        title="Jobs"
        subtitle="Track the jobs you've saved."
        actions={
          <Button asChild>
            <Link to="/jobs/new">Add job</Link>
          </Button>
        }
      />

      <JobFilters
        search={searchInput}
        status={status}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
      />

      {actionError && <ErrorMessage title="Could not delete job" message={actionError.message} />}

      {loading && <Loading label="Loading jobs..." />}

      {!loading && loadError && (
        <div className="flex gap-3">
          <ErrorMessage title="Could not load jobs" message={loadError.message} />
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !loadError && jobs.length === 0 && (
        hasFilters ? (
          <EmptyState
            title="No matching jobs"
            description="Try adjusting your search or filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title="No jobs yet"
            description="Add a job posting to start tracking your applications."
            action={
              <Button asChild>
                <Link to="/jobs/new">Add job</Link>
              </Button>
            }
          />
        )
      )}

      {!loading && !loadError && jobs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} deleting={deletingId === job._id} onDelete={handleDelete} />
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
