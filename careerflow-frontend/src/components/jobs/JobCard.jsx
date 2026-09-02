import { Link } from 'react-router-dom'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
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
      return 'destructive'
    default:
      return 'default'
  }
}

export default function JobCard({ job, onDelete, deleting = false }) {
  const deadline = job.deadline ? formatDisplayDate(job.deadline) : null

  return (
    <Card className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium">
            <Link to={`/jobs/${job._id}`} className="hover:underline">{job.title}</Link>
          </h3>
          <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {job.location && <span>{job.location}</span>}
          {job.employmentType && <span>{job.employmentType}</span>}
          {job.workplaceType && <span>{job.workplaceType}</span>}
          {deadline && <span>Deadline {deadline}</span>}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/jobs/${job._id}`}>View</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/jobs/${job._id}/edit`}>Edit</Link>
        </Button>
        <Button variant="destructive" size="sm" disabled={deleting} onClick={() => onDelete(job)}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}
