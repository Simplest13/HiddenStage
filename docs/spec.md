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
