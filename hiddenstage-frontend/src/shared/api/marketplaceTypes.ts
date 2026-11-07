import type { CustomerEvent, ProviderCoverageLocation, ProviderProfile } from './customerContracts'

/** UI-domain types for the provider and event marketplace screens. The adapter owns backend mapping. */
export type ProviderService = {
  id: string
  category: string
  title: string
  description: string
  basePricePaise: number | null
  isActive: boolean
}

export type ProviderMatch = ProviderProfile & {
  id: string
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  matchingCoverage: ProviderCoverageLocation[]
  exactPinMatch: boolean
  alreadyInvited: boolean
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED'
export type DemoInvitation = {
  id: string
  eventId: string
  providerId: string
  requirementId: string | null
  message: string
  status: InvitationStatus
  createdAt: string
  expiresAt: string | null
}

export type QuoteRevisionStatus = 'DRAFT' | 'SUBMITTED' | 'SUPERSEDED' | 'WITHDRAWN' | 'EXPIRED'
export type QuoteItem = {
  id: string
  requirementId: string
  kind: 'LINE' | 'PACKAGE'
  packageKey: string
  title: string
  description: string
  amountPaise: number
}
export type QuoteRevision = {
  id: string
  revisionNumber: number
  status: QuoteRevisionStatus
  notes: string
  validUntil: string
  items: QuoteItem[]
  totalPaise: number
  createdAt: string
}
export type DemoQuotation = {
  id: string
  eventId: string
  providerId: string
  providerName: string
  status: 'OPEN' | 'WITHDRAWN'
  revisions: QuoteRevision[]
  currentRevisionId: string | null
  updatedAt: string
}

export type QuotationDraftInput = {
  eventId: string
  notes: string
  validUntil: string
  items: Omit<QuoteItem, 'id'>[]
}

export type MarketplaceApi = {
  getProviderProfile(): Promise<ProviderProfile | null>
  updateProviderProfile(profile: ProviderProfile): Promise<ProviderProfile>
  listServices(): Promise<ProviderService[]>
  saveService(service: Omit<ProviderService, 'id'> & { id?: string }): Promise<ProviderService>
  deleteService(id: string): Promise<void>
  listCoverage(): Promise<ProviderCoverageLocation[]>
  saveCoverage(location: ProviderCoverageLocation, index?: number): Promise<ProviderCoverageLocation[]>
  deleteCoverage(index: number): Promise<ProviderCoverageLocation[]>
  discoverProviders(event: CustomerEvent): Promise<ProviderMatch[]>
  listInvitationsForEvent(eventId: string): Promise<DemoInvitation[]>
  listProviderInvitations(): Promise<DemoInvitation[]>
  inviteProvider(eventId: string, providerId: string, requirementId: string | null, message: string): Promise<DemoInvitation>
  respondToInvitation(id: string, accept: boolean): Promise<DemoInvitation>
  listProviderQuotations(): Promise<DemoQuotation[]>
  listEventQuotations(eventId: string): Promise<DemoQuotation[]>
  saveQuotationRevision(input: QuotationDraftInput): Promise<DemoQuotation>
  getEvent(eventId: string): Promise<CustomerEvent | null>
  listCustomerEvents(): Promise<CustomerEvent[]>
}
