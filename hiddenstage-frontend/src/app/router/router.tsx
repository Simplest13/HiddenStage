// oxlint-disable react/only-export-components -- This module intentionally exports the router and route objects beside lazy page modules.
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { PublicLayout } from '../../layouts/PublicLayout'
import { AuthenticationLayout } from '../../layouts/AuthenticationLayout'
import { WorkspaceLayout } from '../../layouts/WorkspaceLayout'
import { routes } from '../routes/routePaths'
import { RequireAuthentication, RequireCustomerOnboarding, RequireVerifiedCustomer, RequireProviderOnboarding, RequireCompletedProvider, RequireAdmin, RequireAdminOrLogin } from './RouteGuards'
import { Spinner } from '../../shared/ui/feedback'

const PublicPages = lazy(() => import('../../features/public/PublicPages'))
const HomepageMyNetworksPage = lazy(() => import('../../features/public/HomepageMyNetworksPage'))
const AuthPages = lazy(() => import('../../features/auth/AuthPages'))
const ProviderPages = lazy(() => import('../../features/provider/ProviderPages'))
const NetworkPages = lazy(() => import('../../features/network/NetworkPages'))
const OnboardingPages = lazy(() => import('../../features/onboarding/OnboardingPage'))
const ProviderOnboardingPage = lazy(() => import('../../features/onboarding/ProviderOnboardingPage'))
const CustomerPages = lazy(() => import('../../features/customer/CustomerPages'))
const CustomerBookingsPage = lazy(() => import('../../features/customer/CustomerBookingsPage'))
const CustomerNetworkPage = lazy(() => import('../../features/customer/CustomerNetworkPage'))
const CustomerPaymentsPage = lazy(() => import('../../features/customer/CustomerPaymentsPage'))
const QuotesPage = lazy(() => import('../../features/customer/QuotesPage'))
const CommitmentsPage = lazy(() => import('../../features/customer/CommitmentsPage'))
const EventPages = lazy(() => import('../../features/events/EventPages'))
const EventWorkspace = lazy(() => import('../../features/events/EventWorkspacePage'))
const SystemPages = lazy(() => import('../../features/system/SystemPages'))
const AdminPages = lazy(() => import('../../features/admin/AdminPages'))
const AdminLoginPage = lazy(() => import('../../features/admin/AdminLoginPage'))
const LegacyEventRedirect = lazy(() => import('../../features/events/LegacyEventRedirect'))
const relativePath = (parentPath: string, fullPath: string) => fullPath.slice(parentPath.length).replace(/^\/+/, '')

function lazyPage(Component: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<Spinner label="Loading page" />}>
      <Component />
    </Suspense>
  )
}

const publicChildren: RouteObject[] = [
  { path: routes.home, element: lazyPage(PublicPages), handle: { page: 'home' } },
  { path: routes.myNetworks, element: lazyPage(HomepageMyNetworksPage), handle: { page: 'myNetworks' } },
  { path: routes.services, element: lazyPage(PublicPages), handle: { page: 'services' } },
  { path: routes.serviceCategory, element: lazyPage(PublicPages), handle: { page: 'serviceCategory' } },
  { path: routes.providers, element: lazyPage(PublicPages), handle: { page: 'providers' } },
  { path: routes.providerDetail, element: lazyPage(PublicPages), handle: { page: 'providerDetail' } },
  { path: routes.howItWorks, element: lazyPage(PublicPages), handle: { page: 'howItWorks' } },
  { path: routes.forProfessionals, element: lazyPage(PublicPages), handle: { page: 'forProfessionals' } },
  { path: routes.about, element: lazyPage(PublicPages), handle: { page: 'about' } },
  { path: routes.contact, element: lazyPage(PublicPages), handle: { page: 'contact' } },
  { path: routes.help, element: lazyPage(PublicPages), handle: { page: 'help' } },
  { path: routes.privacy, element: lazyPage(PublicPages), handle: { page: 'privacy' } },
  { path: routes.terms, element: lazyPage(PublicPages), handle: { page: 'terms' } },
]

const authChildren: RouteObject[] = [
  { path: relativePath(routes.authBase, routes.auth.login), element: lazyPage(AuthPages), handle: { page: 'login' } },
  { path: relativePath(routes.authBase, routes.auth.register), element: lazyPage(AuthPages), handle: { page: 'register' } },
  { path: relativePath(routes.authBase, routes.auth.verifyEmail), element: lazyPage(AuthPages), handle: { page: 'verifyEmail' } },
  { path: relativePath(routes.authBase, routes.auth.forgotPassword), element: lazyPage(AuthPages), handle: { page: 'forgotPassword' } },
  { path: relativePath(routes.authBase, routes.auth.resetPassword), element: lazyPage(AuthPages), handle: { page: 'resetPassword' } },
]

const protectedChildren: RouteObject[] = [
  { path: '', element: <WorkspaceLayout audience="customer" />, children: [
    { path: relativePath(routes.appBase, routes.customer.onboarding), element: <RequireVerifiedCustomer />, children: [
      { index: true, element: lazyPage(OnboardingPages), handle: { page: 'onboarding' } },
    ] },
    { element: <RequireCustomerOnboarding />, children: [
    { index: true, element: lazyPage(CustomerPages), handle: { page: 'customerHome' } },
    { path: relativePath(routes.appBase, routes.customer.bookings), element: lazyPage(CustomerBookingsPage), handle: { page: 'customerBookings' } },
    { path: relativePath(routes.appBase, routes.customer.network), element: lazyPage(CustomerNetworkPage), handle: { page: 'customerNetwork' } },
    { path: relativePath(routes.appBase, routes.customer.payments), element: lazyPage(CustomerPaymentsPage), handle: { page: 'customerPayments' } },
    { path: relativePath(routes.appBase, routes.customer.requests), element: lazyPage(CustomerPages), handle: { page: 'customerRequests' } },
    { path: relativePath(routes.appBase, routes.customer.newRequest), element: lazyPage(EventPages), handle: { page: 'eventCreate' } },
    { path: relativePath(routes.appBase, routes.customer.requestDetail), element: lazyPage(EventWorkspace), handle: { page: 'eventDetail' } },
    { path: relativePath(routes.appBase, routes.customer.requestEdit), element: lazyPage(EventPages), handle: { page: 'eventEdit' } },
    { path: relativePath(routes.appBase, routes.marketplace.providersForEvent), element: lazyPage(EventWorkspace), handle: { page: 'eventProviderDiscovery' } },
    { path: relativePath(routes.appBase, routes.marketplace.quotesForEvent), element: lazyPage(EventWorkspace), handle: { page: 'customerEventQuotes' } },
    { path: relativePath(routes.customer.home, routes.customer.quotes), element: lazyPage(QuotesPage), handle: { page: 'customerQuotes' } },
    { path: relativePath(routes.customer.home, routes.customer.commitments), element: lazyPage(CommitmentsPage), handle: { page: 'customerCommitments' } },
    ] },
    { path: 'settings', element: lazyPage(CustomerPages), handle: { page: 'customerSettings' } },
    { path: 'customer', children: [
      { index: true, element: <Navigate to={routes.customer.home} replace /> },
      { path: 'requests', children: [
        { index: true, element: <Navigate to={routes.customer.requests} replace /> },
        { path: 'new', element: <Navigate to={routes.customer.newRequest} replace /> },
        { path: ':requestId', element: lazyPage(LegacyEventRedirect) },
      ] },
    ] },
  ] },
  { element: <RequireCompletedProvider />, children: [{ path: relativePath(routes.appBase, routes.provider.home), element: <WorkspaceLayout audience="provider" />, children: [
    { index: true, element: lazyPage(ProviderPages), handle: { page: 'providerHome' } },
    { path: relativePath(routes.provider.home, routes.provider.profile), element: lazyPage(ProviderPages), handle: { page: 'providerProfile' } },
    { path: relativePath(routes.provider.home, routes.provider.services), element: lazyPage(ProviderPages), handle: { page: 'providerServices' } },
    { path: relativePath(routes.provider.home, routes.provider.coverage), element: <Navigate to={`${routes.provider.profile}?tab=coverage`} replace /> },
    { path: relativePath(routes.provider.home, routes.provider.opportunities), element: lazyPage(ProviderPages), handle: { page: 'providerOpportunities' } },
    { path: relativePath(routes.provider.home, routes.provider.network), element: lazyPage(NetworkPages), handle: { page: 'network' } },
    { path: relativePath(routes.provider.home, routes.provider.customerNetwork), element: lazyPage(CustomerNetworkPage), handle: { page: 'customerNetwork' } },
    { path: relativePath(routes.provider.home, routes.provider.networkDiscover), element: lazyPage(NetworkPages), handle: { page: 'networkDiscover' } },
    { path: relativePath(routes.provider.home, routes.provider.assignments), element: lazyPage(NetworkPages), handle: { page: 'assignments' } },
    { path: relativePath(routes.provider.home, routes.provider.assignmentDetail), element: lazyPage(NetworkPages), handle: { page: 'assignmentDetail' } },
    { path: relativePath(routes.provider.home, routes.provider.requests), element: lazyPage(ProviderPages), handle: { page: 'providerRequests' } },
    { path: relativePath(routes.provider.home, routes.provider.quotes), element: lazyPage(ProviderPages), handle: { page: 'providerQuotes' } },
    { path: relativePath(routes.provider.home, routes.provider.quoteForEvent), element: lazyPage(ProviderPages), handle: { page: 'providerQuoteEditor' } },
    { path: relativePath(routes.provider.home, routes.provider.commitments), element: lazyPage(ProviderPages), handle: { page: 'providerCommitments' } },
    { path: relativePath(routes.provider.home, routes.provider.settings), element: lazyPage(CustomerPages), handle: { page: 'customerSettings' } },
  ] }] },
  // Business workspace has no backend in this release; the URL stays reserved.
  { path: relativePath(routes.appBase, routes.business.home), element: <Navigate to={routes.forbidden} replace /> },
  { path: `${relativePath(routes.appBase, routes.business.home)}/*`, element: <Navigate to={routes.forbidden} replace /> },
  { element: <RequireAdmin />, children: [{ path: relativePath(routes.appBase, routes.admin.legacyHome), element: <WorkspaceLayout audience="admin" />, children: [
    { index: true, element: lazyPage(AdminPages), handle: { page: 'adminOverview' } },
    { path: relativePath(routes.admin.legacyHome, routes.admin.businesses), element: lazyPage(AdminPages), handle: { page: 'adminBusinesses' } },
    { path: relativePath(routes.admin.legacyHome, routes.admin.reviews), element: lazyPage(AdminPages), handle: { page: 'adminReviews' } },
    { path: relativePath(routes.admin.legacyHome, routes.admin.audit), element: lazyPage(AdminPages), handle: { page: 'adminAudit' } },
  ] }] },
]

export const routeConfig: RouteObject[] = [
  { element: <PublicLayout />, children: publicChildren },
  { path: routes.authBase, element: <AuthenticationLayout />, children: authChildren },
  { path: routes.admin.login, element: lazyPage(AdminLoginPage) },
  {
    path: routes.admin.home,
    element: <RequireAdminOrLogin />,
    children: [
      {
        element: <WorkspaceLayout audience="admin" />,
        children: [
          { index: true, element: lazyPage(AdminPages), handle: { page: 'adminOverview' } },
          { path: relativePath(routes.admin.home, routes.admin.businesses), element: lazyPage(AdminPages), handle: { page: 'adminBusinesses' } },
          { path: relativePath(routes.admin.home, routes.admin.reviews), element: lazyPage(AdminPages), handle: { page: 'adminReviews' } },
          { path: relativePath(routes.admin.home, routes.admin.audit), element: lazyPage(AdminPages), handle: { page: 'adminAudit' } },
        ],
      },
    ],
  },
  { element: <RequireAuthentication />, children: [
    { path: routes.onboarding.customer, element: <RequireVerifiedCustomer />, children: [{ index: true, element: lazyPage(OnboardingPages), handle: { page: 'onboarding' } }] },
    { path: routes.onboarding.provider, element: <RequireProviderOnboarding />, children: [{ index: true, element: lazyPage(ProviderOnboardingPage) }] },
  ] },
  { path: routes.appBase, element: <RequireAuthentication />, children: protectedChildren },
  { path: routes.forbidden, element: lazyPage(SystemPages), handle: { page: 'forbidden' } },
  { path: routes.notFound, element: lazyPage(SystemPages), handle: { page: 'notFound' } },
]

export const router = createBrowserRouter(routeConfig)
