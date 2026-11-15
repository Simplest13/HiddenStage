import { apiRequest, jsonBody } from '../client'
import type { ApiAttachment, ApiCategory, ApiEvent, ApiEventListItem } from './types'

export type RequirementPayload = {
  category: string
  title: string
  description?: string
  budget_paise?: number | null
  instructions?: string
}

export type EventWritePayload = {
  name: string
  event_type: string
  description?: string
  event_date: string
  start_time: string
  end_time: string
  guest_count: number
  pin_code: string
  locality: string
  city: string
  state: string
  venue_name?: string
  venue_address?: string
  status?: 'DRAFT' | 'SUBMITTED'
  requirements?: RequirementPayload[]
}

export const eventsApi = {
  categories() {
    return apiRequest<ApiCategory[]>('/catalog/categories/')
  },
  list(status?: string) {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : ''
    return apiRequest<ApiEventListItem[]>(`/events/${query}`)
  },
  get(eventId: string) {
    return apiRequest<ApiEvent>(`/events/${encodeURIComponent(eventId)}/`)
  },
  create(payload: EventWritePayload) {
    return apiRequest<ApiEvent>('/events/', { method: 'POST', ...jsonBody(payload) })
  },
  update(eventId: string, payload: Partial<EventWritePayload>) {
    return apiRequest<ApiEvent>(`/events/${encodeURIComponent(eventId)}/`, {
      method: 'PATCH',
      ...jsonBody(payload),
    })
  },
  submit(eventId: string) {
    return apiRequest<ApiEvent>(`/events/${encodeURIComponent(eventId)}/submit/`, { method: 'POST' })
  },
  withdraw(eventId: string) {
    return apiRequest<ApiEvent>(`/events/${encodeURIComponent(eventId)}/withdraw/`, { method: 'POST' })
  },
  remove(eventId: string) {
    return apiRequest<void>(`/events/${encodeURIComponent(eventId)}/`, { method: 'DELETE' })
  },
  uploadAttachment(eventId: string, file: File) {
    const body = new FormData()
    body.append('file', file)
    return apiRequest<ApiAttachment>(`/events/${encodeURIComponent(eventId)}/attachments/`, { method: 'POST', body })
  },
  deleteAttachment(eventId: string, attachmentId: string) {
    return apiRequest<void>(
      `/events/${encodeURIComponent(eventId)}/attachments/${encodeURIComponent(attachmentId)}/`,
      { method: 'DELETE' },
    )
  },
}
