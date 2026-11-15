import { apiRequest, ensureCsrfToken, jsonBody, resetCsrfToken } from '../client'
import type { AccountRole, ApiUser } from './types'

export type RegisterInput = {
  full_name: string
  email: string
  password: string
  phone?: string
  role: AccountRole
  accept_terms: boolean
}

export type LoginInput = { email: string; password: string }

/**
 * Session endpoints. The browser never receives or stores a token: Django sets an
 * HttpOnly session cookie and the CSRF token is echoed from its companion cookie.
 */
export const sessionApi = {
  async bootstrap() {
    await ensureCsrfToken()
  },
  me() {
    return apiRequest<ApiUser>('/auth/me/')
  },
  register(input: RegisterInput) {
    return apiRequest<ApiUser>('/auth/register/', { method: 'POST', ...jsonBody(input) })
  },
  login(input: LoginInput) {
    return apiRequest<ApiUser>('/auth/login/', { method: 'POST', ...jsonBody(input) })
  },
  async logout() {
    try {
      await apiRequest<void>('/auth/logout/', { method: 'POST' })
    } finally {
      resetCsrfToken()
    }
  },
  verifyEmail(token: string) {
    return apiRequest<ApiUser>('/auth/email/verify/', { method: 'POST', ...jsonBody({ token }) })
  },
  resendVerification() {
    return apiRequest<{ detail: string; email_sent: boolean }>('/auth/email/resend/', { method: 'POST' })
  },
  requestPasswordReset(email: string) {
    return apiRequest<{ detail: string }>('/auth/password/reset/', { method: 'POST', ...jsonBody({ email }) })
  },
  confirmPasswordReset(token: string, newPassword: string) {
    return apiRequest<{ detail: string }>('/auth/password/reset/confirm/', {
      method: 'POST',
      ...jsonBody({ token, new_password: newPassword }),
    })
  },
}
