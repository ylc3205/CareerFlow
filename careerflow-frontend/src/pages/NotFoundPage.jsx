import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <h1 className="not-found__code">404</h1>
      <p className="not-found__text">This page doesn't exist.</p>
      <Link to="/" className="btn btn--primary">
        Go home
      </Link>
    </div>
  )
}