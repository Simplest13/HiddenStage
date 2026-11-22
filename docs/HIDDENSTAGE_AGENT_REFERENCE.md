# HiddenStage --- Consolidated Agent Reference

# FILE: spec.md

# HiddenStage --- Product & Functional Specification

**Document:** `spec.md`\
**Purpose:** Single functional source of truth for product-flow
verification and implementation\
**Status:** Consolidated working specification; unresolved decisions are
explicitly marked\
**Product:** HiddenStage --- multi-sided event-services marketplace

------------------------------------------------------------------------

## 1. Product vision

HiddenStage connects people planning events with event professionals and
the people who deliver the work. A customer can describe one event
containing multiple service requirements, receive and compare
quotations, choose providers for some or all requirements, coordinate
delivery, and complete the event. Professionals can participate as a
Manager/business, an independent service provider, an associated service
provider, a Worker/crew member, or Talent.

The platform must support two connected sides:

1.  **Customer marketplace:** event creation, service discovery,
    provider matching, enquiries, quotations, selection, commitments,
    event coordination, payment and post-event feedback.
2.  **Professional operations:** profiles and portfolios, opportunity
    discovery, quotations, Manager--Worker relationships,
    staffing/assignments, availability, execution and
    earnings/settlement views when payment rules are approved.

An Administrator has a separate operational workspace and must not be
treated as another public marketplace role.

## 2. Product principles and non-negotiable constraints

-   Preserve the existing application and its working routes,
    authentication, onboarding, components, design tokens and verified
    workflows. Extend in place; do not regenerate the product from
    scratch.
-   The public homepage is the same for every signed-in role. Clicking
    the HiddenStage logo returns to the public homepage, not the role
    dashboard and not logout.
-   Dashboards and navigation are role-aware. Different professional
    types must not see irrelevant actions or summaries.
-   Backend authorization is authoritative. Frontend route guards are UX
    only and are never a security boundary.
-   Customer event requests support multiple service requirement lines
    and private attachments.
-   Provider matching must respect declared services and explicitly
    declared coverage using PIN code and locality/city matching. Do not
    infer coverage.
-   A Worker can be associated with a Manager/business and can also
    participate independently, receive eligible customer opportunities
    and submit quotations.
-   A Manager may have a primary representative and additional
    representatives. Team permissions must be explicit and auditable.
-   Partial acceptance is supported: accepted lines become commitments
    while remaining lines stay open for further quotations/selection.
-   Commitment cancellation uses an audited release process. Never
    silently delete or erase commitment history.
-   Email verification is temporarily configurable/off for the current
    launch stage. Turning it off must not mark accounts as verified. The
    ability to restore mandatory verification must remain.
-   Frontend: React + TypeScript + Vite; deployment target Vercel.
-   Backend: Django + Django REST Framework; hosted separately from the
    frontend.
-   Shared database: Neon PostgreSQL. Vercel hosts the frontend, not the
    Django application.
-   Current palette is the palette already in use in the repository. Do
    not restore an older palette or hard-code a new one. Inspect the
    actual current design tokens before styling.
-   Business Workspace is deferred. Do not expand its scope into the
    current milestone without explicit approval.
-   Security findings are a priority before adding further sensitive
    workflows.

## 3. User types and professional classification

### 3.1 Customer

A person or organisation planning an event and requesting services.

Core capabilities: - Register/login and maintain a customer profile. -
Explore the common public homepage, categories, active/public events and
professional profiles. - Create, edit and review event requests. - Add
multiple service requirement lines, each with its own description,
budget if applicable, instructions and attachments as allowed. - Receive
matched providers, invitations, enquiries and quotations. - Compare
quotations and revisions. - Accept one or more quote lines; partial
acceptance leaves other lines open. - View commitments, communicate and
coordinate. - Track event execution and completion. - View payment
records and submit reviews when those modules are enabled.

### 3.2 Event Professional account

Professional onboarding first asks how the person works. The selected
type determines the next onboarding steps, profile fields, dashboard
navigation and eligible actions.

The approved options are:

1.  **MANAGER** --- runs a business/team, handles customer requirements
    and quotations, coordinates professionals and manages event
    delivery.
2.  **INDIVIDUAL SERVICE PROVIDER** --- provides one selected service
    independently. The onboarding/profile flow should constrain this
    type to one service unless product rules are deliberately revised.
3.  **ASSOCIATE SERVICE PROVIDER** --- a provider associated with one or
    more Managers/businesses through a network-request/approval
    relationship. The provider chooses the Manager by username and sends
    a network request. Association must not silently transfer ownership
    of the provider account.
4.  **TALENT** --- high-profile or specialist individuals such as
    singers, DJs, anchors, actors, musicians, influencers and similar
    talent. Ask talent category/type and collect relevant
    professional/social/profile details.
5.  **WORKER** --- operational staff, volunteers, security guards,
    bouncers, setup crew, coordinators and other on-ground operators.
    Onboarding asks the work role, skills, service area and relevant
    availability/experience.

**Important participation rule:** Worker is not restricted to
Manager-only opportunities. A Worker can connect to a Manager/business
and can also receive eligible independent customer opportunities and
submit quotations where the request and service rules permit.

### 3.3 Manager/business

A Manager is a professional account/business workspace. It can have: -
Primary representative. - Additional representatives/assistants. -
Declared services and coverage. - Public profile, about section,
experience, portfolio and media album. - Customer enquiries,
invitations, opportunities, quotations and revisions. - Commitments and
execution management. - Manager--Worker/Associate network and staffing
assignments.

Primary and additional representatives are an approved product
requirement. Exact granular permission tiers for representatives must be
confirmed before exposing high-risk actions.

### 3.4 Administrator

Admin is a separate workspace, not a variation of the Manager dashboard.

Expected operational domains include account/provider review, reports,
moderation, disputes, platform configuration and audit visibility. Exact
admin permissions and operational procedures must be taken from the
existing admin implementation/specification; do not invent authority to
alter financial records or impersonate users.

## 4. End-to-end customer journey

### 4.1 Public discovery

1.  Visitor lands on the common HiddenStage homepage.
2.  Visitor can explore service categories, category details, public
    professional profiles, how it works, about/help/contact and other
    public information.
3.  Search/discovery can filter by service, city/locality and PIN code
    where supported.
4.  Demo/fictional content must be clearly identified. Do not display
    fake reviews, provider counts, verification badges or marketplace
    statistics as real.
5.  A visitor selects an action such as creating an event request,
    contacting a professional or registering; authentication is required
    where the action is private.

### 4.2 Customer registration and profile

1.  User chooses Customer account.
2.  Completes registration and logs in.
3.  Completes customer profile/onboarding with contact and location
    information, including PIN/locality/city/state as required.
4.  Email verification is currently optional/disabled by configuration
    for launch. The account must remain unverified if no verification
    occurred.
5.  Customer is directed to the customer workspace after onboarding, but
    the HiddenStage logo always returns to the common public homepage.

### 4.3 Create an event request

The event request is a container for the event and multiple
independently quotable service requirements.

1.  **Basic event details:** event name, event type, description, start
    date/time, end date/time, guest count and other currently approved
    fields.
2.  **Multi-day event:** start and end dates must support different
    calendar days. End date cannot be constrained to the same day as
    start date. Validate end date/time chronologically after start
    date/time.
3.  **Location:** PIN code, locality, city, state, venue name and full
    venue address as specified by the existing contract.
4.  **Service requirements:** add multiple lines. Each line has
    category, title/requirement, detailed description, budget if
    supplied, special instructions and any line-level fields supported
    by the contract.
5.  **Custom category:** provide an "Other" option allowing the customer
    to enter a category/service not present in the predefined list.
    Preserve the submitted custom label; do not silently map it to an
    unrelated category.
6.  **Attachments:** multiple files can be selected, previewed, removed
    and validated. Event attachments are private. Authorized users must
    be able to download them through a secure backend flow. Do not
    expose public storage URLs or rely on ephemeral local filesystem
    storage in production.
7.  **Review:** show all event details, service lines and attachment
    metadata with edit actions.
8.  **Submit:** create the request and show a stable reference/status.
    Do not imply that providers have been contacted or that a booking
    exists unless the backend confirms it.

### 4.4 Matching and provider opportunities

-   Match by declared service capability and explicit PIN/locality/city
    coverage.
-   A provider must not receive a requirement outside their declared
    service scope.
-   Managers may receive/invite suitable professionals and submit
    quotations.
-   Independent providers and eligible Workers may discover matched open
    opportunities and submit quotations without an invitation, as
    already implemented.
-   Opportunity responses must minimize customer personal data. The
    existing design intentionally withholds customer identity, phone,
    PIN, venue name and venue address from the broad matched-opportunity
    feed. Preserve that privacy boundary unless an approved
    relationship/commitment grants access.
-   Show whether an opportunity is invited/open, whether the provider
    has already quoted, and relevant requirement/budget/guest
    information that the API explicitly permits.
-   Do not show private event attachments to uncommitted matched
    providers unless a separately approved access rule grants access.

### 4.5 Enquiries, quotations and revisions

1.  Customer can receive provider enquiries/clarifications where
    supported.
2.  Provider creates a quotation for eligible requirement lines and
    services declared on their profile.
3.  Quotation may cover one or multiple compatible lines, subject to
    existing package/quotation contract.
4.  Quotation includes itemised lines, amount, scope,
    inclusions/exclusions, assumptions, validity and other supported
    terms.
5.  Provider can submit a revision/version; preserve prior versions and
    audit history.
6.  Customer can compare quotations by service line, price, scope and
    terms.
7.  Do not claim all quotations are invitation-originated: eligible
    providers can quote independently.

### 4.6 Selection, partial acceptance and commitments

-   Customer accepts selected quote lines.
-   Partial acceptance is valid. Accepted lines become commitments;
    unaccepted lines remain open for additional quotations/selection.
-   Acceptance conflicts must be handled transactionally. Overlapping
    acceptances must not create duplicate commitments.
-   Package acceptance must be all-or-nothing for the covered lines when
    the package contract requires atomicity.
-   Commitments are persisted business records, not merely UI status.
-   Cancellation/release follows an audited release process, preserving
    who initiated it, when, reason and resulting state.
-   Customer and provider must see consistent commitment state.

### 4.7 Manager execution and Worker participation

Manager execution management is approved as **hybrid**: it should reuse
existing commitments, network relationships and assignment workflows
rather than create a disconnected task system.

The intended operational flow: 1. Manager sees accepted commitments and
event-level work requiring delivery. 2. Manager breaks delivery into
operational work/roles/tasks where the current data model supports it.
3. Manager can identify suitable associated or available Workers. 4.
Manager checks limited availability information. 5. Manager assigns work
or publishes/selects a gig/job opportunity according to the existing
assignment model. 6. Worker can review an assignment/opportunity and
accept/apply/respond according to its type. 7. Manager and Worker can
view the assignment state and relevant schedule/details. 8. Work
progresses through check-in/status/completion confirmation only where
those APIs and policies exist. 9. Completion evidence and
reliability/review data should be recorded only through an approved
workflow.

**Do not assume all of the above is implemented.** The latest reported
implementation says Manager execution reuses commitment, network and
assignment workflows, but tasks/checklists, job board/applications,
availability/overlap checks, check-ins, completion confirmation and
reliability remain gaps in the earlier gap report. Audit current code
before implementing.

### 4.8 Event completion, payment and aftercare

The intended complete business journey includes: - Provider/Manager
marks relevant work complete. - Customer confirms completion or raises
an issue. - Payment is collected/recorded according to approved payment
terms. - Platform commission, provider settlement and Worker payouts are
calculated transparently. - Reviews/ratings and dispute handling follow
completion.

**Payment policy is not fully specified in the consolidated decisions
available here.** Do not implement or simulate escrow, deposits,
milestones, refunds, commission percentages, cancellation fees, payout
timing or payment-provider behavior without an approved financial
specification. Build only the verified integration boundary and clearly
report missing decisions.

## 5. Professional onboarding and role-specific experiences

### 5.1 Common professional onboarding

-   Create account and authenticate.
-   Choose one of the five professional types.
-   Present only the onboarding steps relevant to the selected type.
-   Collect contact and declared service/skill/coverage data.
-   Do not imply identity verification, business verification or service
    coverage unless actually verified/declared.
-   Allow users to return to previous steps without losing valid data.
-   Finish with a profile-completion state and role-appropriate
    dashboard.

### 5.2 Type-specific onboarding

**Manager** - Business/professional display name, about/description,
contact details. - Multiple service categories. - Multiple coverage
entries with PIN, locality, city and state. - Primary representative and
additional representatives. - Portfolio/experience/media details,
subject to upload rules.

**Individual Service Provider** - One selected service as the current
approved constraint. - Personal professional profile, service
description, coverage, experience and portfolio. - Independent
opportunity and quotation access.

**Associate Service Provider** - Provider's own professional profile and
declared service/coverage. - Search Manager/business by username. - Send
network request; association becomes active only after the relevant
approval. - Maintain independent identity and permitted independent
customer participation.

**Talent** - Talent category (examples: singer, DJ, anchor, actor,
musician; list should be data/config driven). - Performance/professional
description, experience, portfolio media and relevant social account
links. - Availability and coverage as supported. - Do not require social
accounts if product policy has not made them mandatory.

**Worker** - Worker role/category (examples: event setup, coordinator,
security, bouncer, volunteer, on-ground operator). - Skills/experience,
location/coverage, availability and relevant portfolio/evidence. -
Manager network association is optional, not a prerequisite to
independent opportunity access.

## 6. Profiles and portfolios

Professional profiles should be rich, public-facing portfolio pages
inspired by the information architecture of professional event-vendor
directories, not a pixel-copy of another company.

Profile sections, where relevant to professional type: - Cover image and
profile image/logo. - Display name, professional type and declared
categories. - About/description. - Service details and packages where
supported. - Service coverage, managed within the Profile area rather
than a separate Manager dashboard destination. - Past work/experience. -
Portfolio albums with images and videos. - Portfolio item captions,
event type, date/location only when safe to publish. - Social links for
Talent and other relevant professionals. - Team/representative details
for Manager accounts, with privacy controls. - Contact/enquiry action
subject to privacy and authorization. - Reviews/reputation only when
backed by real completed transactions and approved moderation rules.

The Manager or authorized additional representative/assistant should be
able to manage the business profile and portfolio according to
permissions. Customers should also have a profile with appropriate
personal/event history controls; do not expose customer private event
information publicly.

## 7. Dashboard and navigation requirements

### Global navigation

-   Common public homepage is shared across all roles.
-   Brand/logo click navigates to `/` or the canonical public homepage
    and preserves authentication/session.
-   Dashboard navigation is role-aware.
-   Admin is separate.
-   Profile includes service coverage management; do not retain a
    redundant standalone Manager Service Coverage page if the
    consolidation is already implemented/approved.

### Customer workspace

Expected domains: - Overview - My Events / Event Requests - Create
Event - Event Details - Quotations / Compare - Commitments / Selected
Services - Messages/notifications when supported - Profile/settings

### Manager workspace

Premium visual direction, using current repository palette: - Overview -
Opportunities / customer requests - Enquiries/invitations - Quotations
and revisions - Commitments / event execution - Network (Workers and
associated providers) - Assignments/gigs where implemented - Profile and
portfolio (including coverage and team representatives) -
Messages/notifications when supported - Account/settings

Manager Execution Management is hybrid and must use existing business
records where possible.

### Individual Service Provider workspace

-   Overview
-   Matching opportunities
-   My quotations
-   Invitations/enquiries
-   Commitments/active work
-   Profile/portfolio and coverage
-   Availability where implemented
-   Messages/notifications when supported

### Associate Service Provider workspace

-   Overview
-   Network requests and connected Managers
-   Opportunities and invitations
-   Quotations
-   Assigned/committed work
-   Profile/portfolio and coverage
-   Messages/notifications when supported

### Talent workspace

-   Overview
-   Talent opportunities/enquiries
-   Quotations/proposals where applicable
-   Bookings/commitments
-   Availability/calendar where implemented
-   Public profile, media portfolio and social links
-   Messages/notifications when supported

### Worker workspace

-   Overview
-   Independent opportunities
-   Manager network/association requests
-   Assignments/gigs
-   Availability where implemented
-   Active work/commitments
-   Profile/skills/experience
-   Messages/notifications when supported

### Admin workspace

Separate route/layout/navigation and permissions. Verify the existing
admin module before defining detailed actions.

## 8. Permissions and privacy

Minimum policy: - Customer owns and manages their own event requests. -
Provider sees only opportunity data permitted by matching and privacy
policy. - Provider may quote only for declared services and eligible
lines. - Customer personal/venue details and private attachments are not
exposed through broad opportunity feeds. - Provider contact details are
limited to the owner/team or customers with a persisted commitment,
including released commitments, as per the latest reported access
change. Verify exact code and ensure released-commitment access is still
appropriate for the intended retention policy. - Manager team details
expose names only in the audited surface; do not expose personal contact
details by default. - Any Manager can currently query limited Worker
availability (latest reported implementation). Treat this as the current
policy to verify, but ensure responses reveal no
event/customer/assignment details. This was a broader policy than the
earlier association-only proposal. - Non-Managers are denied the
Manager-only availability endpoint. - Additional representatives must
have explicit permissions. Do not assume all assistants can perform
financial, account ownership, cancellation or payout actions. - Admin
access is separately controlled and audited. - All sensitive actions are
authorized server-side and recorded where appropriate.

## 9. Current technical and operational constraints

-   React + TypeScript + Vite frontend.
-   Django + DRF backend.
-   Neon PostgreSQL shared cloud database.
-   Frontend deployed on Vercel; Django backend deployed separately.
-   API base URL must be environment-driven; no production bundle may
    contain localhost URLs.
-   CORS/CSRF/session cookie configuration must match the actual
    production domain topology.
-   Private uploads require durable object storage or another
    production-persistent private storage solution. Local ephemeral disk
    is not acceptable for production attachments.
-   Email verification can be disabled via configuration without falsely
    setting `email_verified`; preserve the ability to re-enable it.
-   Keep secrets out of source control and logs.
-   Migrations must be data-preserving, reviewed and reversible where
    practical.
-   No production database reset, destructive migration, or data
    mutation as part of an audit.

## 10. Known implementation checkpoint (must be re-verified against code)

Latest reported implementation: - Provider contact visible only to
owner/staff or customer with a matching persisted commitment, including
released commitments. - Manager team details expose names only. - Any
Manager can query any Worker's limited availability; non-Managers
denied. - Shared provider workspace tailors navigation, summaries and
actions for Manager, Individual, Associate, Talent and Worker. - Manager
execution reuses commitment, network and assignment workflows. -
Reported focused verification: 35 backend tests and 6 focused dashboard
tests passed; TypeScript and production build passed; lint had
warnings. - Full frontend suite had two failures in untouched
public-page flows. - No migrations, route/auth changes, style changes or
production actions were made in that reported task.

Treat this as a reported checkpoint, not proof of current workspace
state. Re-run checks and inspect git history/diff.

## 11. Explicitly unresolved / do not invent

The following require an approved decision or an existing authoritative
contract: - Payment provider, collection timing, escrow/no escrow,
milestones, refunds, commission, settlements and payout rules. -
Detailed dispute, cancellation-fee and refund policy. - Exact
representative permission tiers. - Exact Worker gig/job application and
shortlisting lifecycle. - Availability data model, overlap policy and
reservation semantics. - Messaging delivery and notification channels. -
Review eligibility/moderation rules. - Exact legal/privacy/retention
wording. - Production media-storage provider and signed-download
implementation if not already selected. - Detailed admin operating
procedures. - Whether released commitments should continue to grant
contact visibility indefinitely or only for a defined retention period.

## 12. Definition of complete product flow

A release is not complete merely because screens render. The complete
flow must be demonstrated with persisted backend data and role-specific
accounts:

1.  Visitor explores common homepage and public profiles.
2.  Customer registers/logs in and completes onboarding.
3.  Customer creates a multi-day event with multiple service lines,
    including a custom category and private attachments.
4.  Request persists and is visible only to authorized customer/admin
    and matched providers within the approved privacy boundary.
5.  Manager and independent eligible providers/Workers see matching
    opportunities.
6.  Providers submit quotations and revisions within declared service
    scope.
7.  Customer compares quotations and partially accepts selected lines.
8.  Commitments are created transactionally; unselected lines remain
    open.
9.  Manager organizes execution using the hybrid
    commitment/network/assignment model.
10. Workers can be associated or act independently, and accept/respond
    to eligible work.
11. Authorized users track work through the implemented lifecycle.
12. Completion, payment, settlement, review and dispute paths operate
    only to the extent that their business rules and integrations have
    been approved and implemented.
13. All roles see correct dashboards and permissions; the common
    homepage remains common.
14. Tests prove authorization, privacy, race safety, persistence, error
    handling and responsive UI.

------------------------------------------------------------------------

## 13. Agent execution instructions

Before coding: 1. Read this file, `architecture.md`, `uiux.md`, all
existing project docs and the current audit reports. 2. Inspect the
actual frontend and backend repositories and git status. Identify the
real project roots. 3. Build a route-to-component-to-API-to-model map.
4. Classify each requirement as `WORKING`, `PARTIAL`, `FRONTEND_ONLY`,
`BACKEND_ONLY`, `MOCK/DEMO`, `MISSING`, or `BLOCKED`. 5. Cite exact file
paths, route names, API paths, model names and tests as evidence. 6. Do
not recreate existing working features. Do not silently change product
decisions. 7. Implement only after presenting the gap report and a
sequenced plan, unless the user explicitly authorizes implementation in
the same task. 8. For each implementation, add/adjust backend and
frontend tests and run the relevant regression suite. 9. Report
unverified areas honestly. Never claim payment, email, upload, security
or production readiness based only on a successful build.

------------------------------------------------------------------------

# FILE: architecture.md

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

------------------------------------------------------------------------

# FILE: uiux.md

# HiddenStage --- UI/UX Specification

**Document:** `uiux.md`\
**Purpose:** Product experience, navigation, role workflows and
interaction standards\
**Status:** Functional design direction; actual current palette and
typography must be read from the repository

------------------------------------------------------------------------

## 1. Experience goals

HiddenStage should feel like one coherent event marketplace with
distinct workspaces for the people using it.

-   Customers should find services, create an event request, compare
    providers and coordinate without needing to understand internal
    marketplace mechanics.
-   Managers should operate a professional business: manage
    opportunities, quotations, commitments, team/network and delivery.
-   Individual providers should focus on their single service, leads,
    quotations and work.
-   Associate providers should manage their independent professional
    identity plus Manager associations.
-   Talent should present a polished public profile and manage
    performance enquiries/bookings.
-   Workers should see practical work opportunities, assignments,
    availability and their Manager connections while retaining
    independent participation.
-   Admin should have a separate operational interface.
-   The public homepage remains common for everyone, signed in or not.

## 2. Visual system

### 2.1 Brand preservation

The user has changed the palette over time. Therefore: - Inspect the
**current repository design tokens** and treat those as authoritative. -
Do not restore older colors such as a previously discussed burgundy/gold
palette unless those are still the actual current tokens. - Do not
invent a replacement palette. - Preserve the current font choices and
type scale found in source. - Use centralized CSS variables/theme
tokens; avoid scattered hard-coded colors. - Manager direction is
**premium**, but premium should be expressed through hierarchy, spacing,
typography, restrained surfaces and strong imagery---not arbitrary
gradients or decorative clutter.

### 2.2 Shared design language

-   Consistent page width, spacing scale, grid, radius, shadows and
    button hierarchy.
-   Clear distinction between primary action, secondary action and
    destructive action.
-   Strong typography hierarchy: page title, section title, card title,
    supporting text, metadata.
-   Use real portfolio imagery only when supplied/approved. Do not
    invent provider reviews or trust badges.
-   Responsive by default: desktop, tablet and mobile.
-   Meet keyboard navigation, visible focus, semantic labels, contrast
    and screen-reader requirements.

## 3. Global application shell

### 3.1 Public homepage

The homepage is shared across all user roles. It may show role-aware
signed-in account controls, but its content and discovery purpose remain
common.

Core elements: - Header with HiddenStage logo, service/category
navigation, discovery/search, help/information and account controls. -
Clicking the logo always navigates to the public homepage while
preserving the active authenticated session. - Public service/category
discovery. - Featured/active event or opportunity content only when
backed by real approved data; otherwise label demo content. -
Professional discovery/profile cards. - Clear "Create event", "Explore
services" and "Join as professional" calls to action as appropriate. -
How it works, customer/professional value, trust/privacy messaging and
footer. - Do not redirect a signed-in Manager/Worker/Talent to their
dashboard when they click the logo.

### 3.2 Signed-in navigation

Use a shared shell with role-specific navigation configuration. The
shell can be reused; the actual navigation items, summaries and actions
must be appropriate to the account type.

Requirements: - Current role/type is visible and understandable. -
Active navigation state is clear. - Mobile navigation is usable and does
not overflow. - Dashboard links do not replace the common homepage. -
Profile access is consistent. - Logout is an explicit action, never
coupled to logo/home navigation.

## 4. Customer experience

### 4.1 Customer dashboard

Prioritize the next meaningful action: - Welcome/profile summary. -
Event request counts and upcoming events based on real persisted data. -
Recent activity. - Pending quotations/decisions. - Commitments and event
execution status. - Quick action to create an event. - Empty state
explains how to create the first event. - Never show fake quotation
counts, provider responses or activity.

### 4.2 Event creation wizard

Use a clear multi-step flow with progress, back/continue,
save/validation feedback and a final review.

**Step 1 --- Event details** - Event name and type. - Description. -
Start date/time. - End date/time, including a date picker that permits a
later day. - Guest count. - Validate end is after start; support
multi-day events naturally.

**Step 2 --- Location** - PIN code. - Locality. - City and state. -
Venue name and full address. - Clearly distinguish event venue from the
customer's home/contact address.

**Step 3 --- Service requirements** - Add multiple requirement
cards/rows. - Select predefined category or choose "Other". - When
"Other" is selected, reveal a text field for the custom service
category. - Each line has a clear title, details, budget if optional,
instructions and edit/remove actions. - Keep each service line
independently reviewable and quotable.

**Step 4 --- Attachments** - Add multiple files. - Show filename, type,
size and preview where supported. - Remove before submission. - Explain
privacy and who can access files. - Show upload progress and clear retry
errors. - Do not report upload success before backend confirmation.

**Step 5 --- Review** - Show all event details, location, service lines
and attachment metadata. - Each section has an edit action. - Final
submit clearly explains what happens next. - Confirmation includes event
reference and actual persisted status.

### 4.3 Event details and quotations

-   Event overview with date range, location privacy and request status.
-   Service requirement sections.
-   Matched providers and quotations grouped by service line.
-   Quote comparison must make total, line-level price, inclusions,
    exclusions, validity and revision date easy to compare.
-   Provide a clear accept action for eligible lines.
-   Make partial acceptance understandable: selected lines are
    confirmed; remaining lines continue to receive responses.
-   Confirmation must explain the commitments created and remaining open
    lines.
-   Download attachments only when the current user is authorized.

### 4.4 Customer profile

Customer can manage their own contact/profile information and
appropriate personal preferences. - Do not expose private event history
or attachments on a public customer profile. - Separate personal account
details from event-specific venue/contact details. - Show relevant
commitments/history only to the customer.

## 5. Professional onboarding UX

### 5.1 Type selection

After choosing "Event Professional", present a clear selection screen
with five options and concise descriptions: - Manager - Individual
Service Provider - Associate Service Provider - Talent - Worker

The selected choice determines the next steps. Do not show one generic
onboarding form to all professional types.

### 5.2 Manager onboarding

Collect business/professional identity, about text, multiple service
categories, multiple coverage entries, representative details and
initial portfolio information. Clearly identify primary representative
and additional representatives.

### 5.3 Individual Service Provider onboarding

Focus on one service, professional description, location coverage,
experience, portfolio and availability where supported.

### 5.4 Associate Service Provider onboarding

Collect own service/profile information, then allow searching for a
Manager/business by username and sending a network request. Explain
pending, accepted and declined states. Do not show an association as
active until approved.

### 5.5 Talent onboarding

Ask talent type/category (for example singer, DJ, anchor, actor,
musician, influencer or other approved taxonomy), performance
description, experience, portfolio media and social links. Social links
should be optional unless policy explicitly requires them.

### 5.6 Worker onboarding

Ask worker role/category (for example setup crew, coordinator, security,
bouncer, volunteer or other on-ground role), skills, experience,
coverage and availability where supported. Explain that connecting to a
Manager is optional and independent opportunities may also be available.

### 5.7 Onboarding behavior

-   Show progress and role-specific step names.
-   Preserve data when navigating backward.
-   Validate at field level with plain language.
-   Avoid claiming "verified" when the user merely completed a form.
-   Completion routes to the correct role-aware workspace.
-   A profile can be completed progressively where allowed; show missing
    sections without blocking unrelated permitted actions.

## 6. Professional profile and portfolio UX

Profile is the professional's public storefront and private management
area.

Suggested information hierarchy: 1. Cover image/profile image or
business logo. 2. Name, professional type, categories and
location/coverage summary. 3. Primary enquiry/contact action governed by
privacy rules. 4. About. 5. Services and packages where supported. 6.
Portfolio albums: images and videos. 7. Past work/experience. 8.
Team/representatives for Manager accounts, with public/private
visibility controls. 9. Social links for Talent/relevant professionals.
10. Reviews only when real, eligible and moderated.

### Profile management

-   Profile owner can edit permitted fields.
-   Manager primary representative and authorized additional
    representatives can manage business profile/portfolio according to
    their permission.
-   Coverage is managed inside Profile, not as a redundant standalone
    Manager navigation page.
-   Add/edit/remove portfolio items with upload progress and validation.
-   Allow captions and optional metadata.
-   Provide preview of public profile before publishing.
-   Clearly distinguish draft, published and hidden items.
-   Do not expose private customer/event media through public portfolio
    albums.

## 7. Role-specific workspace UX

### 7.1 Manager --- premium workspace

Primary job: win customer work and coordinate delivery.

Navigation should be role-specific and may include: - Overview -
Opportunities / Requests - Enquiries / Invitations - Quotations -
Commitments / Execution - Network - Assignments / Gigs (only where
implemented) - Profile & Portfolio - Messages / Notifications (only
where implemented) - Settings

Overview content: - Open opportunities. - Quotes awaiting
response/revision. - Active commitments. - Upcoming event delivery. -
Team/network snapshot. - Recent activity.

Execution management is hybrid: - Start from a persisted commitment. -
Show accepted service scope and event context the Manager is authorized
to see. - Provide an event-level execution view. - Reuse existing
network and assignment workflows. - Do not create fake task/checklist
actions if backend support is absent. - Clearly distinguish customer
commitment from internal Worker assignment.

### 7.2 Individual Service Provider

Focus on: - Matching opportunities for the declared service. -
Invitations/enquiries. - Quotes and revisions. - Accepted
commitments/active work. - Profile/portfolio and coverage. -
Availability only where backed by real API data.

Hide Manager-only team administration and multi-service controls.

### 7.3 Associate Service Provider

Focus on: - Manager network requests and current associations. -
Independent opportunities. - Opportunities received through a Manager
where authorized. - Own quotations and commitments. - Own
profile/portfolio and coverage.

Make the source of each opportunity clear: independent marketplace or
associated Manager. Do not imply the Manager owns the Associate's
account.

### 7.4 Talent

Focus on: - Talent-specific public profile and media portfolio. -
Performance enquiries/opportunities. - Proposals/quotations where
supported. - Bookings/commitments. - Availability/calendar only when
implemented. - Social links and performance history.

Avoid showing irrelevant ground-staff management actions.

### 7.5 Worker

Focus on: - Independent work opportunities. - Manager association
requests and connected Managers. - Assignments/gigs. - Active work and
upcoming schedule. - Skills/profile and availability where supported.

Clearly distinguish: - Independent customer opportunity. - Work offered
by an associated Manager. - Confirmed assignment. Do not make
association mandatory for independent participation.

### 7.6 Admin

Separate layout, navigation, visual context and permission boundary. Do
not expose admin controls in professional/customer navigation.

## 8. Key interaction patterns and states

Every data-driven screen should define: - Initial loading. - Empty
state. - Search/filter no-results state. - Validation error. -
API/network error. - Forbidden/unauthorized state. - Success
confirmation. - Stale/conflict state. - Retry/recovery action.

Specific examples: - No events: prompt customer to create first event. -
No matched opportunities: explain matching criteria and profile
coverage/service completeness. - No quotations: explain whether request
is still awaiting providers. - Partial acceptance: visually separate
confirmed lines from still-open lines. - Pending network request: show
pending, not connected. - Attachment download denied: explain access
restriction without exposing storage path. - Availability unknown: show
"not available/unknown" accurately; never infer free time from missing
data.

## 9. Responsive and accessibility requirements

-   Mobile-first layouts for event creation, quote comparison, profile
    editing and Worker assignments.
-   No horizontal overflow at 360--390px widths.
-   Forms use persistent labels, helpful errors and correct input types.
-   All controls keyboard accessible.
-   Focus visible; dialogs trap/return focus correctly.
-   Do not rely on color alone for statuses.
-   Video/image previews have accessible labels.
-   Respect reduced-motion preferences.
-   Tables become cards or horizontally manageable layouts on small
    screens; do not shrink text to unreadable sizes.

## 10. Content and trust rules

-   No fake provider counts, testimonials, ratings, verification marks
    or completed events.
-   Demo content must be labelled.
-   Privacy/Terms drafts must remain marked for legal review until
    approved.
-   Never say a message, quote, upload, payment or booking was
    sent/completed unless the backend confirms it.
-   Avoid ambiguous statuses. Use consistent terms for opportunity,
    quotation, acceptance, commitment, assignment, completion and
    payment.
-   Customer-facing copy should explain what happens next and what
    remains pending.

## 11. UX acceptance checklist

-   [ ] Logo returns to common homepage without logging out for every
    role.
-   [ ] Same public homepage/discovery experience is available to all
    signed-in roles.
-   [ ] Each professional type sees relevant onboarding steps.
-   [ ] Each professional type sees relevant dashboard navigation and
    actions.
-   [ ] Customer can create multi-day event with start and end dates on
    different days.
-   [ ] Customer can add multiple service lines and a custom "Other"
    category.
-   [ ] Customer can attach private files and authorized users can
    download them.
-   [ ] Customer can compare quotes and partially accept lines.
-   [ ] Unaccepted lines remain open.
-   [ ] Provider profile includes about, services, coverage, experience
    and image/video portfolio where relevant.
-   [ ] Manager team editing is permission-aware.
-   [ ] Worker can participate independently and through Manager
    association.
-   [ ] Manager execution view distinguishes commitments from
    assignments.
-   [ ] Availability UI does not reveal private event/customer details.
-   [ ] Admin is separate.
-   [ ] Loading, empty, error, success and forbidden states are
    designed.
-   [ ] Current repository palette and typography are preserved.
-   [ ] Mobile and accessibility checks pass.

------------------------------------------------------------------------

## 12. Agent instructions

1.  Inspect the current palette, fonts, components and routes from
    source before proposing visual changes.
2.  Review existing screenshots and route inventory, but verify actual
    runtime behavior.
3.  Produce a role-by-role screen inventory and workflow map.
4.  Compare current UI with this document and classify gaps.
5.  Do not redesign all screens or replace routes merely to satisfy a
    document structure.
6.  Implement one role/workflow slice at a time with responsive browser
    tests.
7.  Use real API state; label demo state and do not fake backend
    completion.
