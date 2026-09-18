import { Link } from 'react-router-dom'
import { MapPin as MapPinIcon, CalendarDays as CalendarIcon, Banknote as BanknoteIcon } from 'lucide-react'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { formatDisplayDate, formatSalary } from '../../utils/format.js'

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

const companyInitials = (company) => {
  if (!company) return 'J'
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export default function JobCard({ job, onDelete, deleting = false }) {
  const deadline = job.deadline ? formatDisplayDate(job.deadline) : null
  const salary = formatSalary(job.salary)

  return (
    <Card className="group flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {companyInitials(job.company)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            <Link to={`/jobs/${job._id}`} className="transition-colors hover:text-primary">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{job.company}</p>
        </div>
        <Badge variant={statusVariant(job.status)} className="shrink-0">
          {job.status}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {job.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {job.location}
          </span>
        )}
        {job.workplaceType && <span>{job.workplaceType}</span>}
        {job.employmentType && <span>{job.employmentType}</span>}
        {salary && (
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <BanknoteIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {salary}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-1 items-end justify-between gap-4 border-t border-border pt-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          {deadline && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Deadline {deadline}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/jobs/${job._id}`}>View</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/jobs/${job._id}/edit`}>Edit</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={() => onDelete(job)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </Card>
  )
}