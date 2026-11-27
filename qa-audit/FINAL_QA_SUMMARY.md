# HiddenStage — Final QA Summary

**Audit completed:** 27 November 2026
**Repository:** `HiddenStage/` (React + Vite frontend, Django REST backend)
**Audience:** product owner, engineering, and whoever makes the launch call.

---

## Recommendation

# NOT READY

HiddenStage is a substantial, working marketplace with a coherent five-role model, a well-guarded API, and a clean build. It is **not ready for public launch** because of one live credential compromise, one explicitly requested customer flow that does not exist, public pages that still describe themselves as a preview, and an unverifiable production configuration.

None of these findings is a reason to rewrite the product. Each has a bounded fix.

---

## What is genuinely working

- **All 180 backend tests pass** (3 skipped), including new regression tests for every fixed defect.
- **108/108 live API checks pass** across registration, five provider kinds, events, custom categories, invitations, quotations, commitments, network, assignments, availability, media, permissions and contact privacy.
- **126/136 browser page loads passed the strict crawl criterion; the 10 flagged rows were re-probed and all render real content.** No blank or crashing page was found.
- **Frontend production build and typecheck pass**; **37 unit tests pass** (36/37 in the full parallel run under load; the single flaky dashboard assertion passes 10/10 in isolation and passed in an earlier full run).
- **Authorization is solid** in the tested surface: no IDOR, no role leak, no unassociated assignment, no worker-availability leak.
- **The customer, manager, individual, associated, talent and worker journeys all work** through the API, and the customer journey passes end-to-end in a real browser.

---

## Release blockers

| # | Blocker | Why it blocks launch | Owner |
|---|---|---|---|
| 1 | **Superuser password was published** (HS-001) | `admin@hiddenstage.in` is an active superuser and its password was compiled into the public bundle and offered by a one-click button. Code is removed; the password must be treated as compromised and rotated. | Owner / ops |
| 2 | **Customer custom-service flow is missing** (HS-007) | The brief requires choosing "Other" and creating a distinct custom service. The customer UI has neither. The backend's `other` path is unreachable on a database built from migrations. | Product + frontend |
| 3 | **Public pages are still preview copy** (HS-017) | `/contact` explicitly says messages are not sent; `/privacy` and `/terms` are drafts describing fictional listings. | Owner / legal / content |
| 4 | **Production configuration is unverified** | Only a development `.env` exists (`DEBUG=1`, localhost hosts, HTTPS redirect off). Production Vercel/Render/Neon variables cannot be inspected from the repository. | Ops |
| 5 | **Production media storage is local by default** | Render's disk is ephemeral; avatars, portfolio media and attachments would be lost on redeploy unless `MEDIA_STORAGE` is set to Cloudinary or S3. | Ops |
| 6 | **Fresh PostgreSQL migration untested** | Fresh SQLite migration passes, but the target is PostgreSQL. A schema drift surprise on deploy is still possible. | Backend |

---

## Defects fixed during this audit

| ID | Fix | Verification |
|---|---|---|
| HS-001 | Removed hardcoded admin credentials and the autofill button from `AdminLoginPage.tsx` | Build + typecheck; credential string gone from source and bundle |
| HS-002 | Deleted the duplicate `0007_merge_20261126_2238` migration | `migrate`, `test` and `makemigrations --check` all run |
| HS-003 | Added missing `administration` and `network` migrations | `makemigrations --check` clean; fresh migrate succeeds |
| HS-004 | Duplicate provider service now returns `400`, not `500` | New regression test; API check |
| HS-005 | Realtime SSE negotiates `text/event-stream` | Live `200`; new tests; console 406 gone |
| HS-006 | Test harness no longer loads the managed database | 7/7 database-URL tests; 180-test suite green |
| HS-008 | Avatar uploads reject empty and spoofed files | New regression test; API checks |
| HS-009 | Browser helper targets the current date-field label | Customer journey passes end-to-end |

---

## Evidence

| Check | Command | Result |
|---|---|---|
| Backend suite | `manage.py test` | **180 tests, OK (3 skipped)** |
| System checks | `manage.py check` | 0 issues |
| Migration consistency | `makemigrations --check --dry-run` | No changes detected |
| Fresh schema (SQLite) | migrate on empty DB | All migrations applied |
| API journeys | `qa-audit/scripts/api_journey.py` | **108/108** |
| Route crawl | `qa-audit/scripts/route_audit.mjs` | **126/136 strict; 10/10 re-probed render** |
| Frontend typecheck | `npm run typecheck` | Exit 0 |
| Frontend build | `npm run build` | Exit 0 (517 kB chunk warning) |
| Frontend unit tests | `npm test` | **36/37 under load; 37/37 when the flaky file is run alone (10/10)** |
| Customer browser journey | `playwright … customer-journey.spec.ts` | **Passed (1.3 min)** |
| Manager browser journey | `playwright … manager-journey.spec.ts` | **Passed (2.3 min)** |
| Network browser journey | `playwright … network-journey.spec.ts` | **Passed (2.7 min)** |
| Responsive browser spec | `playwright … responsive.spec.ts` | Not completed (dev-server hang); layout verified by 16 tablet/mobile crawl loads, 0 overflow |

---

## What was not tested, and why

- **Fresh PostgreSQL migration** — no local Postgres/Docker, and creating a database on the managed Neon cluster was avoided. Fresh SQLite was used instead.
- **Cloudinary/S3 round-trip** — no bucket configured; local storage was exercised end-to-end.
- **Email delivery** — password-reset and verification endpoints return the right status, but no mailbox was available to complete the loop.
- **Payment processing** — `/payments/pay/` is a simulation and was not treated as a real gateway.
- **Load, soak, concurrency and penetration testing** — out of scope for this pass.
- **Production environment variables, backups, monitoring, rollback** — not inspectable from the repository.

Every one of these is labelled as a limitation, not as a pass.

---

## Path to "READY WITH CONDITIONS"

1. Rotate `admin@hiddenstage.in`, confirm the old password fails, and remove the account's superuser status if it is only used for the SPA admin (a staff account is enough).
2. Implement the customer custom-service flow (either a real "Other" taxonomy entry or a create-custom-service control) and add it to the parity test.
3. Replace preview copy on `/contact`, `/privacy` and `/terms`; connect the contact channel to a real destination.
4. Set and verify production env: `DEBUG=0`, real hosts/origins, HTTPS redirect, fresh secret key, `MEDIA_STORAGE=cloudinary` (or S3).
5. Run a fresh PostgreSQL migration in staging, then one full customer→manager→worker write journey against it.
6. Re-run the 180 backend tests, 108 API checks, customer journey and route crawl against staging; expect the same counts.

When 1–5 are done, the honest verdict becomes **READY WITH CONDITIONS** (monitoring, backups and legal review still outstanding).

---

## One-paragraph verdict

The engineering core is stronger than the launch surface suggests: the API is permission-tight, the role model is consistent, the build is clean, and every defect found in the core was reproducible and fixable. What blocks launch is not architecture but unfinished edges — a leaked admin password, a missing customer flow, demo copy on public pages, and production settings nobody can verify from here. Fix those six items, re-run the same evidence set, and this becomes a launchable product.
