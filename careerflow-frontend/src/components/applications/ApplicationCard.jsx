import { Link } from 'react-router-dom'
import Card from '../Card.jsx'
import Badge from '../Badge.jsx'
import { APPLICATION_STATUS_VARIANT } from '../../utils/constants.js'
import { formatDisplayDate } from '../../utils/format.js'

export default function ApplicationCard({ application, onDelete, deleting = false }) {
  const job = application.job
  const appliedAt = application.appliedAt ? formatDisplayDate(application.appliedAt) : null

  return (
    <Card className="app-card">
      <div className="app-card__main">
        <div className="app-card__heading">
          <h3 className="app-card__title">
            <Link to={`/applications/${application._id}`}>{job ? job.title : 'Job removed'}</Link>
          </h3>
          <Badge variant={APPLICATION_STATUS_VARIANT[application.status] || 'default'}>{application.status}</Badge>
        </div>
        {job && <p className="app-card__company">{job.company}</p>}
        <div className="app-card__meta">
          {job?.location && <span className="app-card__meta-item">{job.location}</span>}
          {job?.employmentType && <span className="app-card__meta-item">{job.employmentType}</span>}
          {appliedAt && <span className="app-card__meta-item">Applied {appliedAt}</span>}
        </div>
      </div>

      <div className="app-card__actions">
        <Link to={`/applications/${application._id}`} className="btn btn--ghost btn--sm">
          View
        </Link>
        <button
          type="button"
          className="btn btn--ghost btn--danger btn--sm"
          disabled={deleting}
          onClick={() => onDelete(application)}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Card>
  )
}