# Frontend Implementation Status

**Updated:** 2026-11-05

## Assignment 004: Provider and marketplace UI

- Provider dashboard now summarizes saved profile, pending invitations, quotation count, and explicit service locations, with navigation to profile, services, coverage, and invitation tools.
- Provider profile editing validates display name, description, and contact fields. Verification remains read-only and is never self-assigned.
- Provider service management supports category offerings, descriptions, optional INR base prices, add/remove actions, and empty/error feedback.
- Provider coverage management supports explicit PIN/locality/city/state locations, duplicate checks, remove actions, and empty/error feedback. No nearby coverage is inferred.
- Customer event-specific discovery matches local provider profiles only when both an event service category and an explicit PIN or city/state coverage row match. Exact PIN matches are identified separately. Customers can scope and create local demo invitations.
- Provider invitation inbox supports pending/accepted/declined filtering, event/requirement context for invitations granted to the provider, and accept/decline demo responses.
- Provider quotation screens require an accepted local demo invitation, validate priced requirement lines and validity date, and preserve submitted revisions. Customer pages provide event-scoped and cross-event quotation comparison with item/package lines and revision history.
- Customer/provider commitment routes now present commitment-specific context and honest empty states. Acceptance and commitment creation remain unavailable.
- `src/features/provider/services/marketplaceApi.ts` is the UI injection seam. The current `demoMarketplaceApi` adapter stores profile service/coverage, invitations, and quotations in browser local storage. `src/shared/api/marketplaceTypes.ts` defines frontend UI-domain shapes only; it is not a backend DTO or generated API contract.
- Public and customer event workflows were preserved. Event details now link to event-specific provider discovery and quotation comparison.

## Backend coordination and integration status

- No approved Phase 0 specification pack was found. The recorded decision log still identifies invitation/quotation rules and other product behaviors as unresolved.
- No separate backend developer session/contact was discoverable from the current workspace session list. The frontend was not connected to source-only backend declarations without coordination or a published schema.
- `hiddenstage-backend` now contains uncommitted Django source that declares profile/service/coverage, matching, invitation, and quotation routes. It does not contain a published/generated OpenAPI file in the workspace. The backend configuration references `apps.commitments`, but that app is absent, so commitment integration is unavailable. Backend startup and tests were not run as part of this frontend-only assignment.
- No production marketplace endpoint is called. Invitation expiry is not modeled, verification is read-only, quote acceptance is not exposed, and commitment records cannot be created or released.

## Assignment 003: Customer workflow

- Demo registration, login, logout, explicit email verification, forgot/reset password preview, validation, password visibility, loading feedback, and recoverable form errors.
- Verified-session guard for onboarding and completed-profile guard for customer workspace routes.
- Two-step customer onboarding for name, email, phone, PIN code, locality, and city, with back/continue and completion states.
- Customer dashboard with welcome, profile completion, active/recent event summaries, create-event CTA, quick navigation, and logout.
- My Events search/status filters, event cards, empty state, and event detail navigation.
- Five-step event create/edit flow: basic details, location, multiple editable/removable requirements with individual budgets/instructions, validated demo attachments, and section-by-section review.
- Event success and details screens clearly state that provider invitations, bookings, and payments did not occur.
- Profile and event metadata persist per demo customer in local storage. Current-tab demo identity is in session storage. Passwords remain in the in-memory demo account map; file bytes are not uploaded or stored.
- Typed endpoint-independent customer service contract in `src/shared/api/customerContracts.ts`; replaceable local implementation in `src/features/customer/services/demoCustomerApi.ts`.
- Official tokens are centralized in `src/index.css`: burgundy `#710927`, antique gold `#B58C4F`, walnut `#92643E`, champagne `#D9C3A6`, and indigo `#2D2C4A`. Existing UI and public styles now consume shared semantic tokens.

## Assignment 003A: Authentication and onboarding extension

- Registration now offers `CUSTOMER` or `PROVIDER` (independent event professional); it does not introduce a supplier/business account role. Terms acceptance is required and links to the existing draft policies.
- Login redirects by account type. Provider workspace access is protected by the `PROVIDER` role; customer workspace access retains its customer profile completion guard. These client-side checks are UX only; the backend must enforce authorization.
- Verification includes pending, demo-success, and unavailable resend feedback. No OTP is used and no email is sent in demo mode.
- Dedicated `/onboarding/customer` and `/onboarding/provider` routes were added while preserving `/app/customer/onboarding` for the existing customer workflow.
- Customer onboarding now collects state and validates Indian mobile numbers as well as PIN codes.
- Provider onboarding captures a display name, description, contact detail, multiple service categories, and multiple explicit PIN/locality/city/state coverage entries. It does not imply verification, ratings, or coverage beyond submitted locations.
- Provider profiles are saved in browser demo storage through a separate replaceable service. Typed profile and account types are in `src/shared/api/customerContracts.ts`; no API endpoint or final backend DTO is assumed.
- Authentication and provider onboarding behavior have targeted unit coverage. Demo identity and account credentials remain mock-only; no real session security or delivery is implemented.

## Day 2: Customer dashboard and event workflow

- Canonical customer routes are `/app`, `/app/events`, `/app/events/new`, `/app/events/:eventId`, and `/app/events/:eventId/edit`. Older `/app/customer` and request URLs redirect for continuity; `/app/customer/onboarding` remains available.
- The customer dashboard summarizes event counts, recent activity and upcoming dates, shows the saved profile, and gives a first-event empty state. Its response and quotation summary counters remain disconnected; the new invitation and quotation demo data is not yet aggregated into that dashboard.
- My Events supports search, status and event-type filters, date sorting, details navigation, and separate empty/no-match states. The only status in the available mock contract is `Submitted`.
- Event create/edit uses focused form sections for basic details, location, service requirements, attachments, and review. Event description, venue name/address, requirement title/detail, per-requirement budgets/instructions, date/time validation, section editing, and timestamps are included.
- Multiple requirements can share a category; no duplicate-category restriction was invented without an approved rule. Submitted demo events can be edited through a dedicated route; no delete action was added.
- `src/features/events/services/customerEventApi.ts` is the typed replaceable UI boundary. It delegates to the browser-only demo adapter because no backend schema or endpoint contract was found in the accessible workspace.
- Event metadata persists per demo customer. Attachments remain local selections/metadata and are not privately uploaded. Event details for another customer appear unavailable in this local adapter; production ownership and 401/403/404 handling must be enforced by the backend.

## Assignment 002: Public website

- Homepage, service discovery, provider discovery/profile pages, How It Works, About, For Professionals, Contact, Help, and visibly draft Privacy/Terms.
- Fictional discovery data remains separate from UI components; local filters and form behavior work.

## Assignment 001: Foundation

- Feature-based React/TypeScript architecture, centralized lazy route tree, shared layouts, route guards, design components, API request boundary, React Query defaults, generated API type directory, and Vitest/Playwright/Oxlint tooling.
- Provider, business, and admin workspaces remain scaffolded and are not part of Assignment 003.

## API assumptions and limitations

- No approved OpenAPI schema, backend repository, or final event API specification was found in the accessible project workspace. Service interfaces are endpoint-independent and define UI-domain inputs only; field mapping and endpoints must be agreed against the backend contract before integration.
- Email, password recovery, and verification are local demo states. The seeded demo account is `demo@hiddenstage.test` / `Preview123!`. Registered demo passwords are held in memory only; after a full page reload, a saved demo session remains for the tab, but custom account credentials do not.
- Attachments accept JPG/PNG/WebP/PDF up to 5 MB each, maximum five. Only file metadata is saved; file contents remain in the browser and private storage is not connected.
- Event records persist locally and use the one supported demo status `Submitted`. No provider matching, invitation, quote, booking, payment, or real authentication occurs.
- Policy drafts remain unapproved and need legal review.

## Verification

- Baseline Assignment 003 results: `npm run typecheck`, `npm run lint`, unit tests (6 files / 17 tests), browser tests (5 Chromium tests), and `npm run build` passed before this extension.
- Assignment 003A final checks: `npm run typecheck` passed; `npm run lint` passed; unit suite passed (7 files / 18 tests); Playwright passed (6 Chromium tests); `npm run build` passed (107 modules).
- Day 2 verification: `npm run typecheck` passed; `npm run lint` passed; unit suite passed (9 files / 24 tests); Playwright passed (6 Chromium tests, including customer create/edit, requirement add/edit/remove, attachment validation, listing filters, refresh persistence, provider onboarding, and public regressions); `npm run build` passed (109 modules).
- Assignment 004 verification: `npm run typecheck` passed; `npm run lint` passed; unit suite passed (11 files / 29 tests); Playwright passed (6 Chromium tests, covering customer workflow/discovery, provider onboarding/dashboard, service and coverage management, responsive navigation, public discovery, and contact validation); production build passed (113 modules).
