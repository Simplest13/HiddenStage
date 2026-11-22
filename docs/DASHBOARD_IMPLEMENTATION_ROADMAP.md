# Dashboard Implementation Roadmap

This is a proposed sequence based on the audit. It is not implementation approval, and no dashboard changes are included in this audit.

## Existing foundation

- Customer and provider workspace route families, shared shell, authentication/onboarding guards, API clients, and broad account role checks exist.
- Provider subtype data exists for Manager, Individual Service Provider, Associated Service Provider, Talent, and Worker. Only Manager/Worker workflows have substantial subtype-specific behavior.
- Backend persists the main request → quotation → commitment workflow and the Manager/Worker network/assignment lifecycle.
- Business route is reserved; real payments are not integrated. Design tokens exist but styles are not uniform across screens.

## Proposed phases

| Phase | Proposed outcome | Dependencies / acceptance evidence |
|---|---|---|
| 0. Confirm product rules | Define the six marketplace identities, dashboard scope per subtype, business membership semantics, and how much “execution management” means. | Approved role/capability matrix; no code implied by this audit. |
| 1. Authorization contracts | Specify role, subtype, object ownership, and cross-role restrictions for every dashboard endpoint. | Tests must prove direct URL and modified request access is denied for unrelated users. |
| 2. Shared dashboard foundation | Keep common shell/data states while making role-specific entry routes and navigation explicit. | Existing customer/provider route tests plus new subtype route tests; no API-only role assumptions. |
| 3. Professional dashboard capability views | Provide tailored views for Manager, Individual, Associated, Talent, and Worker using existing APIs where adequate. | Each page's data source and expected role state have a contract test. |
| 4. Manager execution workflow | Connect accepted commitments, active network, Worker assignments, availability and assignment history; decide whether a generic task model is needed. | End-to-end test asserts database states across the whole flow; PostgreSQL concurrency test for availability/acceptance assumptions. |
| 5. Business workspace (optional) | Build only after deciding how `BusinessRepresentative` and its scopes relate to provider profiles and account access. | Membership, scope, isolation, audit, and migration approach reviewed before work. |
| 6. Design consistency and operational verification | Align styles only after visual approval; validate light/dark, responsive, contrast, API load and external integrations. | Visual regression and production-like integration evidence, with limitations explicit. |

## Dependency order

`Identity/product rules → authorization contracts → route/navigation changes → subtype modules → Manager execution integration → optional business workspace → visual/operational hardening`.

For Manager execution, the prerequisite graph is: active completed Manager profile → completed Worker discovery → accepted network association; separately, customer event → quote submission → customer acceptance → active commitment. Assignment creation joins both branches, then Worker response and status transitions establish execution history.

## Non-goals of this roadmap

It does not prescribe framework replacement, migration, production configuration edits, palette changes, payment provider selection, or schema changes without a later reviewed design.

## Evidence limits

This sequence is based on checked-in architecture and isolated tests. No production credentials, customer research, external provider contracts, measured performance, or product approval were supplied. All phases are proposals; this document does not authorize implementation.
