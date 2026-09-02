import { Link } from 'react-router-dom'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'

export default function ApplyAction({ applicationId, applied, applying, onApply }) {
  if (applied || applicationId) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success">Applied</Badge>
        {applicationId && (
          <Button asChild>
            <Link to={`/applications/${applicationId}`}>View Application</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button disabled={applying} onClick={onApply}>
        {applying ? 'Applying…' : 'Apply'}
      </Button>
    </div>
  )
}
