import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="rounded-sm border border-border bg-card shadow-none p-6 md:p-8">
          <Link to="/" className="flex items-center justify-center gap-3 mb-6" aria-label="CareerFlow home">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary text-primary-foreground font-bold" aria-hidden="true">
              CF
            </div>
            <span className="font-semibold text-xl">CareerFlow</span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  )
}