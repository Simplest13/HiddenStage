import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { AccountRole } from '../auth/authTypes'
import { routes } from '../routes/routePaths'
import { Spinner } from '../../shared/ui/feedback'

export function RequireAuthentication() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return <Spinner label="Checking your session" />
  }
  if (auth.status === 'anonymous') {
    return <Navigate to={routes.auth.login} replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

export function RequireRole({ role }: { role: AccountRole }) {
  const auth = useAuth()
  if (auth.status !== 'authenticated') return <Navigate to={routes.auth.login} replace />
  if (!auth.roles.includes(role)) return <Navigate to={routes.forbidden} replace />
  return <Outlet />
}
