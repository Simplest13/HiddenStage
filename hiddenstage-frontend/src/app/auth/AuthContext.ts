import { createContext } from 'react'
import type { AuthState } from './authTypes'

export const anonymousAuthState: AuthState = { status: 'anonymous' }
export const AuthContext = createContext<AuthState>(anonymousAuthState)
