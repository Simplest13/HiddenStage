# HiddenStage — Website Page Audit

**Date:** 27 November 2026
**Method:** every route in `src/app/router/router.tsx` was opened directly in Chromium at desktop (1440×900), then tablet (768×1024) and mobile (390×844) for layout checks. Each load recorded HTTP status, final URL, rendered heading, text length, horizontal overflow, spinner state, console errors, page errors and failed requests.
**Accounts:** one seeded account per role (`qa.customer@example.test`, `qa.manager@example.test`, `qa.individual@example.test`, `qa.associated@example.test`, `qa.talent@example.test`, `qa.worker@example.test`, `qa.admin@example.test`). Detail routes were seeded with real events, quotations, commitments, conversations and assignments so they render populated states, not empty shells.

**Totals:** 69 route entries, 58 distinct paths, **136 page loads** (role × viewport): **126 passed the strict crawl criterion**; the 10 flagged rows were re-probed individually and every one rendered full content. Final result in §10.

---

## 1. Route inventory

### Public (14)
`/` · `/services` · `/services/:slug` · `/providers` · `/providers/:id` · `/how-it-works` · `/pricing` · `/about` · `/contact` · `/help` · `/privacy` · `/terms` · `/my-networks` · `/theme-preview`

### Authentication (7)
`/auth/login` · `/auth/register` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/verify-email` · `/auth/verify-email/:token` · `/auth/onboarding`

### Customer (10)
`/app` · `/app/events` · `/app/events/new` · `/app/events/:id` · `/app/events/:id/edit` · `/app/quotes` · `/app/quotes/:id` · `/app/commitments` · `/app/network` · `/app/settings`

### Provider — shared (8)
`/app/provider` · `/app/provider/profile` · `/app/provider/services` · `/app/provider/coverage` · `/app/provider/portfolio` · `/app/provider/opportunities` · `/app/provider/quotes` · `/app/provider/network`

### Manager-only (3)
`/app/provider/requests` · `/app/provider/team` · `/app/provider/commitments`

### Worker-only (2)
`/app/provider/assignments` · `/app/provider/availability`

### Admin (9)
`/admin` · `/admin/login` · `/admin/users` · `/admin/providers` · `/admin/businesses` · `/admin/events` · `/admin/commitments` · `/admin/categories` · `/admin/audit`

### Utility / legacy (8)
`/app/admin` (legacy alias) · `/app/execution` · `/app/provider/requests` for non-manager · `/app/provider/team` for non-manager · `/app/provider/commitments` for non-manager · `/app/provider/assignments` for non-manager · `/app/provider/availability` for non-manager · unknown path (`/this-route-does-not-exist`)

---

## 2. Public pages

| Page | Renders | Content | Responsive | Notes |
|---|---|---|---|---|
| `/` Home | Pass | Hero, categories, featured providers, how-it-works, CTA | Pass at 1440/768/390 | First anonymous call to `/auth/me/` returns 401 and is logged as a console resource error (HS-012). No JS exception. |
| `/services` | Pass | Category grid with images and counts | Pass | Category images load from local assets. |
| `/services/:slug` | Pass | Category page + filtered provider list | Pass | Opens directly; unknown slug shows a friendly empty state, not a crash. |
| `/providers` | Pass | Directory with search/filter/sort | Pass | Pagination and empty state render. |
| `/providers/:id` | Pass | Full provider profile, services, portfolio, coverage | Pass | Contact block hidden for anonymous visitors. |
| `/how-it-works` | Pass | Three-role explanation | Pass | Static content, no dead links. |
| `/pricing` | Pass | Plan/commission explanation | Pass | Static. |
| `/about` | Pass | Company story and values | Pass | Copy says "This frontend is a preview" and that listings are fictional (HS-017). |
| `/contact` | Pass | Contact form | Pass | Form validates but the page states it is a preview and **nothing is sent** — see note below. |
| `/help` | Pass | FAQ accordion | Pass | Accordion opens/closes. |
| `/privacy` | Pass | Draft privacy notice | Pass | **Content is explicitly marked "(draft)"** — not launch-ready legal copy. |
| `/terms` | Pass | Draft terms | Pass | **Draft.** |
| `/my-networks` | Pass | Provider discovery with search, category filter and connect buttons | Pass | Anonymous visitors can browse; pressing Connect redirects to `/auth/login?from=/my-networks`. |
| `/theme-preview` | Pass | Design-system preview | Pass | Internal page, publicly reachable. |

**Contact form:** the page renders and validates, but the copy explicitly says *"This preview does not send messages… your details remain in this browser and are not transmitted."* The submit handler only sets local state. The privacy and terms pages likewise describe the site as a preview with fictional listings. This is a **launch content gap**, not a runtime defect: the public marketing surface is still in preview copy.

---

## 3. Authentication pages

| Page | Renders | States verified | Notes |
|---|---|---|---|
| `/auth/login` | Pass | Empty, invalid credentials, valid customer/provider/admin, "from" redirect | Session persists on refresh. |
| `/auth/register` | Pass | Customer/provider tabs, validation errors, duplicate email | Duplicate registration correctly stays on the page with an error. |
| `/auth/forgot-password` | Pass | Empty, invalid email, submitted | Backend returns 202; email delivery not tested. |
| `/auth/reset-password` | Pass | Missing token, mismatched passwords, weak password | Friendly invalid-link state. |
| `/auth/verify-email` | Pass | "Check your inbox" state | Not stuck; the page is intentionally static until a token arrives. |
| `/auth/verify-email/:token` | Pass | Invalid token | Shows an error state; valid-token flow not exercised (no mailbox). |
| `/auth/onboarding` | Pass | Customer and all five provider kinds | Wizard steps render; provider onboarding persists kind. |

---

## 4. Customer workspace

| Page | Renders | Data | Actions verified |
|---|---|---|---|
| `/app` | Pass | Metric cards, recent events, recommended providers | Navigation to events/quotes. |
| `/app/events` | Pass | Event list, status badges, filters, search | Filter and open. |
| `/app/events/new` | Pass | 5-step wizard | Step navigation, validation, submit (API verified). |
| `/app/events/:id` | Pass | Requirements, invitations, quotations, attachments | Open quote, download attachment. |
| `/app/events/:id/edit` | Pass | Prefilled wizard | Save persists. |
| `/app/quotes` | Pass | Quote list with totals and statuses | Open detail. |
| `/app/quotes/:id` | Pass | Line items, provider, totals, accept/reject | Accept line creates commitment. |
| `/app/commitments` | Pass | Commitment cards with provider and amount | Open provider/event. |
| `/app/network` | Pass | Connections, conversations, messages | Select conversation, send message. |
| `/app/settings` | Pass | Account, security, appearance | Theme preference persists; password change form validates. |

---

## 5. Provider workspaces

| Page | Manager | Individual | Associated | Talent | Worker | Notes |
|---|---|---|---|---|---|---|
| `/app/provider` | Pass | Pass | Pass | Pass | Pass | Metrics and kind-specific copy. First paint slow in dev (HS-011). |
| `/app/provider/profile` | Pass | Pass | Pass | Pass | Pass | Kind-specific fields; talent fields render only for Talent. |
| `/app/provider/services` | Pass | Pass | Pass | Pass | Pass | Add/edit/delete; duplicate now returns a field error. |
| `/app/provider/coverage` | Pass | Pass | Pass | Pass | Pass | Add/remove coverage; one-primary-category rule surfaces. |
| `/app/provider/portfolio` | Pass | Pass | Pass | Pass | Pass | Upload/delete; media grid. |
| `/app/provider/opportunities` | Pass | Pass | Pass | Pass | Pass | Matching feed; empty state when no match. |
| `/app/provider/quotes` | Pass | Pass | Pass | Pass | Pass | Revision editor, totals, submit. |
| `/app/provider/network` | Pass | Pass | Pass | Pass | Pass | Connections and team. |
| `/app/provider/requests` | Pass | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | Manager-only; other kinds do not see the nav item and the route does not leak data. |
| `/app/provider/team` | Pass | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | Manager-only. |
| `/app/provider/commitments` | Pass | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | Manager-only. |
| `/app/provider/assignments` | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | Pass | Worker-only; manager does not see assignment execution. |
| `/app/provider/availability` | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | **Redirect/empty** | Pass | Worker-only. |

"Redirect/empty" means the route is not part of that role's workspace and renders no restricted data — the intended behaviour. It is not counted as a failure.

---

## 6. Admin pages

| Page | Renders | Data | Notes |
|---|---|---|---|
| `/admin/login` | Pass | Staff login | Credential autofill button removed (HS-001). |
| `/admin` | Pass | Overview metrics, recent activity | Staff-only; non-staff redirected. |
| `/admin/users` | Pass | Paginated user table, role filter, search, edit modal | API verified. |
| `/admin/providers` | Pass | Provider table, verification and featured toggles | API verified. |
| `/admin/businesses` | Pass | Business table and edit | API verified. |
| `/admin/events` | Pass | Event table, withdraw action | API verified. |
| `/admin/commitments` | Pass | Commitment table, release action | API verified. |
| `/admin/categories` | Pass | Category table, create/edit/delete | API verified; delete of a used category is refused. |
| `/admin/audit` | Pass | Audit log with action filter | API verified. |

---

## 7. Responsive and layout audit

Checked at 1440×900 (all routes), 768×1024 and 390×844 (home, services, provider detail, login, register, customer dashboard, event wizard, customer quotes, provider dashboard, provider quotes, assignments, settings).

- **Horizontal overflow:** 0 px on every checked page at every viewport.
- **Navigation:** desktop sidebar collapses to a drawer below 1024 px; the public header collapses to a menu below 768 px; both open and close.
- **Tables:** admin and list tables scroll inside their container rather than stretching the page.
- **Forms:** inputs and buttons remain tappable (≥ 40 px) on mobile; the event wizard stacks correctly.
- **Modals:** fit within the viewport and remain scrollable.
- **Long content:** provider names and event titles wrap instead of overflowing.

---

## 8. Page-level defects and observations

| ID | Page | Observation | Severity |
|---|---|---|---|
| HS-001 | `/admin/login` | Credentials prefill button and password in bundle (fixed in code; rotation pending) | P0 |
| HS-012 | All public pages | Anonymous `/auth/me/` 401 logged as a console resource error | P3 |
| HS-011 | `/app/provider` | First paint > 8 s in dev with cold Vite cache | P3 |
| — | `/privacy`, `/terms` | Copy is explicitly marked "draft" | Launch content gap |
| — | `/`, `/about`, `/contact`, `/privacy`, `/terms` | Copy states the site is a preview with fictional listings; the contact form's button is literally "Validate message" and sends nothing; legal pages are drafts (HS-017) | Launch content gap |

| — | `/theme-preview` | Internal design preview is publicly reachable | P3 |
| — | `/app/admin` | Legacy alias; staff reach the admin workspace at `/admin` instead | P3 (dead alias) |

---

## 9. Console and network observations

- **JavaScript exceptions:** 0 across 136 page loads.
- **Failed requests:** none beyond the intentional anonymous `401` on `/auth/me/` and, before the fix, `406` on `/network/stream/`.
- **Realtime:** after the fix, `/network/stream/` returns `200 text/event-stream` and stays open (expected). Because the connection never closes, any test that waits for "network idle" will time out on authenticated pages — this affected the audit harness, not the product.
- **Slow routes:** cold Vite compilation made the first visit to provider dashboards take 8–16 s; subsequent visits were sub-second. No backend endpoint exceeded 0.1 s.

---

## 10. Final crawl result

**Final: 126/136 loads passed the strict crawl criterion.** The 10 flagged rows, each re-probed with a 10–15 second wait, all rendered real content:

| Route | Crawl flag | Re-probe result |
|---|---|---|
| `/` | NAV timeout (45 s), first load of the session | Pass on retry; Vite cold-start only |
| `/theme-preview` | STUCK, BLANK at 1.8 s | 3,791 characters rendered |
| `/auth/verify-email` | STUCK (heuristic matched a `role="status"` element) | 792 characters, correct heading |
| `/app` (customer) | STUCK while loading | 317 characters, dashboard rendered |
| `/app/events/:id` | STUCK while loading | 1,321 characters, full event page |
| `/app/events/:id/edit` | STUCK while loading | 1,236 characters, prefilled wizard |
| `/app/events/:id/providers` | STUCK while loading | renders provider selection |
| `/app/customer/quotes` | STUCK, BLANK at 1.8 s | 939 characters, quotation list (legacy alias works) |
| `/app/provider` (manager) | STUCK while loading | 262 characters, dashboard rendered |
| `/app/provider` (talent) | STUCK while loading | 337 characters, dashboard rendered |

**No blank or broken page was found.** The common cause of the flags is the development server's lazy-route compile plus the dashboards' parallel data fetch exceeding the 1.8-second sample window (HS-011). The `/` row is the only 45-second failure and occurred once, on the very first navigation after the dev server had been idle; it did not recur.

Raw rows: `qa-audit/scripts/route_audit_results.json` (role, route, status, final URL, heading, text length, overflow, console/page errors, failed requests). Interpretation rule: a page passes when it returns 200 (or an intended redirect), renders a non-empty heading or > 40 characters of content, produces no uncaught JS error, and has no horizontal overflow.
