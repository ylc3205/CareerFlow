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
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              <Link to={`/interviews/${interview._id}`} className="transition-colors hover:text-primary">
                {interview.title}
              </Link>
            </h3>
            <Badge variant={INTERVIEW_TYPE_VARIANT[interview.type] || 'default'}>{interview.type}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {job ? `${job.title}${job.company ? ` — ${job.company}` : ''}` : 'Linked job removed'}
          </p>
        </div>
        <Badge variant={INTERVIEW_STATUS_VARIANT[interview.status] || 'default'} className="shrink-0">
          {interview.status}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {scheduled && <span>{scheduled}</span>}
        {interview.location && <span>{interview.location}</span>}
      </div>

      <div className="mt-4 flex flex-1 items-end justify-end gap-1 border-t border-border pt-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/interviews/${interview._id}`}>View</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={deleting}
          onClick={() => onDelete(interview)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}