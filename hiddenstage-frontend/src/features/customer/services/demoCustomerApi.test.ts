import { beforeEach, describe, expect, it } from 'vitest'
import { demoCustomerApi } from './demoCustomerApi'

describe('demo customer service', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('completes demo registration and email verification without sending email', async () => {
    const email = `customer-${Date.now()}@example.test`
    const registered = await demoCustomerApi.register({ fullName: 'Sample Customer', email, password: 'Preview123!' })
    expect(registered.emailVerified).toBe(false)
    expect(demoCustomerApi.getSession()?.email).toBe(email)
    const verified = await demoCustomerApi.verifyEmail(email)
    expect(verified.emailVerified).toBe(true)
  })

  it('persists a profile and multi-requirement event across service reads', async () => {
    const email = `events-${Date.now()}@example.test`
    await demoCustomerApi.register({ fullName: 'Event Customer', email, password: 'Preview123!' })
    const profile = await demoCustomerApi.updateCustomerProfile({ fullName: 'Event Customer', email, phone: '9876543210', city: 'Bengaluru', pinCode: '560038', locality: 'Indiranagar', state: 'Karnataka', completedAt: new Date().toISOString() })
    expect(profile.city).toBe('Bengaluru')
    expect(demoCustomerApi.getSession()?.profileCompleted).toBe(true)
    const event = await demoCustomerApi.createEvent({ name: 'Dinner', type: 'Family gathering', description: 'An evening dinner with family.', date: '2030-06-20', startTime: '17:00', endTime: '21:00', guestCount: 24, pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', venueName: 'Garden venue', address: '12 Main Road', requirements: [], attachments: [] })
    const withRequirement = await demoCustomerApi.createServiceRequirement(event.id, { id: 'requirement-1', category: 'food-and-drink', title: 'Vegetarian dinner', description: 'Vegetarian dinner menu for family guests.', budget: 25000, instructions: '' })
    expect((await demoCustomerApi.retrieveEvent(event.id))?.requirements).toEqual(withRequirement.requirements)
    expect((await demoCustomerApi.listEvents()).map((item) => item.id)).toContain(event.id)
    const updated = await demoCustomerApi.updateEvent(event.id, { ...withRequirement, name: 'Updated dinner' })
    expect(updated.name).toBe('Updated dinner')
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(event.createdAt).getTime())
    await demoCustomerApi.register({ fullName: 'Another Customer', email: `another-${Date.now()}@example.test`, password: 'Preview123!' })
    expect(await demoCustomerApi.listEvents()).toEqual([])
    expect(await demoCustomerApi.retrieveEvent(event.id)).toBeNull()
  })
})
