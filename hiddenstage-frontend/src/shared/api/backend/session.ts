import { apiRequest, ensureCsrfToken, jsonBody, resetCsrfToken } from '../client'
import type { AccountRole, ApiNotification, ApiUser } from './types'

export type RegisterInput = {
  full_name: string
  username?: string
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
  checkUsername(username: string) {
    return apiRequest<{ available: boolean; username: string; message: string }>(
      `/auth/check-username/?username=${encodeURIComponent(username)}`
    )
  },
  updateSettings(data: {
    full_name?: string
    email?: string
    phone?: string
    username?: string
    theme_preference?: 'light' | 'dark'
  }) {
    return apiRequest<ApiUser>('/auth/settings/', { method: 'PATCH', ...jsonBody(data) })
  },
  changePassword(current_password: string, new_password: string) {
    return apiRequest<{ detail: string }>('/auth/password/change/', {
      method: 'POST',
      ...jsonBody({ current_password, new_password }),
    })
  },
  async uploadAvatar(file: File) {
    await ensureCsrfToken()
    const formData = new FormData()
    formData.append('avatar', file)
    return apiRequest<ApiUser>('/auth/avatar/', {
      method: 'POST',
      body: formData,
    })
  },
  removeAvatar() {
    return apiRequest<ApiUser>('/auth/avatar/', {
      method: 'POST',
      ...jsonBody({ action: 'remove' }),
    })
  },
  getNotifications() {
    return apiRequest<{ unread_count: number; results: ApiNotification[] }>('/auth/notifications/')
  },
  markNotificationsRead(ids?: string[], mark_all = false) {
    return apiRequest<{ marked_read: number }>('/auth/notifications/mark-read/', {
      method: 'POST',
      ...jsonBody({ ids: ids || [], mark_all }),
    })
  },
}
