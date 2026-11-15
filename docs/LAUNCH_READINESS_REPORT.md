# Launch Readiness Report

**Date:** 2026-11-15
**Objective:** first production launch, with email verification temporarily optional
and the frontend deployable on Vercel.

Everything below was executed in this pass. Items that were not run are named.

---

## 1. What changed

### Email verification is now a configuration switch

| File | Change |
|---|---|
| `config/settings.py` | `EMAIL_VERIFICATION_REQUIRED = env_bool("EMAIL_VERIFICATION_REQUIRED", True)` |
| `apps/accounts/policy.py` | **New.** `verification_required()` and `verification_satisfied(user)` — one definition of the policy. |
| `apps/accounts/serializers.py` | `email_verification_required` added to the user payload so the SPA knows the policy. |
| `apps/accounts/views.py` | Registration issues no token and sends no mail when the requirement is off; `/auth/email/resend/` short-circuits with `email_sent: false`. |
| `apps/invitations/services.py` | Invitation gate → `verification_satisfied(customer)`. |
| `apps/quotations/services.py` | Quotation gate → `verification_satisfied(provider_user)`. |
| `apps/commitments/services.py` | Acceptance gate → `verification_satisfied(actor)`. |
| `apps/network/services.py` | `_require_verified` → `verification_satisfied(user)`. |

### Frontend

- `vercel.json` — Vite build + SPA deep-link rewrite.
- `.env.example` — documents the production absolute API base.
- `src/app/router/RouteGuards.tsx` — all four guards honour the policy.
- `src/features/auth/AuthPages.tsx` — post-registration lands on the real destination;
  the verify screen explains that verification is optional instead of waiting for a
  link that will not arrive.
- `src/app/auth/{authTypes,AuthProvider}.ts(x)`, `src/shared/api/backend/types.ts` —
  carry `emailVerificationRequired`.

### Backend production hardening (`config/settings.py`)

- `ALLOWED_HOSTS` no longer defaults to loopback in production: an empty list fails
  at import instead of returning 400 for every request.
- `SECURE_SSL_REDIRECT` defaults to on whenever `DEBUG` is off.
- `SESSION_COOKIE_SAMESITE` / `CSRF_COOKIE_SAMESITE` are environment settings,
  validated against `Lax|Strict|None`.

## 2. What was preserved

- Every verification artefact: `email_verified_at`, `EmailVerificationToken`,
  `EmailVerificationView`, resend endpoint, email templates, SMTP/Resend config,
  `EMAIL_VERIFICATION_TTL_HOURS`.
- Usernames/passwords are untouched: password hashing, session cookies, CSRF,
  throttling and role permissions are unchanged.
- No account was marked verified to bypass anything. `email_verified_at` still
  records only what was actually proven, verified by a test that reads the column
  back after switching the requirement off.
- The existing 92-test backend suite and 19 frontend tests were not weakened; the
  five tests that assume the gate now state that assumption explicitly with
  `@override_settings(EMAIL_VERIFICATION_REQUIRED=True)`.
- No model, migration, route or screen was deleted.

## 3. How the switch works

`EMAIL_VERIFICATION_REQUIRED` answers one question: *is an unverified account allowed
to take verification-gated actions?*

- **`1` (default)** — previous behaviour exactly: unverified accounts can register and
  log in, but inviting, quoting, accepting and the Manager/Worker network return
  `400 Verify your email address before …`.
- **`0`** — those four gates open. Registration creates **no** token and sends **no**
  mail, so signup has no runtime dependency on an email provider.

Reverting is `EMAIL_VERIFICATION_REQUIRED=1` and a redeploy. No migration, no data
fix-up: accounts that already verified keep `email_verified_at`; accounts that never
did remain unverified and simply become gated again.

## 4. Authentication test results

Automated — `python manage.py test` (PostgreSQL 16):

| Mode | Command | Result |
|---|---|---|
| Gate on | `EMAIL_VERIFICATION_REQUIRED=1 python manage.py test` | **92 tests, OK** |
| Launch config | `python manage.py test` (`.env` sets `0`) | **92 tests, OK** |

New coverage: policy unit tests; registration with no mail and no token; immediate
session after registration; existing unverified account signing in; resend being a
no-op; the verification link still working when presented; and two integration tests
that accept a quotation and create one with an unverified account, each paired with a
twin that re-enables the gate and expects `400`.

Live HTTP against the running server — **16/16 passed**:

customer / manager (PROVIDER) / worker registration without verification · `email_verified`
stays false · `verification_email_required` false · `verification_email_sent` false ·
session present immediately · logout 204 · session gone · login after registration ·
duplicate email 400 · bad password 403 generic · anonymous blocked from `/events/` ·
malformed registration 400 · password reset 202.

Admin: `/admin/` is mounted and admin login is untouched (not exercised through the
browser; the URL and auth backend are unchanged).

## 5. Production build

`cd hiddenstage-frontend && npm run build` → **success**. `tsc -b` passed, `vite build`
emitted `dist/` with 15 chunks; largest `index-*.js` 268.67 kB (81.85 kB gzip).
`npm run lint` → **0 errors, 6 pre-existing warnings**. `npm test` → **19 tests, 5
files, passed**.

## 6. Backend checks

- `python manage.py check` → 0 issues.
- `python manage.py check --deploy` with `DEBUG=0` → 18 `drf_spectacular` warnings
  (network app; see audit HIGH-4) plus W008 from the developer `.env` pinning
  `DJANGO_SECURE_SSL_REDIRECT=0`; with a production environment (flag unset) the
  setting defaults on.
- Migrations applied to the local database; no pending model changes.
- Test suite ran against real PostgreSQL, not SQLite.

## 7. Database status

PostgreSQL 16 in Docker, host port **55432** (matching `hiddenstage-backend/.env`),
database `hiddenstage`, migrations applied. The local container
`hiddenstage-postgres` was started for this work. Port 5432 on this machine belongs to
another project's container and was left untouched.

## 8. Security findings

Clean: no committed `.env`/keys, no hardcoded credentials, no `localhost` in the built
source path (configurable base URL), `DEBUG` off by default, `SECRET_KEY` mandatory in
production, server-side authorization, HttpOnly session cookies, no stack traces in
error responses, uploads private.

Fixed in this pass: production `ALLOWED_HOSTS` fails closed; HTTPS redirect defaults
on; cookie `SameSite` configurable for split-origin deployments.

Open: attachments on local disk (BLOCKER-1), static files unserved (HIGH-1), unpinned
dependencies and local Django 6 vs pinned 5.2 (HIGH-2), no CI (HIGH-3), incomplete
OpenAPI coverage (HIGH-4), public `/admin/` (MED-1). Full detail in
`docs/PRODUCTION_READINESS_AUDIT.md`.

## 9. Deployment configuration

- Frontend: Vercel, root `hiddenstage-frontend`, `npm ci` / `npm run build` / `dist`,
  `VITE_API_BASE_URL` set to the absolute backend URL.
- Backend: any persistent Python host running `gunicorn config.wsgi:application`.
- Database: managed PostgreSQL with TLS and backups.
- Media: persistent volume or object storage.
- Documents: `docs/DEPLOYMENT_ARCHITECTURE.md`, `docs/VERCEL_DEPLOYMENT_GUIDE.md`,
  `docs/PRODUCTION_READINESS_AUDIT.md`.

## 10. Remaining blockers

1. **Attachment storage** must be chosen (volume vs object storage) before real
   uploads reach production.
2. **Pin Python dependencies** and confirm the suite on the pinned Django 5.2.
3. **Serve static files** (WhiteNoise or CDN).
4. **Provision production secrets/hosts/origins** — the code fails closed without them.
5. **Set `VITE_API_BASE_URL`** on Vercel (the local build uses the relative default).

## 11. Exact next steps to deploy

1. Push the branch; on the backend host set every variable in guide §6.
2. `python manage.py migrate --noinput` against the production database.
3. `curl https://api.your-domain.com/api/v1/health/` → `database: "ok"`.
4. Import the repo on Vercel, root `hiddenstage-frontend`, set `VITE_API_BASE_URL`.
5. Deploy, then walk the checklist in `docs/VERCEL_DEPLOYMENT_GUIDE.md` §11.
6. Register a real account and confirm you land in the workspace with no email step.

---

## Status update — 15 November 2026 (hardening milestone)

**Code readiness: ready for a controlled first deployment.**
**Operational readiness: owner action required.** Nothing was deployed or pushed.

### What changed since the previous report

| Area | Before | Now |
| --- | --- | --- |
| Uploaded media | Local disk only; lost on redeploy | `MEDIA_STORAGE=local\|s3`, private by default, tested round-trip |
| Static files | Unserved behind Gunicorn | WhiteNoise + manifest storage, verified over HTTP at `DEBUG=0` |
| Dependencies | Ranges only, local Django 6.0.9 vs declared 5.2 | Fully pinned lockfile, resolved and tested on Django 5.2.19 |
| API schema | 18 network endpoints missing, 2 id collisions | 0 warnings / 0 errors, 56 paths |
| CI | None | Two read-only workflows (backend, frontend) — **not yet executed remotely** |
| Browser QA | None | 18 Playwright tests, real API, 3 viewports, screenshots |
| Attachment uploads | Silently stored no bytes | Fixed, regression-tested |

### Test evidence

- Backend: **100 tests pass** on Django 5.2.19, in both verification modes.
- Frontend: typecheck 0, lint 0 errors / 6 warnings, **19 unit tests pass**,
  production build succeeds (largest chunk 268.67 kB / 81.85 kB gzip).
- Browser: **18 Playwright tests**; journeys for customer, manager, independent
  worker, network invitations and responsive layouts. Details in
  `docs/BROWSER_QA_REPORT.md`.
- Static: 163 files collected, 469 post-processed, hashed asset served `200`
  with immutable caching under `DEBUG=0`.

### What still blocks a public launch

1. **Owner must provision**: Vercel project, backend host, managed PostgreSQL,
   S3-compatible bucket (or a persistent volume), domain and DNS.
2. **Owner must set the production environment**: `DJANGO_SECRET_KEY`,
   `DJANGO_ALLOWED_HOSTS`, `POSTGRES_*`, `CORS_ALLOWED_ORIGINS`,
   `CSRF_TRUSTED_ORIGINS` (must contain the exact frontend origin),
   `FRONTEND_BASE_URL`, and the media-storage variables when using S3.
3. **First CI run must be observed.** The workflows are unproven until they run.
4. **S3 round-trip is unproven** until a real bucket exists.
5. **Assignments were not exercised in the browser**; backend tests cover them.

None of these is a code defect. They are accounts, credentials and first-run
observations.
