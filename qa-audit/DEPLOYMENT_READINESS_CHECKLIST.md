# HiddenStage — Deployment Readiness Checklist

**Date:** 27 November 2026
**Rule applied:** no item is PASS without a command, a request, or a browser observation behind it.

Status key: **PASS** · **FAIL** · **BLOCKED** · **NOT IMPLEMENTED** · **NOT TESTED**

---

## Frontend

| # | Item | Status | Evidence |
|---|---|---|---|
| F1 | Production build succeeds | **PASS** | `npm run build` exit 0; `dist/` emitted; main chunk 517.06 kB (118.61 kB gzip), lazy route chunks emitted. |
| F2 | TypeScript checks pass | **PASS** | `npm run typecheck` (`tsc -b`) exit 0 after all edits. |
| F3 | No critical console errors | **PASS** | Route crawl: 0 uncaught JS errors across 136 page loads. One non-critical `401` resource log remains for anonymous `/auth/me/` (HS-012). |
| F4 | All routes tested | **PASS** | 58 routes discovered from `router.tsx`; 136 crawl checks (roles × desktop, plus tablet/mobile spot checks). See `WEBSITE_PAGE_AUDIT.md`. |
| F5 | All core buttons and forms tested | **PASS (with test debt)** | 108 API checks, 37 unit tests (one flakes under CPU load, passes alone), customer/manager/network browser journeys. Two auth E2E specs still assert obsolete UI (HS-010) and are not a product failure. |
| F6 | Mobile responsiveness checked | **PASS** | No horizontal overflow at 390×844 or 768×1024 on home, services, customer dashboard, event create, settings, provider dashboard, quotes, assignments. |
| F7 | Correct API base URL | **PASS (config), BLOCKED (host)** | `.env.production` → `https://hiddenstage-j2j3.onrender.com/api/v1`; `vercel.json` rewrites `/api` and `/private-media` to the same host; dev proxy → `127.0.0.1:8000`. The Render host itself was not exercised. |
| F8 | Environment variables verified | **BLOCKED** | Only the local `.env` is in the workspace. Production Vercel/Render variables cannot be inspected from the repository. |
| F9 | Deep links survive refresh | **PASS** | Browser crawl navigated directly to every route (including UUID detail routes) with HTTP 200 and rendered content; `vercel.json` SPA rewrite present. |
| F10 | Role-specific navigation correct | **PASS** | Route crawl: Manager sees execution navigation; Individual/Associated/Talent/Worker see their own; no Worker/Talent navigation leaks into other kinds. |
| F11 | Image assets and icons load | **PASS** | No failed image requests in the crawl; `category-images-and-network-search` spec passed in the earlier run. |

---

## Backend

| # | Item | Status | Evidence |
|---|---|---|---|
| B1 | Django system checks pass | **PASS** | `manage.py check` → "System check identified no issues (0 silenced)". |
| B2 | API tests pass | **PASS** | `manage.py test` → **180 tests, OK (3 skipped)**. |
| B3 | Authentication and permissions tested | **PASS** | 108 live API checks: session auth, role separation, IDOR, ownership, assignment association gate. |
| B4 | No critical server exceptions | **PASS after fix** | One 500 found (HS-004) and fixed; final suite and journey show only intended 400/403/404/409 responses. |
| B5 | Database connectivity verified | **PASS** | PostgreSQL 18.7 via Neon (read-only inspection, 25 users / 4 events) and isolated SQLite for write journeys. |
| B6 | Required migrations reviewed | **PASS (SQLite), NOT TESTED (fresh Postgres)** | Duplicate leaf fixed (HS-002), missing migrations generated (HS-003), fresh SQLite migrate from zero succeeds. A fresh PostgreSQL migrate was **not** run: no local Postgres/Docker was available and creating a database on the managed Neon cluster was avoided. |
| B7 | Upload/storage configuration verified | **PASS (local), BLOCKED (production)** | `MEDIA_STORAGE` defaults to `local`; avatars, portfolio media and event attachments round-trip on local storage. Cloudinary is configured in `.env` but only activates with `MEDIA_STORAGE=cloudinary`; S3 path untested. Render's disk is ephemeral — production **must** set object storage or uploads are lost on redeploy. |
| B8 | CORS and security settings reviewed | **FAIL (environment)** | Code supports production hardening, but the only `.env` present has `DJANGO_DEBUG=1`, `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`, `DJANGO_SECURE_SSL_REDIRECT=0`, and CORS/CSRF limited to localhost:5173/5195. These values must not reach production. |
| B9 | Static files served in production | **NOT TESTED** | WhiteNoise/manifest storage is configured in code; not exercised on the Render host. |
| B10 | Admin surface protected | **FAIL** | Django admin is mounted at `/admin/`; the SPA admin account is a superuser whose password was published (HS-001). Rotation and host-level restriction required. |

---

## Marketplace

| # | Item | Status | Evidence |
|---|---|---|---|
| M1 | Customer journey tested | **PASS** | Register → customer onboarding → event create → submit → invitations → quotations → accept → commitment, via API and browser. |
| M2 | Manager journey tested | **PASS** | Register → provider onboarding (MANAGER) → invitation inbox → quotation draft/revision/submit → customer acceptance → commitment → assignment creation. |
| M3 | Individual Provider journey tested | **PASS** | Registration, profile, service listing, coverage, opportunity feed, quotations, commitments. |
| M4 | Associated Provider journey tested | **PASS (single Manager)** | Registration, kind persistence, independent opportunities/quotations, network page. **Multiple simultaneous Manager associations were not executed.** |
| M5 | Talent journey tested | **PASS** | Talent kind, performance category/styles/experience/social links persisted and rendered; talent-specific opportunity view. |
| M6 | Worker journey tested | **PASS** | Worker profile, manager invitation accept, association, assignment invitation, accept, duplicate-accept refusal, availability conflict. |
| M7 | Event creation verified | **PASS** | Multi-requirement event created and persisted; validation for past dates, end-before-start, budget, location. |
| M8 | Custom categories verified | **FAIL / NOT IMPLEMENTED** | Custom-category API works and stores a distinct category, but the customer UI exposes neither "Other" nor custom-category creation (HS-007). |
| M9 | Quotations verified | **PASS** | Draft → items → submit → total computed server-side (₹10,000.00) → supersede on resubmit → double-submit refused. |
| M10 | Commitments verified | **PASS** | Accepting one service line created a commitment of the selected amount and appeared in the customer list. |
| M11 | Assignments verified | **PASS (create/accept), NOT TESTED (start/complete/cancel)** | Create, worker accept, duplicate accept refusal, availability conflict, unauthorized assignment refusal. Completion/cancellation services exist but were not exercised end-to-end. |
| M12 | Contact-detail privacy rule | **PASS (active commitment)** | Anonymous and non-committed customers receive `contact: ""`; a customer with a persisted commitment and the owner receive it. Released-commitment edge case is HS-013. |
| M13 | Worker availability privacy | **PASS** | Response contains only `available/conflict/event_date/start_time/end_time`; no event, customer, location or instructions. |

---

## Operations

| # | Item | Status | Evidence |
|---|---|---|---|
| O1 | Error logging verified | **PASS (application), NOT IMPLEMENTED (aggregation)** | Django logs 400/403/404/409 and the fixed 500; no Sentry/APM or alerting configured. |
| O2 | Backup and recovery approach reviewed | **BLOCKED** | Neon backup/PITR settings cannot be verified from the repository; no restore drill was run. |
| O3 | Monitoring reviewed | **NOT IMPLEMENTED** | No uptime check, error tracker, or performance monitor found. `/api/v1/health/` exists and returns `{"status":"ok","database":"ok"}`. |
| O4 | Production environment configuration reviewed | **BLOCKED** | Production Vercel/Render/Neon variables are not in the workspace. The committed `.env` is a development file with `DEBUG=1`. |
| O5 | Rollback procedure documented | **NOT TESTED** | `docs/DEPLOYMENT_ARCHITECTURE.md` and `docs/VERCEL_DEPLOYMENT_GUIDE.md` exist; no rollback was executed or rehearsed. |
| O6 | Privacy and security review completed | **FAIL** | HS-001 (published superuser credential) and HS-007 (unimplemented custom-service flow) are open. Privacy/terms are drafts and the public copy still describes a preview (HS-017). |
| O7 | Rate limiting on sensitive endpoints | **PASS** | DRF throttles (`anon 30/min`, `user 120/min`, `auth 30/min`); a live burst returned `429` with `Expected available in …`. |
| O8 | Secrets absent from repository | **PASS (git), FAIL (bundle)** | `.env` is ignored; no key found in tracked source. However HS-001 embedded an admin password in the client bundle. |

---

## Release-blocking summary

1. **Rotate `admin@hiddenstage.in`** and remove any reliance on the leaked password (HS-001). Code fix applied; credential action is the owner's.
2. **Decide and implement the customer custom-service flow** (HS-007), or explicitly launch without it.
3. **Configure production media storage** (`MEDIA_STORAGE=cloudinary` or `s3`) — local disk on Render is ephemeral.
4. **Set and verify production backend environment** (`DEBUG=0`, real hosts/origins, HTTPS redirect, secret key, DB URL) — cannot be verified from here.
5. **Run a fresh PostgreSQL migration** on a staging database and verify `/api/v1/health/` plus one write journey before onboarding real users.
6. **Replace preview copy and draft legal pages, and connect the contact channel** (HS-017).
