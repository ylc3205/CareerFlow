import { Input } from '../ui/input.jsx'
import { Select } from '../ui/select.jsx'
import { X } from 'lucide-react'

const JOB_STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed']

function ActiveFilterChip({ label, clearLabel, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  )
}

export default function JobFilters({ search, status, onSearchChange, onStatusChange, onClearFilters }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search jobs..."
          aria-label="Search jobs"
          value={search}
          onChange={onSearchChange}
          className="flex-1"
        />
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="sm:w-44"
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {(search || status) && (
        <div className="flex flex-wrap items-center gap-2">
          {search && <ActiveFilterChip label={`Search: “${search}”`} clearLabel="Clear search" onClear={onClearFilters} />}
          {status && <ActiveFilterChip label={`Status: ${status}`} clearLabel="Clear status" onClear={onClearFilters} />}
        </div>
      )}
    </div>
  )
}