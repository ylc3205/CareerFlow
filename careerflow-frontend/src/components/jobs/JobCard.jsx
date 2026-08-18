import { Link } from 'react-router-dom'
import Card from '../Card.jsx'
import Badge from '../Badge.jsx'
import { formatDisplayDate } from '../../utils/format.js'

const statusVariant = (status) => {
  switch (status) {
    case 'applied':
      return 'primary'
    case 'interviewing':
      return 'warning'
    case 'offered':
      return 'success'
    case 'rejected':
    case 'closed':
      return 'danger'
    default:
      return 'default'
  }
}

export default function JobCard({ job, onDelete, deleting = false }) {
  const deadline = job.deadline ? formatDisplayDate(job.deadline) : null

  return (
    <Card className="job-card">
      <div className="job-card__main">
        <div className="job-card__heading">
          <h3 className="job-card__title">
            <Link to={`/jobs/${job._id}`}>{job.title}</Link>
          </h3>
          <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
        </div>
        <p className="job-card__company">{job.company}</p>
        <div className="job-card__meta">
          {job.location && <span className="job-card__meta-item">{job.location}</span>}
          {job.employmentType && <span className="job-card__meta-item">{job.employmentType}</span>}
          {job.workplaceType && <span className="job-card__meta-item">{job.workplaceType}</span>}
          {deadline && <span className="job-card__meta-item">Deadline {deadline}</span>}
        </div>
      </div>

      <div className="job-card__actions">
        <Link to={`/jobs/${job._id}`} className="btn btn--ghost btn--sm">
          View
        </Link>
        <Link to={`/jobs/${job._id}/edit`} className="btn btn--ghost btn--sm">
          Edit
        </Link>
        <button type="button" className="btn btn--ghost btn--danger btn--sm" disabled={deleting} onClick={() => onDelete(job)}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Card>
  )
}
