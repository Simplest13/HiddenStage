import { routes } from '../../app/routes/routePaths'
import type { ProviderKind } from '../../shared/api/backend/types'

export type ProviderDashboardPresentation = {
  eyebrow: string
  title: string
  intro: string
  primaryAction: { label: string; to: string }
  quickLinks: Array<{ label: string; to: string }>
}

const providerDashboardPresentations: Record<ProviderKind, ProviderDashboardPresentation> = {
  MANAGER: {
    eyebrow: 'Manager execution',
    title: 'Coordinate accepted bookings with your team.',
    intro: 'Review active commitments, your Worker network, and assignment progress using the existing execution workflow.',
    primaryAction: { label: 'Open assignments', to: routes.provider.assignments },
    quickLinks: [
      { label: 'Discover Workers', to: routes.provider.networkDiscover },
      { label: 'Review assignments', to: routes.provider.assignments },
      { label: 'View commitments', to: routes.provider.commitments },
    ],
  },
  INDIVIDUAL_SERVICE_PROVIDER: {
    eyebrow: 'Direct bookings',
    title: 'Grow your service bookings.',
    intro: 'Keep your services current, review matched opportunities, and respond to organiser invitations.',
    primaryAction: { label: 'Manage services', to: routes.provider.services },
    quickLinks: [
      { label: 'Browse matched opportunities', to: routes.provider.opportunities },
      { label: 'Review invitations', to: routes.provider.requests },
      { label: 'Manage services and prices', to: routes.provider.services },
      { label: 'Your quotations', to: routes.provider.quotes },
    ],
  },
  ASSOCIATED_SERVICE_PROVIDER: {
    eyebrow: 'Professional engagements',
    title: 'Manage your professional engagements.',
    intro: 'Review organiser invitations and track your own quotations and commitments alongside your service profile.',
    primaryAction: { label: 'Review invitations', to: routes.provider.requests },
    quickLinks: [
      { label: 'Review invitations', to: routes.provider.requests },
      { label: 'View commitments', to: routes.provider.commitments },
      { label: 'Update professional profile', to: routes.provider.profile },
      { label: 'Manage services and prices', to: routes.provider.services },
    ],
  },
  TALENT: {
    eyebrow: 'Talent workspace',
    title: 'Showcase your talent and find performances.',
    intro: 'Explore matched event opportunities, keep your performance profile current, and follow quotations through to commitment.',
    primaryAction: { label: 'Update talent profile', to: routes.provider.profile },
    quickLinks: [
      { label: 'Explore performance opportunities', to: routes.provider.opportunities },
      { label: 'Update talent profile', to: routes.provider.profile },
      { label: 'Review quotations', to: routes.provider.quotes },
      { label: 'View commitments', to: routes.provider.commitments },
    ],
  },
  WORKER: {
    eyebrow: 'Worker assignments',
    title: 'Review your assignments and Manager network.',
    intro: 'Respond to assignment invitations, track accepted work, and keep your relationships with Managers up to date.',
    primaryAction: { label: 'Review assignments', to: routes.provider.assignments },
    quickLinks: [
      { label: 'Review assignments', to: routes.provider.assignments },
      { label: 'View your Manager network', to: routes.provider.network },
      { label: 'Review booking invitations', to: routes.provider.requests },
    ],
  },
}

export function getProviderDashboardPresentation(kind?: ProviderKind): ProviderDashboardPresentation {
  return kind ? providerDashboardPresentations[kind] : providerDashboardPresentations.INDIVIDUAL_SERVICE_PROVIDER
}
