import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { AuthProvider } from '../auth/AuthProvider'
import type { AuthState } from '../auth/authTypes'
import { ToastProvider } from '../../shared/ui/Toast'
import { queryClient } from './queryClient'

export function AppProviders({ children, authState }: { children: ReactNode; authState?: AuthState }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider state={authState}>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
