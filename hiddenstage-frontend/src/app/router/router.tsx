// oxlint-disable react/only-export-components -- This module intentionally exports the router and route objects beside lazy page modules.
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { PublicLayout } from '../../layouts/PublicLayout'
import { AuthenticationLayout } from '../../layouts/AuthenticationLayout'
import { WorkspaceLayout } from '../../layouts/WorkspaceLayout'
import { routes } from '../routes/routePaths'
import { RequireAuthentication, RequireRole } from './RouteGuards'
import { Spinner } from '../../shared/ui/feedback'

const PublicPages = lazy(() => import('../../features/public/PublicPages'))
const AuthPages = lazy(() => import('../../features/auth/AuthPages'))
const WorkspacePages = lazy(() => import('../../features/workspaces/WorkspacePages'))
const SystemPages = lazy(() => import('../../features/system/SystemPages'))
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
  { path: relativePath(routes.appBase, routes.customer.home), element: <WorkspaceLayout audience="customer" />, children: [
    { index: true, element: lazyPage(WorkspacePages), handle: { page: 'customerHome' } },
    { path: relativePath(routes.customer.home, routes.customer.requests), element: lazyPage(WorkspacePages), handle: { page: 'customerRequests' } },
    { path: relativePath(routes.customer.home, routes.customer.newRequest), element: lazyPage(WorkspacePages), handle: { page: 'customerNewRequest' } },
    { path: relativePath(routes.customer.home, routes.customer.requestDetail), element: lazyPage(WorkspacePages), handle: { page: 'customerRequestDetail' } },
    { path: relativePath(routes.customer.home, routes.customer.quotes), element: lazyPage(WorkspacePages), handle: { page: 'customerQuotes' } },
    { path: relativePath(routes.customer.home, routes.customer.commitments), element: lazyPage(WorkspacePages), handle: { page: 'customerCommitments' } },
  ] },
  { path: relativePath(routes.appBase, routes.provider.home), element: <WorkspaceLayout audience="provider" />, children: [
    { index: true, element: lazyPage(WorkspacePages), handle: { page: 'providerHome' } },
    { path: relativePath(routes.provider.home, routes.provider.profile), element: lazyPage(WorkspacePages), handle: { page: 'providerProfile' } },
    { path: relativePath(routes.provider.home, routes.provider.coverage), element: lazyPage(WorkspacePages), handle: { page: 'providerCoverage' } },
    { path: relativePath(routes.provider.home, routes.provider.requests), element: lazyPage(WorkspacePages), handle: { page: 'providerRequests' } },
    { path: relativePath(routes.provider.home, routes.provider.quotes), element: lazyPage(WorkspacePages), handle: { page: 'providerQuotes' } },
    { path: relativePath(routes.provider.home, routes.provider.commitments), element: lazyPage(WorkspacePages), handle: { page: 'providerCommitments' } },
  ] },
  { path: relativePath(routes.appBase, routes.business.home), element: <WorkspaceLayout audience="business" />, children: [
    { index: true, element: lazyPage(WorkspacePages), handle: { page: 'businessHome' } },
    { path: relativePath(routes.business.home, routes.business.profile), element: lazyPage(WorkspacePages), handle: { page: 'businessProfile' } },
    { path: relativePath(routes.business.home, routes.business.representatives), element: lazyPage(WorkspacePages), handle: { page: 'businessRepresentatives' } },
    { path: relativePath(routes.business.home, routes.business.verification), element: lazyPage(WorkspacePages), handle: { page: 'businessVerification' } },
  ] },
  { element: <RequireRole role="ADMIN" />, children: [
    { path: relativePath(routes.appBase, routes.admin.home), element: <WorkspaceLayout audience="admin" />, children: [
      { index: true, element: lazyPage(WorkspacePages), handle: { page: 'adminHome' } },
      { path: relativePath(routes.admin.home, routes.admin.businesses), element: lazyPage(WorkspacePages), handle: { page: 'adminBusinesses' } },
      { path: relativePath(routes.admin.home, routes.admin.reviews), element: lazyPage(WorkspacePages), handle: { page: 'adminReviews' } },
      { path: relativePath(routes.admin.home, routes.admin.audit), element: lazyPage(WorkspacePages), handle: { page: 'adminAudit' } },
    ] },
  ] },
]

export const routeConfig: RouteObject[] = [
  { element: <PublicLayout />, children: publicChildren },
  { path: routes.authBase, element: <AuthenticationLayout />, children: authChildren },
  { path: routes.appBase, element: <RequireAuthentication />, children: protectedChildren },
  { path: routes.forbidden, element: lazyPage(SystemPages), handle: { page: 'forbidden' } },
  { path: routes.notFound, element: lazyPage(SystemPages), handle: { page: 'notFound' } },
]

export const router = createBrowserRouter(routeConfig)
