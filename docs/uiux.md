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
