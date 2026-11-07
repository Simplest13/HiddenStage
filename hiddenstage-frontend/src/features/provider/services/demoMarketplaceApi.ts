import { demoCustomerApi } from '../../customer/services/demoCustomerApi'
import { demoProviderApi } from '../../onboarding/services/demoProviderApi'
import type { CustomerEvent, ProviderProfile } from '../../../shared/api/customerContracts'
import type { DemoInvitation, DemoQuotation, MarketplaceApi, ProviderMatch, ProviderService, QuotationDraftInput, QuoteRevision } from '../../../shared/api/marketplaceTypes'

const SERVICE_KEY = 'hiddenstage.demo.provider-services.v1'
const INVITATION_KEY = 'hiddenstage.demo.invitations.v1'
const QUOTATION_KEY = 'hiddenstage.demo.quotations.v1'
const id = () => globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
function currentProviderId() {
  try { return (JSON.parse(sessionStorage.getItem('hiddenstage.demo.session.v1') ?? 'null') as { id?: string } | null)?.id ?? '' } catch { return '' }
}
function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T ?? fallback } catch { return fallback } }
function write<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)) }
function servicesKey() { return `${SERVICE_KEY}.${currentProviderId()}` }
function getAllProviderProfiles(): Array<{ id: string; profile: ProviderProfile }> {
  const entries: Array<{ id: string; profile: ProviderProfile }> = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith('hiddenstage.demo.provider-profile.v1.')) continue
    try {
      const profile = JSON.parse(localStorage.getItem(key) ?? 'null') as ProviderProfile | null
      const profileId = key.slice('hiddenstage.demo.provider-profile.v1.'.length)
      if (profile && profileId) entries.push({ id: profileId, profile })
    } catch { /* Ignore malformed demo-only entries. */ }
  }
  return entries
}
function allInvitations() { return read<DemoInvitation[]>(INVITATION_KEY, []) }
function saveInvitations(value: DemoInvitation[]) { write(INVITATION_KEY, value) }
function allQuotations() { return read<DemoQuotation[]>(QUOTATION_KEY, []) }
function saveQuotations(value: DemoQuotation[]) { write(QUOTATION_KEY, value) }

export const demoMarketplaceApi: MarketplaceApi = {
  getProviderProfile: () => demoProviderApi.getProviderProfile(),
  async updateProviderProfile(profile) { await demoProviderApi.completeProviderOnboarding(profile); return profile },
  async listServices() {
    const saved = read<ProviderService[]>(servicesKey(), [])
    if (saved.length) return saved
    const profile = await demoProviderApi.getProviderProfile()
    return (profile?.categories ?? []).map((category) => ({ id: id(), category, title: '', description: '', basePricePaise: null, isActive: true }))
  },
  async saveService(input) {
    const existing = await this.listServices()
    const service = { ...input, id: input.id ?? id() }
    write(servicesKey(), [...existing.filter((row) => row.id !== service.id && row.category !== service.category), service])
    const profile = await demoProviderApi.getProviderProfile()
    if (profile) await demoProviderApi.completeProviderOnboarding({ ...profile, categories: [...new Set([...profile.categories.filter((category) => category !== service.category), ...(service.isActive ? [service.category] : [])])] })
    return service
  },
  async deleteService(serviceId) {
    const services = (await this.listServices()).filter((service) => service.id !== serviceId)
    write(servicesKey(), services)
    const profile = await demoProviderApi.getProviderProfile()
    if (profile) await demoProviderApi.completeProviderOnboarding({ ...profile, categories: services.filter((service) => service.isActive).map((service) => service.category) })
  },
  async listCoverage() { return (await demoProviderApi.getProviderProfile())?.coverage ?? [] },
  async saveCoverage(location, index) {
    const profile = await demoProviderApi.getProviderProfile()
    if (!profile) throw new Error('Complete your provider profile before managing coverage.')
    const coverage = [...profile.coverage]
    if (index === undefined) coverage.push(location); else coverage[index] = location
    await demoProviderApi.completeProviderOnboarding({ ...profile, coverage })
    return coverage
  },
  async deleteCoverage(index) {
    const profile = await demoProviderApi.getProviderProfile()
    if (!profile) return []
    const coverage = profile.coverage.filter((_, current) => current !== index)
    await demoProviderApi.completeProviderOnboarding({ ...profile, coverage })
    return coverage
  },
  async discoverProviders(event) {
    const invites = allInvitations().filter((invite) => invite.eventId === event.id && ['PENDING', 'ACCEPTED'].includes(invite.status))
    const matches: ProviderMatch[] = []
    for (const { id: providerId, profile } of getAllProviderProfiles()) {
      if (providerId === currentProviderId()) continue
      const matchingCoverage = profile.coverage.filter((location) => location.pinCode === event.pinCode || (location.city.toLowerCase() === event.city.toLowerCase() && location.state.toLowerCase() === event.state.toLowerCase()))
      const services = read<ProviderService[]>(`${SERVICE_KEY}.${providerId}`, [])
      const categories = services.length ? services.filter((service) => service.isActive).map((service) => service.category) : profile.categories
      const eventCategories = event.requirements.map((item) => item.category)
      if (!matchingCoverage.length || !categories.some((category) => eventCategories.includes(category))) continue
      matches.push({ ...profile, id: providerId, categories, matchingCoverage, exactPinMatch: matchingCoverage.some((location) => location.pinCode === event.pinCode), alreadyInvited: invites.some((invite) => invite.providerId === providerId), verificationStatus: 'UNVERIFIED' })
    }
    return matches.sort((left, right) => Number(right.exactPinMatch) - Number(left.exactPinMatch) || left.displayName.localeCompare(right.displayName))
  },
  async listInvitationsForEvent(eventId) { return allInvitations().filter((invite) => invite.eventId === eventId) },
  async listProviderInvitations() { return allInvitations().filter((invite) => invite.providerId === currentProviderId()) },
  async inviteProvider(eventId, providerId, requirementId, message) {
    const invites = allInvitations()
    if (invites.some((invite) => invite.eventId === eventId && invite.providerId === providerId && invite.requirementId === requirementId && invite.status === 'PENDING')) throw new Error('A pending invitation already exists for this provider and requirement.')
    const now = new Date().toISOString()
    const invitation: DemoInvitation = { id: id(), eventId, providerId, requirementId, message: message.trim(), status: 'PENDING', createdAt: now, expiresAt: null }
    saveInvitations([invitation, ...invites]); return invitation
  },
  async respondToInvitation(invitationId, accept) {
    let updated: DemoInvitation | undefined
    const invitations = allInvitations().map((invite) => {
      if (invite.id !== invitationId || invite.providerId !== currentProviderId() || invite.status !== 'PENDING') return invite
      updated = { ...invite, status: accept ? 'ACCEPTED' : 'DECLINED' }; return updated
    })
    if (!updated) throw new Error('This invitation is no longer available.')
    saveInvitations(invitations); return updated
  },
  async listProviderQuotations() { return allQuotations().filter((quote) => quote.providerId === currentProviderId()) },
  async listEventQuotations(eventId) { return allQuotations().filter((quote) => quote.eventId === eventId) },
  async saveQuotationRevision(input: QuotationDraftInput) {
    const invitation = allInvitations().find((item) => item.eventId === input.eventId && item.providerId === currentProviderId() && item.status === 'ACCEPTED')
    if (!invitation) throw new Error('An accepted customer invitation is required before preparing a quotation.')
    const quotations = allQuotations()
    const existing = quotations.find((quote) => quote.eventId === input.eventId && quote.providerId === currentProviderId())
    const current = existing ?? { id: id(), eventId: input.eventId, providerId: currentProviderId(), providerName: (await demoProviderApi.getProviderProfile())?.displayName ?? 'Demo professional', status: 'OPEN' as const, revisions: [], currentRevisionId: null, updatedAt: new Date().toISOString() }
    const nextRevisionNumber = Math.max(0, ...current.revisions.map((revision) => revision.revisionNumber)) + 1
    const revisions = current.revisions.map((revision) => revision.status === 'SUBMITTED' ? { ...revision, status: 'SUPERSEDED' as const } : revision)
    const revision: QuoteRevision = { id: id(), revisionNumber: nextRevisionNumber, status: 'SUBMITTED', notes: input.notes, validUntil: input.validUntil, items: input.items.map((item) => ({ ...item, id: id() })), totalPaise: input.items.reduce((sum, item) => sum + item.amountPaise, 0), createdAt: new Date().toISOString() }
    const updated: DemoQuotation = { ...current, revisions: [revision, ...revisions], currentRevisionId: revision.id, updatedAt: revision.createdAt }
    saveQuotations([updated, ...quotations.filter((quote) => quote.id !== updated.id)])
    return updated
  },
  async getEvent(eventId) {
    const ownEvent = await demoCustomerApi.retrieveEvent(eventId)
    if (ownEvent) return ownEvent
    const invited = allInvitations().some((invite) => invite.eventId === eventId && invite.providerId === currentProviderId() && ['PENDING', 'ACCEPTED'].includes(invite.status))
    if (!invited) return null
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith('hiddenstage.demo.events.v1.')) continue
      const events = read<CustomerEvent[]>(key, [])
      const event = events.find((item) => item.id === eventId)
      if (event) return event
    }
    return null
  },
  listCustomerEvents: () => demoCustomerApi.listEvents(),
}
