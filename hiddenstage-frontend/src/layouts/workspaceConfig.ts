import { routes } from '../app/routes/routePaths'
import type { ProviderKind } from '../shared/api/backend/types'

export type WorkspaceAudience = 'customer' | 'provider' | 'business' | 'admin'
type NavItem = { href: string; label: string; icon: string }
type WorkspaceSettings = { title: string; eyebrow: string; home: string; items: NavItem[] }

export const workspaceConfig: Record<WorkspaceAudience, WorkspaceSettings> = {
  customer: { title: 'Your workspace', eyebrow: 'CUSTOMER', home: routes.customer.home, items: [
    { href: routes.customer.home, label: 'Overview', icon: '◫' },
    { href: routes.customer.bookings, label: 'My Bookings', icon: '📅' },
    { href: routes.customer.requests, label: 'Event requests', icon: '✳' },
    { href: routes.customer.network, label: 'My Network', icon: '👥' },
    { href: routes.customer.payments, label: 'My Payments', icon: '💳' },
    { href: routes.customer.quotes, label: 'Quotes', icon: '▤' },
    { href: routes.customer.commitments, label: 'Commitments', icon: '◇' },
    { href: routes.app.settings, label: 'Account settings', icon: '◉' },
  ] },
  provider: { title: 'Your workspace', eyebrow: 'PROFESSIONAL', home: routes.provider.home, items: [
    { href: routes.provider.home, label: 'Overview', icon: '◫' }, { href: routes.provider.opportunities, label: 'Opportunities', icon: '⌕' },
    { href: routes.provider.requests, label: 'Invitations', icon: '✉' },
    { href: routes.provider.network, label: 'My network', icon: '♧' },
    { href: routes.provider.assignments, label: 'Assignments', icon: '▣' },
    { href: routes.provider.quotes, label: 'Quotes', icon: '▤' }, { href: routes.provider.profile, label: 'Profile', icon: '◉' },
    { href: routes.provider.commitments, label: 'Commitments', icon: '◇' },
    { href: routes.provider.services, label: 'Services', icon: '✳' },
  ] },
  business: { title: 'Business workspace', eyebrow: 'BUSINESS', home: routes.business.home, items: [
    { href: routes.business.home, label: 'Overview', icon: '◫' }, { href: routes.business.profile, label: 'Business profile', icon: '▣' },
    { href: routes.business.representatives, label: 'Representatives', icon: '♙' }, { href: routes.business.verification, label: 'Verification', icon: '✓' },
  ] },
  admin: { title: 'Admin workspace', eyebrow: 'ADMINISTRATION', home: routes.admin.home, items: [
    { href: routes.admin.home, label: 'Overview', icon: '◫' }, { href: routes.admin.businesses, label: 'Business review', icon: '▣' },
    { href: routes.admin.reviews, label: 'Moderation', icon: '◈' }, { href: routes.admin.audit, label: 'Audit trail', icon: '≋' },
  ] },
}

export function getWorkspaceConfig(audience: WorkspaceAudience, providerKind?: ProviderKind | null): WorkspaceSettings {
  const config = workspaceConfig[audience]
  if (audience !== 'provider') return config

  const commonItems = config.items.filter(
    (item) => item.href !== routes.provider.network && item.href !== routes.provider.assignments,
  )
  if (providerKind === 'MANAGER') {
    return {
      ...config,
      items: [
        ...commonItems,
        { href: routes.provider.network, label: 'My network', icon: '♧' },
        { href: routes.provider.networkDiscover, label: 'Discover Workers', icon: '⌕' },
        { href: routes.provider.assignments, label: 'Assignments', icon: '▣' },
      ],
    }
  }
  if (providerKind === 'WORKER') {
    return {
      ...config,
      items: [
        ...commonItems,
        { href: routes.provider.network, label: 'My network', icon: '♧' },
        { href: routes.provider.assignments, label: 'Assignments', icon: '▣' },
      ],
    }
  }
  return { ...config, items: commonItems }
}
