import { lazy, Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { AccountRole, SessionUser } from '../auth/authTypes'
import { routes } from '../routes/routePaths'
import { Spinner } from '../../shared/ui/feedback'

// Verification only blocks the workspace when the deployment still requires it.
// The account's recorded state is left alone either way.
function verificationPending(user: SessionUser) {
  return user.emailVerificationRequired && !user.emailVerified
}

export function RequireAuthentication() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return <Spinner label="Checking your session" />
  }
  if (auth.status === 'anonymous') {
    return <Navigate to={routes.auth.login} replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

export function RequireRole({ role }: { role: AccountRole }) {
  const auth = useAuth()
  if (auth.status === 'loading') return <Spinner label="Checking your session" />
  if (auth.status !== 'authenticated') return <Navigate to={routes.auth.login} replace />
  if (!auth.roles.includes(role)) return <Navigate to={routes.forbidden} replace />
  return <Outlet />
}

export function RequireVerifiedCustomer() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Spinner label="Checking your session" />
  if (auth.status !== 'authenticated') return <Navigate to={routes.auth.login} replace />
  if (!auth.roles.includes('CUSTOMER')) return <Navigate to={routes.forbidden} replace />
  if (verificationPending(auth.user)) return <Navigate to={routes.auth.verifyEmail} replace />
  return <Outlet />
}

export function RequireCustomerOnboarding() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Spinner label="Checking your session" />
  if (auth.status !== 'authenticated') return <Navigate to={routes.auth.login} replace />
  if (!auth.roles.includes('CUSTOMER')) return <Navigate to={routes.forbidden} replace />
  if (verificationPending(auth.user)) return <Navigate to={routes.auth.verifyEmail} replace />
  if (!auth.user.profileCompleted) return <Navigate to={routes.customer.onboarding} replace />
  return <Outlet />
}

export function RequireProviderOnboarding() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Spinner label="Checking your session" />
  if (auth.status !== 'authenticated') return <Navigate to={routes.auth.login} replace />
  if (!auth.roles.includes('PROVIDER')) return <Navigate to={routes.forbidden} replace />
  if (verificationPending(auth.user)) return <Navigate to={routes.auth.verifyEmail} replace />
  return <Outlet />
}

export function RequireCompletedProvider() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Spinner label="Checking your session" />
  if (auth.status !== 'authenticated') return <Navigate to={routes.auth.login} replace />
  if (!auth.roles.includes('PROVIDER')) return <Navigate to={routes.forbidden} replace />
  if (verificationPending(auth.user)) return <Navigate to={routes.auth.verifyEmail} replace />
  if (!auth.user.profileCompleted) return <Navigate to={routes.onboarding.provider} replace />
  return <Outlet />
}

const AdminLoginPage = lazy(() => import('../../features/admin/AdminLoginPage'))

export function RequireAdminOrLogin() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Spinner label="Checking your session" />
  if (auth.status !== 'authenticated' || !auth.user.isStaff) {
    return (
      <Suspense fallback={<Spinner label="Loading administrator login" />}>
        <AdminLoginPage />
      </Suspense>
    )
  }
  return <Outlet />
}

export function RequireAdmin() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Spinner label="Checking your session" />
  if (auth.status !== 'authenticated') return <Navigate to={routes.auth.login} replace />
  if (!auth.user.isStaff) return <Navigate to={routes.forbidden} replace />
  return <Outlet />
}
