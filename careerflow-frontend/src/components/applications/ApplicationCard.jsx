import { Link } from 'react-router-dom'
import { MapPin as MapPinIcon, CalendarDays as CalendarIcon } from 'lucide-react'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { APPLICATION_STATUS_VARIANT, APPLICATION_PROGRESS, APPLICATION_TERMINAL } from '../../utils/constants.js'
import { formatDisplayDate } from '../../utils/format.js'

const companyInitials = (company) => {
  if (!company) return 'J'
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function StatusProgressDots({ status }) {
  const currentIndex = APPLICATION_PROGRESS.indexOf(status)
  const isTerminal = APPLICATION_TERMINAL.includes(status)
  const lastReachedIndex = isTerminal ? APPLICATION_PROGRESS.length - 1 : currentIndex

  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {APPLICATION_PROGRESS.map((step, index) => {
        const reached = index <= lastReachedIndex
        return (
          <span key={step} className="flex items-center gap-1">
            {index > 0 && <span className={`h-0.5 w-3 ${reached ? 'bg-primary/60' : 'bg-border'}`} />}
            <span
              className={`h-2 w-2 rounded-full ${
                reached && !isTerminal && index === currentIndex
                  ? 'bg-primary ring-2 ring-primary/20'
                  : reached
                  ? 'bg-primary/60'
                  : 'bg-border'
              }`}
            />
          </span>
        )
      })}
    </div>
  )
}

export default function ApplicationCard({ application, onDelete, deleting = false }) {
  const job = application.job
  const appliedAt = application.appliedAt ? formatDisplayDate(application.appliedAt) : null

  return (
    <Card className="group flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {companyInitials(job?.company)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            <Link to={`/applications/${application._id}`} className="transition-colors hover:text-primary">
              {job ? job.title : 'Job removed'}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {job ? job.company : 'Linked job removed'}
          </p>
        </div>
        <Badge variant={APPLICATION_STATUS_VARIANT[application.status] || 'default'} className="shrink-0">
          {application.status}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {job?.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {job.location}
          </span>
        )}
        {job?.employmentType && <span>{job.employmentType}</span>}
        {appliedAt && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Applied {appliedAt}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-1 items-end justify-between gap-4 border-t border-border pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Pipeline</span>
          <StatusProgressDots status={application.status} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/applications/${application._id}`}>View</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={() => onDelete(application)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </Card>
  )
}