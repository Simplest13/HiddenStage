import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProviderDashboardPresentation } from './providerDashboardConfig'
import { getWorkspaceConfig } from '../../layouts/workspaceConfig'
import { WorkspaceLayout } from '../../layouts/WorkspaceLayout'
import { AuthProvider } from '../../app/auth/AuthProvider'
import { profilesApi } from '../../shared/api/backend/profiles'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { networkApi } from '../../shared/api/backend/network'
import type { ApiProviderProfile, ProviderKind } from '../../shared/api/backend/types'
import { routes } from '../../app/routes/routePaths'
import ProviderPages from './ProviderPages'

vi.mock('../../shared/ui/NotificationDropdown', () => ({ NotificationDropdown: () => null }))

const providerKinds: ProviderKind[] = [
  'MANAGER',
  'INDIVIDUAL_SERVICE_PROVIDER',
  'ASSOCIATED_SERVICE_PROVIDER',
  'TALENT',
  'WORKER',
]

const providerAuth = {
  status: 'authenticated',
  roles: ['PROVIDER'],
  user: {
    id: 'provider-1',
    fullName: 'Demo Professional',
    email: 'provider@example.test',
    phone: '',
    emailVerified: true,
    emailVerificationRequired: true,
    profileCompleted: true,
    accountType: 'PROVIDER',
  },
} as const

function providerProfile(kind: ProviderKind): ApiProviderProfile {
  return {
    id: 'profile-1',
    display_name: 'Demo Professional',
    kind,
    description: '',
    contact: '',
    categories: [],
    coverage: [],
    services: [],
    verification_status: 'VERIFIED',
    completed_at: null,
    created_at: '',
    updated_at: '',
  }
}

function renderWorkspace(kind: ProviderKind) {
  vi.spyOn(profilesApi, 'getProviderProfile').mockResolvedValue(providerProfile(kind))
  const router = createMemoryRouter(
    [{
      path: '/provider',
      element: <AuthProvider state={providerAuth}><WorkspaceLayout audience="provider" /></AuthProvider>,
      children: [{ index: true, element: <div>Provider content</div> }],
    }],
    { initialEntries: ['/provider'] },
  )
  return render(<RouterProvider router={router} />)
}

function renderProviderDashboard(kind: ProviderKind) {
  vi.spyOn(profilesApi, 'getProviderProfile').mockResolvedValue(providerProfile(kind))
  vi.spyOn(marketplaceApi, 'listProviderOpportunities').mockResolvedValue([])
  vi.spyOn(marketplaceApi, 'listProviderInvitations').mockResolvedValue([])
  vi.spyOn(marketplaceApi, 'listProviderQuotations').mockResolvedValue([])
  vi.spyOn(marketplaceApi, 'listProviderCommitments').mockResolvedValue([])
  vi.spyOn(networkApi, 'listAssociations').mockResolvedValue([])
  vi.spyOn(networkApi, 'listInvitations').mockResolvedValue([])
  vi.spyOn(networkApi, 'listAssignments').mockResolvedValue([])
  const router = createMemoryRouter(
    [{
      path: '/provider',
      element: <AuthProvider state={providerAuth}><WorkspaceLayout audience="provider" /></AuthProvider>,
      children: [{ index: true, element: <ProviderPages /> }],
    }],
    { initialEntries: ['/provider'] },
  )
  return render(<RouterProvider router={router} />)
}

afterEach(() => vi.restoreAllMocks())

describe('provider dashboard configuration', () => {
  it('gives each professional kind a distinct overview and primary action', () => {
    const presentations = providerKinds.map((kind) => getProviderDashboardPresentation(kind))
    expect(new Set(presentations.map((item) => item.eyebrow)).size).toBe(providerKinds.length)
    expect(new Set(presentations.map((item) => item.title)).size).toBe(providerKinds.length)

    expect(getProviderDashboardPresentation('MANAGER').primaryAction.to).toBe(routes.provider.assignments)
    expect(getProviderDashboardPresentation('WORKER').primaryAction.to).toBe(routes.provider.assignments)
    expect(getProviderDashboardPresentation('TALENT').primaryAction.to).toBe(routes.provider.profile)
  })

  it('keeps network and assignment links for Managers and Workers only', () => {
    const managerHrefs = getWorkspaceConfig('provider', 'MANAGER').items.map((item) => item.href)
    const workerHrefs = getWorkspaceConfig('provider', 'WORKER').items.map((item) => item.href)
    expect(managerHrefs).toContain(routes.provider.network)
    expect(managerHrefs).toContain(routes.provider.assignments)
    expect(managerHrefs).toContain(routes.provider.networkDiscover)
    expect(workerHrefs).toContain(routes.provider.network)
    expect(workerHrefs).toContain(routes.provider.assignments)
    expect(workerHrefs).not.toContain(routes.provider.networkDiscover)

    for (const kind of providerKinds.filter((item) => item !== 'MANAGER' && item !== 'WORKER')) {
      const hrefs = getWorkspaceConfig('provider', kind).items.map((item) => item.href)
      expect(hrefs).not.toContain(routes.provider.network)
      expect(hrefs).not.toContain(routes.provider.assignments)
      expect(hrefs).not.toContain(routes.provider.networkDiscover)
      expect(hrefs).toContain(routes.provider.profile)
      expect(hrefs).toContain(routes.provider.commitments)
    }
  })

  it('loads the provider kind before showing specialized workspace navigation', async () => {
    renderWorkspace('MANAGER')
    expect(await screen.findByRole('link', { name: 'Discover Workers' })).toHaveAttribute('href', routes.provider.networkDiscover)
    expect(screen.getByRole('link', { name: 'Assignments' })).toHaveAttribute('href', routes.provider.assignments)
  })

  it('does not show Manager or Worker navigation for other provider kinds', async () => {
    renderWorkspace('TALENT')
    expect(await screen.findByText('Provider content')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Discover Workers' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Assignments' })).not.toBeInTheDocument()
  })

  it('renders the Manager execution overview from existing workflow data', async () => {
    renderProviderDashboard('MANAGER')
    expect(await screen.findByRole('heading', { name: /Coordinate accepted bookings with your team/ })).toBeInTheDocument()
    expect(screen.getByText('Active commitments')).toBeInTheDocument()
    expect(screen.getAllByText('Assignment invitations')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Active commitments/ })).toHaveAttribute('href', routes.provider.commitments)
    expect(screen.getAllByRole('link', { name: /Active Workers/ }).every((link) => link.getAttribute('href') === routes.provider.network)).toBe(true)
    expect(screen.getAllByRole('link', { name: /Upcoming assignments/ }).every((link) => link.getAttribute('href') === routes.provider.assignments)).toBe(true)
    expect(screen.getByRole('link', { name: /Profile Verified/ })).toHaveAttribute('href', routes.provider.profile)
    expect(screen.getByRole('link', { name: 'Open assignments' })).toHaveAttribute('href', routes.provider.assignments)
  })

  it('renders the Talent-specific opportunity overview', async () => {
    renderProviderDashboard('TALENT')
    expect(await screen.findByRole('heading', { name: /Showcase your talent and find performances/ })).toBeInTheDocument()
    expect(screen.getByText('Performance opportunities')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Performance opportunities/ })).toHaveAttribute('href', routes.provider.opportunities)
    expect(screen.getByRole('link', { name: /Performance invitations/ })).toHaveAttribute('href', routes.provider.requests)
    expect(screen.getByRole('link', { name: /Open quotations/ })).toHaveAttribute('href', routes.provider.quotes)
    expect(screen.getAllByRole('link', { name: 'Update talent profile' }).map((link) => link.getAttribute('href'))).toContain(routes.provider.profile)
  })
})
