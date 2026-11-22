import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  return useContext(AuthContext).state
}

export function useAuthActions() {
  const { state: _state, ...actions } = useContext(AuthContext)
  return actions
}

export function useTheme() {
  return useContext(AuthContext).theme
}
