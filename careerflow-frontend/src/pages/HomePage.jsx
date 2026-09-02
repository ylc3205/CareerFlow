import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { Button } from '../components/ui/button.jsx'

export default function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary text-primary-foreground font-bold" aria-hidden="true">
            CF
          </div>
          <span className="font-semibold text-xl">CareerFlow</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button asChild>
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">AI-powered job tracking</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Save jobs, track applications, prepare for interviews, and measure your progress with
          AI-driven analytics. All in one place.
        </p>
        {!isAuthenticated && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/register">Create free account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}