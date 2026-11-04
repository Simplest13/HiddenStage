# API Integration Plan

## Current boundary

- Configure the API base URL with `VITE_API_BASE_URL`; `.env.example` uses `/api/v1`.
- Call JSON endpoints through `src/shared/api/client.ts`. It includes cookies and attaches the `csrftoken` cookie to unsafe requests, matching the planned Django session/CSRF approach.
- Keep React Query defaults in `src/app/providers/queryClient.ts`.
- Generate API types into `src/shared/api/generated/` from the backend's published OpenAPI schema. The directory is intentionally empty of endpoint declarations until that schema exists.
- `createDevOnlyAdapter` is an injection seam for development UI work. It has no fixtures and throws if called in a production build.

## Before connecting features

1. Obtain the backend OpenAPI schema and agree on a reproducible type-generation command.
2. Confirm session bootstrap, CSRF-cookie initialization, login/logout, email verification, and password reset contracts.
3. Confirm API origin, CORS/CSRF trusted origins, and local proxy behavior for each environment.
4. Replace the default anonymous auth provider with session-backed state; never persist session credentials in local storage.
5. Add feature query keys and endpoint hooks only from generated types and approved product rules.
6. Verify authorization, privacy, and PostgreSQL-backed invariants on the server. Frontend guards are not security controls.

## Not connected

No endpoint, response fixture, fabricated production record, login simulation, or submit action is included in this foundation.
