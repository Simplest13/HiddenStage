# Role and Permission Matrix

Permission evidence is divided into frontend navigation and API enforcement. **Existing** means code is present; **verified** is supported by isolated tests; **proposed** is not implemented.

## Identity model

- `User.role` is only `CUSTOMER` or `PROVIDER`. Admin uses Django `is_staff`/`is_superuser`, not a third marketplace role.
- A provider's subtype is `ProviderProfile.kind`: `MANAGER`, `INDIVIDUAL_SERVICE_PROVIDER`, `ASSOCIATED_SERVICE_PROVIDER`, `TALENT`, or `WORKER`.
- `Business` and `BusinessRepresentative` are separate records. Representative `PRIMARY`/`ADDITIONAL` and scopes do not currently create a separate account role or routed workspace.
- The frontend provider guard checks only `PROVIDER` and profile completion; API endpoints use broad `IsProvider` unless a service adds kind-specific checks.

## Route access

| Surface | Frontend gate | Result for cross-role manual URL entry |
|---|---|---|
| Customer `/app` routes | Authenticated, then customer role/email policy/profile completion guards | Provider is redirected to forbidden; anonymous user to sign-in. |
| Provider `/app/provider...` | Authenticated `PROVIDER`, email policy, completed provider profile | Customer is redirected to forbidden; incomplete provider to onboarding. All five provider kinds share these routes. |
| Business `/app/business...` | No identity guard surface; route redirects to forbidden | Not an implemented workspace. |
| `/admin` and legacy `/app/admin...` | Frontend `isStaff` check | Non-staff receives forbidden or the admin login screen. |
| Django `/admin/` | Django admin authentication | Staff authorization is enforced server-side. |

Route tests passed for anonymous protection, customer onboarding, provider/customer separation, and staff admin access. In this run 8/9 route tests passed; the remaining public homepage test timed out while lazy content remained on the spinner. This is a UI test limitation, not evidence that an API authorization check passed.

## API-level permissions and record scope

| API resource/action | Coarse gate | Object/ownership enforcement observed |
|---|---|---|
| Customer profile, event create/update, invitations, quote list for an event, commitments and customer payments | `IsCustomer` or `IsCustomerOrProvider` as applicable | Profiles/events/invoices/commitments are filtered by `request.user`; event quote/invitation routes first resolve an owned event; commitment acceptance validates event customer. |
| Provider profile/services/coverage, provider invitations/quotations/opportunities | `IsProvider` | Self-profile/service/coverage queries and invitation/quotation queries are scoped to the signed-in user; quote revisions validate the quotation owner. |
| Manager/Worker network and assignments | Coarse `IsProvider` plus service checks | `require_manager`/`require_worker`, active association checks, own commitment checks, and actor-specific invitation/assignment checks. Detail endpoints expose participant-owned records only. |
| Portfolio/team APIs | `IsAuthenticated` or `IsProvider` | Portfolio defaults to own/team-managed records; requested public profile lists filter to public visibility; team rows are scoped to owner. Team `MANAGE_PORTFOLIO` scope is checked on writes. |
| Provider directory/detail | `AllowAny` | Public listing filters active, completed, public profiles; detail hides incomplete/private profiles from non-owners and excludes private portfolio items. |
| Manager availability query | `IsAuthenticated`, followed by Manager-kind service check | Returns only a boolean/time window and no other Manager's event details. The current service does not require the queried Worker to be associated with the requesting Manager. Assignment creation separately requires an active association. |
| Admin API | `IsStaffUser` (`is_staff`) | Staff-only for user/provider verification, business, event, commitment, category, overview, and audit operations. |

Focused API tests verified provider cannot accept a customer's quotation, foreign customer cannot accept, foreign party cannot read/release commitments, customer cannot list assignments, and non-participating worker/customer cannot read a WorkerAssignment. Tests also verified cross-manager commitment assignment rejection.

## Access-control observations requiring product confirmation

- `ProviderDetailView` is public and limits private portfolio rows for non-owners, but its response includes the provider's `contact` whenever the requester is authenticated—not only for the owner/staff. It also includes active Manager team-member names and their `permissions` for any profile viewer. These response fields should be confirmed as intentionally visible to every signed-in account; no relationship check was found. This is a source-level finding, not a live-data probe.
- A Manager-kind account can query availability for a Worker ID without an active association. The response is limited to availability/conflict and the requested time window, with no conflicting event details. Confirm this privacy scope is intended; this does not authorize assignment creation, which requires an active association.
- These are API response/scope semantics and remain relevant even when frontend route guards behave as intended.

## Professional-type permissions

| `ProviderProfile.kind` | Kind-specific backend behavior found | Shared behavior |
|---|---|---|
| `MANAGER` | Can use Manager-only Worker discovery, invite Workers, manage its own profile team, and create assignments for own active commitments and associated completed Workers. | Still passes broad provider routes and general provider APIs. |
| `INDIVIDUAL_SERVICE_PROVIDER` | Serializer rejects more than one selected service category. | No distinct route guard or separate provider permission class. |
| `ASSOCIATED_SERVICE_PROVIDER` | Kind is stored and publicly represented; optional business FK exists. No kind-specific membership enforcement found in the profile API. | Broad provider routes/permissions. Business representative permissions are separate data and do not automatically attach to this kind. |
| `TALENT` | Talent fields and kind are stored/serialized; tests verify a Talent `role_data` payload persists. | Broad provider routes/permissions. |
| `WORKER` | Can respond to invitations addressed to them, list their own associations and assignments, and update their own assignment lifecycle. | Broad provider routes/permissions and quotation capability remain available. |

## Proposed (not implemented)

Specify and enforce per-kind capability policies, business representative membership resolution, and route-level workspace separation. Maintain backend object ownership regardless of the frontend shell.

## Evidence limits

Source and isolated in-memory SQLite tests were used. A live penetration test, production accounts, production API, and production data were not available or accessed. PostgreSQL-only concurrency tests were skipped.
