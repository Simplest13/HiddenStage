# Dashboard Architecture Audit

## Scope and evidence

This is an audit of the implementation currently present in this repository. It does not redesign or change the application. “Existing” means supported by source code; “verified” additionally means exercised by the isolated tests listed below. “Proposed” means not implemented and is not a commitment to build it.

Primary evidence: [frontend router](../hiddenstage-frontend/src/app/router/router.tsx), [route guards](../hiddenstage-frontend/src/app/router/RouteGuards.tsx), [workspace layout](../hiddenstage-frontend/src/layouts/WorkspaceLayout.tsx), [backend URL configuration](../hiddenstage-backend/config/urls.py), [account model](../hiddenstage-backend/apps/accounts/models.py), and [provider/profile models](../hiddenstage-backend/apps/profiles/models.py).

## Existing architecture

- **Client:** React, TypeScript, Vite, React Router, lazy-loaded feature modules, shared workspace shell, and a shared `apiRequest` client. Mutations use session cookies and a CSRF header.
- **API:** Django REST Framework under `/api/v1/`, organized as a modular monolith (accounts, profiles, events, matching, invitations, quotations, commitments/payments, network/assignments, administration).
- **Authentication:** Django server-side sessions; the session cookie is HttpOnly. The frontend bootstraps and sends CSRF for unsafe requests.
- **Persistence:** Django models and migrations are the source of truth for profiles, event requests, requirements, invitations, quotation revisions, commitments, network relationships, assignments, payments, and admin audit entries.
- **Authorization:** Frontend route guards manage navigation, but the API also checks account role and scopes records by owner/participant. A route guard is not treated as an API security boundary.

## Workspace shape as implemented

| Audience / identity | Existing route and UI | Current status |
|---|---|---|
| Customer | `/app` and customer request, booking, network, payment, quote, and commitment pages | Implemented and API-backed; customer route guard checks `CUSTOMER`, email-verification policy, and profile completion. |
| Manager | Shared `/app/provider` workspace; Manager-specific network, worker discovery, and assignment actions | Implemented as a `PROVIDER` account with `ProviderProfile.kind=MANAGER`; this is not a separate Manager shell/dashboard. |
| Individual Service Provider | Shared provider workspace | `ProviderProfile.kind=INDIVIDUAL_SERVICE_PROVIDER`; backend limits declared categories to one, but the workspace and broad provider permissions are shared. |
| Associated Service Provider | Shared provider workspace | `ProviderProfile.kind=ASSOCIATED_SERVICE_PROVIDER`; no separate route or role-specific dashboard. Business representative records/scopes exist separately from this profile kind. |
| Talent | Shared provider workspace | `ProviderProfile.kind=TALENT`; talent-specific profile fields are available, but provider routes and broad provider permissions remain shared. |
| Worker | Shared provider workspace, with Worker-specific network and assignment views | `ProviderProfile.kind=WORKER`; worker association and assignment operations have kind-specific service checks. |
| Business workspace | `/app/business...` | Reserved and redirected to forbidden. It is not an implemented professional workspace. |
| Administration | `/admin` and legacy `/app/admin` routes | Staff-only application surface; separate from the six customer/professional identities. |

Thus, the code contains six marketplace identities (customer plus five provider kinds), but only two marketplace route families (customer and provider). A business workspace is explicitly not available. Admin is a separate operations surface.

## Persisted workflow and module dependencies (existing)

1. A customer profile is saved before the customer workspace is admitted. Provider completion requires a profile with display name/contact plus active service and coverage rows; completion is persisted on `ProviderProfile`.
2. A customer creates an `Event` and `ServiceRequirement` rows. Drafts are owner-scoped; submitting opens matching and quotations.
3. Matching and/or a customer invitation makes a request available to a provider. The provider creates a quotation, drafts line items/revisions, and submits a revision.
4. The customer selects eligible quoted lines/packages. Acceptance creates a `Commitment`, `CommitmentLine` rows and an `ACCEPTED` audit record; selected requirements move to committed and a fully committed event closes.
5. **Manager execution depends on an active commitment.** The manager must be the provider on that commitment, the worker must have a completed Worker profile, and an active Manager–Worker association must exist. A WorkerAssignment is then sent; acceptance, start, completion, cancellation, and reassignment are persisted lifecycle states. Pending assignments do not block availability; accepted/in-progress assignments do.
6. Payment screens and transaction records are separate from quotation acceptance. The payment endpoint is explicitly simulated; it does not demonstrate a real payment processor or settlement.

The workflow and database persistence are supported by isolated backend tests: the 71-test targeted run passed (3 PostgreSQL-only tests skipped) using an in-memory SQLite test database. Tests assert commitment, line, audit, event/requirement, association, and assignment state in the database—not only HTTP success.

## Proposed architecture direction (not implemented)

- Give the five professional kinds explicit dashboard entry points, navigation, and capability matrices while retaining shared components where appropriate.
- Treat Manager execution as a workflow assembled from accepted commitments, network associations, worker assignments, schedule/availability, and lifecycle history. A generic task/project-management module does not currently exist.
- Add a user-facing business workspace only after its identity, membership, scope enforcement, and API contracts are defined. Existing Business and BusinessRepresentative models do not make the reserved route functional.
- Establish API contract and cross-role tests for every proposed workspace before implementation.

## Evidence limits

- Production credentials, live user accounts, and current production infrastructure were not used. No production reads or writes were attempted.
- External email delivery, S3-compatible media storage, actual payment processing, deployment health, and production database behavior were not runtime-verified.
- PostgreSQL-specific concurrency/trigger behavior was not verified in this run; the isolated SQLite run skipped three PostgreSQL-only tests.
- The frontend route suite passed 8/9 tests; its public-homepage lazy-render assertion timed out with the loading fallback still present. Unauthorized-route assertions passed, but the homepage behavior requires separate investigation.
- A broader backend test run had one test failure because the subprocess S3-storage check could not import `django-storages`; the targeted workflow tests passed. No dependencies were installed or changed.
