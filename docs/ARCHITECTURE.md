# HiddenStage --- System Architecture

**Document:** `architecture.md`\
**Purpose:** Architecture reference for an AI coding/review agent\
**Status:** Target architecture constrained by the current
implementation; verify all paths and components in source before
changing them

------------------------------------------------------------------------

## 1. Architecture goals

1.  Support a multi-sided event marketplace with customer, professional
    and admin workspaces.
2.  Keep customer event requests, quotations, commitments and execution
    records consistent and auditable.
3.  Enforce role, ownership, service-scope, association and privacy
    rules on the backend.
4.  Support both Manager-led delivery and independent
    professional/Worker participation.
5.  Keep frontend and backend independently deployable.
6.  Use Neon PostgreSQL as the shared cloud relational database.
7.  Preserve existing code and evolve incrementally; avoid parallel
    duplicate domain models.

## 2. Deployment topology

``` text
Browser / Mobile Web
        |
        v
React + TypeScript + Vite SPA
        |
        | HTTPS JSON API + session/CSRF credentials
        v
Django + Django REST Framework API
        |
        +----------------------+
        |                      |
        v                      v
Neon PostgreSQL          Durable private media storage
(shared cloud DB)        (provider to be confirmed)
        |
        +---- optional Redis/cache/worker services
              only where already configured/required
```

-   **Frontend:** Vercel. Build output is Vite `dist`; SPA deep links
    must rewrite to the app entry point.
-   **Backend:** separately hosted Django/DRF service. Vercel does not
    host the Django application.
-   **Database:** Neon PostgreSQL. Use environment-based connection
    configuration and TLS as required by Neon.
-   **Media:** event attachments and portfolio media must use durable
    storage with private/public access rules. Do not assume Neon is an
    object store.
-   **Email:** provider integration remains configured but verification
    can be disabled through `EMAIL_VERIFICATION_REQUIRED=0` for the
    current launch stage. Re-enable with configuration, not a schema
    rewrite.

## 3. Repository boundaries

Maintain separate repositories/directories: - `hiddenstage-frontend/` -
`hiddenstage-backend/`

Do not move backend code into the frontend repository or introduce a
Node backend. Frontend owns presentation, client state and API adapters.
Backend owns business rules, persistence, authorization and lifecycle
transitions.

Suggested frontend organization (adapt to actual structure; do not force
a rewrite):

``` text
hiddenstage-frontend/
  src/
    app/
      router/
      providers/
      guards/
    components/
      ui/
      layout/
      feedback/
      forms/
    features/
      public/
      auth/
      onboarding/
      customer/
      manager/
      individual-provider/
      associate-provider/
      talent/
      worker/
      admin/
      profile/
      portfolio/
      events/
      quotations/
      commitments/
      network/
      assignments/
      messaging/
      notifications/
    services/
      api/
      auth/
      events/
      providers/
      quotations/
      commitments/
    hooks/
    types/
    styles/
    test/
  public/
  docs/
```

This is a logical organization, not an instruction to move existing
files. Reuse existing feature boundaries and routes where they are
sound.

Suggested backend organization (adapt to actual Django apps):

``` text
hiddenstage-backend/
  config/
    settings/
    urls.py
  apps/
    accounts/
    profiles/
    marketplace/
    events/
    quotations/
    commitments/
    network/
    assignments/
    availability/
    media/
    messaging/
    notifications/
    payments/       # only when approved
    reviews/        # only when approved
    disputes/       # only when approved
    admin_ops/
  common/
  tests/
  docs/
```

Do not create duplicate apps/models if equivalent domains already exist.

## 4. Domain boundaries and source of truth

  -----------------------------------------------------------------------------
  Domain                    Owns                        Must not own
  ------------------------- --------------------------- -----------------------
  Accounts                  identity, login/session,    event business
                            account state, verification lifecycle
                            policy                      

  Profiles                  professional type, public   quote
                            profile, declared services, acceptance/payment
                            coverage, portfolio         
                            metadata, representatives   

  Events                    customer event request,     provider pricing
                            locations, requirement      decisions
                            lines, private attachment   
                            relations                   

  Matching                  service/coverage matching,  commitment creation
                            opportunity visibility,     
                            invitation eligibility      

  Quotations                quote, quote lines,         event ownership
                            versions/revisions, terms   

  Commitments               accepted scope, provider,   transient UI state
                            status, release history     

  Network                   Manager--Worker/Associate   employment/legal
                            connection requests and     classification unless
                            relationships               separately specified

  Assignments               work allocation/gigs,       customer quotation
                            assignees, lifecycle        acceptance

  Availability              limited availability query  exposing private
                            and any approved            calendars
                            reservations/overlap rules  

  Media                     upload metadata, access     public profile
                            checks, signed/private      permissions
                            delivery                    

  Messaging/notifications   conversations and delivery  bypassing domain
                            records                     authorization

  Payments                  payment intents,            ad hoc status flags
                            ledger/settlement/payout    
                            rules only after approval   

  Reviews                   transaction-linked reviews  fabricated reputation
                            and moderation only after   
                            approval                    

  Admin operations          moderation/review/audit     unrestricted bypass of
                            actions                     audit trail
  -----------------------------------------------------------------------------

Existing app names may differ. Map this table to the real codebase.

## 5. Core domain entities (conceptual)

These are conceptual responsibilities, not instructions to create every
table. Reuse current models.

### Identity and profiles

-   User / Account
-   CustomerProfile
-   ProviderProfile with professional kind: MANAGER, INDIVIDUAL,
    ASSOCIATE, TALENT, WORKER
-   ProviderService / declared category
-   ServiceCoverage (PIN, locality, city, state)
-   BusinessRepresentative / team membership
-   PortfolioAlbum / PortfolioMedia / Experience
-   SocialLink (where relevant)

### Event request

-   EventRequest
-   EventLocation
-   EventRequirementLine
-   EventAttachment
-   EventStatusHistory / audit record

### Marketplace

-   Match / Opportunity
-   Invitation
-   Enquiry / clarification
-   Quotation
-   QuotationRevision
-   QuotationLine
-   QuoteAcceptance (or equivalent)
-   Commitment
-   CommitmentRelease / audit history

### Network and execution

-   NetworkRequest
-   ManagerWorkerAssociation / provider association
-   Gig / WorkOpportunity (if approved/currently present)
-   Assignment
-   AssignmentStatusHistory
-   Availability record/query
-   Task / checklist / check-in only if approved and absent from current
    model

### Supporting

-   Conversation / Message
-   Notification
-   Payment / PaymentTransaction / Ledger / Settlement / Payout only
    after financial policy approval
-   Review
-   Dispute
-   AuditLog

## 6. Role and authorization model

### 6.1 Separate identity from professional type

A user account is an identity. A provider profile has a professional
kind. Avoid confusing the account's authentication role with a
provider's business classification. Verify the current schema before
changing it.

### 6.2 Authorization layers

Every sensitive API must enforce: 1. Authenticated user/session. 2.
Account active/eligible state. 3. Correct broad role
(customer/provider/admin). 4. Object ownership or explicit relationship.
5. Professional kind and declared service scope. 6.
Event/quote/commitment/assignment state transition eligibility. 7.
Privacy/access policy for individual fields and media.

Frontend route guards only hide unavailable screens; they do not grant
access.

### 6.3 Key access policies

-   Customer can access only their own event requests and associated
    private attachments.
-   Provider opportunity feed returns minimum necessary details and
    omits customer identity/contact and exact venue details where the
    current privacy policy requires.
-   Provider can quote only eligible requirements and services declared
    on their profile.
-   Manager team/representative access must be scoped to the business
    and permission.
-   Manager--Worker network relationships require explicit
    request/approval state.
-   Worker remains an independent account even when associated with a
    Manager.
-   Latest reported policy: any Manager can query a Worker's limited
    availability; non-Managers are denied. Response must not reveal
    event/customer/assignment details. This policy must be tested and
    documented.
-   Customer/provider contact visibility is restricted to owner/staff or
    a customer with a matching persisted commitment, including released
    commitments, according to the latest implementation report. Verify
    and review retention implications.
-   Admin operations require explicit admin permission and audit events.

## 7. Important transactional invariants

### 7.1 Event creation

-   Event and requirement lines persist consistently.
-   Attachment metadata must be associated with the correct event and
    access policy.
-   Editing must not orphan private media or silently remove records.

### 7.2 Matching

-   Match only declared services and explicit coverage.
-   PIN/locality matching must follow the approved normalization rules.
-   No inferred service or geographic coverage.

### 7.3 Quotation

-   Quote lines must belong to the provider's declared service scope.
-   Duplicate event/provider quote constraints must be enforced by
    database/service logic as appropriate.
-   Revisions preserve history; do not overwrite prior commercial terms
    without trace.

### 7.4 Acceptance and commitments

-   Lock relevant rows/records in a transaction for competing
    acceptances.
-   Exactly one conflicting acceptance wins.
-   Disjoint requirement lines can be accepted independently.
-   Package acceptance is atomic across all lines in that package.
-   Partial acceptance leaves unaccepted lines open.
-   Commitment release is audited; do not delete history.

The existing PostgreSQL concurrency tests are important evidence. Run
them against PostgreSQL/Neon-compatible PostgreSQL, not SQLite alone,
because SQLite does not prove row-locking behavior.

### 7.5 Availability and assignments

-   Do not expose a Worker's private calendar or customer/event details
    in a broad availability response.
-   If assignment overlap prevention is implemented, enforce it
    transactionally on the backend.
-   Do not claim availability is reserved merely because it was queried.
-   Define and test race behavior before treating availability as a
    booking guarantee.

## 8. API architecture

-   Versioned REST API under the existing `/api/v1/` prefix unless the
    current code establishes another canonical prefix.
-   Serializers validate input and shape output; business invariants
    belong in domain/service layer and database constraints where
    appropriate.
-   Use consistent pagination, filtering, error envelope and status
    semantics.
-   Keep endpoint paths and DTOs derived from the actual OpenAPI/schema
    and code. Never invent endpoint paths to make the frontend compile.
-   Frontend API adapters map backend DTOs to UI-facing types. Do not
    let demo local-storage models masquerade as server-persisted data.
-   Document authentication/session/CSRF requirements for each
    deployment origin.

Suggested resource families to verify: - `/api/v1/auth/...` -
`/api/v1/accounts/...` - `/api/v1/profiles/...` - `/api/v1/events/...` -
`/api/v1/provider/opportunities/...` - `/api/v1/quotations/...` -
`/api/v1/commitments/...` - `/api/v1/network/...` -
`/api/v1/assignments/...` - `/api/v1/availability/...` -
`/api/v1/media/...` - `/api/v1/admin/...`

These are domain groupings only. Use actual registered URLs from Django.

## 9. Authentication and cross-origin deployment

-   Session-based authentication and CSRF-backed unsafe requests are
    part of the reported current design. Verify actual settings.
-   Frontend must send credentials when required.
-   Configure allowed origins, trusted CSRF origins, cookie domain,
    Secure, HttpOnly and SameSite settings for the actual
    Vercel/custom-domain topology.
-   Cross-site frontend/backend deployments can break session cookies if
    SameSite/domain settings are inconsistent. Test in a real browser on
    deployed origins.
-   Never put secrets in Vite `VITE_*` variables; those are public
    client values.
-   `VITE_API_BASE_URL` (or the repository's actual variable) must point
    to the deployed API in production. No localhost in production
    bundle.
-   Keep email verification policy server-controlled and exposed to the
    client as a policy value, not inferred from local state.

## 10. Media and attachment architecture

Two classes of media: 1. **Private event attachments:** accessible only
to customer owner, authorized providers/teams after the correct access
grant, and admin roles explicitly permitted. 2. **Public portfolio
media:** intentionally published by the profile owner and accessible
through public profile rules.

Requirements: - Validate file type, size, count and content as
appropriate. - Store durable metadata and storage key; do not store
large file bytes in ordinary relational rows unless specifically
designed. - Use private object storage and short-lived authorized
download URLs or an authenticated streaming endpoint for private
attachments. - Check permission on every download request. - Avoid
exposing raw storage keys or permanent public URLs for private files. -
Support upload progress, error/retry and removal before submission. -
Portfolio uploads must support image/video types that are explicitly
allowed, with thumbnail/preview and moderation controls if required. -
Local filesystem storage is acceptable only for local development, not
ephemeral production hosting.

## 11. Frontend architecture and state

-   React Router (or existing router) owns route mapping and protected
    layout.
-   Query/cache layer (React Query is reported in foundation) handles
    server state and invalidation.
-   Form state is local and validated; backend remains final validator.
-   Auth state must survive public-home navigation. Clicking logo must
    not call logout or clear session.
-   Role-specific navigation should derive from the authenticated
    account and provider kind, not duplicate hard-coded role assumptions
    across components.
-   Keep shared primitives and design tokens centralized.
-   Loading, empty, error, forbidden, stale and success states must be
    explicit.
-   No fake success for contact submission, email, payment, file upload
    or booking.

## 12. Testing strategy

### Backend

-   Unit tests for matching, service scope, profile kinds, quote rules
    and state transitions.
-   API permission tests for every role and object ownership.
-   PostgreSQL integration/concurrency tests for quote acceptance,
    commitments, assignments and any overlap logic.
-   Private attachment authorization/download tests.
-   Migration tests and `makemigrations --check`.
-   Test verification required on/off; off must not falsely mark email
    verified.
-   Test team representative permission boundaries.
-   Test Manager-only limited availability access and response
    minimization.

### Frontend

-   TypeScript, lint, unit tests, production build.
-   Browser tests for public homepage while authenticated, role-specific
    navigation, onboarding, event creation, custom categories, multi-day
    dates, attachments and download, quotations and partial acceptance.
-   Browser tests for each professional onboarding type and dashboard.
-   Responsive tests for mobile and desktop.
-   Verify no logout on logo click and no private data in UI/API
    payloads.

### End-to-end

Use separate seeded accounts for Customer, Manager, Individual,
Associate, Talent, Worker and Admin. Test a complete persisted event
journey and capture API/network evidence. Do not use fictional demo data
as proof of backend functionality.

## 13. Environments and operational safety

-   Local development, test and production must use distinct database
    credentials/URLs.
-   Never run destructive reset/flush commands against Neon production.
-   Before migrations: inspect migration plan, backup/branch strategy,
    row counts and backward compatibility.
-   Use additive migrations where possible; backfill in controlled
    steps; avoid dropping columns/tables in the same release that stops
    using them.
-   Never print `.env` or secrets. Report variable names and presence,
    not values.
-   CI should run backend tests, PostgreSQL concurrency gate, frontend
    typecheck/lint/tests/build and migration drift checks.
-   Log request IDs and domain events without logging passwords, session
    tokens, private attachment URLs or unnecessary personal data.

## 14. Architecture decision register

  -----------------------------------------------------------------------
  Decision                            Current position
  ----------------------------------- -----------------------------------
  Separate frontend/backend           Approved

  Frontend framework                  React + TypeScript + Vite

  Frontend hosting                    Vercel

  Backend framework                   Django + DRF

  Shared database                     Neon PostgreSQL

  Public homepage                     Common across all signed-in roles

  Professional types                  Manager, Individual, Associate,
                                      Talent, Worker

  Worker participation                Associated with Manager and
                                      independent participation both
                                      supported

  Manager representatives             Primary + additional
                                      representatives

  Matching coverage                   PIN + locality/city explicit
                                      coverage

  Partial acceptance                  Accepted lines commit; remaining
                                      lines stay open

  Commitment cancellation             Audited release process

  Event attachments                   Private attachments required in
                                      first release

  Email verification                  Configurable; currently may be
                                      disabled without false verification

  Manager execution                   Hybrid reuse of commitments,
                                      network and assignment workflows

  Worker availability query           Latest reported rule: any Manager
                                      may query limited availability;
                                      non-Managers denied

  Business Workspace                  Deferred

  Admin                               Separate workspace

  Security findings                   Address before further sensitive
                                      expansion
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Agent instructions

-   Inspect actual code before deciding where a domain belongs.
-   Reuse existing models and API endpoints where possible.
-   Do not create duplicate entities or a second competing workflow.
-   Do not change production Neon data, authentication, routes or
    migrations during a read-only audit.
-   For implementation, propose migrations and permission changes before
    applying them.
-   Every architecture claim in an audit report must cite source file,
    symbol, route/endpoint or test.
