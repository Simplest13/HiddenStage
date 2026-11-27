# HiddenStage — Prioritized Bug Report

**Audit date:** 27 November 2026
**Scope:** repository `HiddenStage/` (frontend `hiddenstage-frontend`, backend `hiddenstage-backend`)
**Environment used for live tests:** isolated SQLite database seeded from migrations + `qa-audit/scripts/seed_audit_data.py`, backend on `127.0.0.1:8010`, frontend on `127.0.0.1:5174`.
**Production data:** the configured Neon database was inspected read-only (counts, taxonomy, staff accounts). No test record was created or deleted there.

Severity: **P0** critical, **P1** high, **P2** medium, **P3** low.

| ID | Title | Severity | Module | Fix status | Retest |
|---|---|---|---|---|---|
| HS-001 | Superuser password shipped in the public admin login page | **P0** | Admin / public bundle | **Fixed in code; credential rotation required** | Pass (code), rotation blocked |
| HS-002 | Duplicate merge migration breaks `migrate`, `test` and deploy | **P0** | Backend / migrations | **Fixed** | Pass |
| HS-003 | Model changes had no migrations (`administration`, `network`) | **P1** | Backend / migrations | **Fixed** | Pass |
| HS-004 | Duplicate provider service returned HTTP 500 | **P1** | Provider / services | **Fixed** | Pass |
| HS-005 | Realtime SSE endpoint returned HTTP 406 on every page | **P1** | All authenticated pages | **Fixed** | Pass |
| HS-006 | Backend test harness read the managed database and failed 5 tests | **P1** | Backend / test infra | **Fixed** | Pass |
| HS-007 | Customer custom-service ("Other"/custom category) flow is not implemented | **P1** | Customer / event creation | **Open — product decision** | Not applicable |
| HS-008 | Empty and non-image avatar uploads were accepted | **P2** | Account / media | **Fixed** | Pass |
| HS-009 | Browser suite helper targets a label that no longer exists | **P2** | Frontend / E2E | **Fixed** | Pass |
| HS-010 | Two authentication E2E specs assert obsolete UI behaviour | **P2** | Frontend / E2E | **Open — test debt** | Fail (test only) |
| HS-011 | Provider dashboard first paint exceeds 8 s in development | **P3** | Provider / performance | Open | Observed |
| HS-012 | Anonymous `/auth/me/` 401 logged as a console error on public pages | **P3** | Public / auth bootstrap | Open | Observed |
| HS-013 | Released commitments still expose provider contact details | **P3** | Matching / privacy | Open | Not tested with a released row |
| HS-014 | Main JS chunk is 517 kB (warning threshold 500 kB) | **P3** | Frontend / build | Open | Observed |
| HS-015 | Duplicate historical migration files remain in several apps | **P3** | Backend / migrations | Open (debt) | Fresh migrate passes |
| HS-016 | Portfolio media validation checks the extension, not the bytes | **P3** | Profiles / media | Open (hardening) | Verified extension checks only |
| HS-017 | Public marketing and legal pages still carry preview/demo copy; contact form sends nothing | **P2** | Public pages | **Open — launch content** | Confirmed in source and page copy |

---

## HS-001 — Superuser password shipped in the public admin login page

- **Severity:** P0 (authentication bypass / credential disclosure)
- **Module:** Admin
- **Route:** `/admin/login`
- **Reproduction:**
  1. Open `/admin/login` (or the deployed site).
  2. Click **Fill default admin credentials**.
  3. The form fills `admin@hiddenstage.in` / `Admin@HiddenStage2026`.
  4. The same string is present in the built bundle (`dist/assets/*.js`).
- **Expected:** No credentials in client code; admin login accepts only operator-supplied secrets.
- **Actual:** A one-click button filled a superuser email and password. The account exists in the configured database (`is_staff=True`, `is_superuser=True`, `is_active=True`, joined 2026-11-18).
- **Root cause:** `AdminLoginPage.tsx` contained a development convenience `handleAutoFill()` plus a visible "Fill default admin credentials" button. Vite compiles every string into the public bundle.
- **Fix applied:** Removed `handleAutoFill()` and the button. No other behaviour changed.
- **Retest:** `/admin/login` renders and typecheck/build pass; the credential string no longer appears in source or `dist`.
- **Remaining action (blocked, owner):** **Rotate the password of `admin@hiddenstage.in` immediately.** The password has been publicly served and must be treated as compromised. This audit did not change production credentials.
- **Evidence:** `qa-audit/scripts/route_audit_results.json` (admin routes), source diff in `hiddenstage-frontend/src/features/admin/AdminLoginPage.tsx`.

---

## HS-002 — Duplicate merge migration breaks `migrate`, `test` and deploy

- **Severity:** P0 (deployment blocker; no data loss)
- **Module:** Backend
- **Reproduction:** `cd hiddenstage-backend && python manage.py test` (or `migrate`).
- **Expected:** Migration graph has one leaf per app.
- **Actual:** `CommandError: Conflicting migrations detected; multiple leaf nodes in the migration graph: (0007_merge_20261126_2238, 0008_providerprofile_is_featured in profiles).` Every migration command and the 176-test suite aborted before running.
- **Root cause:** An untracked, generated duplicate `apps/profiles/migrations/0007_merge_20261126_2238.py` sat beside the committed `0007_merge_20261126_1930.py`. Both were empty merges of the same two parents.
- **Fix applied:** Deleted the duplicate untracked file. The committed merge chain remains.
- **Retest:** `showmigrations --plan` resolves; fresh-database `migrate` succeeds; 180 tests pass.

---

## HS-003 — Model changes had no migrations

- **Severity:** P1 (schema drift on deploy)
- **Module:** Backend
- **Reproduction:** `python manage.py makemigrations --check --dry-run`.
- **Expected:** "No changes detected".
- **Actual:** Pending changes for `administration.AdminAuditLog.action` (new `PROVIDER_FEATURED_UPDATED` choice) and `network.NetworkInvitation` (constraint/`initiated_by` drift from duplicate `0002` migrations).
- **Root cause:** Model edits were committed without their migrations.
- **Fix applied:** Added `administration/0002_alter_adminauditlog_action.py` and a single consolidated `network/0006_...` that removes the stale constraint, widens `initiated_by`, and re-adds the model's null-aware constraint. The generated two-step 0006+0007 pair was merged into one file before it was ever applied.
- **Retest:** `makemigrations --check` → "No changes detected"; fresh-database migrate succeeds.

---

## HS-004 — Duplicate provider service returned HTTP 500

- **Severity:** P1 (server error on a normal user action)
- **Module:** Provider / services
- **Route:** `POST /api/v1/me/provider-services/`
- **Reproduction:** As a provider, create a service for a category, then submit the same category again.
- **Expected:** `400` with a field error.
- **Actual:** `500 IntegrityError: UNIQUE constraint failed: profiles_providerservice.provider_id, profiles_providerservice.category_id`.
- **Root cause:** `ProviderServiceListCreateView.perform_create` saved directly; the `(provider, category)` uniqueness was enforced only by the database.
- **Fix applied:** Explicit existence check in `perform_create` raising a DRF `ValidationError({"category": ...})`.
- **Retest:** New test `test_duplicate_provider_service_returns_validation_error`; API journey check returns 400. Full suite green.

---

## HS-005 — Realtime SSE endpoint returned HTTP 406

- **Severity:** P1 (realtime messages/notifications never connected; console error on every authenticated page)
- **Module:** Network / realtime
- **Route:** `GET /api/v1/network/stream/`
- **Reproduction:** Sign in and open any workspace page; DevTools shows `406 (Not Acceptable)` for `/api/v1/network/stream/`, repeating every 5 seconds.
- **Expected:** `200 text/event-stream`.
- **Actual:** DRF content negotiation rejected the browser's `Accept: text/event-stream` before the `StreamingHttpResponse` was returned.
- **Root cause:** `RealtimeStreamView` is an `APIView` with no renderer that accepts `text/event-stream`.
- **Fix applied:** Added `EventStreamRenderer` (`media_type = "text/event-stream"`) and set `renderer_classes` on the view.
- **Retest:** Live request returns `200`, `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`; new tests cover authenticated 200 and anonymous rejection. Browser route crawl no longer records the 406.
- **Limitation:** First SSE frame delivery through the development server was slow to flush; production WSGI/ASGI buffering must be checked on the real host.

---

## HS-006 — Backend test harness read the managed database

- **Severity:** P1 (test reliability; risk of testing against shared data)
- **Module:** Backend / test infrastructure
- **Reproduction:** On a machine whose `.env` sets `DJANGO_ENV_FILE=.env.neon`, run `python manage.py test apps.core.test_database_url`.
- **Expected:** 7/7 pass.
- **Actual:** 5 failures; probes inherited `DJANGO_ENV_FILE` and `.env.neon` overrode each case's `DATABASE_URL`.
- **Root cause:** `run_settings()` removed `DJANGO_ENV_FILE` from the child environment, so `config.settings` re-read it from `.env` and loaded Neon with `override=True`.
- **Fix applied:** Set `DJANGO_ENV_FILE=""` in the probe environment instead of removing it.
- **Retest:** 7/7 pass; full suite 180 tests OK.

---

## HS-007 — Customer custom-service ("Other"/custom category) flow is not implemented

- **Severity:** P1 (a release-critical customer journey named in the brief)
- **Module:** Customer / event creation
- **Route:** `/app/events/new` → Services step
- **Reproduction:**
  1. Open the event creation wizard as a customer.
  2. Open the **Service category** select.
  3. There is no "Other" option and no control to create a custom category.
  4. Sending `category: "other"` directly to `POST /api/v1/events/` returns `400 {"requirements":[{"category":["Unknown service category: other."]}]}` on a database built from migrations.
- **Expected (per brief):** the customer can choose "Other", enter a custom service name/description, persist it, and see it on the event.
- **Actual:**
  - The customer UI lists only API categories and has no "Other" entry.
  - No customer-facing call to `POST /api/v1/catalog/categories/custom/` exists. That endpoint is used only by provider onboarding.
  - The backend's `custom_service_name` validation requires `category == "other"`, but the seed migration never creates an `other` category, so the path is unreachable on a fresh database.
  - The configured Neon database **does** contain an ad-hoc `other` row (plus custom rows `dandance`, `dance`, `technical`, `theka`), which is data drift not represented in code.
- **What does work (verified live):** `POST /catalog/categories/custom/` creates a distinct category (`is_custom=true`, own slug), deduplicates case-insensitively, rejects empty/1-character/over-80-character names, accepts special characters, persists in the public catalog, and can be used as an event requirement category — the requirement is stored under that category code, **not** as a generic "Other".
- **Root cause:** Product/UI gap plus taxonomy drift; the backend supports two different custom-service designs but the customer UI implements neither.
- **Recommended fix (needs product approval):** either expose "Other" as a first-class taxonomy entry (seed + frontend catalogue + select option) or add a "Create a custom service" control in the customer requirement editor that calls the existing custom-category endpoint and selects the returned code. The second matches the brief's "distinct custom category" requirement and the existing parity test.
- **Status:** Open. Not marked as passing anywhere in this report.

---

## HS-008 — Empty and non-image avatar uploads were accepted

- **Severity:** P2 (unsafe upload handling)
- **Module:** Account / media
- **Route:** `POST /api/v1/auth/avatar/`
- **Reproduction:** Upload a 0-byte file named `empty.png`, or `<html><script>…</script>` named `fake.png`.
- **Expected:** `400`.
- **Actual:** `200`; the file was stored and served at `/api/v1/auth/avatars/…`.
- **Root cause:** Only the extension and the 5 MB upper bound were checked; there was no lower bound and no signature check.
- **Fix applied:** Reject `size <= 0`; verify JPEG/PNG/GIF/WebP magic bytes before saving.
- **Retest:** New test `test_avatar_rejects_empty_and_spoofed_files`; API journey checks pass. Valid PNG still uploads and is served.

---

## HS-009 — Browser suite helpers no longer match the current UI

- **Severity:** P2 (the E2E suite cannot run, so it cannot gate a release)
- **Module:** Frontend / E2E
- **Reproduction:** `npx playwright test e2e/customer-journey.spec.ts` against the current UI.
- **Expected:** the journey creates an event.
- **Actual:** timeout waiting for `getByLabel('Event date')`; the form labels the field **Event start date** (`EventPages.tsx:490`).
- **Root cause:** UI label changed without updating `e2e/helpers.ts`.
- **Second helper defect found later:** provider onboarding selected the *first* service category, while the test event requested Photography. The opportunity feed correctly excluded the manager, so the test failed at "event not visible".
- **Fix applied:** helper now targets `Event start date` and selects the Photography category when present.
- **Retest:** customer journey passes in 1.3 min; manager journey passes in 2.3 min; see `FUNCTIONAL_TEST_REPORT.md`.

---

## HS-010 — Two authentication E2E specs assert obsolete UI behaviour

- **Severity:** P2 (test debt)
- **Module:** Frontend / E2E
- **Files:** `e2e/auth.spec.ts`
- **Details:**
  - "provider registration routes to professional onboarding" expects the profile-name field immediately; the onboarding is now a multi-step wizard whose first step is professional-kind selection (the helper `completeProviderOnboarding` already handles the wizard).
  - "duplicate registration is rejected" calls `register()`, whose contract is "wait until navigation leaves `/auth/register`"; a rejected registration correctly stays on the page.
- **Fix:** not applied (test-only rewrite; not required to establish product behaviour). Recorded as open test debt.

---

## HS-011 — Provider dashboard first paint exceeds 8 s in development

- **Severity:** P3 (performance)
- **Observation:** On a cold browser context the manager/associated dashboard showed "Loading your workspace" for ~8–16 s while eight API calls each completed in 30–70 ms (measured directly). Individual/talent/worker dashboards rendered sooner after chunks were warm.
- **Likely cause:** first-visit Vite module compilation plus eight parallel fetches behind a single `Promise.all`, with no skeleton. Production bundle behaviour was not measured against the deployed host.
- **Status:** Open; needs a production-host measurement before being called a defect.

---

## HS-012 — Anonymous `/auth/me/` 401 logged as a console error

- **Severity:** P3 (cosmetic/noise)
- **Observation:** Public pages call `/api/v1/auth/me/`; an anonymous visitor receives the intended `401`, which Chromium logs as a failed resource.
- **Status:** Open. Behaviour is correct; the console noise can be removed by treating 401 as "anonymous" without a network error, or by a session probe that returns 204.

---

## HS-013 — Released commitments still expose provider contact details

- **Severity:** P3 (privacy edge case)
- **Detail:** `ProviderDetailView` grants contact visibility when *any* `Commitment` exists for `(provider, customer)`, regardless of status. A released/cancelled commitment still reveals the contact.
- **Status:** Open; needs a product decision on whether released engagements retain contact access.

---

## HS-014 / HS-015 / HS-016 — Low-severity debt

- **HS-014:** production build emits a 517 kB main chunk (warning only; gzip 118.61 kB).
- **HS-015:** duplicate historical migration files remain (`accounts/0002`, `events/0002`, `network/0002`, `profiles/0004–0006`). The graph resolves and a fresh migrate succeeds, but this is the condition that produced HS-002.
- **HS-016:** portfolio uploads validate extension and size only (`apps/core/validators.py`), not magic bytes. Avatar uploads were hardened (HS-008); portfolio media was not changed.

---

## HS-017 — Public marketing and legal pages still carry preview/demo copy

- **Severity:** P2 (launch content, not a runtime defect)
- **Module:** Public pages
- **Routes:** `/contact`, `/privacy`, `/terms`, and the site-wide footer
- **Observation:**
  - `/contact` renders the hero *"This preview does not send messages. You can check how the contact form behaves; your details remain in this browser and are not transmitted."* The submit handler only flips local state.
  - `/privacy` and `/terms` state that the frontend *"uses fictional sample listings and does not submit contact forms or booking requests"* and that *"production data practices, retention, processors, and user rights must be documented and reviewed before launch."*
  - Both legal pages are headed "(draft)".
- **Expected for launch:** production copy that describes the real service, a working contact channel, and legally reviewed privacy/terms.
- **Status:** Open. This is a content/legal task for the owner, not something to be invented by engineering.

---

## Bugs explicitly **not** found

These were tested and passed; they are listed so the absence of a finding is evidence, not an omission:

- IDOR on events, quotations, attachments (foreign customer/provider → 403/404).
- Customer calling provider-only endpoints and vice versa (403).
- Anonymous access to protected APIs (401/403).
- Assignment creation without an active Manager–Worker association (refused).
- Worker availability response leaking event, customer, location or instructions (none present).
- Duplicate assignment acceptance (refused).
- Custom-category duplicate/empty/long/special-character handling (correct, except the unreachable `other` path).
- Attachment content/type mismatch and executable extensions (refused).
- Event attachment download by a foreign user (403/404).
