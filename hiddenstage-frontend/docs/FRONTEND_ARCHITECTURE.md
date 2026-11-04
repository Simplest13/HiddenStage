# Frontend Architecture

## Application shape

The app is organized by product feature and shared responsibility. `App.tsx` only composes providers and the router. Public pages, authentication views, workspace pages, and system errors are lazy-loaded feature modules. Layouts own navigation and page framing; pages own content; shared controls own reusable UI behavior.

```text
src/
  app/
    auth/             session state contract and hook
    providers/        React Query, auth, and toast providers
    router/           centralized route tree and guards
    routes/           canonical route path constants
  features/
    auth/              authentication page placeholders
    public/            homepage and public page placeholders
    system/            forbidden and not-found pages
    workspaces/        customer, provider, business, and admin previews
  layouts/             public, authentication, and workspace shells
  shared/
    api/               fetch boundary, dev-only adapter seam, generated types
    ui/                typed accessible controls and page states
```

## Route and access model

All path strings are exported from `src/app/routes/routePaths.ts`; the route tree derives relative route segments from those constants. Page modules are lazy imports. `/app/*` routes require an authenticated session; the admin subtree additionally requires the explicit `ADMIN` account role. The default auth context is anonymous until a backend session provider replaces it. Client guards are presentation controls only; backend authorization remains authoritative.

Business and provider previews do not infer account-role mappings or representative scopes. The approved permission matrix and server-side session contract must be supplied before those rules are made specific.

## Data and API boundaries

- `apiRequest` uses `VITE_API_BASE_URL`, `credentials: 'include'`, and sends the Django CSRF cookie on unsafe methods.
- React Query uses one shared client and conservative retry defaults.
- No endpoint contract or generated type exists until the backend publishes OpenAPI.
- The development adapter requires explicit injection and refuses production builds. No fixture data is bundled.
- Auth UI controls are disabled until real server-side session flows exist. No token or fake login is stored in browser storage.

## Decisions and constraints

- Keep frontend and backend as independent projects.
- The backend owns validation, permissions, and business state transitions.
- Do not add chat, booking, payment, escrow, payout, refund, wallet, credit, subscription, commission, automatic GST, or invoice behavior.
- Keep account roles limited to `USER`, `MANAGER`, `WORKER`, and `ADMIN` until an approved contract says otherwise.
