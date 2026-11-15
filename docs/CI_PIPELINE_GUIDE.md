# Continuous Integration Pipeline Guide

HiddenStage uses two GitHub Actions workflows. Both are **read-only** verification
pipelines: neither deploys, publishes, or writes anywhere but its own runner.

| File | Job | Covers |
| --- | --- | --- |
| `.github/workflows/backend.yml` | `django` | Django checks, migrations, tests, OpenAPI schema, static collection |
| `.github/workflows/frontend.yml` | `vite` | TypeScript, lint, unit tests, production build |

## 1. Triggers

Both workflows run on:

- `pull_request` touching the relevant application directory.
- `push` to `main` touching the relevant application directory.
- `push` to the workflow file itself (so pipeline fixes are validated immediately).

`main` is the only long-lived branch in this repository today. If a `develop`
branch is introduced later, add it to `on.push.branches` in both files.

Path filters keep the two halves independent: a backend-only change does not run
the frontend job and vice versa. Both directories are separate roots, so each job
sets `defaults.run.working-directory` instead of assuming a monorepo layout.

## 2. Backend job

Runner: `ubuntu-latest`, Python `3.12` (the version the pinned set was resolved
and tested against).

Service container: `postgres:16` with a health check, bound to `127.0.0.1:5432`.
The job is given only throwaway credentials (`hiddenstage_ci` /
`hiddenstage_ci_only`) that exist for the duration of the run. No repository
secret is used and no secret is required.

Steps, in order:

1. `pip install -r requirements.txt` — the fully pinned lockfile (28 packages plus
   `gunicorn` on POSIX).
2. `python manage.py check` — framework and project system checks.
3. `python manage.py makemigrations --check --dry-run` — fails if a model change
   has no migration.
4. `python manage.py test --parallel 1` — creates and destroys its own
   `test_hiddenstage_ci` database. CI never points at a development or production
   database.
5. `python manage.py spectacular --file /tmp/schema.yml --validate` — regenerates
   the OpenAPI document and fails on warnings, duplicate `operationId`s, or
   undescribed views.
6. `collectstatic` with `DJANGO_DEBUG=0` — proves the production static pipeline
   (hashed names plus `staticfiles.json` manifest) works.

Job-wide environment is test-only: `DJANGO_DEBUG=1`, a literal throwaway
`DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`,
`EMAIL_VERIFICATION_REQUIRED=1`. The static step overrides `DJANGO_DEBUG=0` so the
production storage backend is exercised.

## 3. Frontend job

Runner: `ubuntu-latest`, Node `22` LTS (Vite 8 supports Node 20.19+/22.12+; the
project is developed on Node 24 locally and 22 is the conservative CI choice).

1. `npm ci` — installs strictly from `hiddenstage-frontend/package-lock.json`.
   The lockfile is committed and is the single source of dependency truth.
2. `npm run typecheck` (`tsc -b`).
3. `npm run lint` (`oxlint`).
4. `npm test` (`vitest run`).
5. `npm run build` (`tsc -b && vite build`).

`VITE_API_BASE_URL` is set to `https://api.ci.invalid/api/v1` for the build step.
It exists only to prove that the production build reads its API base from the
environment; the value is intentionally unusable and never shipped.

## 4. Security posture

- Top-level `permissions: contents: read` — the workflow token cannot push,
  comment on PRs, or publish packages.
- `pull_request` (not `pull_request_target`) is used, so PRs from forks receive no
  access to repository secrets.
- No repository, environment, or organisation secret is referenced. A CI run needs
  zero owner configuration.
- All database credentials in the workflow are disposable literals scoped to the
  job's service container.
- Third-party actions are the first-party `actions/*` family, pinned to major
  versions. For stricter supply-chain control, pin them to commit SHAs.
- There is deliberately **no** deployment workflow. Publishing stays a manual,
  authorised action.

## 5. Interpreting failures

| Failing step | Usual cause |
| --- | --- |
| `pip install` | `requirements.txt` inconsistent with `requirements.in`; regenerate the lock. |
| `manage.py check` | Settings change that breaks configuration validation. |
| `makemigrations --check` | Model edited without a migration. |
| `test` | A real regression, or a test that depends on ambient `.env` values. |
| `spectacular --validate` | A new endpoint view or serializer without schema metadata. |
| `collectstatic` | A missing static file, or a storage backend that cannot hash assets. |
| `npm ci` | `package-lock.json` out of sync with `package.json`. |
| `typecheck` / `lint` | Type or style regression. |
| `build` | Import graph problem, or an env var the bundle requires at build time. |

## 6. Running the same checks locally

Backend (from `hiddenstage-backend`, inside the pinned virtualenv):

```bash
pip install -r requirements.txt
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test --parallel 1
python manage.py spectacular --file /tmp/schema.yml --validate
DJANGO_DEBUG=0 DJANGO_ALLOWED_HOSTS=127.0.0.1 python manage.py collectstatic --noinput
```

Frontend (from `hiddenstage-frontend`):

```bash
npm ci
npm run typecheck && npm run lint && npm test && npm run build
```

## 7. Status of this pipeline

The workflows are written, and their YAML has been parsed and structurally
validated locally. **They have not executed on GitHub**: this milestone was
explicitly forbidden from pushing to a remote branch. The first real run happens
on the first push or pull request after the owner authorises a push. Until that
run is green, treat CI as unproven infrastructure rather than a passing gate.
