import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    links: [{ to: '/dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Career',
    links: [
      { to: '/profile', label: 'Profile' },
      { to: '/resume', label: 'Resume' },
    ],
  },
  {
    label: 'Jobs',
    links: [
      { to: '/jobs', label: 'Jobs' },
      { to: '/applications', label: 'Applications' },
      { to: '/interviews', label: 'Interviews' },
    ],
  },
  {
    label: 'Insights',
    links: [{ to: '/analytics', label: 'Analytics' }],
  },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__logo" aria-hidden="true">
            CF
          </span>
          <span className="brand__name">CareerFlow</span>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="nav-section">
              <span className="nav-section__label">{section.label}</span>
              <div className="nav-section__links">
                {section.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__spacer" />
          <div className="topbar__user">
            <span className="topbar__email">{user?.email}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}