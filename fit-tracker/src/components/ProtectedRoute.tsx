import { Navigate, Outlet } from 'react-router-dom'
import { LoadingSpinner } from './LoadingSpinner'
import { useAuth } from '../hooks/useAuth'

/** Cloud users must sign in; local-only mode skips this gate. */
export function ProtectedRoute() {
  const { user, loading, isCloudEnabled } = useAuth()

  if (isCloudEnabled && loading) {
    return <LoadingSpinner label="Checking session…" />
  }

  if (isCloudEnabled && !user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
