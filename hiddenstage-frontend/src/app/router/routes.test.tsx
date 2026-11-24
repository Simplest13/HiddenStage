import { configure, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routeConfig } from './router'
import { AppProviders } from '../providers/AppProviders'
import type { AuthState } from '../auth/authTypes'

configure({ asyncUtilTimeout: 10000 })

const customer: AuthState = {
  status: 'authenticated',
  roles: ['CUSTOMER'],
  user: { id: 'customer-1', fullName: 'Demo Customer', email: 'customer@example.test', phone: '', emailVerified: true, emailVerificationRequired: true, profileCompleted: true, accountType: 'CUSTOMER' },
}

function renderRoute(path: string, authState?: AuthState) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] })
  return render(<AppProviders authState={authState}><RouterProvider router={router} /></AppProviders>)
}

describe('application routes', () => {
  it('renders the public homepage', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Direct booking for/)
  })

  it('redirects an anonymous visitor away from a protected workspace', async () => {
    renderRoute('/app')
    expect(await screen.findByRole('heading', { name: 'Sign in to HiddenStage' })).toBeInTheDocument()
  })

  it('requires email verification before customer onboarding', async () => {
    renderRoute('/app', {
      status: 'authenticated',
      roles: ['CUSTOMER'],
      user: { id: 'customer-1', fullName: 'Demo Customer', email: 'customer@example.test', phone: '', emailVerified: false, emailVerificationRequired: true, profileCompleted: false, accountType: 'CUSTOMER' },
    })
    expect(await screen.findByRole('heading', { name: 'Verify your email address' })).toBeInTheDocument()
  })

  it('sends a verified customer without a profile to onboarding', async () => {
    renderRoute('/app', {
      status: 'authenticated',
      roles: ['CUSTOMER'],
      user: { id: 'customer-1', fullName: 'Demo Customer', email: 'customer@example.test', phone: '', emailVerified: true, emailVerificationRequired: true, profileCompleted: false, accountType: 'CUSTOMER' },
    })
    expect(await screen.findByRole('heading', { name: 'Where do you usually plan events?' })).toBeInTheDocument()
  })

  it('keeps a provider out of the organiser workspace', async () => {
    renderRoute('/app', {
      status: 'authenticated',
      roles: ['PROVIDER'],
      user: { id: 'provider-1', fullName: 'Demo Provider', email: 'provider@example.test', phone: '', emailVerified: true, emailVerificationRequired: true, profileCompleted: true, accountType: 'PROVIDER' },
    })
    expect(await screen.findByText('This space is for an approved administrator.')).toBeInTheDocument()
  })

  it('renders the customer dashboard for a completed organiser', async () => {
    renderRoute('/app', customer)
    expect(await screen.findByRole('heading', { name: /Welcome back/ })).toBeInTheDocument()
  })

  it('admits an unverified customer when the deployment does not require verification', async () => {
    renderRoute('/app', {
      status: 'authenticated',
      roles: ['CUSTOMER'],
      user: { id: 'customer-2', fullName: 'Demo Customer', email: 'customer@example.test', phone: '', emailVerified: false, emailVerificationRequired: false, profileCompleted: false, accountType: 'CUSTOMER' },
    })
    expect(await screen.findByRole('heading', { name: 'Where do you usually plan events?' })).toBeInTheDocument()
  })

  it('reserves the administration URL without exposing demo data', async () => {
    renderRoute('/app/admin', customer)
    expect(await screen.findByText('This space is for an approved administrator.')).toBeInTheDocument()
  })

  it('renders the administration workspace for a staff administrator', async () => {
    renderRoute('/app/admin', {
      status: 'authenticated',
      roles: ['CUSTOMER'],
      user: {
        id: 'admin-1',
        fullName: 'Platform Admin',
        email: 'admin@hiddenstage.in',
        phone: '',
        emailVerified: true,
        emailVerificationRequired: false,
        profileCompleted: true,
        accountType: 'CUSTOMER',
        isStaff: true,
        isSuperuser: true,
      },
    })
    expect(await screen.findByRole('heading', { name: 'Platform Operations' })).toBeInTheDocument()
  })

  it('renders provider onboarding and specialty dynamic category flow', async () => {
    renderRoute('/onboarding/provider', {
      status: 'authenticated',
      roles: ['PROVIDER'],
      user: {
        id: 'provider-1',
        fullName: 'Demo Provider',
        email: 'provider@example.test',
        phone: '',
        emailVerified: true,
        emailVerificationRequired: true,
        profileCompleted: false,
        accountType: 'PROVIDER',
      },
    })
    expect(await screen.findByRole('heading', { name: 'Build your HiddenStage profile.' })).toBeInTheDocument()
  })
})
