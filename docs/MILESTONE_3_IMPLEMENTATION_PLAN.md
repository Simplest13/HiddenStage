# Milestone 3 — Manager–Worker Network & Assignment Management Plan

**Date:** 2026-11-10  
**Status:** Approved implementation approach for this milestone.  
**Authority:** The milestone brief; `docs/DECISION_LOG.md` (D-010, D-012, D-014); existing application behaviour. No separate Phase 0 product spec exists in this workspace, so lifecycle and privacy choices below are recorded explicitly rather than inferred silently.

## 1. Existing functionality reused

| Existing capability | Reuse |
|---|---|
| `User` + `ProviderProfile.kind` | Manager and Worker are existing provider accounts differentiated by profile kind. No new auth model and no account migration. |
| Provider services and coverage | Worker discovery filters and cards reuse `ProviderService` and `ProviderCoverage`. No duplicate skills/coverage tables in this milestone. |
| Provider workspace shell and navigation | Manager and Worker screens extend the existing `/app/provider` workspace, components, CSS variables and typography. |
| Provider commitments | Only an ACTIVE commitment where the Manager is the provider can receive team assignments. |
| Customer event/commitment privacy | Assignments derive event details from the manager's accepted commitment; no new customer contact exposure. |
| Existing provider opportunity and quotation flow | Untouched. Workers keep independent opportunities and commitments regardless of network membership. |
| Existing `Business` model | A Manager's public business identity continues to use `ProviderProfile`; `Business` is not duplicated. |

No equivalent network, association or assignment model exists.

## 2. New models (`apps/network`)

### `NetworkInvitation`
- `manager` → User, `worker` → User
- `message`, `status` (`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `EXPIRED`)
- `expires_at`, `responded_at`, timestamps
- Constraints: manager ≠ worker; valid status; one PENDING invitation per manager/worker pair.
- Only a completed `MANAGER` may send; only a completed `WORKER` may receive.

### `NetworkAssociation`
- `manager`, `worker`
- `status` (`ACTIVE`, `ENDED`), `associated_at`, `ended_at`, `ended_by`, `ended_reason`
- Constraints: one ACTIVE association per pair; manager ≠ worker.
- Ending sets `ENDED`; rows are never deleted, preserving history.

### `WorkerAssignment`
- `manager`, `worker`, `commitment` (accepted customer commitment), optional `replaces`
- `role`, `task_description`, `instructions`
- `event_date`, `start_time`, `end_time`, `reporting_time`
- `location` (manager-supplied disclosure text; no new customer contact fields)
- `compensation_paise` nullable — recorded only, no payment/settlement behaviour
- `response_deadline` nullable
- Status: `DRAFT`, `SENT`, `ACCEPTED`, `DECLINED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REASSIGNED`
- `responded_at`, `accepted_at`, `started_at`, `completed_at`, `cancelled_at`, `cancellation_reason`, `completion_notes`, timestamps
- Constraints: start < end; manager ≠ worker; valid status; non-negative compensation; indexes on worker/date/status and manager/status.

## 3. State transitions and rules

Network invitation:
- `PENDING → ACCEPTED | DECLINED | CANCELLED | EXPIRED`
- Accepting creates one ACTIVE association transactionally and prevents duplicates.
- Declining leaves no association and retains the invitation.
- A previously ended association is retained; a later accepted invitation creates a new association row.

Assignment:
- `DRAFT → SENT`
- `SENT → ACCEPTED | DECLINED | CANCELLED | REASSIGNED`
- `ACCEPTED → IN_PROGRESS | CANCELLED | REASSIGNED`
- `IN_PROGRESS → COMPLETED`
- Only backend services perform transitions. Clients never PATCH `status` directly.
- Only the Manager who owns the commitment can create/send/cancel/reassign.
- Only the named Worker can accept/decline/start/complete.
- A Worker must have an ACTIVE association with the Manager when the assignment is sent and when accepted.
- Assignment creation requires an ACTIVE commitment belonging to that Manager.
- Reassignment creates a new assignment linked through `replaces`; the old row becomes `REASSIGNED`, preserving its decline/cancel reason.

## 4. Availability

- Conflict = another `ACCEPTED` or `IN_PROGRESS` assignment for the same Worker on the same date where `start < other_end` and `end > other_start`.
- `SENT` invitations do not block the calendar.
- `DECLINED`, `CANCELLED`, `REASSIGNED`, `COMPLETED` and `DRAFT` do not block.
- Availability is checked when the Manager requests a check, when an assignment is sent (warning only) and again inside a transaction when the Worker accepts.
- Acceptance locks the Worker's `User` row (`select_for_update`) before rechecking, so concurrent acceptances cannot both succeed.
- Cross-Manager checks return only `available`, `conflict` and the proposed schedule. No other Manager's event, customer, venue or compensation is disclosed.
- No travel-time or buffer calculation exists; this is documented as a limitation.

## 5. API surface

All under the existing `/api/v1/` prefix and DRF conventions.

| Method and path | Actor | Purpose |
|---|---|---|
| `GET /network/workers/` | Manager | Discover completed Workers; filters category, city, pin_code, locality. |
| `GET /network/workers/<user_id>/` | Manager | Worker public profile + relationship state. |
| `GET /network/invitations/` | Manager / Worker | Sent or received invitations according to role. |
| `POST /network/invitations/` | Manager | Invite a Worker. |
| `POST /network/invitations/<id>/accept/` | Worker | Accept, create association. |
| `POST /network/invitations/<id>/decline/` | Worker | Decline. |
| `POST /network/invitations/<id>/cancel/` | Manager | Cancel pending invitation. |
| `GET /network/associations/` | Manager / Worker | Own active network with counterpart details and assignment counts. |
| `POST /network/associations/<id>/end/` | Manager / Worker | End association with optional reason; history retained. |
| `GET /assignments/` | Manager / Worker | Own assignments; optional `commitment`/`status` filters. |
| `POST /assignments/` | Manager | Create and optionally send (default) an assignment. |
| `GET /assignments/<id>/` | Manager / Worker | Assignment detail. |
| `GET /assignments/availability/` | Manager | Privacy-safe availability check. |
| `POST /assignments/<id>/accept/` | Worker | Accept with conflict recheck. |
| `POST /assignments/<id>/decline/` | Worker | Decline with optional reason. |
| `POST /assignments/<id>/start/` | Worker | Mark in progress. |
| `POST /assignments/<id>/complete/` | Worker | Submit completion notes. |
| `POST /assignments/<id>/cancel/` | Manager | Cancel with reason. |

## 6. Frontend changes

- New routes inside the existing provider workspace:
  - `/app/provider/network` — My Network for both roles.
  - `/app/provider/network/discover` — Manager-only Worker discovery.
  - `/app/provider/assignments` — assignment list/management.
  - `/app/provider/assignments/:assignmentId` — assignment detail.
- Navigation adds **My Network** and **Assignments** for providers; Manager-only discovery action appears inside My Network.
- Manager commitment cards gain a **Manage team** link for ACTIVE commitments.
- Dashboard summary cards add real network/assignment counts for the current role.
- Reuse existing `customer-page`, `Card`, `Badge`, `Button`, form primitives and CSS variables. No new visual system.

## 7. Permissions

- Manager-only: Worker discovery, send/cancel network invitation, create/cancel assignment, availability check.
- Worker-only: accept/decline network invitation, accept/decline/start/complete assignment.
- Object scoping: Managers see only their invitations, associations and assignments; Workers see only theirs; customers receive 403.
- Association required for assignment send and acceptance.
- Assignment creation requires an ACTIVE commitment owned by the acting Manager.
- No customer or public access to team, compensation or assignment data.
- All state transitions are auditable through invitation/association/assignment timestamps and reasons. A dedicated audit table is not added in this milestone; mutation history is preserved through retained rows and status timestamps.

## 8. Notifications

No notification backend exists. This milestone will not fake email/SMS/push delivery. Network and assignment states are visible in both workspaces; the completion report will list notification delivery as pending.

## 9. Out of scope

Job board, applications, shortlisting, payments/escrow/settlements, event execution plans, check-in, reviews, reliability scoring, chat and email delivery. No placeholders that appear operational.

## 10. Open decisions

- Whether a Manager may assign a Worker who is not in their network. This milestone requires an ACTIVE association, matching the milestone brief's default rule.
- Whether a pending invitation should reserve availability. This milestone follows the explicit rule that it does not.
- Travel-time buffers and multi-day events are not modelled.
- A Worker leaving a network does not cancel accepted assignments; the current milestone requires explicit cancellation by the Manager.
- Account roles remain `CUSTOMER`/`PROVIDER` with `ProviderProfile.kind`; splitting the account enum remains a separate decision.

## 11. Verification plan

- Backend tests for invitation accept/decline/duplicate, non-exclusive associations, assignment ownership, association requirement, decline/reassign history, cross-Manager overlap rejection, race-safe acceptance, network removal and authorization.
- Live end-to-end: Manager invites Worker → Worker accepts → Manager assigns from an active commitment → Worker accepts → appears in both workspaces; second Manager overlap rejected; independent Worker quote flow regression.
- TypeScript, lint, unit tests, production build, Playwright suite, and 390 px mobile overflow checks.
