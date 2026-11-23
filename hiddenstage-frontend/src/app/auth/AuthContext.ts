import { createContext } from 'react'
import type { AuthState, RegisterResult, SessionUser } from './authTypes'
import type { LoginInput, RegisterInput } from '../../shared/api/backend/session'
import type { CustomerProfilePayload, ProviderProfilePayload } from '../../shared/api/backend/profiles'
import type { ApiUser } from '../../shared/api/backend/types'

export const anonymousAuthState: AuthState = { status: 'anonymous' }

export type AuthActions = {
  state: AuthState
  theme: 'light' | 'dark'
  setTheme(theme: 'light' | 'dark'): void
  toggleTheme(): void
  register(input: RegisterInput): Promise<RegisterResult>
  login(input: LoginInput): Promise<SessionUser>
  logout(): Promise<void>
  refresh(user?: ApiUser): Promise<SessionUser | null>
  verifyEmail(token: string): Promise<SessionUser>
  resendVerification(): Promise<boolean>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(token: string, newPassword: string): Promise<void>
  saveCustomerProfile(payload: CustomerProfilePayload): Promise<void>
  saveProviderProfile(payload: ProviderProfilePayload): Promise<void>
}

const unavailable = async (): Promise<never> => { throw new Error('Authentication provider unavailable.') }

export const AuthContext = createContext<AuthActions>({
  state: { status: 'loading' },
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  register: unavailable,
  login: unavailable,
  logout: async () => {},
  refresh: async () => null,
  verifyEmail: unavailable,
  resendVerification: async () => false,
  requestPasswordReset: async () => {},
  resetPassword: async () => {},
  saveCustomerProfile: unavailable,
  saveProviderProfile: unavailable,
})
