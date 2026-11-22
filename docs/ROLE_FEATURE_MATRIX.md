# Role and Feature Matrix

This matrix describes current repository behavior, not a future product specification. **Existing** is implemented in source; **verified** has focused test evidence; **proposed** is not implemented.

| Marketplace identity | Representation | Existing route/dashboard | Existing capabilities and constraints | Proposed distinction |
|---|---|---|---|---|
| Customer / organiser | `User.role=CUSTOMER` + one-to-one `CustomerProfile` | `/app`; event requests, bookings, network, payments, quotes, commitments, settings | Own profile and event records; create/publish/withdraw requests; discover/invite providers; compare submitted quotes; accept/release commitments. | Dedicated customer experience is already present; future work is workflow usability and better consolidated status, not a new account role. |
| Manager | `User.role=PROVIDER` + `ProviderProfile.kind=MANAGER` | Shared `/app/provider`; Manager variations in network/assignment pages | All broad provider features; can discover/invite Workers, maintain network, manage a profile team, and create assignments only for own active commitments and associated completed Workers. | Distinct Manager overview/capability navigation and execution-oriented workload view. |
| Individual Service Provider | `User.role=PROVIDER` + `ProviderProfile.kind=INDIVIDUAL_SERVICE_PROVIDER` | Shared `/app/provider` | General provider profile, matching, invitations, quotation and commitment features. Serializer limits categories to one when category values are supplied. | Explicit single-category onboarding/dashboard messaging and capabilities. |
| Associated Service Provider | `User.role=PROVIDER` + `ProviderProfile.kind=ASSOCIATED_SERVICE_PROVIDER`; optional `ProviderProfile.business` FK | Shared `/app/provider` | General provider features. Separate Business/BusinessRepresentative data structures exist, but the profile kind does not itself establish a business membership or representative scope. | Define and enforce organization membership, representative scopes, and a business-aware dashboard. |
| Talent / Performer | `User.role=PROVIDER` + `ProviderProfile.kind=TALENT` | Shared `/app/provider` | General provider features; profile schema has talent category, performance styles, experience, and social links. No talent-specific authorization policy was found. | Talent-specific profile completeness and workflow affordances where product requirements justify them. |
| Worker / Crew | `User.role=PROVIDER` + `ProviderProfile.kind=WORKER` | Shared `/app/provider`; Worker-specific network/assignment variations | General provider profile/opportunity/quotation features; may associate with multiple Managers; only the assigned Worker can respond to their assignment; accepted/in-progress work participates in availability checks. | Worker-first schedule, assignments, status, and history entry point, while preserving independent provider rights. |
| Platform administrator (not one of the six marketplace identities) | Django `is_staff` | `/admin` and legacy `/app/admin`; separate Django admin URL | API administration views require `IsStaffUser`; operations include user, provider verification, business, event, commitment, category, and audit management. | Keep administration separate; add operational metrics only with explicit permissions and audit requirements. |

## Shared account and profile model

The account-role enum contains only `CUSTOMER` and `PROVIDER`. All five professional identities share the provider route guard and coarse `IsProvider` API permission; `ProviderProfile.kind` carries the professional subtype. Kind-specific authorization is present for Manager/Worker network actions and some profile rules, not as a universal five-kind permission system.

`ProviderProfile` stores `kind`, optional `business`, provider fields, JSON `role_data`, onboarding step/completion fields, services, and coverage. `BusinessRepresentative` has separate `PRIMARY`/`ADDITIONAL` roles and a set of enumerated business scopes. Do not equate that schema with a complete business workspace or assume every kind has a distinct permission set.

## Existing workflow readiness

| Feature | Current evidence |
|---|---|
| Provider onboarding persistence | API serializer persists `kind`, `role_data`, and onboarding progress. Tests verify a Talent payload and progress persisted. Individual-provider category limit and URL validation have focused tests. |
| Customer request and quote workflow | Event, requirement, invitation, quotation, and revision records are persisted through backend services and model relations. |
| Commitment acceptance | Verified API test asserts `Commitment`, lines, audit, requirement status, and event status. Customer ownership is checked; a provider or foreign customer cannot accept. |
| Manager network and assignments | Verified service/API tests assert association creation, invitation ownership, assignment lifecycle, active association requirement, and private assignment detail. |
| Payments | Invoice and transaction records/API are present; the payment action is simulated, not a live gateway integration. |
| Reviews/ratings | Public directory payload currently returns `rating=None` and `review_count=0`; no review workflow is evidenced in this audit. |

## Proposed future behavior

Role-specific landing dashboards and controls, formal Associated-provider membership, role-specific completeness rules across all five kinds, and a generic project/task module are proposals—not currently implemented features.

## Evidence limits

Evidence comes from checked-in routes, serializers, views, services, models, and isolated tests. No production credentials, real accounts, production database, external payment service, or live organization data were available or accessed. PostgreSQL-only tests were skipped under SQLite.
