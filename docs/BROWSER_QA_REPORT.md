# Browser QA Report

Real Chromium sessions against the local Django API and PostgreSQL. No mocked
responses, no stubbed network layer: every journey below hits the live backend.

## 1. Environment

| Item | Value |
| --- | --- |
| Date | 15 November 2026 |
| Browser | Playwright bundled Chromium (headless), `Desktop Chrome` profile |
| Frontend | Vite dev server, `http://127.0.0.1:5173` |
| Backend | Django `runserver`, `http://127.0.0.1:8000`, pinned virtualenv (Django 5.2.19) |
| Database | PostgreSQL 16 container on `127.0.0.1:55432` |
| Email verification | `EMAIL_VERIFICATION_REQUIRED=0` (registration signs in immediately) |
| Test data | Fresh accounts per test, `@example.test` addresses, unique display names |
| Artifacts | `hiddenstage-frontend/e2e-artifacts/*.png` |

Suite: `hiddenstage-frontend/e2e/` — `auth.spec.ts`, `customer-journey.spec.ts`,
`manager-journey.spec.ts`, `worker-journey.spec.ts`, `network-journey.spec.ts`,
`responsive.spec.ts`.

Run with `npm run test:e2e` from `hiddenstage-frontend`. The suite reuses a running
dev server on 5173 and otherwise starts one; it never touches production data.

## 2. Scenario results

| # | Scenario | Result |
| --- | --- | --- |
| 1 | Homepage, services index and provider directory render | PASS |
| 2 | Customer registers, onboards, is signed in without email verification | PASS |
| 3 | Session survives reload; cookie is `HttpOnly` + `SameSite=Lax` | PASS |
| 4 | Provider registration routes to professional onboarding | PASS |
| 5 | Duplicate email registration shows a visible error | PASS |
| 6 | Wrong password is refused and leaves no session cookie | PASS |
| 7 | Anonymous access to `/app/events` redirects to sign-in; sign-out clears the session | PASS |
| 8 | Customer publishes an event request through the 4-step wizard | PASS |
| 9 | Request appears in the customer's request list | PASS |
| 10 | Manager onboards, discovers the published request, submits a quotation | PASS |
| 11 | Independent Worker onboards, finds the request with **no invitation**, submits a quotation | PASS |
| 12 | Customer compares quotations and records a commitment with the Worker | PASS |
| 13 | Commitment appears in the customer's commitments with the correct total | PASS |
| 14 | Manager discovers a Worker and sends a network invitation | PASS |
| 15 | Worker reviews and accepts; association visible to both sides | PASS |
| 16 | Responsive: customer routes at 1440 / 768 / 390, no horizontal overflow | PASS |
| 17 | Responsive: provider routes at 1440 / 768 / 390, no horizontal overflow | PASS |

Responsive coverage traversed: `/`, `/services`, `/providers`, `/app`,
`/app/events`, `/app/events/new`, `/app/events/:id`, `/app/settings`,
`/app/provider`, `/app/provider/opportunities`, `/app/provider/quotes`,
`/app/provider/network`, `/app/provider/network/discover`,
`/app/provider/assignments`, `/app/provider/profile`. The overflow assertion
compares `documentElement.scrollWidth` to `clientWidth` at each width, so a
single overflowing element fails the check.

## 3. Defects found and fixed

**D-QA-1 (critical, fixed). Private attachment uploads silently discarded the file.**
`EventAttachmentSerializer` declared every field read-only and never declared
`file`, so `serializer.save()` created a database row with an empty file path and
no bytes on disk. Uploads returned `201` and the API looked healthy; the download
endpoint would then fail because the field had no file. Found by the new
attachment test that reads the bytes back.

Fix: `file` is now a write-only `FileField` on the serializer, so the upload is
persisted while the raw storage path is never returned. Download still happens
only through the authorising view.

Regression coverage: `apps/events/test_attachments.py` — owner round-trip (bytes
identical, `Cache-Control: private, no-store`), another customer denied, anonymous
denied, mismatched content type rejected, plus storage-configuration guards.

**D-QA-2 (test-harness, not a product defect). CSRF origin for the QA server.**
Authenticated writes from `127.0.0.1:4173` failed origin checking because that
origin is not in `CSRF_TRUSTED_ORIGINS`. The suite now runs on the configured dev
origin (5173). Production impact: the deployed frontend origin **must** be listed
in `CSRF_TRUSTED_ORIGINS`, otherwise every authenticated write is rejected. This is
already recorded in the deployment checklist.

## 4. Console and network observations

- Two `403` responses to `GET /api/v1/auth/me/` on first load. Expected: the app
  probes the session before the visitor signs in.
- React logged DOM-nesting warnings on the registration screen
  (`In HTML, <…> cannot be a descendant of <…>`). Invalid HTML nesting, no
  behavioural effect; left unfixed as cosmetic and recorded here rather than
  silently ignored.
- No failed XHR other than the pre-auth `403`s above. No 5xx observed in any
  journey. No unhandled promise rejections.

## 5. Not covered by browser QA

| Area | Status | Why |
| --- | --- | --- |
| Assignment invitation / accept / start / complete | NOT TESTED IN BROWSER | Needs a Manager with an accepted commitment for a Worker; covered by backend tests (`apps/network/tests.py`) instead |
| Availability conflict screen | NOT TESTED IN BROWSER | Same prerequisite as above |
| Assignment cancellation and reassignment | NOT TESTED IN BROWSER | Same prerequisite |
| Email verification links | OUT OF SCOPE | Disabled for this milestone (`EMAIL_VERIFICATION_REQUIRED=0`) |
| Password reset email delivery | NOT TESTED IN BROWSER | Needs a configured mail provider |
| S3 media round-trip | PENDING OWNER CONFIGURATION | Needs a real bucket and credentials |
| Real device / Safari / Firefox | NOT TESTED | Chromium only in this milestone |

The `assignments` screens were still opened at all three widths and rendered a
real empty state; only their state transitions are unverified in the browser.

## 6. Artifacts

Screenshots are written to `hiddenstage-frontend/e2e-artifacts/` (git-ignored):

- `auth-01-customer-dashboard.png`, `auth-02-provider-onboarding.png`,
  `auth-03-duplicate-email.png`
- `cust-01-home.png` … `cust-06-requests-list.png`
- `mgr-01-dashboard.png` … `mgr-04-quotes-list.png`
- `wrk-01-dashboard.png` … `wrk-07-commitments-list.png`
- `net-01-worker-discovery.png` … `net-06-assignments-empty.png`
- `resp-{desktop,tablet,mobile}-*.png`

No screenshot or log contains a session token: cookies are `HttpOnly` and are
never rendered, and the suite never prints them.
