import { apiRequest, jsonBody } from '../client'
import type {
  ApiCoverage,
  ApiCustomerProfile,
  ApiManagerSearchResult,
  ApiPortfolioItem,
  ApiProfileTeamMember,
  ApiProviderProfile,
  ApiProviderService,
  ProfileTeamPermission,
  ProviderKind,
} from './types'

export type CustomerProfilePayload = {
  pin_code: string
  locality: string
  city: string
  state: string
  avatar?: string | null
  bio?: string
}

export type ProviderProfilePayload = {
  display_name: string
  kind: ProviderKind
  description: string
  contact: string
  categories: string[]
  coverage: Array<Omit<ApiCoverage, 'id'>>
  username?: string
  headline?: string
  primary_category?: string | null
  talent_category?: string
  specializations?: string[]
  performance_styles?: string[]
  experience_summary?: string
  languages?: string[]
  website?: string
  instagram?: string
  youtube?: string
  availability_note?: string
  logo?: string | null
  cover_image?: string | null
  is_public?: boolean
}

export type PortfolioItemPayload = {
  title: string
  description?: string
  category?: string
  event_date?: string | null
  media?: string | null
  external_url?: string
  media_kind?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK'
  visibility?: 'PUBLIC' | 'PRIVATE'
  position?: number
}

export const profilesApi = {
  async getCustomerProfile() {
    return apiRequest<ApiCustomerProfile | null>('/me/customer-profile/')
  },
  saveCustomerProfile(payload: CustomerProfilePayload) {
    return apiRequest<ApiCustomerProfile>('/me/customer-profile/', { method: 'PUT', ...jsonBody(payload) })
  },
  async getProviderProfile() {
    return apiRequest<ApiProviderProfile | null>('/me/provider-profile/')
  },
  saveProviderProfile(payload: ProviderProfilePayload) {
    return apiRequest<ApiProviderProfile>('/me/provider-profile/', { method: 'PUT', ...jsonBody(payload) })
  },
  listProviderServices() {
    return apiRequest<ApiProviderService[]>('/me/provider-services/')
  },
  createProviderService(payload: { category: string; title?: string; description?: string; base_price_paise?: number | null }) {
    return apiRequest<ApiProviderService>('/me/provider-services/', { method: 'POST', ...jsonBody(payload) })
  },
  updateProviderService(serviceId: string, payload: Partial<{ title: string; description: string; base_price_paise: number | null; is_active: boolean }>) {
    return apiRequest<ApiProviderService>(`/me/provider-services/${encodeURIComponent(serviceId)}/`, {
      method: 'PATCH',
      ...jsonBody(payload),
    })
  },
  deleteProviderService(serviceId: string) {
    return apiRequest<void>(`/me/provider-services/${encodeURIComponent(serviceId)}/`, { method: 'DELETE' })
  },
  listProviderCoverage() {
    return apiRequest<ApiCoverage[]>('/me/provider-coverage/')
  },
  createProviderCoverage(payload: Omit<ApiCoverage, 'id'>) {
    return apiRequest<ApiCoverage>('/me/provider-coverage/', { method: 'POST', ...jsonBody(payload) })
  },
  deleteProviderCoverage(coverageId: string) {
    return apiRequest<void>(`/me/provider-coverage/${encodeURIComponent(coverageId)}/`, { method: 'DELETE' })
  },
  listPortfolioItems() {
    return apiRequest<ApiPortfolioItem[]>('/profiles/portfolio/')
  },
  createPortfolioItem(payload: PortfolioItemPayload | FormData) {
    if (payload instanceof FormData) {
      return apiRequest<ApiPortfolioItem>('/profiles/portfolio/', { method: 'POST', body: payload })
    }
    return apiRequest<ApiPortfolioItem>('/profiles/portfolio/', { method: 'POST', ...jsonBody(payload) })
  },
  updatePortfolioItem(id: string, payload: Partial<PortfolioItemPayload> | FormData) {
    if (payload instanceof FormData) {
      return apiRequest<ApiPortfolioItem>(`/profiles/portfolio/${encodeURIComponent(id)}/`, { method: 'PATCH', body: payload })
    }
    return apiRequest<ApiPortfolioItem>(`/profiles/portfolio/${encodeURIComponent(id)}/`, { method: 'PATCH', ...jsonBody(payload) })
  },
  deletePortfolioItem(id: string) {
    return apiRequest<void>(`/profiles/portfolio/${encodeURIComponent(id)}/`, { method: 'DELETE' })
  },
  listTeamMembers() {
    return apiRequest<ApiProfileTeamMember[]>('/profiles/team/')
  },
  createTeamMember(payload: { email: string; permissions: ProfileTeamPermission[] }) {
    return apiRequest<ApiProfileTeamMember>('/profiles/team/', { method: 'POST', ...jsonBody(payload) })
  },
  updateTeamMember(id: string, payload: { permissions?: ProfileTeamPermission[]; is_active?: boolean }) {
    return apiRequest<ApiProfileTeamMember>(`/profiles/team/${encodeURIComponent(id)}/`, { method: 'PATCH', ...jsonBody(payload) })
  },
  deleteTeamMember(id: string) {
    return apiRequest<void>(`/profiles/team/${encodeURIComponent(id)}/`, { method: 'DELETE' })
  },
  searchManagers(q: string) {
    return apiRequest<ApiManagerSearchResult[]>(`/profiles/managers/search/?q=${encodeURIComponent(q)}`)
  },
}
