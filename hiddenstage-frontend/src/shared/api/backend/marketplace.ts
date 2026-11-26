import { apiRequest, jsonBody } from '../client'
import type {
  ApiCommitment,
  ApiInvitation,
  ApiProviderDetail,
  ApiProviderMatch,
  ApiProviderOpportunity,
  ApiPublicDirectoryProvider,
  ApiQuotation,
  ApiQuoteRevision,
  Paginated,
} from './types'

export type DiscoveryParams = {
  event?: string
  category?: string
  pin_code?: string
  city?: string
  state?: string
}

export type PublicDirectoryParams = {
  q?: string
  category?: string
  kind?: string
  location?: string
  featured?: boolean
}

export type QuoteItemPayload = {
  requirement_id: string
  kind: 'LINE' | 'PACKAGE'
  package_key?: string
  title: string
  description?: string
  amount_paise: number
}

function queryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function unpaginated<T>(path: string): Promise<T[]> {
  const payload = await apiRequest<T[] | Paginated<T>>(path)
  return Array.isArray(payload) ? payload : payload.results
}

export const marketplaceApi = {
  /** Public directory exploration of verified providers. */
  listPublicProviders(params?: PublicDirectoryParams) {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.category) search.set('category', params.category)
    if (params?.kind) search.set('kind', params.kind)
    if (params?.location) search.set('location', params.location)
    if (params?.featured !== undefined) search.set('featured', String(params.featured))
    const query = search.toString()
    return apiRequest<ApiPublicDirectoryProvider[]>(`/directory/providers/${query ? `?${query}` : ''}`)
  },
  /** Eligible providers for one owned event: category + explicit location coverage. */
  discover(params: DiscoveryParams) {
    return apiRequest<ApiProviderMatch[]>(`/providers/${queryString(params)}`)
  },
  providerDetail(providerId: string) {
    return apiRequest<ApiProviderDetail>(`/providers/${encodeURIComponent(providerId)}/`)
  },

  listEventInvitations(eventId: string) {
    return apiRequest<ApiInvitation[]>(`/events/${encodeURIComponent(eventId)}/invitations/`)
  },
  inviteProvider(eventId: string, payload: { provider_id: string; requirement_id?: string | null; message?: string }) {
    return apiRequest<ApiInvitation>(`/events/${encodeURIComponent(eventId)}/invitations/`, {
      method: 'POST',
      ...jsonBody(payload),
    })
  },
  withdrawInvitation(eventId: string, invitationId: string) {
    return apiRequest<ApiInvitation>(
      `/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/withdraw/`,
      { method: 'POST' },
    )
  },

  listCustomerQuotations() {
    return unpaginated<ApiQuotation>('/customer/quotations/')
  },
  listEventQuotations(eventId: string) {
    return apiRequest<ApiQuotation[]>(`/events/${encodeURIComponent(eventId)}/quotations/`)
  },
  acceptQuotation(quotationId: string, payload: { revision_id: string; package_keys: string[]; requirement_ids: string[] }) {
    return apiRequest<ApiCommitment>(`/quotations/${encodeURIComponent(quotationId)}/acceptance/`, {
      method: 'POST',
      ...jsonBody(payload),
    })
  },

  listCommitments() {
    return unpaginated<ApiCommitment>('/commitments/?page_size=100')
  },
  getCommitment(commitmentId: string) {
    return apiRequest<ApiCommitment>(`/commitments/${encodeURIComponent(commitmentId)}/`)
  },
  releaseCommitment(commitmentId: string, reason: string) {
    return apiRequest<ApiCommitment>(`/commitments/${encodeURIComponent(commitmentId)}/release/`, {
      method: 'POST',
      ...jsonBody({ reason }),
    })
  },

  /** Provider-side endpoints used by the supplier workspace. */
  /** Public requests matched to this provider's services and explicit coverage. */
  listProviderOpportunities() {
    return apiRequest<ApiProviderOpportunity[]>('/provider/opportunities/')
  },

  listProviderInvitations(status?: string) {
    return apiRequest<ApiInvitation[]>(`/provider/invitations/${queryString({ status })}`)
  },
  respondToInvitation(invitationId: string, accept: boolean) {
    return apiRequest<ApiInvitation>(
      `/provider/invitations/${encodeURIComponent(invitationId)}/${accept ? 'accept' : 'decline'}/`,
      { method: 'POST' },
    )
  },
  listProviderQuotations() {
    return apiRequest<ApiQuotation[]>('/provider/quotations/')
  },
  createQuotation(eventId: string) {
    return apiRequest<ApiQuotation>('/provider/quotations/', { method: 'POST', ...jsonBody({ event: eventId }) })
  },
  createRevision(quotationId: string) {
    return apiRequest<ApiQuoteRevision>(`/provider/quotations/${encodeURIComponent(quotationId)}/revisions/`, {
      method: 'POST',
    })
  },
  updateRevision(quotationId: string, revisionId: string, payload: { notes?: string; valid_until?: string | null; items?: QuoteItemPayload[] }) {
    return apiRequest<ApiQuoteRevision>(
      `/provider/quotations/${encodeURIComponent(quotationId)}/revisions/${encodeURIComponent(revisionId)}/`,
      { method: 'PATCH', ...jsonBody(payload) },
    )
  },
  submitRevision(quotationId: string, revisionId: string) {
    return apiRequest<ApiQuoteRevision>(
      `/provider/quotations/${encodeURIComponent(quotationId)}/revisions/${encodeURIComponent(revisionId)}/submit/`,
      { method: 'POST' },
    )
  },
  withdrawQuotation(quotationId: string) {
    return apiRequest<ApiQuotation>(`/provider/quotations/${encodeURIComponent(quotationId)}/withdraw/`, { method: 'POST' })
  },
  listProviderCommitments() {
    return unpaginated<ApiCommitment>('/provider/commitments/?page_size=100')
  },
}
