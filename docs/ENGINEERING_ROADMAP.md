# HiddenStage Engineering Roadmap

This roadmap follows the restart prompt. A phase is not complete until its acceptance criteria are demonstrated; a working-looking UI or successful server startup alone is insufficient.

| Phase | Scope | Status | Exit evidence |
|---|---|---|---|
| A — Discovery and architecture | Inventory approved docs, reference research, reconcile decisions, define independent repository boundaries and risks. | In progress | Documentation inventory and access limitations recorded; reconcile with approved Phase 0 source documents when supplied. |
| B — Technical foundation | Independent projects, PostgreSQL/Docker, API/OpenAPI, environment templates, logging, health checks, CI, setup docs. | Not started | Both repos install/test independently; database-backed health and production checks run in CI. |
| C — Authentication and permissions | Custom user, registration, login/logout, session/CSRF, email verification, password reset, roles, business representatives and permissions. | Not started | Backend authorization, enumeration protection, lifecycle and permission tests pass. |
| D — Business and provider foundation | Professional/business profiles, service categories, normalized service coverage, verification. | Not started | Validated API and permission coverage, backed by tests. |
| E — Event request engine | Event/service requirements, private attachments, request lifecycle, matching, discovery, invitations. | Not started | End-to-end customer/provider workflow and attachment authorization tests pass. |
| F — Quotation engine | Quotes, items/packages, immutable revisions, expiry, comparison, acceptance, PostgreSQL concurrency protections. | Not started | Real PostgreSQL race tests cover same-line conflicts, distinct lines, packages, and view-level operations; CI fails on skips. |
| G — Commitments and admin | Commitment records, partial acceptance, audited release, audit logs, moderation/admin workflows. | Not started | State, audit, permission, and administrative tests pass. |
| H — Product polish and release readiness | Responsive/accessibility/performance, optional analytics, security review, full QA, deployment readiness. | Not started | Verified user journeys, production checks, and documented release evidence. |

## Execution guardrails

- Do not advance a phase by substituting mocks for critical integrations or SQLite for PostgreSQL concurrency evidence.
- Keep approved product behavior, API schema, frontend types, tests, and implementation status synchronized.
- Treat absent specifications as unresolved; proceed only on independent foundation work until clarified.
- Do not enable analytics until consent, configuration, and event delivery are verified.
