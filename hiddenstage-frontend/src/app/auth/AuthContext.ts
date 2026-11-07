import { createContext } from 'react'
import type { CustomerIdentity, CustomerProfile, LoginInput, ProviderProfile, RegisterInput } from '../../shared/api/customerContracts'
import type { AuthState } from './authTypes'

export const anonymousAuthState: AuthState = { status: 'anonymous' }
export type AuthActions = {
  state: AuthState
  register(input: RegisterInput): Promise<CustomerIdentity>
  login(input: LoginInput): Promise<CustomerIdentity>
  logout(): Promise<void>
  verifyEmail(email: string): Promise<void>
  resendVerification(email: string): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(email: string, password: string): Promise<void>
  completeCustomerProfile(profile: CustomerProfile): Promise<void>
  completeProviderProfile(profile: ProviderProfile): Promise<void>
}
export const AuthContext = createContext<AuthActions>({
  state: anonymousAuthState,
  register: async () => { throw new Error('Authentication provider unavailable.') }, login: async () => { throw new Error('Authentication provider unavailable.') }, logout: async () => {}, verifyEmail: async () => {}, resendVerification: async () => {}, requestPasswordReset: async () => {}, resetPassword: async () => {}, completeCustomerProfile: async () => {}, completeProviderProfile: async () => {},
})
