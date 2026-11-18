import { apiRequest, jsonBody } from '../client'

export type AdminCategory = {
  id: string
  code: string
  name: string
  description: string
  sort_order: number
  is_active: boolean
}

export type AdminOverviewData = {
  metrics: {
    users: { total: number; active: number; customers: number; providers: number; staff: number }
    providers: {
      total: number
      verified: number
      pending: number
      unverified: number
      rejected: number
      managers: number
      workers: number
    }
    businesses: { total: number; active: number }
    events: { total: number; draft: number; submitted: number; withdrawn: number; closed: number }
    invitations_total: number
    quotations: { total: number; open?: number; submitted?: number; withdrawn?: number }
    commitments: { total: number; active: number; released: number; active_total_paise: number }
    network: { active_associations: number; active_assignments: number; completed_assignments: number }
    categories: { total: number; active: number }
  }
  recent_audit: AdminAuditEntry[]
}

export type AdminUser = {
  id: string
  email: string
  full_name: string
  phone: string
  role: 'CUSTOMER' | 'PROVIDER'
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  email_verified: boolean
  email_verified_at: string | null
  profile_completed: boolean
  provider_kind: 'MANAGER' | 'WORKER' | null
  verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | null
  date_joined: string
  last_login: string | null
}

export type AdminProvider = {
  id: string
  user_id: string
  user_email: string
  user_full_name: string
  user_is_active: boolean
  display_name: string
  kind: 'MANAGER' | 'WORKER'
  contact: string
  description: string
  business_name: string
  verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  completed_at: string | null
  services: { id: string; category: string; category_name: string; title: string; base_price_paise: number; is_active: boolean }[]
  coverage: { id: string; pin_code: string; locality: string; city: string; state: string }[]
  created_at: string
  updated_at: string
}

export type AdminBusiness = {
  id: string
  name: string
  description: string
  city: string
  state: string
  is_active: boolean
  created_at: string
  representatives: {
    id: string
    user_id: string
    user_email: string
    user_full_name: string
    role: string
    scopes: string[]
    is_active: boolean
  }[]
}

export type AdminEvent = {
  id: string
  name: string
  event_type: string
  event_date: string
  city: string
  state: string
  pin_code: string
  guest_count: number
  status: 'DRAFT' | 'SUBMITTED' | 'WITHDRAWN' | 'CLOSED'
  customer_email: string
  customer_name: string
  requirement_count: number
  submitted_at: string | null
  withdrawn_at: string | null
  created_at: string
}

export type AdminCommitment = {
  id: string
  event_id: string
  event_name: string
  event_date: string
  customer_email: string
  customer_name: string
  provider_email: string
  provider_name: string
  status: 'ACTIVE' | 'RELEASED'
  total_paise: number
  line_count: number
  accepted_at: string
  released_at: string | null
  release_reason: string
}

export type AdminAuditEntry = {
  id: string
  source: string
  action: string
  actor_email: string
  actor_name: string
  target_type: string
  target_id: string
  target_label: string
  note: string
  metadata: Record<string, unknown>
  created_at: string
}

export const adminApi = {
  overview() {
    return apiRequest<AdminOverviewData>('/admin/overview/')
  },
  listUsers(params?: { role?: string; is_active?: boolean; is_staff?: boolean; q?: string }) {
    const query = new URLSearchParams()
    if (params?.role) query.set('role', params.role)
    if (params?.is_active !== undefined) query.set('is_active', String(params.is_active))
    if (params?.is_staff !== undefined) query.set('is_staff', String(params.is_staff))
    if (params?.q) query.set('q', params.q)
    const qs = query.toString()
    return apiRequest<AdminUser[]>(`/admin/users/${qs ? `?${qs}` : ''}`)
  },
  updateUser(
    userId: string,
    payload: { is_active?: boolean; is_staff?: boolean; mark_email_verified?: boolean; note?: string }
  ) {
    return apiRequest<AdminUser>(`/admin/users/${userId}/`, { method: 'PATCH', ...jsonBody(payload) })
  },
  listProviders(params?: { verification_status?: string; kind?: string; q?: string }) {
    const query = new URLSearchParams()
    if (params?.verification_status) query.set('verification_status', params.verification_status)
    if (params?.kind) query.set('kind', params.kind)
    if (params?.q) query.set('q', params.q)
    const qs = query.toString()
    return apiRequest<AdminProvider[]>(`/admin/providers/${qs ? `?${qs}` : ''}`)
  },
  verifyProvider(
    providerId: string,
    payload: { verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'; note?: string }
  ) {
    return apiRequest<AdminProvider>(`/admin/providers/${providerId}/verification/`, {
      method: 'POST',
      ...jsonBody(payload),
    })
  },
  listBusinesses(params?: { q?: string }) {
    const query = new URLSearchParams()
    if (params?.q) query.set('q', params.q)
    const qs = query.toString()
    return apiRequest<AdminBusiness[]>(`/admin/businesses/${qs ? `?${qs}` : ''}`)
  },
  updateBusiness(businessId: string, payload: { is_active?: boolean; name?: string; city?: string; state?: string; note?: string }) {
    return apiRequest<AdminBusiness>(`/admin/businesses/${businessId}/`, {
      method: 'PATCH',
      ...jsonBody(payload),
    })
  },
  listEvents(params?: { status?: string; q?: string }) {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.q) query.set('q', params.q)
    const qs = query.toString()
    return apiRequest<AdminEvent[]>(`/admin/events/${qs ? `?${qs}` : ''}`)
  },
  withdrawEvent(eventId: string, reason?: string) {
    return apiRequest<AdminEvent>(`/admin/events/${eventId}/withdraw/`, {
      method: 'POST',
      ...jsonBody({ reason: reason ?? '' }),
    })
  },
  listCommitments(params?: { status?: string; q?: string }) {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.q) query.set('q', params.q)
    const qs = query.toString()
    return apiRequest<AdminCommitment[]>(`/admin/commitments/${qs ? `?${qs}` : ''}`)
  },
  releaseCommitment(commitmentId: string, reason?: string) {
    return apiRequest<AdminCommitment>(`/admin/commitments/${commitmentId}/release/`, {
      method: 'POST',
      ...jsonBody({ reason: reason ?? '' }),
    })
  },
  listCategories() {
    return apiRequest<AdminCategory[]>('/admin/categories/')
  },
  createCategory(payload: { code: string; name: string; description?: string; sort_order?: number; is_active?: boolean }) {
    return apiRequest<AdminCategory>('/admin/categories/', { method: 'POST', ...jsonBody(payload) })
  },
  updateCategory(
    categoryId: string,
    payload: { name?: string; description?: string; sort_order?: number; is_active?: boolean }
  ) {
    return apiRequest<AdminCategory>(`/admin/categories/${categoryId}/`, {
      method: 'PATCH',
      ...jsonBody(payload),
    })
  },
  listAudit(params?: { source?: string; q?: string; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.source) query.set('source', params.source)
    if (params?.q) query.set('q', params.q)
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return apiRequest<AdminAuditEntry[]>(`/admin/audit/${qs ? `?${qs}` : ''}`)
  },
}
