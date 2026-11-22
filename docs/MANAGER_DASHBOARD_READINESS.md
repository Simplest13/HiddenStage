# Manager Dashboard Readiness

This is a current-state assessment for Manager functionality. Recommendations below are **proposed**, not implemented or approved for build.

## Existing Manager identity and surface

- A Manager is a normal `User.role=PROVIDER` with `ProviderProfile.kind=MANAGER`.
- Managers enter the shared provider route family; there is no Manager-only top-level dashboard route or route guard.
- The shared provider overview requests opportunities, invitations, quotations, commitments, profile, network, network invitations, and assignments. Network pages change content and actions for `MANAGER` vs `WORKER`.
- Manager service checks exist for Worker discovery/invitations, network listing, and assignment creation. Team membership management is restricted to Managers. General provider profile/quotation functionality is not Manager-specific.

## Business workflow and module dependencies

```text
Completed Manager profile
  -> discover completed Workers
  -> invitation accepted
  -> active Manager–Worker association

Customer event + requirements
  -> provider invitation or matching opportunity
  -> Manager submits quotation revision
  -> customer accepts selected lines/packages
  -> active Commitment (Manager is provider)
  -> Manager creates WorkerAssignment for an associated completed Worker
  -> Worker accepts -> start -> complete
```

Assignments cannot be treated as an independent execution module: `create_assignment` requires (1) an authenticated Manager with `MANAGER` kind, (2) verified email where policy requires it, (3) active commitment owned by that Manager as provider, (4) completed Worker profile, and (5) active association. Assignment schedule is based on the commitment's event date. Availability checks consider the Worker across all Managers; accepted and in-progress assignments block overlaps. A pending assignment does not block the calendar. Rows preserve state/history on reassignment and association end.

## Readiness by capability

| Capability | Current status |
|---|---|
| Manager identity/profile | **Existing:** provider profile kind and onboarding/profile APIs. |
| Worker discovery and non-exclusive associations | **Existing; persistence verified:** discovery, invite/respond, active and ended association models and services. |
| Commitment visibility | **Existing:** provider commitment list and detail; active commitment is the assignment prerequisite. |
| Assignment lifecycle | **Existing; persistence verified:** create, respond, start, complete, cancel/reassign, detail/list, availability checks. Focused tests cover own commitment, association, private detail, and actor ownership. |
| Shared dashboard summary | **Existing:** frontend aggregates multiple APIs; not a Manager-specific execution overview. |
| Generic tasks, milestones, checklists, project plan, and task assignment independent of a WorkerAssignment | **Not found.** |
| Real payments/settlement tied to work completion | **Not verified/not implemented as a live payment flow:** the payment action is marked simulated. |
| Business/organization workspace | **Not available:** route redirects to forbidden; no user-facing business API family is registered. |

## Proposed readiness gates (not implemented)

1. Define Manager-specific landing priorities and differentiate Manager from the other four provider kinds.
2. Treat accepted commitments as the authoritative source for executable work; do not allow assignments from draft/withdrawn/unowned commitments.
3. Decide whether current WorkerAssignment covers the task-management requirement or a separate task entity is required. Avoid duplicating its lifecycle until requirements are agreed.
4. Add contract/integration tests that traverse commitment acceptance → association → assignment → Worker lifecycle and query persisted rows at each state.
5. Define access matrix for Managers, Workers, customers, and staff at every list/detail/action endpoint.
6. Validate date/time zones, race handling and availability against production PostgreSQL before relying on concurrency guarantees.

## Evidence limits

The targeted backend tests passed 71 tests with 3 PostgreSQL-only tests skipped on SQLite. Production database concurrency, real account journeys, live messaging/payment, and infrastructure were not tested. No production state was read or changed.
