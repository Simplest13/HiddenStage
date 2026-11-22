# Dashboard Component Inventory

The inventory records current components and API wiring. Anything labelled **proposed** is not implemented.

## Shared application shell

| Component | Existing responsibility | Evidence |
|---|---|---|
| `router.tsx` | Lazy-loads public/auth, customer, provider, network, events, and admin page modules; nests route guards and layouts. | [router](../hiddenstage-frontend/src/app/router/router.tsx) |
| `RouteGuards.tsx` | Checks authentication, account role, email-verification policy, profile completion, and staff status before rendering a route. | [guards](../hiddenstage-frontend/src/app/router/RouteGuards.tsx) |
| `WorkspaceLayout.tsx` | Shared sidebar, top bar, breadcrumb, account menu, notifications, theme switch, and sign-out. | [layout](../hiddenstage-frontend/src/layouts/WorkspaceLayout.tsx) |
| `workspaceConfig.ts` | Navigation definitions for customer, provider, business, and admin audiences. Business links are configured but router paths redirect to forbidden. | [workspace config](../hiddenstage-frontend/src/layouts/workspaceConfig.ts) |
| Shared UI/API | Primitives, toast/error/loading/empty states, `useApiData`, API domain clients, CSRF/session client. | [UI](../hiddenstage-frontend/src/shared/ui/index.ts), [API client](../hiddenstage-frontend/src/shared/api/client.ts) |

## Existing dashboard modules

| Audience/module | Current screens and behavior | Data/API dependencies |
|---|---|---|
| Customer overview and requests | Summary counts, latest quotes, request list/filter, account settings and customer profile. | Events, commitments, event quotations, customer profile, account settings. |
| Customer event workspace | Overview, attachments, provider matching, invitations, quotation comparison, commitment acceptance/release. | Event ownership, category, matching, invitations, quotations, commitments. |
| Customer bookings/network/payments | Booking list/detail, provider connections/conversations, invoices/transactions, payment action. | Events, network/messaging, payments. Payment action is simulated. |
| Provider overview | Opportunities, invitations, quotations, commitments, profile, network and assignments are fetched to compose summary cards. | Multiple independent provider/profile/network endpoints; no dashboard aggregate endpoint. |
| Provider profile/services/coverage | Profile editing, categories/prices, explicit coverage; displays verification/completion state. | Provider profile, service, coverage, category, portfolio/team APIs. |
| Provider opportunities/invitations/quotes | Matched opportunities, invitation inbox, quotation/revision editing and submission, commitment view. | Matching, invitations, quotations, commitments. |
| Network and Worker discovery | Manager/Worker-specific UI variations; accept/decline/cancel invitations, end association, filter/discover/invite Workers. | Network invitation, association and discovery endpoints. |
| Assignments | Manager assignment creation from active commitments and active Workers; Worker response, start, completion; details/history. | Provider profile, commitments, associations, availability, assignments. |
| Admin operations | Platform overview, users, categories, provider verification, business review, moderation, audit. | Staff-protected admin endpoints. |
| Business | No dashboard screen is reachable; reserved route redirects to forbidden. | No user-facing business API family is registered in the root URL configuration. |

## Workflow dependency map (existing)

`Provider profile + service + coverage → completed profile → discoverable/matched provider → invitation/opportunity → quotation revision → customer selection → persisted active commitment → Manager + active Worker association → Worker assignment → acceptance/start/completion`.

The scheduling module depends on an accepted commitment; an invitation or submitted quote alone is not sufficient. A generic task/project module is absent: assignment rows provide a role, task description, instructions, schedule, compensation, and lifecycle state.

## Proposed additions (not implemented)

- Separate entry dashboards and navigation per professional kind while reusing shared profile, quote, and assignment components.
- A Manager execution summary combining active commitments, assignments, availability conflicts, and worker response state.
- A business workspace with explicit representative permissions and APIs.
- A dedicated API aggregate/read model if measured dashboard load or consistency needs justify it.

## Evidence limits

UI/API integration is inferred from source call sites; persistence/authorization claims are limited to the successful isolated backend tests. No live production page, account, API, payment processor, email delivery, or S3 provider was exercised. The route test for the public homepage timed out on a lazy loading fallback; eight other route tests passed.
