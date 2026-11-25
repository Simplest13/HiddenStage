import { routes } from '../app/routes/routePaths'
import type { ProviderKind } from '../shared/api/backend/types'
import type { IconName } from '../shared/ui/Icon'

export type WorkspaceAudience = 'customer' | 'provider' | 'business' | 'admin'
type NavItem = { href: string; label: string; icon: IconName }
type WorkspaceSettings = { title: string; eyebrow: string; home: string; items: NavItem[] }

export const workspaceConfig: Record<WorkspaceAudience, WorkspaceSettings> = {
  customer: { title: 'Your workspace', eyebrow: 'CUSTOMER', home: routes.customer.home, items: [
    { href: routes.customer.home, label: 'Overview', icon: 'layoutDashboard' },
    { href: routes.customer.bookings, label: 'My Bookings', icon: 'calendarDays' },
    { href: routes.customer.requests, label: 'Event requests', icon: 'clipboardCheck' },
    { href: routes.customer.network, label: 'My Network', icon: 'users' },
    { href: routes.customer.payments, label: 'My Payments', icon: 'creditCard' },
    { href: routes.customer.quotes, label: 'Quotes', icon: 'fileText' },
    { href: routes.customer.commitments, label: 'Commitments', icon: 'calendarCheck' },
    { href: routes.app.settings, label: 'Account settings', icon: 'settings' },
  ] },
  provider: { title: 'Your workspace', eyebrow: 'PROFESSIONAL', home: routes.provider.home, items: [
    { href: routes.provider.home, label: 'Overview', icon: 'layoutDashboard' }, { href: routes.provider.opportunities, label: 'Opportunities', icon: 'search' },
    { href: routes.provider.requests, label: 'Invitations', icon: 'mail' },
    { href: routes.provider.network, label: 'My network', icon: 'network' },
    { href: routes.provider.customerNetwork, label: 'Customer network', icon: 'message' },
    { href: routes.provider.assignments, label: 'Assignments', icon: 'briefcase' },
    { href: routes.provider.quotes, label: 'Quotes', icon: 'fileText' }, { href: routes.provider.profile, label: 'Profile', icon: 'user' },
    { href: routes.provider.commitments, label: 'Commitments', icon: 'calendarCheck' },
    { href: routes.provider.services, label: 'Services', icon: 'briefcase' },
    { href: routes.provider.settings, label: 'Account settings', icon: 'settings' },
  ] },
  business: { title: 'Business workspace', eyebrow: 'BUSINESS', home: routes.business.home, items: [
    { href: routes.business.home, label: 'Overview', icon: 'layoutDashboard' }, { href: routes.business.profile, label: 'Business profile', icon: 'building' },
    { href: routes.business.representatives, label: 'Representatives', icon: 'users' }, { href: routes.business.verification, label: 'Verification', icon: 'shieldCheck' },
  ] },
  admin: { title: 'Admin workspace', eyebrow: 'ADMINISTRATION', home: routes.admin.home, items: [
    { href: routes.admin.home, label: 'Overview', icon: 'layoutDashboard' }, { href: routes.admin.businesses, label: 'Business review', icon: 'building' },
    { href: routes.admin.reviews, label: 'Moderation', icon: 'shield' }, { href: routes.admin.audit, label: 'Audit trail', icon: 'listChecks' },
  ] },
}

export function getWorkspaceConfig(audience: WorkspaceAudience, providerKind?: ProviderKind | null): WorkspaceSettings {
  const config = workspaceConfig[audience]
  if (audience !== 'provider') return config

  const roleTitles: Record<ProviderKind, { title: string; eyebrow: string }> = {
    MANAGER: { title: 'Manager workspace', eyebrow: 'EVENT BUSINESS' },
    WORKER: { title: 'Worker workspace', eyebrow: 'OPERATIONAL CREW' },
    TALENT: { title: 'Talent workspace', eyebrow: 'TALENT & ARTIST' },
    ASSOCIATED_SERVICE_PROVIDER: { title: 'Associate workspace', eyebrow: 'ASSOCIATE SPECIALIST' },
    INDIVIDUAL_SERVICE_PROVIDER: { title: 'Provider workspace', eyebrow: 'SERVICE PROVIDER' },
  }
  const roleMeta = providerKind ? roleTitles[providerKind] : { title: config.title, eyebrow: config.eyebrow }

  const commonItems = config.items.filter(
    (item) => item.href !== routes.provider.network && item.href !== routes.provider.assignments,
  )
  if (providerKind === 'MANAGER') {
    return {
      ...config,
      ...roleMeta,
      items: [
        ...commonItems,
        { href: routes.provider.network, label: 'My network', icon: 'network' },
        { href: routes.provider.networkDiscover, label: 'Discover Workers', icon: 'search' },
        { href: routes.provider.assignments, label: 'Assignments', icon: 'briefcase' },
      ],
    }
  }
  if (providerKind === 'WORKER') {
    return {
      ...config,
      ...roleMeta,
      items: [
        ...commonItems,
        { href: routes.provider.network, label: 'My network', icon: 'network' },
        { href: routes.provider.assignments, label: 'Assignments', icon: 'briefcase' },
      ],
    }
  }
  return { ...config, ...roleMeta, items: commonItems }
}
