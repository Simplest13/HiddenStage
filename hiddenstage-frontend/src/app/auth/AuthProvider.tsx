import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, anonymousAuthState } from './AuthContext'
import type { AuthState, SessionUser } from './authTypes'
import { sessionApi, type LoginInput, type RegisterInput } from '../../shared/api/backend/session'
import { profilesApi, type CustomerProfilePayload, type ProviderProfilePayload } from '../../shared/api/backend/profiles'
import type { ApiUser } from '../../shared/api/backend/types'
import { isApiError, resolveMediaUrl } from '../../shared/api/client'
import { clearApiDataCache } from '../../shared/api/backend/useApiData'

export function toSessionUser(user: ApiUser): SessionUser {
  return {
    id: user.id,
    fullName: user.full_name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatarUrl: resolveMediaUrl(user.avatar_url),
    themePreference: user.theme_preference ?? 'light',
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

function getCachedSessionUser(): SessionUser | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    const raw = window.sessionStorage.getItem('hs_session_user')
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

function setCachedSessionUser(user: SessionUser | null) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    if (user) {
      window.sessionStorage.setItem('hs_session_user', JSON.stringify(user))
    } else {
      window.sessionStorage.removeItem('hs_session_user')
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children, state }: { children: ReactNode; state?: AuthState }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (state) return state
    const cached = getCachedSessionUser()
    return cached ? authenticated(cached) : { status: 'loading' }
  })
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('hiddenstage-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('hiddenstage-theme', theme)
  }, [theme])

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme)
    if (authState.status === 'authenticated') {
      void sessionApi.updateSettings({ theme_preference: newTheme }).catch(() => {})
    }
  }, [authState.status])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  const refresh = useCallback(async (preloadedUser?: ApiUser) => {
    try {
      const user = toSessionUser(preloadedUser ?? await sessionApi.me())
      setCachedSessionUser(user)
      setAuthState(authenticated(user))
      if (user.themePreference && user.themePreference !== theme) {
        setThemeState(user.themePreference)
      }
      return user
    } catch (error) {
      // 401 is the normal signed-out state; anything else must not masquerade as one.
      if (isApiError(error) && error.status !== 401 && error.status !== 403) throw error
      setCachedSessionUser(null)
      setAuthState(anonymousAuthState)
      return null
    }
  }, [theme])

  useEffect(() => {
    if (state) return
    let active = true
    Promise.allSettled([sessionApi.bootstrap(), sessionApi.me()])
      .then(([, meResult]) => {
        if (!active) return
        if (meResult.status === 'fulfilled') {
          const user = toSessionUser(meResult.value)
          setCachedSessionUser(user)
          setAuthState(authenticated(user))
          if (user.themePreference) {
            setThemeState(user.themePreference)
          }
        } else {
          setCachedSessionUser(null)
          setAuthState(anonymousAuthState)
        }
      })
    return () => { active = false }
  }, [state])

  const register = useCallback(async (input: RegisterInput) => {
    const response = await sessionApi.register(input)
    const user = toSessionUser(response)
    setCachedSessionUser(user)
    setAuthState(authenticated(user))
    return { user, verificationEmailSent: response.verification_email_sent !== false }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const user = toSessionUser(await sessionApi.login(input))
    setCachedSessionUser(user)
    setAuthState(authenticated(user))
    return user
  }, [])

  const logout = useCallback(async () => {
    try { await sessionApi.logout() } finally {
      setCachedSessionUser(null)
      clearApiDataCache()
      setAuthState(anonymousAuthState)
    }
  }, [])

  const verifyEmail = useCallback(async (token: string) => {
    const user = toSessionUser(await sessionApi.verifyEmail(token))
    setCachedSessionUser(user)
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

  const value = useMemo(
    () => ({
      state: authState,
      theme,
      setTheme,
      toggleTheme,
      register,
      login,
      logout,
      refresh,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      saveCustomerProfile,
      saveProviderProfile,
    }),
    [
      authState,
      theme,
      setTheme,
      toggleTheme,
      register,
      login,
      logout,
      refresh,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      saveCustomerProfile,
      saveProviderProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
