import { configure, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routeConfig } from './router'
import { AppProviders } from '../providers/AppProviders'
import type { AuthState } from '../auth/authTypes'

configure({ asyncUtilTimeout: 10000 })

function renderRoute(path: string, authState?: AuthState) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] })
  return render(<AppProviders authState={authState}><RouterProvider router={router} /></AppProviders>)
}

describe('application routes', () => {
  it('renders the public homepage', async () => {
    renderRoute('/')
    expect(await screen.findByText(/Make room for/)).toBeInTheDocument()
  })

  it('redirects an anonymous visitor away from a protected workspace', async () => {
    renderRoute('/app/customer')
    expect(await screen.findByRole('heading', { name: 'Sign in to HiddenStage' })).toBeInTheDocument()
  })

  it('requires demo email verification before customer onboarding', async () => {
    renderRoute('/app/customer/onboarding', { status: 'authenticated', roles: ['USER'], customer: { id: 'customer-1', fullName: 'Demo Customer', email: 'customer@example.test', emailVerified: false, profileCompleted: false, accountType: 'CUSTOMER' } })
    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
  })

  it('renders the admin shell only when the explicit ADMIN role is present', async () => {
    renderRoute('/app/admin', { status: 'authenticated', roles: ['ADMIN'] })
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument()
  })

  it('sends an authenticated non-admin away from the admin area', async () => {
    renderRoute('/app/admin', { status: 'authenticated', roles: ['USER'] })
    expect(await screen.findByText('This space is for an approved administrator.')).toBeInTheDocument()
  })
})
