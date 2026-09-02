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

export default function CareerDirectionCard({ direction, onDelete, deleting = false }) {
  const skills = direction.focusSkills || []
  const visibleSkills = skills.slice(0, 5)
  const remainingCount = skills.length - 5

  const roles = direction.targetRoles || []
  const rolesText = roles.length > 3 ? `${roles.slice(0, 3).join(', ')} +${roles.length - 3} more` : roles.join(', ')

  return (
    <Card className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium">
            <Link to={`/career-directions/${direction._id}`} className="hover:underline">{direction.title}</Link>
          </h3>
          <Badge variant={baseTypeVariant(direction.baseType)}>{direction.baseType}</Badge>
        </div>
        {direction.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{direction.description}</p>
        )}
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => (
              <Badge key={skill} variant="outline">{skill}</Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline">+{remainingCount} more</Badge>
            )}
          </div>
        )}
        {rolesText && (
          <p className="mt-2 text-sm text-muted-foreground truncate">{rolesText}</p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/career-directions/${direction._id}`}>View</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/career-directions/${direction._id}/edit`}>Edit</Link>
        </Button>
        <Button variant="destructive" size="sm" disabled={deleting} onClick={() => onDelete(direction)}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}
