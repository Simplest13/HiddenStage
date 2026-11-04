# HiddenStage Decision Log

This log separates explicit product decisions from unresolved choices. Entries sourced from the restart prompt are approved constraints; implementation choices must be recorded with rationale and validation.

## Approved constraints

| ID | Decision | Source |
|---|---|---|
| D-001 | Keep frontend and backend as two independently installable, testable, deployable repositories; do not use a monorepo. | Restart prompt |
| D-002 | Start with a modular monolith; do not introduce microservices prematurely. | Restart prompt |
| D-003 | Backend: Python 3.12+, Django 5.2 LTS, DRF, PostgreSQL, drf-spectacular, Docker, Docker Compose, and Gunicorn. | Restart prompt |
| D-004 | Frontend: React, TypeScript, Vite, React Router, modern CSS, and OpenAPI-generated TypeScript API types. | Restart prompt |
| D-005 | Use server-side Django sessions, email as the unique login identifier, email verification, CSRF protection, HttpOnly cookies, secure production cookies, explicit CORS origins, and backend-enforced authorization. Do not build homemade JWT or store auth tokens in localStorage. | Restart prompt |
| D-006 | PostgreSQL is authoritative; monetary amounts use integer paise; timestamps are aware; default timezone is Asia/Kolkata. | Restart prompt |
| D-007 | Quote revisions are immutable; only the latest valid, submitted, unexpired revision can be accepted. Package acceptance is all-or-nothing; service-line acceptance can be partial. | Restart prompt |
| D-008 | Acceptance creates a recorded commercial commitment, not a booking, payment, guarantee, or service-completion record. Release is audited and does not erase commitment history. | Restart prompt |
| D-009 | Protect concurrent acceptance with PostgreSQL transactions, row locks, and constraints; distinct non-overlapping lines may be independently accepted. SQLite is not evidence of PostgreSQL locking behavior. | Restart prompt |
| D-010 | Keep business identity separate from individual accounts; support a primary and additional active representatives with explicit permission scopes. Do not add a SUPPLIER account role based on business identity. | Restart prompt |
| D-011 | Verify email before launch using secure, expiring, single-use verification tokens. | Restart prompt |
| D-012 | Match normalized PIN codes and localities with city/state context; do not infer broad provider coverage. | Restart prompt |
| D-013 | Event attachments are private by default; validate type, MIME, size, and count; authorize downloads; retain a malware-scanning integration point. | Restart prompt |
| D-014 | Exclude chat, direct messaging, booking records/confirmation, payments, escrow, payouts, refunds, settlements, wallets, credits, subscriptions, commission infrastructure, automatic GST, and fabricated invoices from release one. | Restart prompt |
| D-015 | PostHog may be optional analytics only after current pricing/limits, privacy/consent, configuration, and actual delivery are verified; core functionality cannot depend on it. | Restart prompt |

## Workspace decisions for this restart

| ID | Decision | Rationale |
|---|---|---|
| W-001 | Place new independent repositories under `HiddenStageCODE\hiddenstage-frontend` and `HiddenStageCODE\hiddenstage-backend`; keep product discovery documents in `HiddenStageCODE\docs`. | The active workspace has no application repository; this avoids altering the separate `Desktop\hiddenstage` folder or turning the root into a monorepo. |
| W-002 | Treat the attached restart prompt as the only available product specification until the owner provides the approved Phase 0 documents. | The current workspace contains no HiddenStage product specs, architecture docs, or application source. |
| W-003 | Record Add to Event research as blocked, not inferred: the site returned Cloudflare HTTP 403 before product pages loaded. | Prevents invented reference findings. |

## Unresolved decisions

- Approved Phase 0 documents may exist outside the workspace; obtain their location and reconcile them before implementing detailed workflows.
- Exact account role names and role-transition rules; business representative permission scopes; professional and business verification states and review rules.
- Request visibility, matching eligibility/ranking, invitation limits/expiry, request edits/withdrawal, and locality/PIN-code source of truth.
- Quote item, package, price/tax presentation (excluding automatic GST), revision policy, expiry, revision requests, and acceptance/release eligibility and deadlines.
- Email verification/password-reset expiry and retry/rate-limit values, production mail delivery, and email templates.
- Attachment allowlist, maximum file sizes/counts, private storage provider, malware scanner, retention/deletion policy.
- Production hosting/domain topology, deployment target, production CORS/CSRF origins, secrets management, and CI PostgreSQL service strategy.
- Applicable analytics consent and privacy policy details; PostHog project/configuration and event-delivery verification.
- Add to Event reference flows and responsive behavior remain unverified.

Material behavior, security, or privacy decisions above must not be silently invented. Implement only work that does not depend on them, or request product-owner direction.
