import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routeConfig } from '../../app/router/router'
import { AppProviders } from '../../app/providers/AppProviders'

describe('provider onboarding demo', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('accepts multiple services and explicit PIN/locality coverage, then completes onboarding', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('hiddenstage.demo.session.v1', JSON.stringify({ id: 'provider-1' }))
    const router = createMemoryRouter(routeConfig, { initialEntries: ['/onboarding/provider'] })
    render(<AppProviders authState={{ status: 'authenticated', roles: ['PROVIDER'], customer: { id: 'provider-1', fullName: 'Rae Professional', email: 'rae@example.test', emailVerified: true, profileCompleted: false, accountType: 'PROVIDER' } }}><RouterProvider router={router} /></AppProviders>)
    await user.type(await screen.findByLabelText('Professional or display name'), 'Rae Studio')
    await user.type(screen.getByLabelText('Short description'), 'Thoughtful photography and styling for intimate celebrations.')
    await user.type(screen.getByLabelText('Contact phone or email'), 'rae@example.test')
    await user.click(screen.getByLabelText('Photography'))
    await user.click(screen.getByLabelText('Decor & styling'))
    await user.type(screen.getByLabelText('PIN code'), '560038')
    await user.type(screen.getByLabelText('Locality'), 'Indiranagar')
    await user.type(screen.getByLabelText('City'), 'Bengaluru')
    await user.type(screen.getByLabelText('State'), 'Karnataka')
    await user.click(screen.getByRole('button', { name: 'Add coverage location' }))
    await user.type(screen.getAllByLabelText('PIN code')[1], '560001')
    await user.type(screen.getAllByLabelText('Locality')[1], 'Central Bengaluru')
    await user.type(screen.getAllByLabelText('City')[1], 'Bengaluru')
    await user.type(screen.getAllByLabelText('State')[1], 'Karnataka')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    expect(await screen.findByRole('heading', { name: /profile is ready/i })).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem('hiddenstage.demo.provider-profile.v1.provider-1') ?? 'null')
    expect(stored.categories).toEqual(['photography', 'decor-and-styling'])
    expect(stored.coverage).toHaveLength(2)
    expect(stored.coverage[0]).toMatchObject({ pinCode: '560038', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka' })
  })
})
