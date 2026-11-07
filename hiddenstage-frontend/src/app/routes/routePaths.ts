export const routes = {
  home: '/',
  authBase: '/auth',
  appBase: '/app',
  onboarding: { customer: '/onboarding/customer', provider: '/onboarding/provider' },
  services: '/services',
  serviceCategory: '/services/:categorySlug',
  providers: '/providers',
  providerDetail: '/providers/:providerId',
  howItWorks: '/how-it-works',
  forProfessionals: '/for-professionals',
  about: '/about',
  contact: '/contact',
  help: '/help',
  privacy: '/privacy',
  terms: '/terms',
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  customer: {
    home: '/app',
    onboarding: '/app/customer/onboarding',
    requests: '/app/events',
    newRequest: '/app/events/new',
    requestDetail: '/app/events/:eventId',
    requestEdit: '/app/events/:eventId/edit',
    legacyHome: '/app/customer',
    legacyRequests: '/app/customer/requests',
    legacyNewRequest: '/app/customer/requests/new',
    legacyRequestDetail: '/app/customer/requests/:requestId',
    quotes: '/app/customer/quotes',
    commitments: '/app/customer/commitments',
  },
  provider: {
    home: '/app/provider',
    profile: '/app/provider/profile',
    services: '/app/provider/services',
    coverage: '/app/provider/coverage',
    requests: '/app/provider/requests',
    quotes: '/app/provider/quotes',
    quoteForEvent: '/app/provider/quotes/:eventId',
    commitments: '/app/provider/commitments',
  },
  marketplace: {
    providersForEvent: '/app/events/:eventId/providers',
    quotesForEvent: '/app/events/:eventId/quotes',
  },
  business: {
    home: '/app/business',
    profile: '/app/business/profile',
    representatives: '/app/business/representatives',
    verification: '/app/business/verification',
  },
  admin: {
    home: '/app/admin',
    businesses: '/app/admin/businesses',
    reviews: '/app/admin/reviews',
    audit: '/app/admin/audit',
  },
  forbidden: '/403',
  notFound: '*',
} as const

export const routeTitles: Record<string, string> = {
  [routes.home]: 'A good event starts with the right people',
  [routes.services]: 'Explore event services',
  [routes.providers]: 'Explore event professionals',
  [routes.howItWorks]: 'How HiddenStage works',
  [routes.forProfessionals]: 'For event professionals',
  [routes.about]: 'About HiddenStage',
  [routes.contact]: 'Contact',
  [routes.help]: 'Help',
  [routes.privacy]: 'Privacy draft',
  [routes.terms]: 'Terms draft',
  [routes.customer.home]: 'Your events',
  [routes.customer.requestEdit]: 'Edit event request',
  [routes.customer.onboarding]: 'Complete your customer profile',
  [routes.customer.newRequest]: 'Create an event request',
  [routes.customer.requests]: 'My events',
  [routes.customer.quotes]: 'Quotes',
  [routes.customer.commitments]: 'Commitments',
  [routes.provider.home]: 'Provider workspace',
  [routes.provider.profile]: 'Your profile',
  [routes.provider.services]: 'Services you offer',
  [routes.provider.coverage]: 'Service coverage',
  [routes.provider.requests]: 'Request inbox',
  [routes.provider.quotes]: 'Your quotes',
  [routes.provider.commitments]: 'Commitments',
  [routes.business.home]: 'Business workspace',
  [routes.business.profile]: 'Business profile',
  [routes.business.representatives]: 'Representatives',
  [routes.business.verification]: 'Verification',
  [routes.admin.home]: 'Admin overview',
  [routes.admin.businesses]: 'Business review',
  [routes.admin.reviews]: 'Moderation queue',
  [routes.admin.audit]: 'Audit trail',
}

export function serviceCategoryPath(categorySlug: string) {
  return routes.serviceCategory.replace(':categorySlug', encodeURIComponent(categorySlug))
}

export function providerDetailPath(providerId: string) {
  return routes.providerDetail.replace(':providerId', encodeURIComponent(providerId))
}

export function customerEventPath(eventId: string) {
  return routes.customer.requestDetail.replace(':eventId', encodeURIComponent(eventId))
}

export function customerEventEditPath(eventId: string) {
  return routes.customer.requestEdit.replace(':eventId', encodeURIComponent(eventId))
}

export function eventProvidersPath(eventId: string) {
  return routes.marketplace.providersForEvent.replace(':eventId', encodeURIComponent(eventId))
}

export function eventQuotesPath(eventId: string) {
  return routes.marketplace.quotesForEvent.replace(':eventId', encodeURIComponent(eventId))
}

export function providerQuotePath(eventId: string) {
  return routes.provider.quoteForEvent.replace(':eventId', encodeURIComponent(eventId))
}
