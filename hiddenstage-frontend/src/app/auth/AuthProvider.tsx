import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, anonymousAuthState } from './AuthContext'
import type { AuthState, SessionUser } from './authTypes'
import { sessionApi, type LoginInput, type RegisterInput } from '../../shared/api/backend/session'
import { profilesApi, type CustomerProfilePayload, type ProviderProfilePayload } from '../../shared/api/backend/profiles'
import type { ApiUser } from '../../shared/api/backend/types'
import { isApiError } from '../../shared/api/client'

export function toSessionUser(user: ApiUser): SessionUser {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    emailVerified: user.email_verified,
    // Older backends omit the field; required is the safe default.
    emailVerificationRequired: user.email_verification_required !== false,
    profileCompleted: user.profile_completed,
    accountType: user.role,
    isStaff: Boolean(user.is_staff),
    isSuperuser: Boolean(user.is_superuser),
  }
}

function authenticated(user: SessionUser): AuthState {
  return { status: 'authenticated', roles: [user.accountType], user }
}

export function AuthProvider({ children, state }: { children: ReactNode; state?: AuthState }) {
  const [authState, setAuthState] = useState<AuthState>(state ?? { status: 'loading' })

  const refresh = useCallback(async () => {
    try {
      const user = toSessionUser(await sessionApi.me())
      setAuthState(authenticated(user))
      return user
    } catch (error) {
      // 401 is the normal signed-out state; anything else must not masquerade as one.
      if (isApiError(error) && error.status !== 401 && error.status !== 403) throw error
      setAuthState(anonymousAuthState)
      return null
    }
  }, [])

  useEffect(() => {
    if (state) return
    let active = true
    sessionApi.bootstrap()
      .then(() => sessionApi.me())
      .then((user) => { if (active) setAuthState(authenticated(toSessionUser(user))) })
      .catch(() => { if (active) setAuthState(anonymousAuthState) })
    return () => { active = false }
  }, [state])

  const register = useCallback(async (input: RegisterInput) => {
    const response = await sessionApi.register(input)
    const user = toSessionUser(response)
    setAuthState(authenticated(user))
    return { user, verificationEmailSent: response.verification_email_sent !== false }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const user = toSessionUser(await sessionApi.login(input))
    setAuthState(authenticated(user))
    return user
  }, [])

  const logout = useCallback(async () => {
    try { await sessionApi.logout() } finally { setAuthState(anonymousAuthState) }
  }, [])

  const verifyEmail = useCallback(async (token: string) => {
    const user = toSessionUser(await sessionApi.verifyEmail(token))
    setAuthState(authenticated(user))
    return user
  }, [])

  const resendVerification = useCallback(async () => {
    const response = await sessionApi.resendVerification()
    return response.email_sent
  }, [])
  const requestPasswordReset = useCallback(async (email: string) => { await sessionApi.requestPasswordReset(email) }, [])
  const resetPassword = useCallback(async (token: string, password: string) => { await sessionApi.confirmPasswordReset(token, password) }, [])

  const saveCustomerProfile = useCallback(async (payload: CustomerProfilePayload) => {
    await profilesApi.saveCustomerProfile(payload)
    await refresh()
  }, [refresh])

  const saveProviderProfile = useCallback(async (payload: ProviderProfilePayload) => {
    await profilesApi.saveProviderProfile(payload)
    await refresh()
  }, [refresh])

  const value = useMemo(() => ({
    state: authState,
    register, login, logout, refresh, verifyEmail, resendVerification,
    requestPasswordReset, resetPassword, saveCustomerProfile, saveProviderProfile,
  }), [authState, register, login, logout, refresh, verifyEmail, resendVerification, requestPasswordReset, resetPassword, saveCustomerProfile, saveProviderProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
