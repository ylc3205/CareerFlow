import { Link } from 'react-router-dom'
import { Card } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'

const baseTypeVariant = (baseType) => {
  switch (baseType) {
    case 'profile':
      return 'primary'
    case 'resume':
      return 'secondary'
    default:
      return 'default'
  }
}

const careerLevelLabel = (level) => {
  const labels = { intern: 'Intern', junior: 'Junior', mid: 'Mid-level', senior: 'Senior', unspecified: 'Not specified' }
  return labels[level] || level
}

export default function CareerDirectionCard({ direction, onDelete, deleting = false }) {
  const skills = direction.focusSkills || []
  const visibleSkills = skills.slice(0, 5)
  const remainingCount = skills.length - 5

  const roles = direction.targetRoles || []
  const rolesText = roles.length > 3 ? `${roles.slice(0, 3).join(', ')} +${roles.length - 3} more` : roles.join(', ')

  const hasLevel = Boolean(direction.careerLevel) && direction.careerLevel !== 'unspecified'

  return (
    <Card className="group flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-1.5">
        <Badge variant={baseTypeVariant(direction.baseType)}>{direction.baseType}</Badge>
        {hasLevel && (
          <Badge variant="outline">{careerLevelLabel(direction.careerLevel)}</Badge>
        )}
      </div>

      <h3 className="mt-2 text-base font-semibold text-foreground">
        <Link to={`/career-directions/${direction._id}`} className="transition-colors hover:text-primary">
          {direction.title}
        </Link>
      </h3>

      {direction.description && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{direction.description}</p>
      )}

      {rolesText && (
        <p className="mt-1 text-xs font-medium text-muted-foreground truncate">{rolesText}</p>
      )}

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <Badge key={skill} variant="secondary" className="font-normal text-xs text-secondary-foreground">
              {skill}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
              +{remainingCount} more
            </Badge>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-1 items-end justify-end gap-1 border-t border-border pt-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/career-directions/${direction._id}`}>View</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/career-directions/${direction._id}/edit`}>Edit</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={deleting}
          onClick={() => onDelete(direction)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}