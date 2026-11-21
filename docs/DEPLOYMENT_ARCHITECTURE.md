# Deployment Architecture

How HiddenStage is meant to run in production, why each piece sits where it does, and
which environment variables wire them together.

---

## 1. Topology at a glance

```
Browser
  │  HTTPS
  ▼
┌─────────────────────┐        ┌──────────────────────────┐        ┌─────────────────┐
│  Vercel (static)    │        │  Django + Gunicorn       │        │ Neon PostgreSQL │
│  hiddenstage-       │  XHR   │  (Railway / Render /     │  TCP   │ (Cloud Serverless│
│  frontend           │───────▶│   Fly / VPS)             │───────▶│  Postgres)      │
│  React 19 + Vite    │ cookies│  DRF API under /api/v1   │  TLS   │  Pooled/Direct  │
└─────────────────────┘        └──────────────────────────┘        └─────────────────┘
                                        │
                                        └──▶ persistent disk or object storage (attachments)
```

**The frontend deploy and the backend deploy are independent.** Publishing the Vite
app to Vercel does not deploy Django, does not create a database, and does not run
migrations. Vercel serves static files only.

### Can Django itself run on Vercel?

It can be forced to (serverless Python wrapper), but not with this codebase as it
stands: a long-lived `gunicorn` process, DB connection pooling (`CONN_MAX_AGE=60`),
local media writes and `migrate` steps all assume a persistent process. Serverless
would require re-architecting connection handling and moving media off disk. That is
an unnecessary migration for this launch, so the recommendation is a normal
persistent host for Django and Vercel for the static frontend.

---

## 2. Frontend — Vercel

| Setting | Value |
|---|---|
| Root directory | `hiddenstage-frontend` |
| Framework preset | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` (`tsc -b && vite build`) |
| Output directory | `dist` |
| Env var | `VITE_API_BASE_URL=https://api.<your-domain>/api/v1` |

Client-side routing works on refresh because `vercel.json` rewrites every unknown
path to `index.html`; existing files (JS, CSS, favicon) are served first.

`VITE_*` values are **compiled into the public bundle**. Never put a secret there.

## 3. Backend — persistent Python host

Any host that runs a long-lived process works: Railway, Render, Fly.io, a VPS with
systemd, or a container platform using the provided `Dockerfile`.

```
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3
```

The host must provide:

- a build step: `pip install -r requirements.txt`
- a release step: `python manage.py migrate --noinput`
- a health check: `GET /api/v1/health/` (returns 503 if the DB is unreachable)
- a persistent disk for `MEDIA_ROOT` (see §7), or object storage

## 4. Database — Neon PostgreSQL

Neon PostgreSQL is the authoritative cloud database platform (`D-006`, `D-016`); there is no SQLite fallback.
All shared environments connect to Neon through environment variables. Credentials are never hardcoded.

### Topology: Pooled Runtime vs Direct Migrations

Neon separates connection pooling from direct compute:

- **Application runtime (Gunicorn / ASGI)**: Connects via `DATABASE_URL` using the Neon PgBouncer connection pooler (`*-pooler.*.aws.neon.tech`). Settings enforce `CONN_MAX_AGE=0` and `DISABLE_SERVER_SIDE_CURSORS=True`.
- **Release-phase migrations (`migrate`)**: Automatically routes through `DATABASE_URL_UNPOOLED` directly to the compute node (`ep-*.*.aws.neon.tech`), avoiding pooler transaction-lock and advisory-lock limitations during DDL execution.
- **SSL security**: Connections must enforce TLS with `sslmode=require&channel_binding=require`.

```
DATABASE_URL="postgresql://<user>:<password>@<project>-pooler.<region>.aws.neon.tech/<dbname>?channel_binding=require&sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://<user>:<password>@<project>.<region>.aws.neon.tech/<dbname>?channel_binding=require&sslmode=require"
NEON_BRANCH=production
NEON_BRANCH_ID=br-<branch-id>
```

### Branching and Isolation Rules

- **Production branch**: The live production branch (`production`) holds authoritative business state. Destructive operations (reset, recreate, wipe) are forbidden. Explicit approval is mandatory prior to running migrations.
- **Automated test isolation**: Test suites are isolated from shared Neon databases. The test runner guards against execution against remote Neon hosts unless a dedicated `TEST_DATABASE_URL` is explicitly provided.
- **Media storage**: Uploaded files and attachments must use persistent object storage (S3/R2) or local persistent volume mounts. Neon database tables must never store raw binary media.

The development `docker-compose.yml` publishes local Postgres on **55432** for offline development and test isolation.

## 5. How the browser talks to the API

The SPA calls `${VITE_API_BASE_URL}/auth/...`, `.../events/`, etc. with
`credentials: 'include'`, so the Django session cookie travels with every request.

Two workable topologies:

**A. Same registrable domain (recommended)** — `app.example.com` (Vercel) and
`api.example.com` (Django). Browsers treat these as *same-site*, so
`SameSite=Lax` cookies are sent and no special cookie policy is needed. Requires a
custom domain on Vercel.

**B. Different sites** — e.g. `hiddenstage.vercel.app` → `api.example.com`. This is
*cross-site*; `Lax` cookies are withheld on XHR, so the deployment **must** set:

```
SESSION_COOKIE_SAMESITE=None
CSRF_COOKIE_SAMESITE=None
```

(`Secure` is already on whenever `DEBUG` is off.) Without this, login appears to
succeed and every subsequent request is anonymous.

## 6. CORS and CSRF

Both must name the exact browser origin, scheme included, no trailing slash:

```
CORS_ALLOWED_ORIGINS=https://app.example.com
CSRF_TRUSTED_ORIGINS=https://app.example.com
```

`CORS_ALLOW_CREDENTIALS` is already `True`; the frontend sends `X-CSRFToken` read
from the `csrftoken` cookie, which Django exposes for exactly that purpose. A
mismatch here produces `403 CSRF verification failed` on every write.

## 7. Media (attachments)

Attachments are **private** (`D-013`): `MEDIA_URL` is `/private-media/` and files are
only served through authorized API views. `MEDIA_ROOT` must therefore be on storage
that survives a redeploy:

- **Single instance + persistent volume**: mount the volume at `MEDIA_ROOT`.
- **Multiple instances or serverless**: object storage behind Django's storage API
  (`django-storages` + S3/R2). This adds a dependency and is a deliberate decision.

Nothing else in the app assumes the local disk.

## 8. Static files

`collectstatic` populates `STATIC_ROOT`. Gunicorn does not serve it. Either add
WhiteNoise (middleware + `STATICFILES_STORAGE`) or front the app with a CDN that
serves `STATIC_ROOT`. Without it `/admin/` renders unstyled.

## 9. Migrations

Run as a **release/deploy step, once**, not per worker start:

```
python manage.py migrate --noinput
```

Migrations are forward-only and committed under `apps/*/migrations/`. Take a
snapshot before the first production run.

## 10. Environment variables (backend)

| Variable | Required | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | yes | Startup fails without it when `DEBUG=0`. |
| `DJANGO_DEBUG` | yes | `0` in production. |
| `DJANGO_ALLOWED_HOSTS` | yes | Comma-separated public hosts; startup fails if empty. |
| `POSTGRES_*` | yes | See §4. |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | yes | Exact frontend origin. |
| `SESSION_COOKIE_SAMESITE` / `CSRF_COOKIE_SAMESITE` | topology-dependent | `None` for cross-site. |
| `DJANGO_SECURE_SSL_REDIRECT` | no | Defaults to on in production. |
| `EMAIL_VERIFICATION_REQUIRED` | no | `0` for this launch. |
| `FRONTEND_BASE_URL` | yes (if mail on) | Builds email links. |
| `RESEND_API_KEY` / `EMAIL_*` | no | Needed only when mail is switched on. |
| `MEDIA_ROOT` | if volume | Absolute path to the persistent disk. |
| `LOG_LEVEL` | no | Default `INFO`. |

Full template: `hiddenstage-backend/.env.example`.
