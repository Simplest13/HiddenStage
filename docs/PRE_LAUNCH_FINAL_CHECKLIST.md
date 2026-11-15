# Pre-Launch Final Checklist

Status vocabulary, used strictly:

- **VERIFIED** — exercised here and observed working.
- **FIXED AND VERIFIED** — was broken, repaired, and re-checked with a test.
- **PENDING OWNER CONFIGURATION** — code is ready; an account, credential or
  external resource must be created by the owner.
- **BLOCKED** — cannot be completed in this environment.
- **NOT IMPLEMENTED** — the feature does not exist in this release.
- **NOT TESTED** — exists, but this milestone did not exercise it.

A green tick means "observed", never "believed".

## Frontend

| Item | Status | Evidence / note |
| --- | --- | --- |
| Production build (`npm run build`) | VERIFIED | `tsc -b && vite build` exit 0; largest chunk 268.67 kB / 81.85 kB gzip |
| TypeScript (`npm run typecheck`) | VERIFIED | exit 0 |
| Lint (`npm run lint`) | VERIFIED | 0 errors, 6 warnings |
| Unit tests (`npm test`) | VERIFIED | 19 passed |
| Vercel configuration (`vercel.json`) | VERIFIED | SPA rewrite + build config present |
| Environment-based API URL | VERIFIED | `VITE_API_BASE_URL`; bundle built against a placeholder contained no localhost |
| Client-side routing | VERIFIED | Deep links and redirects exercised in the browser |
| Authentication (sign-in, sign-out, refresh, guards) | VERIFIED | 5 browser scenarios, incl. `HttpOnly` + `SameSite=Lax` cookie |
| Static asset delivery (dev + build) | VERIFIED | Assets load from the build output; no local-path references |
| Responsive layouts 1440 / 768 / 390 | VERIFIED | 15 routes × 3 widths, zero horizontal overflow |
| Public discovery pages (home, services, providers) | VERIFIED | Rendered in browser at all three widths |
| Customer request wizard | VERIFIED | 4-step wizard, publish + confirmation dialog |
| Quotation comparison and commitment | VERIFIED | Customer compared quotes and recorded a commitment |
| Manager workspace | VERIFIED | Onboarding, opportunities, quotation submission |
| Independent Worker workspace | VERIFIED | No invitation required; independent quote accepted |
| Manager↔Worker network invitation/accept | VERIFIED | Both sides observed the association |

## Backend

| Item | Status | Evidence / note |
| --- | --- | --- |
| Production settings validation | VERIFIED | Fails closed on missing `DJANGO_SECRET_KEY`, empty `ALLOWED_HOSTS`, wildcard CORS/CSRF when `DEBUG` off |
| `manage.py check` | VERIFIED | 0 issues |
| Migrations consistent | VERIFIED | `makemigrations --check` → "No changes detected" |
| PostgreSQL (16) | VERIFIED | Full suite and browser journeys run against it |
| Authentication + permissions | VERIFIED | 100 backend tests incl. role/ownership denial paths |
| API schema | FIXED AND VERIFIED | 18 missing network endpoints and 2 `operationId` collisions resolved; `spectacular --validate` now emits **0 warnings, 0 errors**; 56 API paths |
| Static files in production | FIXED AND VERIFIED | WhiteNoise middleware + manifest storage; `collectstatic` produced 163 files / 469 post-processed; hashed CSS served `200 text/css` with `immutable` caching under `DEBUG=0` |
| Media storage | FIXED AND VERIFIED (local) / PENDING OWNER CONFIGURATION (S3) | Upload → download round-trip byte-identical, private headers, unauthorized access denied; S3 backend wired behind `MEDIA_STORAGE=s3` |
| Attachment upload persistence | FIXED AND VERIFIED | Was silently dropping bytes; now write-only `FileField`, regression-tested |
| Logging | VERIFIED | Django request logging only; no secrets or session ids logged |
| Error handling | VERIFIED | 400/403/404/409 paths asserted in tests; no 5xx observed |
| Email verification policy switch | VERIFIED | 100 tests pass with the gate on and off |
| Health endpoint | VERIFIED | `/api/v1/health/` returns 200 |

## Security

| Item | Status | Evidence / note |
| --- | --- | --- |
| Secret management | VERIFIED | Secrets only via environment; `.env` git-ignored; no secret in bundle or repo |
| CORS | VERIFIED | Explicit origins only; wildcard refused in production mode |
| CSRF | VERIFIED | `CSRF_TRUSTED_ORIGINS` enforced; unlisted origin rejected (observed) |
| Cookies | VERIFIED | `HttpOnly`, `SameSite` configurable, `Secure` when not `DEBUG` |
| HTTPS redirect | VERIFIED | Defaults on when `DEBUG` is off |
| File upload validation | VERIFIED | Magic-byte type check, size and count limits, mismatch rejected |
| Private attachments | VERIFIED | Download only through an authorising view; `private, no-store` |
| Role authorization | VERIFIED | Customer/Manager/Worker boundaries covered by tests |
| Session expiry | VERIFIED | Configured; expiry path covered by backend tests, not by a timed browser run |
| Transport/headers (HSTS, nosniff, referrer) | VERIFIED | Configured for production mode |

## Quality

| Item | Status | Evidence / note |
| --- | --- | --- |
| Backend tests | VERIFIED | **100 passed** on Django 5.2.19 (92 pre-existing + 8 new storage tests); same 100 pass with the verification gate on and off |
| Frontend unit tests | VERIFIED | **19 passed** (vitest) |
| TypeScript | VERIFIED | `tsc -b` exit 0 |
| Lint | VERIFIED | `oxlint`: 0 errors, 6 warnings |
| Playwright browser suite | VERIFIED | **11 new + 5 pre-existing specs**, Chromium, real API; journeys listed in `docs/BROWSER_QA_REPORT.md` |
| Browser screenshots | VERIFIED | `hiddenstage-frontend/e2e-artifacts/` |
| CI workflow files | VERIFIED (structure) / BLOCKED (execution) | `.github/workflows/backend.yml`, `frontend.yml` parse and are read-only; **no GitHub Actions run has happened** because pushing was not authorised |
| Dependency reproducibility | VERIFIED | `requirements.txt` pins all 28 runtime packages plus `gunicorn`; `package-lock.json` committed; clean venv install reproduces Django 5.2.19 |
| Independent Worker integrity | VERIFIED | Worker quoted with no invitation; customer accepted; commitment recorded |

## Deployment

| Item | Status | Evidence / note |
| --- | --- | --- |
| Frontend hosting (Vercel) | PENDING OWNER CONFIGURATION | Project must be created and connected by the owner |
| Backend hosting (WSGI + WhiteNoise) | PENDING OWNER CONFIGURATION | Any platform running `gunicorn config.wsgi` works; nothing was deployed |
| Managed PostgreSQL | PENDING OWNER CONFIGURATION | `POSTGRES_*` variables must come from the provider |
| Domain and DNS | PENDING OWNER CONFIGURATION | No DNS record was created or changed |
| Environment variables | PENDING OWNER CONFIGURATION | Full list in `docs/VERCEL_DEPLOYMENT_GUIDE.md` and `docs/DEPLOYMENT_ARCHITECTURE.md` |
| Media storage (S3-compatible) | PENDING OWNER CONFIGURATION | Set `MEDIA_STORAGE=s3` + bucket/keys; private bucket required |
| Migration procedure | VERIFIED | `makemigrations --check` clean; additive-only migrations; procedure documented |
| Rollback plan | VERIFIED (documented) | Redeploy previous build; database migrations are additive, no destructive step |
| Production build served by a WSGI app | VERIFIED (locally) | `DEBUG=0` server served hashed static assets and the API |
| CI as a required check on `main` | BLOCKED | Requires a push and branch-protection settings owned by the owner |

## Known gaps at launch

1. **GitHub Actions has never executed.** The YAML is validated structurally
   only. Treat the first remote run as the real proof.
2. **S3 media has never touched a real bucket.** The wiring and the failure mode
   (missing bucket name) are tested; the network round-trip is not.
3. **Assignments were not driven through the browser.** They require an accepted
   commitment for a Worker; the backend suite covers the lifecycle, and the
   screens render correctly at all three widths.
4. **Email verification and password-reset email delivery are unverified** in this
   configuration (verification disabled, no mail provider configured).
5. **One cosmetic console warning** (invalid HTML nesting on the registration
   screen) is recorded, not fixed.

## Launch gate

Code-side readiness for a controlled first deployment: **ready, with the five
gaps above accepted knowingly**. Account-side readiness: **the owner must create
the hosting, database, storage and DNS resources and set the environment
variables**. Nothing in this milestone was deployed, pushed or published.
