const JOB_STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed']

export default function JobFilters({ search, status, onSearchChange, onStatusChange }) {
  return (
    <div className="job-filters">
      <input
        type="search"
        className="form__input"
        placeholder="Search jobs..."
        aria-label="Search jobs"
        value={search}
        onChange={onSearchChange}
      />
      <select
        className="form__input"
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
