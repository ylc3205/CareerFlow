import { Link } from 'react-router-dom'
import Card from '../Card.jsx'
import Badge from '../Badge.jsx'
import { INTERVIEW_TYPE_VARIANT, INTERVIEW_STATUS_VARIANT } from '../../utils/constants.js'
import { formatDisplayDate } from '../../utils/format.js'

export default function InterviewCard({ interview, onDelete, deleting = false }) {
  const job = interview.application?.job
  const scheduled = interview.scheduledDate ? formatDisplayDate(interview.scheduledDate) : null

  return (
    <Card className="interview-card">
      <div className="interview-card__main">
        <div className="interview-card__heading">
          <h3 className="interview-card__title">
            <Link to={`/interviews/${interview._id}`}>{interview.title}</Link>
          </h3>
          <Badge variant={INTERVIEW_TYPE_VARIANT[interview.type] || 'default'}>{interview.type}</Badge>
          <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'}>{interview.status}</Badge>
        </div>
        <p className="interview-card__company">
          {job ? `${job.title}${job.company ? ` — ${job.company}` : ''}` : 'Linked job removed'}
        </p>
        <div className="interview-card__meta">
          {scheduled && <span className="interview-card__meta-item">{scheduled}</span>}
          {interview.location && <span className="interview-card__meta-item">{interview.location}</span>}
        </div>
      </div>

      <div className="interview-card__actions">
        <Link to={`/interviews/${interview._id}`} className="btn btn--ghost btn--sm">
          View
        </Link>
        <button
          type="button"
          className="btn btn--ghost btn--danger btn--sm"
          disabled={deleting}
          onClick={() => onDelete(interview)}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Card>
  )
}