import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import Loading from '../components/Loading.jsx'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <Loading fullscreen label="Loading your workspace..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}