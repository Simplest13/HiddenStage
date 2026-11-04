import { type ReactNode } from 'react'
import { AuthContext, anonymousAuthState } from './AuthContext'
import type { AuthState } from './authTypes'

export function AuthProvider({ children, state = anonymousAuthState }: { children: ReactNode; state?: AuthState }) {
  // The host will supply session-backed state once the backend contract exists.
  // This foundation never treats local storage or a local form as authentication.
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
