import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, anonymousAuthState } from './AuthContext'
import type { AuthState } from './authTypes'
import type { CustomerProfile, LoginInput, ProviderProfile, RegisterInput } from '../../shared/api/customerContracts'
import { demoProviderApi } from '../../features/onboarding/services/demoProviderApi'

function rolesFor(accountType: string) { return accountType === 'PROVIDER' ? ['PROVIDER'] as const : ['USER', 'CUSTOMER'] as const }
import { demoCustomerApi } from '../../features/customer/services/demoCustomerApi'

export function AuthProvider({ children, state }: { children: ReactNode; state?: AuthState }) {
  const [authState, setAuthState] = useState<AuthState>(() => { const identity = demoCustomerApi.getSession(); return state ?? (identity ? { status: 'authenticated', roles: rolesFor(identity.accountType), customer: identity } : anonymousAuthState) })
  const register = useCallback(async (input: RegisterInput) => { const customer = await demoCustomerApi.register(input); setAuthState({ status: 'authenticated', roles: rolesFor(customer.accountType), customer }); return customer }, [])
  const login = useCallback(async (input: LoginInput) => { const customer = await demoCustomerApi.login(input); setAuthState({ status: 'authenticated', roles: rolesFor(customer.accountType), customer }); return customer }, [])
  const logout = useCallback(async () => { await demoCustomerApi.logout(); setAuthState(anonymousAuthState) }, [])
  const verifyEmail = useCallback(async (email: string) => { const customer = await demoCustomerApi.verifyEmail(email); setAuthState({ status: 'authenticated', roles: rolesFor(customer.accountType), customer }) }, [])
  const resendVerification = useCallback(async (email: string) => demoCustomerApi.resendVerification(email), [])
  const requestPasswordReset = useCallback(async (email: string) => demoCustomerApi.requestPasswordReset(email), [])
  const resetPassword = useCallback(async (email: string, password: string) => demoCustomerApi.resetPassword(email, password), [])
  const completeCustomerProfile = useCallback(async (profile: CustomerProfile) => {
    await demoCustomerApi.updateCustomerProfile(profile)
    setAuthState((current) => current.status === 'authenticated' && current.customer ? { ...current, customer: { ...current.customer, profileCompleted: true } } : current)
  }, [])
  const completeProviderProfile = useCallback(async (profile: ProviderProfile) => {
    await demoProviderApi.completeProviderOnboarding(profile)
    await demoCustomerApi.setProfileCompleted()
    setAuthState((current) => current.status === 'authenticated' && current.customer ? { ...current, customer: { ...current.customer, profileCompleted: true } } : current)
  }, [])
  const value = useMemo(() => ({ state: authState, register, login, logout, verifyEmail, resendVerification, requestPasswordReset, resetPassword, completeCustomerProfile, completeProviderProfile }), [authState, register, login, logout, verifyEmail, resendVerification, requestPasswordReset, resetPassword, completeCustomerProfile, completeProviderProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
