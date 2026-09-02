import { Input } from '../ui/input.jsx'

const JOB_STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed']

export default function JobFilters({ search, status, onSearchChange, onStatusChange }) {
  return (
    <div className="flex gap-3 mb-6">
      <Input
        type="search"
        placeholder="Search jobs..."
        aria-label="Search jobs"
        value={search}
        onChange={onSearchChange}
        className="flex-1"
      />
      <select
        className="flex h-9 w-[200px] rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        aria-label="Filter by status"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="">All statuses</option>
        {JOB_STATUSES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  )
}
