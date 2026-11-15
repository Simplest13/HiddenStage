# Vercel Deployment Guide

Step-by-step instructions to put the HiddenStage frontend on Vercel and point it at a
deployed Django backend. Pairs with `docs/DEPLOYMENT_ARCHITECTURE.md`.

---

## 1. Prerequisites

- A Vercel account and the repository pushed to GitHub/GitLab/Bitbucket.
- A deployed Django backend with a public HTTPS URL (see §6).
- The frontend builds locally: `cd hiddenstage-frontend && npm ci && npm run build`.

## 2. Create the Vercel project

1. **Add New → Project**, import the repository.
2. **Root Directory:** `hiddenstage-frontend` — the repo root holds the backend too,
   so this is mandatory.
3. Framework preset: **Vite** (detected from `vite.config.ts`).
4. Build & Output settings come from `hiddenstage-frontend/vercel.json`:

| Setting | Value |
|---|---|
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node version | 20+ (Vite 8 requires ≥20.19) |

`vercel.json` also rewrites every unmatched path to `index.html`, which is what makes
`/app/requests/new` survive a refresh instead of 404ing.

## 3. Environment variables

Set these in **Project → Settings → Environment Variables** for Production *and*
Preview:

| Name | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.your-domain.com/api/v1` | Absolute URL, include `/api/v1`. A relative value cannot work: `/api/v1` is not served by Vercel. |

Everything prefixed `VITE_` is inlined into the browser bundle at build time. Never
put a database URL, secret key or API token here — the whole world can read it.
Changing this value requires a **redeploy** to take effect.

## 4. Custom domain (recommended)

Attach `app.your-domain.com` rather than using the `*.vercel.app` hostname, so the
SPA and `api.your-domain.com` are **same-site** and the default `SameSite=Lax`
session cookie is sent. See architecture §5 for the alternative.

## 5. First deployment

Push to the production branch (or press **Deploy**). Then verify:

1. `https://app.your-domain.com/` renders the marketing page.
2. `https://app.your-domain.com/auth/login` renders on **direct load** (deep link).
3. In DevTools → Network, `POST /auth/login` returns 200 and `Set-Cookie` includes
   `hs_sessionid`.
4. Reload the page: still signed in (`GET /auth/me/` 200).
5. Register a new account — this launch needs no verification email.

## 6. Deploying the backend

Vercel does **not** host Django here. On a persistent host (Railway, Render, Fly.io,
VPS) with the repository's `hiddenstage-backend/Dockerfile`:

```
pip install -r requirements.txt
python manage.py migrate --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3
```

Required backend environment:

```
DJANGO_DEBUG=0
DJANGO_SECRET_KEY=<50+ random chars>
DJANGO_ALLOWED_HOSTS=api.your-domain.com
POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_HOST / POSTGRES_PORT
POSTGRES_SSLMODE=require
CORS_ALLOWED_ORIGINS=https://app.your-domain.com
CSRF_TRUSTED_ORIGINS=https://app.your-domain.com
FRONTEND_BASE_URL=https://app.your-domain.com
EMAIL_VERIFICATION_REQUIRED=0
```

If you stay on a `*.vercel.app` hostname, also set
`SESSION_COOKIE_SAMESITE=None` and `CSRF_COOKIE_SAMESITE=None`.

Check the deployment: `curl https://api.your-domain.com/api/v1/health/` →
`{"status":"ok","database":"ok"}`.

## 7. PostgreSQL

Use a managed instance. Create the database and a dedicated user, enable TLS, turn on
automated backups + point-in-time recovery, and put the connection details in the
backend environment only. Never in the frontend, never in the repository.

## 8. CORS and CSRF

Both settings must contain the exact frontend origin, scheme included, no trailing
slash. `https://app.your-domain.com` ≠ `https://www.app.your-domain.com`; add both if
you serve both. A mismatch shows up as a CORS error in the browser console, or
`403 CSRF verification failed` on every write.

## 9. Domain configuration

| Record | Host | Value |
|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com` |
| CNAME / A | `api` | your backend host |

Wait for DNS propagation, then verify HTTPS on both.

## 10. Running migrations

Run **once per release**, before the new code serves traffic:

```
python manage.py migrate --noinput
```

Most hosts expose a "release command" or pre-deploy hook. Do not run migrations from
every worker's start command — concurrent workers race.

## 11. Production verification checklist

- [ ] `GET /api/v1/health/` → 200 with `database: "ok"`
- [ ] Marketing page loads over HTTPS
- [ ] Deep link (`/auth/login`, `/app`) survives refresh
- [ ] Register → immediately signed in, **no** verification email required
- [ ] Logout → `/auth/me/` returns 401/403
- [ ] Login with an existing unverified account works
- [ ] Password reset request returns 202 (mail delivery depends on your provider)
- [ ] Customer can create an event request
- [ ] Provider can see opportunities and open the quote editor
- [ ] No console errors; no requests to `localhost`
- [ ] `Set-Cookie` shows `Secure` and the intended `SameSite`

## 12. Rollback

- **Frontend:** Vercel → Deployments → previous deployment → **Promote to
  Production**. Instant, no rebuild.
- **Backend:** redeploy the previous image/commit. Migrations are forward-only; if a
  release included a destructive migration, restore the database from the snapshot
  taken before it rather than reversing code alone.
- **Environment variables:** changes require a redeploy. Keep the previous values
  recorded somewhere safe before rotating the secret key — rotating
  `DJANGO_SECRET_KEY` invalidates every session.

## 13. Common failures

| Symptom | Cause |
|---|---|
| Every API call 404s | `VITE_API_BASE_URL` left relative, or missing `/api/v1`. |
| Login 200 but next request 401 | Cookie not sent: cross-site origin with `SameSite=Lax`. Set `None`, or use a custom domain. |
| `403 CSRF verification failed` | Frontend origin missing from `CSRF_TRUSTED_ORIGINS`, or cookies blocked. |
| CORS error in console | Origin missing from `CORS_ALLOWED_ORIGINS`. |
| Nested route 404 on refresh | `vercel.json` rewrite missing or Root Directory wrong. |
| `/admin/` unstyled | Static files not served (see architecture §8). |

---

## Addendum — 15 November 2026

### Required production environment (backend)

| Variable | Why it matters |
| --- | --- |
| `DJANGO_SECRET_KEY` | Boot fails without it when `DJANGO_DEBUG=0` |
| `DJANGO_DEBUG` | `0` in production (enables HTTPS redirect, secure cookies, manifest static) |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated API hostnames; boot fails if empty |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_HOST` / `POSTGRES_PORT` | Managed database |
| `POSTGRES_SSLMODE` | Set `require` for a managed database |
| `CORS_ALLOWED_ORIGINS` | The Vercel origin, e.g. `https://app.example.com`; wildcards are refused |
| `CSRF_TRUSTED_ORIGINS` | **Must contain the exact Vercel origin**, or every authenticated write is rejected with "Origin checking failed" |
| `FRONTEND_BASE_URL` | Used in verification and reset links |
| `EMAIL_VERIFICATION_REQUIRED` | `1` for the public launch, `0` only for a closed pilot |
| `MEDIA_STORAGE` | `s3` in production; `local` only with a persistent volume |
| `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME`, `AWS_S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Only when `MEDIA_STORAGE=s3`; the bucket must be **private** |

`DJANGO_SECURE_SSL_REDIRECT` defaults to on when `DEBUG` is off; leave it unset
unless a load balancer already terminates and redirects.

### Cross-site cookie note

If the frontend calls the API on a **different** site (not just a different port),
`SameSite=Lax` cookies are not sent. Set the cookie policy explicitly, e.g.
`SESSION_COOKIE_SAMESITE=None` with `Secure` cookies and HTTPS on both sides.

### Deploy order

1. Provision PostgreSQL and run `python manage.py migrate`.
2. Set the environment variables above.
3. `python manage.py collectstatic --noinput` during the build step.
4. Start `gunicorn config.wsgi` (WhiteNoise serves `/static/`).
5. Deploy the frontend with `VITE_API_BASE_URL` pointing at the API host.
6. Create one test account per role and walk the journeys in
   `docs/BROWSER_QA_REPORT.md` against the real deployment.

### Verification after deploy

- `GET /api/v1/health/` returns 200.
- `GET /static/admin/css/base.css` returns 200 with `text/css`.
- Registration signs the user in and the session cookie is `HttpOnly`.
- A request can be created, quoted by an independent Worker, and accepted.
- An authenticated write from the Vercel origin succeeds (proves CSRF config).
