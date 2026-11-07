import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppProviders } from '../../app/providers/AppProviders'
import { demoMarketplaceApi } from './services/demoMarketplaceApi'
import ProviderPages from './ProviderPages'

function renderPage(path: string, page: string, entry = path) {
  const router = createMemoryRouter([{ path, element: <ProviderPages />, handle: { page } }], { initialEntries: [entry] })
  return render(<AppProviders><RouterProvider router={router} /></AppProviders>)
}

describe('provider marketplace screens', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('validates and saves an explicit coverage location', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify({ id: 'provider-one', accountType: 'PROVIDER' }))
    localStorage.setItem('hiddenstage.demo.provider-profile.v1.provider-one', JSON.stringify({ displayName: 'Studio One', description: 'A profile with a sufficiently long introduction.', contact: 'studio@example.test', categories: ['decor-and-styling'], coverage: [], completedAt: new Date().toISOString() }))
    renderPage('/app/provider/coverage', 'providerCoverage')
    await screen.findByRole('heading', { name: 'Service coverage' })
    await user.click(screen.getByRole('button', { name: 'Add coverage' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('6-digit PIN code')
    await user.type(screen.getByLabelText('PIN code'), '560038')
    await user.type(screen.getByLabelText('Locality'), 'Indiranagar')
    await user.type(screen.getByLabelText('City'), 'Bengaluru')
    await user.type(screen.getByLabelText('State'), 'Karnataka')
    await user.click(screen.getByRole('button', { name: 'Add coverage' }))
    expect(await screen.findByText('Indiranagar, Bengaluru')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('hiddenstage.demo.provider-profile.v1.provider-one') ?? 'null').coverage).toHaveLength(1)
  })

  it('discovers explicitly covered demo providers and records a customer invitation', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify({ id: 'customer-one', accountType: 'CUSTOMER' }))
    const event = { id: 'event-one', name: 'Family gathering', type: 'Celebration', description: '', date: '2027-02-12', startTime: '17:00', endTime: '20:00', guestCount: 24, pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', venueName: 'Demo hall', address: 'Main road', requirements: [{ id: 'requirement-one', category: 'decor-and-styling', title: 'Table styling', description: '', budget: null, instructions: '' }], attachments: [], status: 'Submitted', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    localStorage.setItem('hiddenstage.demo.events.v1.customer-one', JSON.stringify([event]))
    localStorage.setItem('hiddenstage.demo.provider-profile.v1.provider-one', JSON.stringify({ displayName: 'Studio One', description: 'A demo styling professional with explicit coverage.', contact: 'studio@example.test', categories: ['decor-and-styling'], coverage: [{ pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka' }], completedAt: new Date().toISOString() }))
    expect(await demoMarketplaceApi.getEvent('event-one')).toMatchObject({ id: 'event-one' })
    renderPage('/app/events/:eventId/providers', 'eventProviderDiscovery', '/app/events/event-one/providers')
    expect(await screen.findByRole('heading', { name: 'Studio One' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Invite for event' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('hiddenstage.demo.invitations.v1') ?? '[]')).toHaveLength(1))
    expect(screen.getByText('Invitation: pending')).toBeInTheDocument()
  })
})
