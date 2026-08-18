import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export default function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="home">
      <header className="home__topbar">
        <div className="brand">
          <span className="brand__logo" aria-hidden="true">
            CF
          </span>
          <span className="brand__name">CareerFlow</span>
        </div>
        <div className="home__topbar-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn--primary">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn--primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="home__hero">
        <h1 className="home__title">AI-powered job tracking</h1>
        <p className="home__tagline">
          Save jobs, track applications, prepare for interviews, and measure your progress with
          AI-driven analytics. All in one place.
        </p>
        {!isAuthenticated && (
          <div className="home__actions">
            <Link to="/register" className="btn btn--primary btn--lg">
              Create free account
            </Link>
            <Link to="/login" className="btn btn--ghost btn--lg">
              Sign in
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}