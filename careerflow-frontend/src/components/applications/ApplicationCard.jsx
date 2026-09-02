import { Link } from 'react-router-dom'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { APPLICATION_STATUS_VARIANT } from '../../utils/constants.js'
import { formatDisplayDate } from '../../utils/format.js'

export default function ApplicationCard({ application, onDelete, deleting = false }) {
  const job = application.job
  const appliedAt = application.appliedAt ? formatDisplayDate(application.appliedAt) : null

  return (
    <Card className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium">
            <Link to={`/applications/${application._id}`} className="hover:underline">
              {job ? job.title : 'Job removed'}
            </Link>
          </h3>
          <Badge variant={APPLICATION_STATUS_VARIANT[application.status] || 'default'}>
            {application.status}
          </Badge>
        </div>
        {job && <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>}
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {job?.location && <span>{job.location}</span>}
          {job?.employmentType && <span>{job.employmentType}</span>}
          {appliedAt && <span>Applied {appliedAt}</span>}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/applications/${application._id}`}>View</Link>
        </Button>
        <Button variant="destructive" size="sm" disabled={deleting} onClick={() => onDelete(application)}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}