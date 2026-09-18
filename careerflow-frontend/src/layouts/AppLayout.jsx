import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
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
  ChevronRight,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = useMemo(() => {
    if (!user?.email) return 'CF'
    return user.email.split('@')[0].slice(0, 2).toUpperCase()
  }, [user])

  const crumb = useMemo(() => {
    for (const section of NAV_SECTIONS) {
      const match = section.links.find(
        (link) => pathname === link.to || pathname.startsWith(`${link.to}/`)
      )
      if (match) {
        return { section: section.label, page: pathname === match.to ? match.label : null }
      }
    }
    return { section: 'Overview', page: null }
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const navLinkClassName = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
    }`

  const renderNav = (onNavigate) =>
    NAV_SECTIONS.map((section) => (
      <div key={section.label}>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.label}
        </p>
        <div className="space-y-1">
          {section.links.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClassName} onClick={onNavigate}>
              <link.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    ))

  const renderUserFooter = (onNavigate) => (
    <>
      <div className="flex items-center gap-3 rounded-lg px-3 py-2">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{user?.email ?? ''}</p>
          <p className="truncate text-xs text-muted-foreground">Signed in</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (onNavigate) onNavigate()
          handleLogout()
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        Logout
      </button>
    </>
  )

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 flex-shrink-0 items-center border-b border-border px-4">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3" aria-label="CareerFlow dashboard home">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm"
              aria-hidden="true"
            >
              CF
            </div>
            <span className="truncate text-lg font-semibold tracking-tight">CareerFlow</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main navigation">
          {renderNav()}
        </nav>

        <div className="flex-shrink-0 space-y-1 border-t border-border p-3">
          {renderUserFooter()}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground md:hidden"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:block">CareerFlow</span>
            <ChevronRight className="hidden h-4 w-4 flex-shrink-0 text-muted-foreground/50 sm:block" aria-hidden="true" />
            <span className="truncate font-medium text-foreground">{crumb.section}</span>
            {crumb.page && (
              <>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" aria-hidden="true" />
                <span className="truncate text-muted-foreground">{crumb.page}</span>
              </>
            )}
          </nav>

          <div
            className="ml-auto hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary md:flex"
            aria-hidden="true"
          >
            {initials}
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="animate-slide-in-left absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl"
          >
            <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border pr-3 pl-4">
              <Link
                to="/dashboard"
                className="flex min-w-0 items-center gap-3"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="CareerFlow dashboard home"
              >
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm"
                  aria-hidden="true"
                >
                  CF
                </div>
                <span className="truncate text-lg font-semibold tracking-tight">CareerFlow</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                autoFocus
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Mobile navigation">
              {renderNav(() => setMobileMenuOpen(false))}
            </nav>

            <div className="flex-shrink-0 space-y-1 border-t border-border p-3">
              {renderUserFooter(() => setMobileMenuOpen(false))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}