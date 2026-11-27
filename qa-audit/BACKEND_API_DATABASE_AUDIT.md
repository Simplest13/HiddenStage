# HiddenStage — Backend API & Database Audit

**Date:** 27 November 2026
**Stack:** Django 5.2.19, Django REST Framework, PostgreSQL 18 (Neon) / SQLite (isolated audit), Cloudinary-capable media storage, session authentication with CSRF.
**Apps:** `accounts`, `profiles`, `events`, `matching`, `invitations`, `quotations`, `commitments`, `network`, `administration`, `core`.

---

## 1. Endpoint inventory

114 URL patterns across ten apps, all under `/api/v1/` except Django admin and private media.

### Authentication and account — `apps/accounts` (15)
`GET auth/csrf/` · `POST auth/register/` · `POST auth/login/` · `POST auth/logout/` · `GET auth/me/` · `POST auth/email/verify/` · `POST auth/email/resend/` · `POST auth/password/reset/` · `POST auth/password/reset/confirm/` · `GET auth/check-username/` · `PATCH auth/settings/` · `POST auth/password/change/` · `POST auth/avatar/` · `GET auth/avatars/{filename}` · `GET auth/notifications/` · `POST auth/notifications/mark-read/`

### Profiles and catalogue — `apps/profiles` (20)
`GET catalog/categories/` · `POST catalog/categories/custom/` · `GET|PUT|PATCH me/customer-profile/` · `GET|PUT|PATCH me/provider-profile/` · `GET|POST me/provider-services/` · `GET|PATCH|DELETE me/provider-services/{id}/` · `GET|POST me/provider-coverage/` · `GET|PATCH|DELETE me/provider-coverage/{id}/` · `GET profiles/managers/search/` · `GET network/managers/` · `GET|POST profiles/portfolio/` and `me/portfolio/` · `POST …/portfolio/reorder/` · `GET|PATCH|DELETE …/portfolio/{id}/` · `GET media/portfolio/{filename}` · `GET|POST profiles/team/` and `me/team/` · `GET|PATCH|DELETE …/team/{id}/` · `GET profiles/{pk}/`

### Events and requirements — `apps/events` (13)
`GET events/feed/` · `GET events/bookings/` · `GET events/bookings/{id}/` · `GET|POST events/` · `GET|PATCH events/{id}/` · `POST events/{id}/submit/` · `POST events/{id}/withdraw/` · `POST events/{id}/complete/` · `GET|POST events/{event}/requirements/` · `GET|PATCH|DELETE …/requirements/{id}/` · `GET|POST events/{event}/attachments/` · `GET …/attachments/{id}/download/` · `DELETE …/attachments/{id}/`

### Matching and discovery — `apps/matching` (4)
`GET directory/providers/` · `GET providers/` · `GET provider/opportunities/` · `GET providers/{pk}/`

### Invitations — `apps/invitations` (5)
`GET|POST events/{event}/invitations/` · `POST …/invitations/{id}/withdraw/` · `GET provider/invitations/` · `POST provider/invitations/{id}/accept/` · `POST …/decline/`

### Quotations — `apps/quotations` (9)
`GET|POST provider/quotations/` · `GET provider/quotations/{id}/` · `POST …/revisions/` · `GET|PATCH …/revisions/{rid}/` · `POST …/revisions/{rid}/submit/` · `POST …/withdraw/` · `GET customer/quotations/` and `quotations/customer/` · `GET events/{event}/quotations/`

### Commitments and payments — `apps/commitments` (11)
`GET payments/summary/` · `GET payments/invoices/` · `GET payments/invoices/{id}/` · `GET payments/transactions/` · `POST payments/pay/` · `POST quotations/{id}/acceptance/` · `GET commitments/` · `GET provider/commitments/` · `GET commitments/{id}/` · `POST commitments/{id}/release/`

### Network and assignments — `apps/network` (19)
`GET network/stream/` · `GET network/connections/` · `POST network/connections/connect/` · `DELETE network/connections/{provider}/` · `GET network/search-providers/` · `GET network/conversations/` · `GET network/conversations/{id}/` · `POST …/messages/` · `GET network/workers/` · `GET network/workers/{user}/` · `GET|POST network/invitations/` · `POST network/invitations/{id}/{action}/` · `GET network/associations/` · `POST network/associations/{id}/end/` · `POST network/managers/request/` · `GET assignments/availability/` · `GET|POST assignments/` · `GET assignments/{id}/` · `POST assignments/{id}/{action}/`

### Administration — `apps/administration` (15)
`GET admin/overview/` · `GET admin/users/` · `GET|PATCH admin/users/{id}/` · `GET admin/providers/` · `POST admin/providers/{id}/verification/` · `POST admin/providers/{id}/featured/` · `GET admin/businesses/` · `GET|PATCH admin/businesses/{id}/` · `GET admin/events/` · `POST admin/events/{id}/withdraw/` · `GET admin/commitments/` · `POST admin/commitments/{id}/release/` · `GET|POST admin/categories/` · `GET|PATCH|DELETE admin/categories/{id}/` · `GET admin/audit/`

### Core / docs
`GET api/v1/health/` · `GET api/v1/schema/` · `GET api/v1/docs/` · `GET api/v1/redoc/`

---

## 2. Automated test results

| Suite | Command | Result |
|---|---|---|
| Full backend suite | `python manage.py test` | **180 tests, OK, 3 skipped** |
| Database URL isolation | `manage.py test apps.core.test_database_url` | **7/7 OK** after fix |
| Realtime stream | `manage.py test apps.network.tests.RealtimeStreamTests` | **2/2 OK** (new) |
| Avatar validation | `manage.py test apps.accounts.tests.AvatarTests` | **4/4 OK** (one new) |
| Provider onboarding | `manage.py test apps.profiles.test_onboarding` | **7/7 OK** (one new) |
| System checks | `manage.py check` | 0 issues |
| Migration consistency | `makemigrations --check --dry-run` | No changes detected |

**Before fixes:** the suite could not start at all (HS-002), then ran 176 tests with 5 failures (HS-006).

---

## 3. Live API test results

108 checks in `qa-audit/scripts/api_journey.py`; results in `qa-audit/scripts/api_journey_results.json`.

Areas covered (all assertions passed):

- Health endpoint and database status; public category catalogue.
- Registration validation: missing username, weak password, invalid email, missing terms, duplicate email.
- Customer plus all five provider kinds: registration, onboarding persistence, kind persistence.
- Talent-specific fields; provider service creation and duplicate-service `400`.
- Custom categories: empty/one-character/over-80 names rejected, creation flagged `is_custom`, own slug, case-insensitive deduplication, special characters, catalogue persistence, use in an event requirement, persistence after refresh.
- Multi-requirement event creation, submission, persisted status; rejection of `custom_service_name` on a standard category.
- Invitation creation, inbox visibility and acceptance.
- Quotation draft, item save, submit, server-computed total, double-submit refusal.
- Customer quotation list, single-line acceptance, resulting commitment and list visibility.
- Role separation: customer/provider/anonymous.
- Worker network invitation, acceptance, active association; assignment create/list/accept; duplicate accept refused; availability conflict and response privacy; assignment authorization for unassociated, customer and non-manager actors.
- IDOR on foreign event, foreign quotations and foreign provider quotation.
- Media: valid PNG avatar and served URL, unsupported/oversized/empty/spoofed avatar, valid and rejected portfolio uploads, event attachment upload/download, unsupported type, content/type mismatch, foreign download refusal.
- Account settings and theme persistence, notifications, provider opportunities, worker-scoped feed, worker discovery.
- Contact visibility: anonymous, authenticated non-committed customer, committed customer, owner; manager team names.

All 108 checks pass on the final run. No destructive operation was performed.

**Caveat on two catalogue checks:** the audit database was created before an experimental `other` seed migration was reverted, so it still contains a non-custom `other` row. The two assertions that look for `other` therefore pass against **residue**, not against a migrated schema. A database built fresh from migrations (`audit-fresh.sqlite3`) contains exactly nine categories and no `other`, and `0002_seed_service_categories.py` does not create one. The custom-category and event checks do not depend on that row.

---

## 4. Database audit

### Connectivity and configuration
- `settings.py` resolves a single `DATABASE_URL` (Neon) or discrete `POSTGRES_*` values; remote test databases are refused unless `ALLOW_REMOTE_TEST_DB=1`.
- Automated tests default to in-memory SQLite when no test URL is supplied, so the shared cloud database is never the test target.
- The configured Neon database responded: PostgreSQL 18.7, 25 users, 4 events, 3 quotations, 0 commitments at audit time.
- The isolated audit database was migrated from zero: **all migrations applied successfully**.

### Persistence verified
- User creation, role (`CUSTOMER`/`PROVIDER`), provider subtype (`MANAGER`, `INDIVIDUAL_SERVICE_PROVIDER`, `ASSOCIATED_SERVICE_PROVIDER`, `TALENT`, `WORKER`).
- Customer profile, provider profile, services, coverage, portfolio metadata, team membership.
- Service categories (seeded nine) and custom categories (`is_custom`, `created_by`, own slug).
- Events, requirements (including custom service fields), attachments, invitations, quotations, revisions, items, commitments, network invitations, associations, assignments, notifications.
- Foreign keys and `PROTECT`/`CASCADE` behaviour: deleting a category referenced by a requirement raises `ProtectedError` (observed while reversing a test data migration); assignment/commitment references are protected.

### Integrity checks
- Unique `(provider, category)` service constraint: enforced; API now returns 400 instead of 500.
- Unique pending network invitation: enforced; duplicate send raises a conflict.
- One quotation per `(event, provider)`: enforced.
- Quotation revision immutability: submitted revisions are superseded, not edited; a Postgres trigger exists (`quotations.0002_immutability_triggers`). The trigger was **not exercised on Postgres** in this audit; SQLite ignores it.
- Event end-after-start and non-negative money constraints: enforced at database level.
- Transaction rollback: service functions use `@transaction.atomic`; no explicit forced-failure rollback test was executed.

### Data-quality observations
- Production contains an ad-hoc `other` category and four custom categories (`dandance`, `dance`, `technical`, `theka`) that are not in the seed migration — drift between code and data (HS-007).
- The isolated audit database also contained a leftover `other` row from a reverted seed experiment; fresh databases do not. This is noted wherever an `other` assertion is mentioned.
- Production contains QA-looking accounts (`*@example.test`) alongside real-looking accounts; no cleanup was performed.

---

## 5. Permissions and authorization

| Actor → target | Expected | Observed |
|---|---|---|
| Anonymous → `/events/`, `/assignments/`, `/provider/quotations/` | 401/403 | 403 |
| Customer → provider quotation inbox | 403 | 403 |
| Provider → customer quotation inbox | 403 | 403 |
| Customer → another customer's event / quotations | 403/404 | 404/403 |
| Provider → another provider's quotation | 403 | 403 |
| Customer → assignment creation | 403 | 403 |
| Non-manager provider → assignment creation | 403 | 403 |
| Manager → assignment without active association | 400/403 | 400 |
| Foreign customer → attachment download | 403/404 | 404 |
| Admin API with staff account | 200 | 200 |
| Admin API without staff | 403 | 403 |

No IDOR or broken object-level authorization was found in the tested surface.

---

## 6. Storage

- `MEDIA_STORAGE` supports `local`, `s3`, `cloudinary`; default is `local` with `MEDIA_ROOT=private-media/`.
- Avatars are served through `/api/v1/auth/avatars/{filename}` and `/private-media/avatars/{filename}`; traversal is rejected.
- Event attachments are private, downloaded through an authorising view, and content-sniffed (JPEG/PNG/WebP/PDF/DOCX).
- Portfolio media is served through `media/portfolio/{filename}`; validation is extension/size based (HS-016).
- Verified live: valid PNG avatar round-trip, valid portfolio upload, valid attachment upload/download, foreign download refusal, unsupported/oversized/empty rejection.
- **Not verified:** Cloudinary and S3 round-trips, signed URLs, bucket permissions, deletion of the storage object, concurrent uploads.

---

## 7. Backend log findings

From `audit-backend.log` and test logs:

- Expected `400 Bad Request` on validation tests, `403 Forbidden` on permission tests, `404 Not Found` on missing resources, `409 Conflict` on duplicate submit — all intentional and correctly mapped.
- One genuine `500 IntegrityError` was found (duplicate provider service) and fixed.
- No stack trace or secret is returned in API error bodies; DRF returns structured `detail`/field errors.
- `python-dotenv could not parse statement starting at line 12/15/16` appears on every command. The `.env` file contains Cloudinary lines with spaces/tabs (`Cloud name\t=…`, `API secret  =…`) that dotenv cannot parse. This is a **configuration hygiene defect**: those values are not loaded from those lines (the `CLOUDINARY_URL` line is used instead). No secret is printed.
- No repeated failing endpoint, no missing environment variable crash, no CORS error observed on the tested origin.

---

## 8. Integration failures found

| Failure | Layer | Status |
|---|---|---|
| SSE `/network/stream/` 406 | DRF content negotiation | Fixed, retested |
| Duplicate service 500 | View + DB constraint | Fixed, retested |
| 5 database-URL tests failing under `.env.neon` | Test harness | Fixed, retested |
| Customer dashboard/provider dashboard slow first paint | Frontend data loading + dev server | Open (P3) |
| Anonymous `/auth/me/` 401 console noise | Frontend auth bootstrap | Open (P3) |

---

## 9. Limitations

- Fresh **PostgreSQL** migration was not run (no local Postgres/Docker; creating a database on the managed Neon cluster was avoided). Fresh SQLite migration succeeded, and the existing Neon schema is current.
- Load, soak and concurrency testing were not performed.
- Cloudinary/S3 storage and email delivery were not exercised.
- Payment endpoints exist (`/payments/pay/` is a simulation) and were not treated as production payment processing.
