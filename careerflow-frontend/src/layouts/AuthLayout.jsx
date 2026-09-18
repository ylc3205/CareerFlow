import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
          <Link to="/" className="mb-6 flex items-center justify-center gap-3" aria-label="CareerFlow home">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-sm" aria-hidden="true">
              CF
            </div>
            <span className="text-xl font-semibold tracking-tight">CareerFlow</span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  )
}