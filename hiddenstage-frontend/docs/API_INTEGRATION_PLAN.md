# API Integration Plan

## Current boundary

- Configure the API base URL with `VITE_API_BASE_URL`; `.env.example` uses `/api/v1`.
- Call JSON endpoints through `src/shared/api/client.ts`. It includes cookies and attaches the `csrftoken` cookie to unsafe requests, matching the planned Django session/CSRF approach.
- `ApiError` carries the HTTP status and the API boundary normalizes validation, session, permission, not-found, server, and network failures. Event UI remains on the mock adapter until a backend implementation can consume the approved contract.
- Keep React Query defaults in `src/app/providers/queryClient.ts`.
- Generate API types into `src/shared/api/generated/` from the backend's published OpenAPI schema. The directory is intentionally empty of endpoint declarations until that schema exists.
- `createDevOnlyAdapter` is an injection seam for development UI work. It has no fixtures and throws if called in a production build.

## Before connecting features

1. Obtain the backend OpenAPI schema and agree on a reproducible type-generation command.
2. Confirm session bootstrap, CSRF-cookie initialization, login/logout, email verification, and password reset contracts.
3. Confirm API origin, CORS/CSRF trusted origins, and local proxy behavior for each environment.
4. Replace the default anonymous auth provider with session-backed state; never persist session credentials in local storage.
5. Keep demo-only identity state in `sessionStorage`; production session credentials belong in secure, HTTP-only server cookies and must not be persisted by the UI.
6. Add feature query keys and endpoint hooks only from generated types and approved product rules.
7. Verify authorization, privacy, and PostgreSQL-backed invariants on the server. Frontend guards are not security controls.

## Not connected

`src/shared/api/customerContracts.ts` defines endpoint-independent typed boundaries for customer/provider auth and profile operations plus event create/read/update, requirements, and attachment metadata. `src/features/events/services/customerEventApi.ts` exposes the UI-facing event API and currently delegates to `demoCustomerApi`; swap this adapter for a backend implementation only after receiving the approved schema. No event endpoint or request DTO is guessed. Profile and event metadata persist in browser local storage; demo identity persists for the current tab in session storage; passwords remain in memory; file bytes are neither uploaded nor stored. The backend must enforce ownership and permissions, and the backend team must confirm event lifecycle states, edit eligibility, field names, session/CSRF behavior, and private attachment flow.

## Provider and marketplace UI boundary

- `src/shared/api/marketplaceTypes.ts` contains UI-domain shapes only; it is not generated OpenAPI output or a backend request/response contract.
- `src/features/provider/services/marketplaceApi.ts` is the injection seam; the current binding is `demoMarketplaceApi` in `src/features/provider/services/demoMarketplaceApi.ts`.
- The local adapter supports provider profile/service/coverage editing, event matching against locally saved provider profiles, event invitations and responses, quotation line items, immutable submitted revision history, and customer comparison. Demo-only records are stored in browser local storage.
- Inspection found Django route declarations for provider profiles/services/coverage, provider discovery, invitations, and quotations. These are source-code declarations in an uncommitted backend directory, not a published/verified OpenAPI contract or a running integration. The referenced commitments app is absent, and no commitment endpoint is available.
- Do not connect the UI to those source-declared endpoints until the backend developer confirms the schema, session bootstrap/CSRF behavior, response pagination, and lifecycle/error semantics. No production API requests are currently made by the marketplace screens.
- Invitation expiry policy is not modeled. Quotations are visibly demo-only; the UI does not accept quotes, create commitments, or infer unresolved product rules.
