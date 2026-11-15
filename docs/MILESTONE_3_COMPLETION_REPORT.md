# HiddenStage — Milestone 3 Completion Report

**Milestone:** Manager–Worker Network & Assignment Management  
**Date:** 10 November 2026  
**Status:** Implemented and verified against the live local application.  
**Scope boundary:** This milestone adds non-exclusive Manager–Worker associations and Manager-to-Worker assignments. It does **not** add a job board, applications, payments, escrow, settlement, payroll, execution plans, check-in or reviews.

## 1. What was implemented

### Manager–Worker network

- Managers can discover completed, active Worker profiles through a dedicated discovery screen.
- Discovery filters by declared service category, city, PIN code and locality.
- Search results show the Worker's name, introduction, categories, coverage and current relationship (`NONE`, `INVITED`, `ASSOCIATED`).
- Managers can send a non-exclusive network invitation with an optional message.
- Workers see incoming invitations, the Manager's public business profile and the message, and can accept or decline.
- Accepting creates an active association visible to both sides.
- Declining creates no association and keeps the invitation record.
- Managers can cancel a pending invitation.
- Managers can remove a Worker from their active network; Workers can leave a Manager's network.
- Ending an association sets it to `ENDED`, records the actor, timestamp and optional reason, and never deletes the row.
- Workers can belong to several Managers at once. The live test confirmed one Worker associated with two Managers.
- Both Manager and Worker network screens show active and previous associations with history.

### Assignment management

- Managers can assign a Worker from their active network to an active accepted `Commitment`.
- Assignment creation records event date from the commitment, role, task description, schedule, reporting time, location, instructions, optional recorded compensation and optional response deadline.
- Workers receive assignment invitations with Manager/business, event, role, task, date, schedule, reporting time, location, instructions, recorded fee and status.
- Workers can accept, decline with a reason, start and complete an assignment.
- Managers can cancel an assignment with a reason.
- A declined or cancelled assignment can be replaced by a new assignment linked through `replaces`; the original row becomes `REASSIGNED` and remains in history.
- Assignment detail is available at a dedicated route with schedule, location, instructions, contact disclosure after acceptance, response/cancellation/completion notes and role-appropriate actions.
- Manager assignment list shows Worker, event, schedule, status, recorded fee, Worker response notes and cancellation reasons.

## 2. Existing functionality reused

- Existing `User` account model and `UserRole.PROVIDER`; no authentication or account-role rewrite.
- Existing `ProviderProfile.kind` (`MANAGER` / `WORKER`) and provider onboarding/profile/services/coverage.
- Existing `Commitment` as the Manager's accepted customer scope and source of event/date ownership.
- Existing provider workspace layout, navigation, route guards, design tokens, fonts, buttons, cards, forms, modals, toasts, loading/empty/error states.
- Existing API conventions: `/api/v1/`, DRF API views, shared error envelope, CSRF-backed session authentication.
- Existing provider dashboard, opportunities, quotations and commitments screens. They were extended, not rebuilt.

## 3. New database models and fields

New Django app: `hiddenstage-backend/apps/network/`.

### `NetworkInvitation`

- `manager`, `worker` foreign keys.
- `message`.
- `status`: `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `EXPIRED`.
- `expires_at`, `responded_at`, timestamps.
- Constraints: manager ≠ worker; valid status; one `PENDING` invitation per manager/worker pair.
- Indexes on manager/status and worker/status.

### `NetworkAssociation`

- `manager`, `worker` foreign keys.
- `status`: `ACTIVE`, `ENDED`.
- `associated_at`, `ended_at`, `ended_by`, `ended_reason`.
- Constraints: manager ≠ worker; valid status; one `ACTIVE` association per manager/worker pair; active rows have no end date.
- Indexes on manager/status and worker/status.
- Rows are retained when a relationship ends, preserving assignment history.

### `WorkerAssignment`

- `manager`, `worker`, `commitment`, self-referential `replaces`.
- `role`, `task_description`, `instructions`.
- `event_date`, `start_time`, `end_time`, `reporting_time`.
- `location`, `compensation_paise`, `response_deadline`.
- `status`: `DRAFT`, `SENT`, `ACCEPTED`, `DECLINED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REASSIGNED`.
- Response, acceptance, start, completion and cancellation timestamps, plus response/cancellation/completion notes.
- Constraints: manager ≠ worker; end time after start; valid status; non-negative compensation; one replacement per original assignment.
- Indexes on Worker/date/status, Manager/status and commitment/status.

Compensation is stored in integer paise and is **recorded only**. No payment, escrow, wallet, payout or settlement behavior was added.

## 4. Migrations

- `apps/network/migrations/0001_initial.py`
- Applied locally against PostgreSQL: `network.0001_initial OK`.
- `python manage.py makemigrations --check --dry-run` reports `No changes detected`.
- No existing table was dropped, renamed or reset. No existing user, provider or event record was deleted.
- `apps.network` added to `INSTALLED_APPS`; network URLs included under the existing `/api/v1/` namespace.

## 5. API endpoints

All endpoints require an authenticated provider and use the existing API error format.

### Worker discovery

- `GET /api/v1/network/workers/` — list completed Workers; filters `category`, `city`, `pin_code`, `locality`.
- `GET /api/v1/network/workers/<user_id>/` — Worker public summary with relationship status.

### Network invitations

- `GET /api/v1/network/invitations/` — Manager's sent or Worker's received invitations; optional `status`.
- `POST /api/v1/network/invitations/` — Manager sends invitation (`worker_id`, optional `message`).
- `POST /api/v1/network/invitations/<id>/accept/` — addressed Worker accepts.
- `POST /api/v1/network/invitations/<id>/decline/` — addressed Worker declines.
- `POST /api/v1/network/invitations/<id>/cancel/` — sending Manager cancels a pending invitation.

### Associations

- `GET /api/v1/network/associations/` — active associations for the signed-in Manager or Worker.
- `GET /api/v1/network/associations/?history=1` — active and ended associations.
- `POST /api/v1/network/associations/<id>/end/` — Manager removes or Worker leaves; optional `reason`.
- Association responses expose only the counterpart profile appropriate to the viewer, plus active/completed assignment counts for that relationship.

### Assignments

- `GET /api/v1/assignments/` — assignments scoped to the signed-in Manager or Worker; optional `commitment`, `status`.
- `POST /api/v1/assignments/` — Manager creates and sends an assignment.
- `GET /api/v1/assignments/<id>/` — assignment detail for its Manager or Worker only.
- `POST /api/v1/assignments/<id>/accept/` — addressed Worker accepts.
- `POST /api/v1/assignments/<id>/decline/` — addressed Worker declines with optional reason.
- `POST /api/v1/assignments/<id>/start/` — assigned Worker starts accepted work.
- `POST /api/v1/assignments/<id>/complete/` — assigned Worker submits completion notes.
- `POST /api/v1/assignments/<id>/cancel/` — Manager cancels with optional reason.
- `GET /api/v1/assignments/availability/` — Manager checks `worker_id`, `event_date`, `start_time`, `end_time`; returns privacy-safe `available`/`conflict` booleans.

## 6. Frontend routes and screens

New routes under the existing provider workspace:

- `/app/provider/network` — **My Network**. Manager view: active Workers, pending invitations, previous associations, remove/assign actions. Worker view: pending Manager invitations, active Managers, previous associations, leave action.
- `/app/provider/network/discover` — **Discover Workers**, Manager-only. Category/city/PIN/locality filters, Worker cards and invite modal.
- `/app/provider/assignments` — **Assignments**. Manager assignment form, commitment selector, Worker selector, availability feedback, assignment list and cancel/reassign actions. Worker assignment invitations, active work, history and accept/decline/start/complete actions.
- `/app/provider/assignments/:assignmentId` — **Assignment detail**, role-aware actions and contact disclosure.

Supporting integration:

- Provider navigation adds **My network** and **Assignments**.
- Provider dashboard adds a real-data network panel: active Workers/Managers, pending network invitations, assignment invitations and upcoming assignments.
- Provider commitments page adds **Manage team** and **Assign Workers** links for active Manager commitments.
- Route names are registered in `routePaths.ts`; pages are lazy-loaded through the existing router.

Design uses the existing Burgundy/Gold/Walnut/Cream/Indigo palette, typography, spacing, cards and controls. New CSS is limited to network and assignment layout in `src/features/network/network.css` plus the dashboard panel styles in `provider.css`.

## 7. Permission rules

Enforced in backend services/views, not only hidden in the UI:

1. Only Manager profiles can discover Workers or send invitations.
2. Only the addressed Worker can accept or decline a network invitation.
3. Only the sending Manager can cancel their own pending invitation.
4. Only a Manager can create an assignment, and only against an active `Commitment` where that Manager is the provider.
5. Only Workers with an `ACTIVE` association with that Manager can be assigned.
6. Only the assigned Worker can accept, decline, start or complete their own assignment.
7. Only the assignment's Manager or Worker can retrieve its detail.
8. Managers see only their own sent invitations, associations and assignments; Workers see only their own received invitations, associations and assignments.
9. Customers cannot list or act on assignments, network invitations or associations.
10. Exact location and contact details are only returned to the assigned Worker/Manager; counterpart contact is withheld until the assignment is accepted (retained for completed work).
11. Ending a network relationship does not cancel or delete assignments.
12. A Worker's independent customer quotations and commitments are separate records and are unaffected by network removal.
13. Invitation acceptance, assignment transitions and association changes validate ownership again on the backend.

## 8. Assignment state transitions

| From | Action | To | Actor |
|---|---|---|---|
| — | Create with `send=true` | `SENT` | Manager |
| — | Create with `send=false` | `DRAFT` | Manager |
| `SENT` | Accept | `ACCEPTED` | Addressed Worker |
| `SENT` | Decline | `DECLINED` | Addressed Worker |
| `ACCEPTED` | Start | `IN_PROGRESS` | Assigned Worker |
| `IN_PROGRESS` | Complete with notes | `COMPLETED` | Assigned Worker |
| `DRAFT`, `SENT`, `ACCEPTED`, `IN_PROGRESS` | Cancel with reason | `CANCELLED` | Assignment Manager |
| `DECLINED`, `CANCELLED` | Create replacement with `replaces_id` | Original `REASSIGNED`; replacement `SENT` | Manager |

Invalid transitions return conflict errors; the frontend cannot set status directly. Reassignment is limited to the same Manager and same commitment.

## 9. Availability logic

- Availability is calculated across **all** of a Worker's assignments, regardless of Manager.
- Blocking statuses are `ACCEPTED` and `IN_PROGRESS`.
- `SENT` does not block a calendar, because an unanswered invitation is not a commitment.
- `DECLINED`, `CANCELLED`, `REASSIGNED` and `COMPLETED` assignments do not block future dates.
- Two assignments conflict when they are on the same date and their time ranges overlap (`start < other.end` and `end > other.start`).
- A Manager receives only `available` / `conflict` plus the proposed date and times. No other Manager's event, customer, venue or worker details are returned.
- On acceptance, the backend locks the Worker `User` row inside a transaction, then rechecks conflicts before transitioning to `ACCEPTED`. Two simultaneous acceptances therefore cannot both create an overlapping commitment.
- If a conflict exists at acceptance time, the Worker receives a 409 conflict response and the assignment stays `SENT`.
- Availability uses event date plus start/end times only. It does not calculate travel time, setup/teardown buffers, multi-day spans or recurring schedules.

## 10. Notification behavior

- No notification backend exists in this repository (no email/SMS/push/in-app notification records or delivery workers).
- The existing header notification control remains explicitly disabled: “Notifications are not part of this release.”
- No fake notification success is displayed.
- Network and assignment state is visible through database-backed dashboard counts, lists and status badges.
- Pending actions are discoverable by visiting **My network** or **Assignments**; there is no background alert delivery.

## 11. Tests performed and actual results

### Backend

Command:

```text
python manage.py test
```

Result: **73 tests passed**, 0 failures/errors, 42.4 seconds. Includes 21 new `apps.network` tests covering:

- Accepting a network invitation creates an association.
- Declining creates no association and keeps history.
- Duplicate pending invitations are rejected.
- Managers cannot invite Managers.
- A Worker can associate with two Managers.
- A Worker cannot answer another Worker's invitation.
- Ending an association retains the row.
- Expired pending invitations are marked expired when listed.
- Assignment sent and accepted.
- Unassociated Workers cannot be assigned.
- A Manager cannot assign another Manager's commitment.
- Declined assignments can be reassigned without losing history.
- Pending assignments do not block, accepted assignments do.
- Overlapping assignments cannot be accepted.
- Cancelled assignments do not block and history remains.
- Start and complete lifecycle.
- Ending a network connection does not cancel an accepted assignment.
- Assignment detail privacy.
- Workers cannot accept another Worker's assignment.
- Customers cannot list assignments.
- Manager assignment lists are scoped to their own assignments.

### Frontend

- `npx tsc -b` — passed, no output.
- `npm run lint` — **0 errors, 6 advisory warnings** (the same baseline React compiler/effect advisories as the previous milestone).
- `npm test` — **18 tests passed** in 5 files.
- `npm run build` — passed; `NetworkPages` bundle produced at 33.36 kB (7.72 kB gzip).
- `npm run test:e2e` — **7 Playwright tests passed**.

No new component-level tests were added for the network screens; the new behavior is covered by backend tests and the live end-to-end verification below.

### Live PostgreSQL end-to-end verification

Using the running Django server and Vite app:

1. Manager **Ivory Lens Photography** discovered Worker **Nisha Rao Photography** and sent a network invitation with a message.
2. Nisha saw the invitation, Manager profile and message, and accepted. The active association appeared in both workspaces.
3. Manager **Marigold Kitchen** invited the same Nisha. Nisha accepted. Both Managers had their own active association with the same Worker; neither workspace exposed the other Manager's private network rows.
4. Ivory assigned Nisha as **Lead Photographer** to the active **Asha & Ravi wedding** commitment, 14:00–22:00, with recorded ₹45,000 fee, venue and instructions. Nisha accepted.
5. Marigold created an **Event Assistant** assignment for the same Worker on the same date, 15:00–19:00. The Manager's pre-send check showed a potential conflict. Nisha's acceptance attempt failed with: “This assignment overlaps another accepted assignment.” The conflicting assignment stayed pending.
6. Nisha declined the Marigold assignment with the reason “Already committed to another event at this time.” Marigold saw the declined row, note and **Reassign** action.
7. Marigold reassigned the role to a second Worker, **Arjun Mehta Films**. The original row became **Reassigned**; the replacement was sent. Arjun accepted, started and completed it with completion notes. Arjun's completed assignment was visible in history.
8. Marigold removed Arjun from the active network with a reason. The association moved to **Previous associations** with the reason retained. Arjun's completed assignment remained in the database and history. No independent Worker records were deleted.
9. Regression: Nisha's dashboard and commitments page still showed the independent customer commitment **Independent worker test**, ₹55,000, status `ACTIVE`. The independent Worker journey records remained intact.

### Mobile 390 px checks

Measured horizontal overflow (`document.documentElement.scrollWidth - clientWidth`) as `0` on:

- Manager My Network
- Manager Worker Discovery
- Manager Assignments (form and list)
- Manager Assignment detail
- Worker My Network
- Worker Assignments

Screenshots:

- `docs/screenshots/manager-network-390.png`
- `docs/screenshots/manager-worker-assignments-390.png`

The existing workspace mobile navigation remains a drawer; these screens do not add horizontal scrolling.

## 12. Known limitations

- Worker discovery has no profile image field in the existing data model; cards use initials avatars.
- There is no experience, skills, rating, review count, portfolio, availability calendar or tier data. None was invented.
- Favorites and “Block / Do Not Rehire” are not implemented. `DECISION_LOG.md` and the existing model have no approved policy for them.
- The public Worker detail endpoint exists, but discovery presents the public information inline rather than on a separate profile route.
- Managers can assign Workers only from an active association; there is no approved exception workflow.
- Required professional roles are not a separate event schema. Team readiness is shown per assignment status, not from a pre-defined required-role list.
- Response deadline is supported by the API but is not exposed in the current Manager assignment form.
- Compensation is a recorded amount only. No invoice, payment, escrow, wallet, commission or settlement exists.
- Assignment completion is recorded, but there is no separate Manager approval/review step, customer confirmation, or check-in.
- Availability has no travel buffer, setup/teardown buffer, multi-day handling or timezone conversion; all times are the existing application's local event times.
- Pending assignment invitations do not reserve a Worker's calendar. This is intentional: only accepted/in-progress work blocks availability.
- No messaging or “Ask a question” action exists. Contact details are revealed only through the existing assignment disclosure rules.
- Notifications are absent. Managers and Workers discover new items by opening their workspace.
- Customers cannot see Manager staffing or Worker compensation. This is intentional.
- The job board, applications, shortlisting, fixed-fee gigs, execution plans, reviews and reliability scoring remain out of scope for this milestone.

## 13. Deferred decisions

1. Worker portfolio, experience, skills, ratings and availability-calendar schema.
2. Favorites and do-not-rehire policy, including whether a removed Worker can be re-invited immediately.
3. Travel-time and buffer policy for conflict detection.
4. Whether assignment compensation is purely informational or will feed a future settlement/payout design.
5. Notification and messaging infrastructure.
6. Manager business accounts with multiple staff users.
7. Required-role staffing model per event and a true “unfilled role” calculation.
8. Whether Manager assignment completion requires explicit Manager review before final status.

## 14. Remaining work for the next milestone

- Public Manager job board and Worker applications/shortlisting, **only after approval**.
- Execution planning, check-in and completion confirmation.
- Manager review of Worker completion and customer-visible completion state.
- Messaging/questions tied to invitations, quotations and assignments.
- Real notification delivery if approved.
- Reviews, reliability and portfolio features after completion data exists.
- Travel/buffer-aware availability if the business approves those rules.
- Payments, escrow, settlement and payouts only under a separately approved financial model.

## 15. Files changed for this milestone

Backend:

- `apps/network/models.py`
- `apps/network/serializers.py`
- `apps/network/services.py`
- `apps/network/views.py`
- `apps/network/urls.py`
- `apps/network/apps.py`
- `apps/network/migrations/0001_initial.py`
- `apps/network/tests.py`
- `config/settings.py`
- `config/urls.py`

Frontend:

- `src/shared/api/backend/network.ts`
- `src/shared/api/backend/types.ts`
- `src/features/network/NetworkPages.tsx`
- `src/features/network/network.css`
- `src/app/routes/routePaths.ts`
- `src/app/router/router.tsx`
- `src/layouts/workspaceConfig.ts`
- `src/features/provider/ProviderPages.tsx`
- `src/features/provider/provider.css`

Documentation:

- `docs/MILESTONE_3_IMPLEMENTATION_PLAN.md`
- `docs/MILESTONE_3_COMPLETION_REPORT.md`
- `docs/WORKFLOW_GAP_ANALYSIS.md` (updated)
