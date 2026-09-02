import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  BarChart3,
  MessageSquare,
  Video,
  Compass,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    links: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Career',
    links: [
      { to: '/profile', label: 'Profile', icon: User },
      { to: '/resume', label: 'Resume', icon: FileText },
      { to: '/career-directions', label: 'Career Directions', icon: Compass },
    ],
  },
  {
    label: 'Jobs',
    links: [
      { to: '/jobs', label: 'Jobs', icon: Briefcase },
      { to: '/applications', label: 'Applications', icon: MessageSquare },
      { to: '/interviews', label: 'Interviews', icon: Video },
    ],
  },
  {
    label: 'Insights',
    links: [{ to: '/analytics', label: 'Analytics', icon: BarChart3 }],
  },
]

export default function AppLayout() {
  const { user: _user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const navLinkClassName = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted'
    }`

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-card h-screen sticky top-0">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground font-bold text-sm" aria-hidden="true">
            CF
          </div>
          <span className="font-semibold text-lg">CareerFlow</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={navLinkClassName}
                  >
                    <link.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex md:hidden items-center justify-between h-14 px-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground font-bold text-sm" aria-hidden="true">
              CF
            </div>
            <span className="font-semibold text-lg">CareerFlow</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-sm text-muted-foreground hover:bg-muted transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        <div className="md:hidden" aria-hidden={!mobileMenuOpen}>
          {mobileMenuOpen && (
            <nav className="border-b border-border bg-card px-3 py-4 space-y-6">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={navLinkClassName}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <link.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                Logout
              </button>
            </nav>
          )}
        </div>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}