# HiddenStage Workflow Gap Analysis

**Updated:** 2026-11-10  
**Scope:** Existing application versus the three-sided marketplace model (Customer, Manager, independent Worker).  
**Basis:** Inspected routes, API clients, Django models/serializers/services/views and migrations, then exercised the live PostgreSQL-backed application. A screen alone was not treated as complete.

## Status at a glance

The existing product is a working two-sided marketplace: customer event requests, provider matching, invitations, quotations, acceptance and commitments. It was preserved.

The central model correction is now implemented: a professional can be a **Manager** or an **independent Worker**, and a Worker can see matched public requests and quote them **without a customer invitation**. Managers, Workers and Customers are still one `PROVIDER`/`CUSTOMER` account enum at the account layer; Manager/Worker is a provider-profile identity. This avoids breaking existing accounts but is not literally three account roles, so it remains a decision item below.

Priority 2 (Worker independence) is functionally implemented. Priority 3 is partially implemented: the non-exclusive Manager–Worker network, assignments, availability checks and reassignment history now work end to end. The public job board, applications and shortlisting remain unimplemented.

## Feature matrix

| Feature | Current implementation | Required change | Priority |
|---|---|---|---|
| Public website (home, categories, provider directory) | React public pages exist. Directory and category examples are explicitly fictional demo data; the public provider detail route reads the demo catalogue, not the API. | Replace demo directory with real public Manager/Worker profiles when the public-directory scope is approved. Keep the demo labels until then. | P2/P4 |
| Customer authentication | Real Django session auth, email verification, password reset, CSRF. Working. | None for current scope. | — |
| Provider authentication | Same account system for all professionals. `UserRole` remains `CUSTOMER`/`PROVIDER`. | Decide whether account roles must split into `CUSTOMER`/`MANAGER`/`WORKER`. Current profile-level `ProviderKind` avoids a destructive account migration. | Decision |
| Manager / Worker identity | `ProviderProfile.kind` (`MANAGER`/`INDIVIDUAL_SERVICE_PROVIDER`/`ASSOCIATED_SERVICE_PROVIDER`/`TALENT`/`WORKER`) formalized with Neon schema synchronization. Selectable in onboarding and profile; shown in discovery and profile status. Individual service providers strictly restricted to 1 primary category. | Complete. | P2 |
| Customer dashboard | Real API: requests, quotes, commitments, profile. Customer private event gallery and bio/avatar settings added. | Add event preparations and completion confirmation when execution exists. | P4 |
| Customer event creation/editing | Complete multi-service wizard with multi-day support (1-day, 2-day, 3-day, 7-day chips, overnight detection), custom service categories ("Other" with manual review status), and attachment upload/preview/download. | Add direct-profile request origin (`Workflow A`) and provider pinning. | P2 |
| Multi-service requirements | Complete: each requirement has category, description, budget, instructions, matching, quotation lines, custom service fields (`custom_service_name`, `custom_service_description`, `custom_review_status`), and commitment state. | Add per-requirement attachments and independent acceptance audit where required. | P3 |
| Provider matching | Complete for signed-in customers. Explicit category + exact PIN or city/state coverage; no inferred coverage. Returns Manager and Worker profiles. | Add availability and sub-service filters when those fields exist. Do not add inferred ranking. | P3 |
| Public opportunity feed | **Implemented:** `GET /api/v1/provider/opportunities/` returns submitted, future requests whose open requirements match declared services and explicit coverage. Hides customer identity, phone, PIN, venue name and address. Shows invitation state, quotation state and matched requirements. | Add decline/snooze and question-asking once messaging exists. | P2 |
| Invitations | Complete: customer creates per-event or per-requirement invitation; provider accepts/declines; expiry and duplicate guards. | Keep as a direct nudge. Revisit whether invitation acceptance should remain mandatory after a provider is committed elsewhere. | — |
| Quotations | Complete lifecycle: draft, submit, revise, withdraw, immutable submitted revisions, expiry, totals. | Add structured inclusions/exclusions/additional charges/terms fields (currently expressed in notes and line descriptions). | P3 |
| Independent Worker quotations | **Implemented:** a matched, completed provider can start a quotation without an invitation. Item lines are restricted to services declared on the provider profile. Accepted-invitation path preserved. | Approve the provider-of-record rule for independent commitments and expose it explicitly. | Decision |
| Customer quotation comparison | Complete: all quotations for the event, per-line comparison, totals, validity, contact reveal, supplier selection. Managers and Workers appear in the same comparison. | Add structured inclusions/exclusions comparison and availability conflict warnings. | P3 |
| Commitments | Complete: one acceptance per open requirement line, active/released states, audit entries, release reason, immutable quoted history. | Add explicit provider-of-record and Manager-led vs independent engagement type. | P4 |
| Manager–Worker network | **Implemented (Milestone 3).** Non-exclusive invitations, Worker accept/decline, active associations, Manager/Worker network screens, removal/leave and retained history. Backend constraints prevent duplicate active invitations/associations. | Add favorites and do-not-rehire only after an approved policy. Add portfolio/experience fields when a schema is approved. | P3 |
| Direct assignments | **Implemented (Milestone 3).** Manager assigns an active-network Worker to an active accepted commitment; Worker accepts/declines/starts/completes; Manager cancels/reassigns; original history is preserved. | Add required-role planning, Manager completion review and customer-visible execution states in a later execution milestone. | P3 |
| Job board | **Missing.** No job post, application, shortlist, selection or fixed-fee assignment model. | Add job posts, applications, manager review states and assignment creation. Fixed posted fee; no worker counter-quotes. | P3 |
| Worker dashboard sections | Overview, opportunities, invitations, quotations, commitments, profile, services and coverage exist. **Milestone 3 adds My Network, network invitations, Assignment invitations and My Assignments.** Portfolio, ratings, reliability, earnings, job board and applications remain absent. | Add portfolio/ratings only after approved data exists; keep the existing workspace shell. | P3/P5 |
| Manager business profile / services / coverage | Complete through the provider profile, services and coverage screens. | Add business identity/team representation if Manager accounts become multi-user businesses. | P3 |
| Manager CRM | **Missing.** | Add customer/event history derived from commitments; no fabricated contacts. | P4 |
| Event execution plans | **Missing.** No plan, role, task, check-in or progress models. | Add Manager execution plan and Worker task/check-in flow; independent Worker completion flow separately. | P4 |
| Completion confirmation | **Missing.** Acceptance is not completion. | Add customer confirmation and audit; keep payment separate. | P4 |
| Reviews and ratings | **Missing.** No review model, moderation or aggregate. | Add only after completion exists; no seeded or invented metrics. | P5 |
| Reliability score | **Missing.** | Define auditable inputs before implementing; do not invent a score. | Decision |
| Messaging / questions | **Missing as an in-platform feature.** Existing UI reveals supplier contact after a quote is prepared; it states no chat exists. | Add authenticated threads tied to event/invitation/quotation, or keep contact reveal as the approved scope. | Decision |
| Notifications | UI affordance only; no notification backend. Network/assignment events are visible in the workspace but are not delivered by email, SMS, push or in-app alerts. | Add event-driven notifications after messaging/notification infrastructure is approved. | P3 |
| Payments, settlements, payouts | **Not implemented, correctly.** Acceptance is explicitly not payment. All money is integer paise. | Do not add gateways, escrow, wallets, commission or payouts without formal approval. Design separate customer payment / manager settlement / worker payout records first. | Blocked |
| Business and administration workspaces | Routes are reserved and redirect to `/403`; no backend. | Implement only with an approved admin/business scope. | Blocked |
| Permissions and audit | Role gates plus object ownership checks on events, invitations, quotations, commitments, attachments, network invitations, associations and assignments. Commitment decisions are audited. Assignment transitions record status timestamps and reasons. | Add dedicated append-only audit entries if a formal audit log is required; add application permissions with the job board. | P4 |
| Availability / overlap detection | **Implemented (Milestone 3).** Availability is checked across every Manager's accepted/in-progress assignments. Acceptance locks the Worker row and rechecks inside a transaction; conflicting acceptance returns 409. No other Manager's event data is exposed. | Approve and add travel/setup buffers or multi-day rules if required. | P3 |

## Changes delivered in Milestone 2

- `ProviderProfile.kind` (Manager or independent Worker) with a data-preserving migration. Existing providers become Managers by default.
- Provider kind is returned by discovery, customer-facing provider detail and the own-profile API, and is editable in onboarding and profile settings.
- New provider opportunity feed with strict privacy: no customer name/contact, no PIN code, no venue name/address.
- Independent quotation creation for matched providers; category-scope enforcement on quotation lines.
- New provider Opportunities screen and navigation; quote editor accepts an opportunity brief as well as an invitation brief.
- Customer matching cards label Manager versus Independent worker.
- Tests: opportunity visibility/privacy, matched vs unmatched direct quotations, Worker kind exposure, plus the existing lifecycle suite.

## Changes delivered in Milestone 3

- New `apps.network` app with `NetworkInvitation`, `NetworkAssociation` and `WorkerAssignment`, including uniqueness, status and time constraints and indexes.
- Manager-only Worker discovery with category, city, PIN code and locality filters; no invented experience, skills, ratings or availability data.
- Non-exclusive network invitations and associations. A Worker can belong to multiple Managers; ending a relationship retains the row and assignment history.
- Manager assignment creation against an active accepted commitment, limited to active-network Workers.
- Worker assignment invitations, accept/decline/start/complete, and Manager cancel/reassign with original history retained.
- Cross-Manager availability checks with transactional recheck at acceptance and privacy-safe conflict responses.
- Manager and Worker **My Network** screens, **Discover Workers**, **Assignments**, **Assignment detail**, navigation entries and real-data dashboard metrics.
- Manager commitment cards link to team assignment; assignment detail exposes contact only under the existing disclosure rule.
- Network/assignment permissions enforced on the backend: ownership, role, active-association and commitment checks. Customers cannot access private staffing data.
- Tests: 21 network/assignment backend tests. Full backend suite now 73 tests; frontend 18 unit tests, 7 Playwright tests, TypeScript and production build passing.
- Live verification: invite → accept → assign → Worker accept; two Managers associated with one Worker; overlapping assignment rejected at acceptance; decline → reassign → replacement accepted/started/completed; association removal retained history; independent Worker commitment remained active.

## Changes delivered in Milestone 4 (Functional Upgrade & Professional Architecture)

- **Logo Authentication Preservation:** Logo click in `PublicLayout` and `WorkspaceLayout` navigates authenticated users directly to their workspace without destroying sessions.
- **Multi-day Event Request Dates:** Multi-day duration chips (1, 2, 3, 7 days), overnight detection (`endTime <= startTime`), and validation ensuring end date never precedes start date.
- **Attachment Download & Preview:** Authenticated and authorized file downloads (`EventAttachmentDownloadView`) for event owners, quoting/committed providers, and staff; 403 Forbidden for unauthenticated/unauthorized users.
- **Custom Service Categories:** Support for selecting "Other", collecting custom title/description, tagging with `custom_review_status='PENDING'`, and excluding custom requirements from automated provider matching.
- **Five Professional Participation Roles:** Formalized `MANAGER`, `INDIVIDUAL_SERVICE_PROVIDER`, `ASSOCIATED_SERVICE_PROVIDER`, `TALENT`, and `WORKER` across database models, serializers, onboarding, and profiles.
- **Strict 1-Category Rule:** Enforced strictly for `INDIVIDUAL_SERVICE_PROVIDER` on both frontend (single radio selection) and backend DRF serializers.
- **Portfolio Management:** `PortfolioItem` model and CRUD APIs (`/api/v1/profiles/portfolio/`) for professional showcase items and customer private event gallery.
- **Manager Assistant Delegation:** `ProfileTeamMember` model and permissions API (`/api/v1/profiles/team/`) for assistant delegation.
- **Manager Search & Association Requests:** `/api/v1/profiles/managers/search/` and `/api/v1/network/request-association/` for Associated Service Providers.

## Remaining work, in dependency order

1. **Job board** with fixed-fee posts, applications, shortlisting and selection.
2. **Execution and completion** for Manager-led and independent engagements, with customer confirmation and optional Manager review of Worker completion.
3. **Reviews/reliability** only after completion data exists.
4. **Messaging/notifications** once the communication scope is approved.
5. **Payments** only after the payment model is formally approved.
6. **Real public provider profiles** to replace the clearly labelled demo directory.
7. **Worker portfolio/experience** fields and any approved favorite/do-not-rehire policy.

## Decisions requiring approval

1. **Account-role model.** Keep `CUSTOMER`/`PROVIDER` plus profile `kind`, or migrate to three account roles? A literal split affects every existing provider account and session/onboarding path.
2. **Workflow A — direct profile request.** Can a Worker selected directly on a public profile quote that request, and is the Worker pinned as recipient in the same way as a Manager? Existing approved behavior does not resolve this.
3. **Provider of record.** Confirm that an independently accepted Worker quotation makes the Worker the provider of record, while a Manager remains accountable for Manager-led accepted scope.
4. **Invitation gate.** This milestone allows matched providers to quote without accepting an invitation. Confirm this replaces the previous invitation-only rule for public requests while invitations remain available as direct outreach.
5. **Decline and messaging.** The API has no customer decline endpoint and no chat; confirm whether leaving a quote unselected and revealing contact details remain the approved behavior.
6. **Public directory.** Confirm when the fictional public catalogue should be replaced by real profiles, and whether unverified profiles may be publicly listed.
7. **Availability policy.** Milestone 3 enforces time-range overlap across all Managers. Travel time, setup/teardown buffers, multi-day events and timezone rules still need approval before they are added.
8. **Reliability score inputs.** Approve measurable, auditable inputs; do not infer scores from marketplace activity.

## Verification performed

- Django checks clean; no missing migrations.
- **73 backend tests pass** across matching, quotations, invitations, events, commitments, accounts and the new network app (21 network tests).
- Milestone 2 live PostgreSQL journey remains intact: Worker registration and verification → Worker onboarding (`WORKER`, photography, Indiranagar 560038) → matched opportunity without an invitation → direct quotation submission → customer comparison → acceptance → commitment visible in the customer ledger.
- Milestone 3 live journey: Manager discovery → network invitation → Worker accept → Manager assignment from an active accepted commitment → Worker accept → cross-Manager overlapping assignment rejected → Worker decline with reason → Manager reassign to another Worker → replacement accept/start/complete → association removal with history retained.
- Regression check: the independent Worker's active ₹55,000 customer commitment remained visible and unchanged after network and assignment activity.
- Frontend: TypeScript clean, lint 0 errors (6 advisory warnings), 18 unit tests passing, production build passing, 7 Playwright tests passing.
- Mobile viewport (390 px): Manager My Network, Worker Discovery, Manager Assignments, Assignment detail, Worker My Network and Worker Assignments report zero horizontal overflow.

## Verification screenshots

- [`screenshots/worker-opportunities.png`](./screenshots/worker-opportunities.png) — matched opportunity feed with no customer contact data.
- [`screenshots/worker-independent-quote.png`](./screenshots/worker-independent-quote.png) — submitted quotation created without an invitation.
- [`screenshots/customer-accepts-independent-worker.png`](./screenshots/customer-accepts-independent-worker.png) — customer comparison and commitment for the independent Worker.
- [`screenshots/manager-network-390.png`](./screenshots/manager-network-390.png) — Manager network at 390 px, including active Workers and retained past association.
- [`screenshots/manager-worker-assignments-390.png`](./screenshots/manager-worker-assignments-390.png) — Worker assignment history at 390 px.
