import { apiRequest, ensureCsrfToken, jsonBody } from '../client'
import type {
  ApiBooking,
  ApiChatMessage,
  ApiConversation,
  ApiCustomerConnection,
  ApiInvoice,
  ApiPaymentTransaction,
  ApiPublicFeedEvent,
} from './types'

export const bookingsApi = {
  list(status?: string) {
    const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : ''
    return apiRequest<ApiBooking[]>(`/events/bookings/${q}`)
  },
  get(id: string) {
    return apiRequest<ApiBooking>(`/events/bookings/${id}/`)
  },
  complete(id: string, feedback = '') {
    return apiRequest<ApiBooking>(`/events/${id}/complete/`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    })
  },
}

export const publicFeedApi = {
  getFeed() {
    return apiRequest<ApiPublicFeedEvent[]>('/events/feed/')
  },
}

export const networkApi = {
  listConnections() {
    return apiRequest<ApiCustomerConnection[]>('/network/connections/')
  },
  connect(providerId?: string, username?: string, notes = '') {
    return apiRequest<ApiCustomerConnection>('/network/connections/connect/', {
      method: 'POST',
      ...jsonBody({ provider_id: providerId, username, notes }),
    })
  },
  disconnect(providerId: string) {
    return apiRequest<void>(`/network/connections/${providerId}/`, {
      method: 'DELETE',
    })
  },
  searchProviders(q: string, category?: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category && category !== 'all') params.set('category', category)
    return apiRequest<
      Array<{
        id: string
        name: string
        username: string | null
        avatar: string | null
        business_name: string
        category: string
        city: string
        is_connected: boolean
      }>
    >(`/network/search-providers/?${params.toString()}`)
  },
  listConversations() {
    return apiRequest<ApiConversation[]>('/network/conversations/')
  },
  startConversation(targetId: string, eventId?: string) {
    return apiRequest<ApiConversation>('/network/conversations/', {
      method: 'POST',
      ...jsonBody({ provider_id: targetId, event_id: eventId }),
    })
  },
  getConversation(id: string) {
    return apiRequest<{ conversation: ApiConversation; messages: ApiChatMessage[] }>(
      `/network/conversations/${id}/`
    )
  },
  async sendMessage(convId: string, content: string, file?: File) {
    await ensureCsrfToken()
    if (file) {
      const fd = new FormData()
      fd.append('content', content)
      fd.append('attachment', file)
      return apiRequest<ApiChatMessage>(`/network/conversations/${convId}/messages/`, {
        method: 'POST',
        body: fd,
      })
    }
    return apiRequest<ApiChatMessage>(`/network/conversations/${convId}/messages/`, {
      method: 'POST',
      ...jsonBody({ content }),
    })
  },
}

export const paymentsApi = {
  getSummary() {
    return apiRequest<{
      total_booked_paise: number
      total_paid_paise: number
      advance_pending_paise: number
      final_pending_paise: number
      event_breakdown: Array<{
        event_id: string
        event_name: string
        event_date: string | null
        total_booked_paise: number
        total_paid_paise: number
        invoices_count: number
        status: string
      }>
    }>('/payments/summary/')
  },
  listInvoices(status?: string, eventId?: string) {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.set('status', status)
    if (eventId) params.set('event_id', eventId)
    const q = params.size ? `?${params.toString()}` : ''
    return apiRequest<ApiInvoice[]>(`/payments/invoices/${q}`)
  },
  getInvoice(id: string) {
    return apiRequest<ApiInvoice>(`/payments/invoices/${id}/`)
  },
  listTransactions() {
    return apiRequest<ApiPaymentTransaction[]>('/payments/transactions/')
  },
  simulatePayment(invoiceId: string) {
    return apiRequest<{
      detail: string
      transaction: ApiPaymentTransaction
      invoice: ApiInvoice
    }>('/payments/pay/', {
      method: 'POST',
      ...jsonBody({ invoice_id: invoiceId }),
    })
  },
}
