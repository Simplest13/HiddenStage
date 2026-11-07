import { routes } from '../app/routes/routePaths'

export type WorkspaceAudience = 'customer' | 'provider' | 'business' | 'admin'
type NavItem = { href: string; label: string; icon: string }
type WorkspaceSettings = { title: string; eyebrow: string; home: string; items: NavItem[] }

export const workspaceConfig: Record<WorkspaceAudience, WorkspaceSettings> = {
  customer: { title: 'Your workspace', eyebrow: 'CUSTOMER', home: routes.customer.home, items: [
    { href: routes.customer.home, label: 'Overview', icon: '◫' }, { href: routes.customer.requests, label: 'Event requests', icon: '✳' },
    { href: routes.customer.quotes, label: 'Quotes', icon: '▤' }, { href: routes.customer.commitments, label: 'Commitments', icon: '◇' },
  ] },
  provider: { title: 'Your workspace', eyebrow: 'PROFESSIONAL', home: routes.provider.home, items: [
    { href: routes.provider.home, label: 'Overview', icon: '◫' }, { href: routes.provider.requests, label: 'Invitations', icon: '⌕' },
    { href: routes.provider.quotes, label: 'Quotes', icon: '▤' }, { href: routes.provider.profile, label: 'Profile', icon: '◉' },
    { href: routes.provider.coverage, label: 'Service coverage', icon: '◎' }, { href: routes.provider.commitments, label: 'Commitments', icon: '◇' },
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
