import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routeConfig } from '../../app/router/router'
import { AppProviders } from '../../app/providers/AppProviders'
import { demoCustomerApi } from './services/demoCustomerApi'

async function renderCustomer(path: string, hasEvent = false) {
  const identity = await demoCustomerApi.register({ fullName: 'Taylor Planner', email: `dashboard-${Date.now()}@example.test`, password: 'Preview123!' })
  await demoCustomerApi.verifyEmail(identity.email)
  await demoCustomerApi.updateCustomerProfile({ fullName: identity.fullName, email: identity.email, phone: '9876543210', city: 'Bengaluru', pinCode: '560038', locality: 'Indiranagar', state: 'Karnataka', completedAt: new Date().toISOString() })
  if (hasEvent) await demoCustomerApi.createEvent({ name: 'Garden gathering', type: 'Family gathering', description: 'An afternoon together in the garden.', date: '2030-06-20', startTime: '16:00', endTime: '20:00', guestCount: 20, pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', venueName: 'Garden House', address: '12 Main Road', requirements: [], attachments: [] })
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] })
  return render(<AppProviders authState={{ status: 'authenticated', roles: ['USER', 'CUSTOMER'], customer: { ...identity, emailVerified: true, profileCompleted: true } }}><RouterProvider router={router} /></AppProviders>)
}

describe('customer dashboard and event list', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('welcomes a new customer and offers a first event action', async () => {
    await renderCustomer('/app')
    expect(await screen.findByRole('heading', { name: /welcome, taylor/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /your first event begins/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first event' })).toHaveAttribute('href', '/app/events/new')
  })

  it('derives request, active, response, and quotation summary totals from demo data', async () => {
    await renderCustomer('/app', true)
    expect(await screen.findByText('Total event requests')).toBeInTheDocument()
    expect(screen.getAllByText('1', { selector: 'strong' })).toHaveLength(2)
    expect(screen.getAllByText('0', { selector: 'strong' })).toHaveLength(2)
  })

  it('calculates dashboard counts from saved events and filters the event list', async () => {
    const user = userEvent.setup()
    await renderCustomer('/app/events', true)
    expect(await screen.findByRole('heading', { name: 'My events' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search events'), 'does not exist')
    expect(screen.getByRole('heading', { name: 'No events match these filters' })).toBeInTheDocument()
  })
})
