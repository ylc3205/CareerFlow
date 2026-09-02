import { Link } from 'react-router-dom'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { INTERVIEW_TYPE_VARIANT, INTERVIEW_STATUS_VARIANT } from '../../utils/constants.js'
import { formatDisplayDate } from '../../utils/format.js'

export default function InterviewCard({ interview, onDelete, deleting = false }) {
  const job = interview.application?.job
  const scheduled = interview.scheduledDate ? formatDisplayDate(interview.scheduledDate) : null

  return (
    <Card className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium">
            <Link to={`/interviews/${interview._id}`} className="hover:underline">{interview.title}</Link>
          </h3>
          <Badge variant={INTERVIEW_TYPE_VARIANT[interview.type] || 'default'}>{interview.type}</Badge>
          <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'}>{interview.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {job ? `${job.title}${job.company ? ` — ${job.company}` : ''}` : 'Linked job removed'}
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {scheduled && <span>{scheduled}</span>}
          {interview.location && <span>{interview.location}</span>}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/interviews/${interview._id}`}>View</Link>
        </Button>
        <Button variant="destructive" size="sm" disabled={deleting} onClick={() => onDelete(interview)}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}