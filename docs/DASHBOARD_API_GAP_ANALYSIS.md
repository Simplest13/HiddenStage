# Dashboard API Gap Analysis

The table focuses on APIs that support current dashboard workflows. “Existing” is code-backed, “verified” means a test asserted behavior and persistence, and “proposed” means not implemented.

## Existing API groups

| Workflow | Existing API family | Authorization/persistence evidence | Gap or limit |
|---|---|---|---|
| Authentication/profile | `/api/v1/auth/*`, `/api/v1/me/customer-profile/`, `/api/v1/me/provider-profile/`, provider services/coverage | Session auth, CSRF, own-profile filters; provider onboarding tests query saved values. | Coarse customer/provider roles; no separate role-permission contract for all five provider kinds. |
| Catalog and discovery | `/catalog/categories/`, `/directory/providers/`, `/providers/`, `/profiles/managers/search/`, `/network/workers/` | Public listings filter active/completed/public profiles; Manager worker search/service has subtype checks. | Public listing currently emits `rating=None` and `review_count=0`; not a real review/rating API. |
| Events and requests | `/events/`, `/events/<id>/`, submit/withdraw, requirements, attachments, bookings/feed | Customer ownership is applied in view/service querysets; event and requirement records persist. Attachment download is authorized via API rather than a public storage URL. | Matching and invite availability depend on active service/coverage data. No production attachment scanner/storage verification. |
| Invitations and quotations | `/events/<event>/invitations/`, `/provider/invitations/`, `/provider/quotations/`, revision create/update/submit, `/events/<event>/quotations/` | Owner/recipient scoping; quotation revision rules and invitation responses are persisted. | Provider subtype access is mostly broad `IsProvider`; no separate quote entitlement per kind. |
| Commitment | `/quotations/<id>/acceptance/`, `/commitments/`, `/provider/commitments/`, detail/release | Tests assert commitment, commitment lines, audit entry, requirement and event transitions; foreign actors are denied. | Not equivalent to payment, booking guarantee, or a full execution plan. |
| Manager/Worker | `/network/invitations/`, `/network/associations/`, `/assignments/`, availability, assignment actions/detail | Manager/Worker services enforce kind, membership, commitment ownership, assignment participant access; lifecycle persistence tested. | Assignment is a bounded work allocation, not a general task/milestone API. |
| Provider public detail / availability | Public provider detail and authenticated Manager availability query | Provider detail hides private portfolio rows from non-owners; availability returns a limited boolean/time result. | Source-level scope requires confirmation: provider contact is returned to any authenticated viewer, and active Manager team-member names/permission arrays are included in profile detail; Manager availability lookup does not require an active association to the Worker. |
| Payment | `/payments/summary/`, invoices, transactions, `/payments/pay/` | Customer-owned queries and transaction model exist. | Payment action is simulated; no live payment gateway, settlement, refund reconciliation, or external callbacks verified. |
| Admin | `/admin/overview/`, users/providers/businesses/events/commitments/categories/audit | Every app admin view uses `IsStaffUser`; state changes have audit services/logs. | Staff is the authorization discriminator; live operational access not tested. |
| Business | Business/BusinessRepresentative models; admin business APIs | Business identity/scope schema exists. | No user-facing business workspace or business-member API is registered in the root API URL config; frontend business routes redirect forbidden. |

## Workflow persistence check

The targeted in-memory SQLite backend run exercised 71 tests (all passed; 3 PostgreSQL-only tests skipped). Among the assertions:

- quotation acceptance writes a `Commitment`, `CommitmentLine`, and acceptance audit row, changes requirement status, and closes the event when all requirements are committed;
- repeated acceptance is rejected, and unauthorized providers/foreign customers cannot accept;
- Manager–Worker invitation acceptance creates an association; decline keeps invitation history without an association;
- Manager assignments require an active association and an active commitment, and Worker status changes persist;
- unauthorized users cannot inspect assignment detail or list assignments as a customer.

This is evidence that tested workflows persist in the isolated test DB; it is not evidence that the production database or external integrations are currently healthy.

## Proposed API work (not implemented)

- Publish an explicit role/kind capability contract and test each endpoint against it.
- Consider a dashboard aggregate endpoint only if product/measurement supports it; current provider overview fans out to multiple APIs.
- Add generic task/project endpoints only if requirements exceed the current WorkerAssignment lifecycle.
- Add a real payment integration and event/callback/idempotency behavior only after provider selection and security review.
- Add business membership endpoints only after mapping `BusinessRepresentative.scopes` to provider identity and proving tenant isolation.
- Confirm intended visibility for provider contact and Manager team metadata in public profile detail, and whether Worker availability queries must be restricted to active network members. No API behavior was changed by this audit.

## Verification limits

The broader 79-test run had one failure: a subprocess S3-storage test could not import `django-storages`. The targeted workflow run passed without that S3-specific test. The frontend route run passed 8/9 tests; the public-homepage lazy-load test timed out. Three backend tests requiring PostgreSQL concurrency/trigger behavior were skipped under SQLite. Live production API, credentials, database records, email, S3, and payment infrastructure were not accessed.
