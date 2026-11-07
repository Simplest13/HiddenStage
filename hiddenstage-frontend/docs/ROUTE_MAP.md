# Route Map

Path constants live in `src/app/routes/routePaths.ts`; `src/app/router/router.tsx` defines the single route tree and lazy feature modules.

| Area | Route | Page / access |
|---|---|---|
| Public | `/` | Homepage |
| Public | `/services` | Filterable demo service category discovery |
| Public | `/services/:categorySlug` | Service category detail and related demo providers |
| Public | `/providers` | Searchable demo provider directory |
| Public | `/providers/:providerId` | Demo provider profile |
| Public | `/how-it-works` | Process overview |
| Public | `/for-professionals` | Professional introduction |
| Public | `/about` | About page |
| Public | `/contact` | Validated local-only contact form preview |
| Public | `/help` | Searchable preview help topics |
| Public | `/privacy` | Draft privacy information requiring legal review |
| Public | `/terms` | Draft terms requiring legal review |
| Authentication | `/auth/login` | Demo sign-in with validation and password visibility |
| Authentication | `/auth/register` | Demo customer registration |
| Authentication | `/auth/verify-email` | Explicit local verification state; no email delivery |
| Authentication | `/auth/forgot-password` | Recovery preview; no email delivery |
| Authentication | `/auth/reset-password` | In-memory demo password reset |
| Onboarding | `/onboarding/customer` | Verified demo customer profile completion |
| Onboarding | `/onboarding/provider` | Verified independent professional profile, services, and explicit coverage locations |
| Customer | `/onboarding/customer` | Verified demo customer profile completion |
| Customer | `/app` | Customer dashboard with event-derived summaries, empty state, recent activity, upcoming events, profile summary, and quick navigation |
| Customer | `/app/events` | Searchable event list with available-status and event-type filters plus date sorting |
| Customer | `/app/events/new` | Multi-step create workflow, multiple titled requirements, attachments, review, and demo success |
| Customer | `/app/events/:eventId` | Persisted demo event details and eligible edit action |
| Customer | `/app/events/:eventId/edit` | Prefilled editing for submitted demo events |
| Customer | `/app/events/:eventId/providers` | Event-specific matching against demo provider service categories and explicit coverage; local customer invitation controls |
| Customer | `/app/events/:eventId/quotes` | Quotation comparison for an event, including submitted revision lines and history |
| Customer (legacy redirect) | `/app/customer` and `/app/customer/requests/*` | Redirects to canonical `/app` and `/app/events*` routes |
| Customer (legacy route) | `/app/customer/onboarding` | Kept for compatibility with the original customer onboarding flow |
| Customer | `/app/customer/quotes` | Customer quotation inbox across the current account's demo events |
| Customer | `/app/customer/commitments` | Commitment explanation and backend-dependent empty state |
| Provider | `/app/provider` | Dashboard with invitation, quotation, coverage and profile summaries |
| Provider | `/app/provider/profile` | Edit provider display name, description and contact; verification is read-only |
| Provider | `/app/provider/services` | Add and remove category offerings with optional base price |
| Provider | `/app/provider/coverage` | Add and remove explicit PIN/locality/city/state coverage rows |
| Provider | `/app/provider/requests` | Invitation inbox with status filters and accept/decline demo actions |
| Provider | `/app/provider/quotes` | Provider quotation list and revision history |
| Provider | `/app/provider/quotes/:eventId` | Create or revise a quotation after an accepted demo invitation |
| Provider | `/app/provider/commitments` | Commitment explanation and backend-dependent empty state |
| Business | `/app/business` | Authenticated shell |
| Business | `/app/business/profile` | Authenticated shell |
| Business | `/app/business/representatives` | Authenticated shell |
| Business | `/app/business/verification` | Authenticated shell |
| Admin | `/app/admin` | Authenticated and `ADMIN` role |
| Admin | `/app/admin/businesses` | Authenticated and `ADMIN` role |
| Admin | `/app/admin/reviews` | Authenticated and `ADMIN` role |
| Admin | `/app/admin/audit` | Authenticated and `ADMIN` role |
| System | `/403` | Forbidden page |
| System | `*` | Not-found page |

Business and admin routes remain structural placeholders. Provider discovery, invitation actions, profile/service/coverage editing, quotations, and customer comparison currently use browser demo storage through the replaceable marketplace API adapter. Commitment views are prepared but do not create or accept commitments. No production backend calls or generated endpoint types are connected. The customer event journey remains demo data only. Event statuses are limited to the currently supported demo value `Submitted`; no event lifecycle states were inferred.
