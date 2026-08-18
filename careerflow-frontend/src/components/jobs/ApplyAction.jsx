import { Link } from 'react-router-dom'
import Badge from '../Badge.jsx'

export default function ApplyAction({ applicationId, applied, applying, onApply }) {
  if (applied || applicationId) {
    return (
      <div className="apply-action">
        <Badge variant="success">Applied</Badge>
        {applicationId && (
          <Link to={`/applications/${applicationId}`} className="btn btn--primary">
            View Application
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="apply-action">
      <button type="button" className="btn btn--primary" disabled={applying} onClick={onApply}>
        {applying ? 'Applying…' : 'Apply'}
      </button>
    </div>
  )
}
