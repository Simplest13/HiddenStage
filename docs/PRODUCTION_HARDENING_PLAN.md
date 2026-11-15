# Production Hardening Plan

Incremental plan for the pre-launch milestone. Nothing here rebuilds the app: every
item closes a gap recorded in `docs/PRODUCTION_READINESS_AUDIT.md`.

| # | Issue | Files | Change | Verification |
|---|---|---|---|---|
| 1 | Attachments written to the local disk | `config/settings.py`, `apps/events/models.py` | Add a storage switch: local filesystem by default, S3-compatible private bucket in production (`django-storages`). No model or API change. | Upload + authorized download + 403 for a stranger, on both backends |
| 2 | Static files unserved by Gunicorn | `config/settings.py`, `requirements.txt` | Add WhiteNoise middleware; manifest-compressed storage in production, dev unchanged. | `collectstatic --noinput`, then served with `DEBUG=0` |
| 3 | Unpinned Python dependencies | `requirements.in`, `requirements.txt`, `requirements-dev.txt` | Human-edited ranges + fully pinned lock generated from a clean venv | Fresh venv installs only from the lock and passes the suite |
| 4 | Local Django 6.0.9 vs project pin `<5.3` | venv | Build the venv on the declared Django 5.2 line | Suite runs on 5.2, not only on 6.x |
| 5 | 18 `drf_spectacular` warnings; network endpoints missing from schema | `apps/network/views.py`, `apps/network/serializers.py` | Annotate `SerializerMethodField` getters, declare `request`/`responses`/`serializer_class`, unique `operation_id`s | `spectacular --validate` with zero errors; network operations present in `schema.yml` |
| 6 | Production config not covered by checks | `config/settings.py` | Fail fast on missing prod values; keep email-verification policy untouched | `check --deploy` with `DEBUG=0` |
| 7 | No CI | `.github/workflows/*.yml` | Backend + frontend workflows, separate roots, Postgres service, test-only env | YAML parsed locally; remote run pending until pushed |
| 8 | No browser QA | `hiddenstage-frontend/e2e/*` | Playwright journeys for customer, provider (manager), worker, auth and responsive widths | Real Chromium runs against the real API |
| 9 | Documentation drift | `docs/*` | Update audit/report/guide, add checklist + CI guide + browser QA report | Docs match executed commands |

## Constraints honoured

- No destructive migrations, no database reset, no deletion of existing records.
- The `EMAIL_VERIFICATION_REQUIRED` policy and all verification artefacts stay.
- Playwright creates its own uniquely-addressed accounts and leaves existing data alone.
- No commit, push, deploy, DNS change or paid resource.

## Environment

Python 3.12, Node 24, PostgreSQL 16 (Docker, host port 55432). The app is verified in
a dedicated `.venv` built only from the committed manifests.
