import { beforeEach, describe, expect, it } from 'vitest'
import type { CustomerEvent, ProviderProfile } from '../../../shared/api/customerContracts'
import { demoMarketplaceApi } from './demoMarketplaceApi'

const profile: ProviderProfile = {
  displayName: 'Preview Studio', description: 'A demo profile for event styling and thoughtful details.', contact: 'studio@example.test',
  categories: ['decor-and-styling'], coverage: [{ pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka' }], completedAt: new Date().toISOString(),
}
const event: CustomerEvent = {
  id: 'event-demo', name: 'Family gathering', type: 'Celebration', description: '', date: '2027-02-12', startTime: '17:00', endTime: '20:00', guestCount: 30,
  pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', venueName: 'Demo hall', address: 'Main road', requirements: [{ id: 'requirement-demo', category: 'decor-and-styling', title: 'Table styling', description: '', budget: null, instructions: '' }], attachments: [],
  status: 'Submitted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}

describe('demoMarketplaceApi', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear()
    sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify({ id: 'provider-demo', accountType: 'PROVIDER' }))
    localStorage.setItem('hiddenstage.demo.provider-profile.v1.provider-demo', JSON.stringify(profile))
    localStorage.setItem('hiddenstage.demo.provider-profile.v1.customer-demo', JSON.stringify({ ...profile, displayName: 'Other provider' }))
    localStorage.setItem('hiddenstage.demo.provider-services.v1.customer-demo', JSON.stringify([{ id: 'service-demo', category: 'decor-and-styling', title: 'Event styling', description: '', basePricePaise: null, isActive: true }]))
  })

  it('matches only profiles with an explicit event category and covered location', async () => {
    const matches = await demoMarketplaceApi.discoverProviders(event)
    expect(matches.map((match) => match.displayName)).toEqual(['Other provider'])
    expect(matches[0].exactPinMatch).toBe(true)
  })

  it('persists an invitation response and preserves submitted quote revisions', async () => {
    const invitation = await demoMarketplaceApi.inviteProvider(event.id, 'provider-demo', null, 'Please review this event.')
    expect((await demoMarketplaceApi.listProviderInvitations()).map((row) => row.id)).toContain(invitation.id)
    await demoMarketplaceApi.respondToInvitation(invitation.id, true)
    const quote = await demoMarketplaceApi.saveQuotationRevision({ eventId: event.id, notes: 'First proposal', validUntil: '2027-02-20', items: [{ requirementId: 'requirement-demo', kind: 'LINE', packageKey: '', title: 'Styling service', description: '', amountPaise: 125000 }] })
    const revisionOne = quote.revisions[0]
    const revised = await demoMarketplaceApi.saveQuotationRevision({ eventId: event.id, notes: 'Revised proposal', validUntil: '2027-02-22', items: [{ requirementId: 'requirement-demo', kind: 'LINE', packageKey: '', title: 'Updated styling', description: '', amountPaise: 150000 }] })
    expect(revised.revisions.map((revision) => revision.revisionNumber)).toEqual([2, 1])
    expect(revised.revisions[0].status).toBe('SUBMITTED')
    expect(revised.revisions[1]).toEqual({ ...revisionOne, status: 'SUPERSEDED' })
  })

  it('requires an accepted invitation before a quotation can be prepared', async () => {
    await expect(demoMarketplaceApi.saveQuotationRevision({ eventId: event.id, notes: '', validUntil: '2027-02-20', items: [] })).rejects.toThrow(/accepted customer invitation/i)
  })
})
