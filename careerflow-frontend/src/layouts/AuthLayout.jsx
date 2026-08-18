import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link to="/" className="brand brand--center">
          <span className="brand__logo" aria-hidden="true">
            CF
          </span>
          <span className="brand__name">CareerFlow</span>
        </Link>
        <Outlet />
      </div>
    </div>
  )
}