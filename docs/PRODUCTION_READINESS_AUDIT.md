# Production Readiness Audit

**Date:** 2026-11-15
**Scope:** `hiddenstage-backend` (Django 5.2 target / DRF) and `hiddenstage-frontend`
(Vite + React 19), plus the local Postgres used for verification.
**Purpose:** prepare the first production launch, with email verification temporarily
optional and the frontend deployable on Vercel.

This audit reports what was actually executed. Anything not run is labelled as not run.

---

## 1. Method and evidence

| Check | Command | Result |
|---|---|---|
| Django system checks | `python manage.py check` | 0 issues |
| Production checks | `DJANGO_DEBUG=0 ... manage.py check --deploy` | 18 schema warnings + 1 security warning (both explained below) |
| Backend suite (gate on) | `EMAIL_VERIFICATION_REQUIRED=1 python manage.py test` | **92 tests, OK** |
| Backend suite (launch config) | `python manage.py test` (`.env` sets the flag to 0) | **92 tests, OK** |
| Frontend type check | `npm run typecheck` (`tsc -b`) | exit 0 |
| Frontend lint | `npm run lint` (`oxlint`) | **0 errors, 6 warnings** |
| Frontend unit tests | `npm test` (`vitest run`) | **19 tests in 5 files, passed** |
| Frontend production build | `npm run build` | success, `dist/` written |
| Live auth journeys | scripted HTTP against `127.0.0.1:8000` | **16/16 checks passed** |
| Frontend ↔ API proxy | `GET 127.0.0.1:5173/api/v1/health/` | 200 |
| Secret scan | grep for credential-shaped literals; `git ls-files` for `.env`/keys | clean |

Environment used for these runs: Windows, Python 3.12.3, PostgreSQL 16 (Docker,
host port 55432), Node 24.19, npm 10.8.

**Not run:** a click-through of the UI in a browser (no automated UI regression
suite is wired up). Frontend behaviour is covered by the 19 unit/route tests and the
backend journeys by the 92 Django tests plus the live HTTP checks.

---

## 2. Blockers

### BLOCKER-1 — Event attachments live on the local filesystem (OPEN)

`MEDIA_ROOT` defaults to `BASE_DIR/private-media` and attachments are written there
(`ATTACHMENT_*` settings, private downloads through authorized views). Any host with
an **ephemeral filesystem** (most PaaS, every serverless runtime) loses every upload
on redeploy, and a multi-instance deployment would serve an upload from only the
instance that received it.

Not fixed in code: the right remedy is a deployment decision, not a guess. Either

- mount a **persistent volume** at `MEDIA_ROOT` and run a single instance, or
- move to object storage (S3/R2) behind Django's storage API — this adds a
  dependency (`django-storages` + a client library) and should be a deliberate
  choice.

Documented in `docs/DEPLOYMENT_ARCHITECTURE.md` §7. **Must be decided before the
first real upload reaches production.**

---

## 3. High priority

### HIGH-1 — Static files are not served in production (OPEN)

`STATIC_ROOT` is set, but the production command is plain `gunicorn` and nothing
serves `/static/`. `/admin/` therefore renders unstyled and its JavaScript 404s.
Admin authentication itself works (it is form POST, not JS), so this is cosmetic for
admin but broken for anyone relying on the admin UI.

Remedy (one of): add `whitenoise` middleware (smallest change, `pip install
whitenoise` + one middleware line), or put the app behind a CDN/platform static
host that serves `STATIC_ROOT` after `collectstatic`.

Not applied here to avoid adding a dependency without a decision; the deployment
guide includes the exact steps.

### HIGH-2 — Python dependencies are unpinned (OPEN)

`requirements.txt` uses ranges (`Django>=5.2,<5.3`, `psycopg[binary]>=3.2,<3.3`, …)
and there is no lock file. Two builds on different days can install different
versions.

Compounding it: **the local interpreter has Django 6.0.9**, while `requirements.txt`
caps at `<5.3`. So the suite above ran on a Django major version that production
will not use. The tests are therefore evidence about the code, not a guarantee about
the exact production interpreter.

Remedy: pin exact versions (or add `pip-tools`/`uv` lock) and run CI against the
pinned set. Do this before the first deploy.

### HIGH-3 — No CI (OPEN)

`.github/` contains only `copilot-instructions.md`. Nothing runs the tests, the type
check, the lint or `makemigrations --check` on push, so every guarantee in this
document is manual and will decay.

### HIGH-4 — OpenAPI schema silently omits the network endpoints (OPEN)

`manage.py check --deploy` emits **18 `drf_spectacular` warnings**, all in
`apps/network`:

- 11 × `unable to resolve type hint for function "get_*"` — serializer
  `SerializerMethodField`s without a return annotation or `@extend_schema_field`.
- 6 × `unable to guess serializer` on plain `APIView`s (`AssignmentActionView`,
  `AssignmentDetailView`, `AvailabilityView`, `NetworkAssociationEndView`,
  `NetworkInvitationActionView`, `WorkerDetailView`).
- 1 × `operationId` collision (`assignments_create`, `network_invitations_create`).

The effect is that these endpoints are missing or mis-typed in `schema.yml` and in
the generated frontend client. They work at runtime; the contract is incomplete.
Fix is mechanical (annotate the getters, add `serializer_class`/`extend_schema`,
give the action views distinct `operation_id`s) but touches 6 views and 2
serializers, so it was left out of this launch pass and recorded here.

### HIGH-5 — Session cookie topology must match the deployed origins (FIXED, needs config)

Session and CSRF cookies were hardcoded `SameSite=Lax`. That is correct when the SPA
and API share a registrable domain (`app.example.com` → `api.example.com` is
*same-site*), but a frontend on a different site (`my-app.vercel.app` →
`api.example.com`) is *cross-site*, and the browser withholds a `Lax` cookie on
cross-site XHR: every signed-in request would look anonymous.

Fixed: `SESSION_COOKIE_SAMESITE` and `CSRF_COOKIE_SAMESITE` are now environment
settings (validated, default `Lax`). **The deployment still has to choose**: `None`
for a cross-site setup (requires `Secure`, already on when `DEBUG` is off), or keep
`Lax` and use custom subdomains / a same-origin rewrite.

---

## 4. Medium priority

| ID | Finding | Detail |
|---|---|---|
| MED-1 | Django admin reachable at `/admin/` | Public brute-force surface. Restrict by IP allowlist, SSO, or move the path before launch. Admin login itself is intact. |
| MED-2 | Only the `auth` scope is throttled | 30/min on auth endpoints; marketplace endpoints are unthrottled. Acceptable for a soft launch, revisit under load. |
| MED-3 | Logging is console-only, no request correlation | Fine for a PaaS that captures stdout; add request IDs before debugging production incidents. |
| MED-4 | `FRONTEND_BASE_URL` defaults to `http://localhost:5173` | Only used to build email links. Verification mail is off this launch; reset links would be wrong if left unset in production. Set it. |
| MED-5 | No database backup/restore procedure documented | Managed Postgres should have PITR enabled; confirm before launch (see architecture doc). |

---

## 5. Low priority

| ID | Finding | Detail |
|---|---|---|
| LOW-1 | `DEFAULT_FROM_EMAIL` falls back to `no-reply@hiddenstage.local` | Harmless while mail is off; set a verified sender before enabling mail. |
| LOW-2 | 6 `oxlint` warnings (`react-hooks/set-state-in-effect`) | Pre-existing in `QuotationEditor.tsx`; no errors, build unaffected. |
| LOW-3 | `e2e/*.spec.ts` exist but no CI runs them | Playwright specs are present (`homepage`, `customer-workflow`, `provider-onboarding`); they were not executed in this pass (no running Playwright browser setup was used). |
| LOW-4 | `requirements-dev.txt` pulls `ruff` but no config exists | Lint runs with defaults; a `[tool.ruff]` block would make it intentional. |

---

## 6. Verified clean (no action)

- **No committed secrets.** `git ls-files` shows no `.env`, `.pem` or key material.
  Root `.gitignore` ignores `.env`; the backend one ignores `.env*` but keeps
  `.env.example`.
- **No hardcoded credentials** in `apps/` or `config/`. A grep for
  `password|secret|api_key|token = '<literal>'` returns only the shared test fixture.
- **No hardcoded `localhost` in `src/`** — the API base comes from
  `import.meta.env.VITE_API_BASE_URL`, defaulting to the Vite proxy.
- **`node_modules/` and `dist/` are untracked**, so the Vercel build cannot ship a
  stale bundle.
- **`DEBUG` defaults to off**; `SECRET_KEY` is mandatory when it is off.
- **Error responses** go through `apps/core/exceptions.api_exception_handler` and
  DRF's handler, so clients get `{"detail": ...}` and never a stack trace.
- **Authorization is server-side**: `require_manager`, `require_worker`, role checks
  and the `IsAuthenticated` default are enforced in views and services, not in the SPA.
- **Sessions are server-side and HttpOnly**, `Secure` whenever `DEBUG` is off; no
  token is ever handed to the browser.

---

## 7. Changed in this pass

| File | Change |
|---|---|
| `config/settings.py` | Added `EMAIL_VERIFICATION_REQUIRED`; `ALLOWED_HOSTS` now fails closed in production; `SECURE_SSL_REDIRECT` defaults on when `DEBUG` is off; cookie `SameSite` made environment-configurable and validated. |
| `apps/accounts/policy.py` | **New.** One definition of the verification policy (`verification_required`, `verification_satisfied`). |
| `apps/accounts/serializers.py` | `email_verification_required` exposed on the user payload. |
| `apps/accounts/views.py` | Registration issues no token and sends no mail when the requirement is off; resend short-circuits. |
| `apps/invitations/services.py`, `apps/quotations/services.py`, `apps/commitments/services.py`, `apps/network/services.py` | The four verification gates consult the policy instead of the column. |
| `hiddenstage-frontend/vercel.json` | **New.** SPA build + deep-link rewrite. |
| `hiddenstage-frontend/.env.example` | Documents the production absolute API base. |
| `hiddenstage-frontend/src/app/{auth,router}/**`, `src/features/auth/AuthPages.tsx` | Guards and redirects honour the policy; the verify screen no longer strands an account when verification is optional. |
| `.env.example` (backend) | Documents the new flag and `MEDIA_ROOT`. |

## 8. Still required before launch

1. Decide attachment storage (BLOCKER-1).
2. Pin Python dependencies and add CI (HIGH-2, HIGH-3).
3. Serve static files, e.g. WhiteNoise (HIGH-1).
4. Provision the production environment: `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`,
   `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `POSTGRES_*`, plus the cookie
   `SameSite` matching the chosen frontend/backend topology.
5. Set `VITE_API_BASE_URL` on Vercel to the absolute backend URL.
6. Run `migrate` against the production database.

---

## Milestone update — 15 November 2026

Five items from the previous audit are now closed. Each entry states what changed
and how it was checked; nothing here is claimed without a command behind it.

### 1. Media storage (was: local-only, unsafe on ephemeral hosts) — CLOSED

- `STORAGES` now selects storage from `MEDIA_STORAGE` (`local` default, `s3` for any
  S3-compatible bucket). The `EventAttachment.file` field, the upload contract and
  the `download_url` response are unchanged.
- S3 options are private by construction: `default_acl=None`,
  `querystring_auth=False`, `file_overwrite=False`. No signed URL is ever minted.
- Missing `AWS_STORAGE_BUCKET_NAME` with `MEDIA_STORAGE=s3` raises
  `ImproperlyConfigured` at boot; an unknown backend value does the same.
- Downloaded files are streamed through `EventAttachmentDownloadView` only, with
  `Cache-Control: private, no-store`.
- **Defect found and fixed:** the serializer never declared `file`, so uploads
  created rows with no bytes. Now a write-only `FileField`.
- Tests: `apps/events/test_attachments.py` (8 tests) covers round-trip, permissions,
  type mismatch and the configuration guards. A real bucket round-trip remains
  **PENDING OWNER CONFIGURATION**.

### 2. Production static files — CLOSED

- `whitenoise.middleware.WhiteNoiseMiddleware` sits directly after
  `SecurityMiddleware`; production uses
  `CompressedManifestStaticFilesStorage`, development keeps the plain storage.
- `collectstatic --noinput` under `DEBUG=0` produced 163 files, 469 post-processed,
  plus `staticfiles.json`.
- Served from a `DEBUG=0` server and fetched over HTTP:
  `GET /static/admin/css/base.<hash>.css` → `200`, `text/css`, 22,285 bytes,
  `Cache-Control: max-age=315360000, public, immutable`.

### 3. Dependency pinning — CLOSED

- `requirements.in` declares ranges; `requirements.txt` pins all 28 resolved
  packages plus `gunicorn==23.0.0` under a non-Windows marker.
- Resolved in a clean virtualenv: Django **5.2.19**, DRF 3.16.1, psycopg 3.3.9,
  whitenoise 6.12.0, django-storages 1.14.6, boto3 1.44.3, drf-spectacular 0.28.0.
- The previous local/declared mismatch (a global Django 6.0.9 against a `~=5.2`
  requirement) is resolved: the suite now runs on 5.2.19 and passes.
- Supported runtimes documented: Python 3.12, Node 22 LTS (developed on 24).

### 4. Generated API schema — CLOSED

- All 18 network endpoints were missing because six plain `APIView`s had no
  serializer metadata and five `SerializerMethodField`s were untyped.
- Fixed with typed nested serializers (`ProviderSummarySerializer`,
  `AvailabilityResponseSerializer`, `NetworkAssociationEndSerializer`),
  `@extend_schema_field` annotations and explicit `operation_id`s.
- `spectacular --validate`: **0 warnings, 0 errors**; 56 `/api/v1/` paths, all ten
  network/assignment paths present with unique operation ids.

### 5. Browser-based verification — CLOSED

- 16 Playwright tests across auth, customer, manager, independent worker, network
  and responsive journeys, against the real API. See `docs/BROWSER_QA_REPORT.md`.

### Remaining at the time of this update

- CI workflows exist and parse, but **have never run on GitHub** (no push allowed).
- Assignments were not driven through the browser; the backend suite covers them.
- S3, Vercel, managed PostgreSQL, domain/DNS and all production env values remain
  owner actions.
