import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import Loading from '../components/Loading.jsx'

// Redirects authenticated users away from auth pages (login/register).
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <Loading fullscreen label="Loading..." />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}