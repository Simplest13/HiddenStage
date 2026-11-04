# Reference Product Analysis

**Research date:** 2026-11-02

## Sources and access

- [Add to Event](https://www.addtoevent.co.uk/) is the requested marketplace reference. Both the integrated browser and page fetch reached a Cloudflare security-verification page (HTTP 403). No product pages, workflows, or interactions could be inspected. This is an access limitation, not evidence that a workflow is absent.
- [PostHog pricing](https://posthog.com/pricing) was accessible in the integrated browser. On the research date, the page advertised a monthly free allowance that renews monthly, including 1 million events, and stated usage stops at free-tier limits to avoid unexpected charges. Pricing and limits can change; re-verify before enabling analytics.
- The HiddenStage restart prompt is the available product source. No approved product specifications or prior implementation were found in the current workspace.

## Observed workflows and mechanics

No Add to Event workflow was observed. In particular, customer request creation, category selection, provider discovery, invitations, provider dashboards, quotation revisions, comparisons, acceptance, and responsive or empty/error states remain unverified against the reference.

## HiddenStage mechanics to preserve

The following are requirements from the HiddenStage prompt, not observations about Add to Event:

- Customers create multi-service event requests with date, location, budget, requirements, and private attachments.
- Providers can discover eligible requests, respond to invitations, and submit immutable quote revisions.
- Customers can compare proposals and accept selected service lines; package acceptance is all-or-nothing.
- Partial acceptance leaves other service lines open. Acceptance records a commercial commitment, not a booking, payment, or service guarantee.
- Commitment release is audited and preserves the original history.
- Business identity is separate from individual accounts; representatives have explicit permission scopes.
- Provider coverage must use normalized PIN-code/locality matching with city/state context.
- Email verification is required. Backend authorization, session authentication, CSRF protection, private attachment access, and PostgreSQL concurrency guarantees are required.
- Chat, booking records, payment, escrow, payouts, refunds, subscriptions, commission infrastructure, automatic GST calculations, and fabricated invoices are excluded from the first release.

## Screens and routes to plan

These are routes implied by HiddenStage requirements, not reference-site findings:

- Public landing and service discovery.
- Registration, login, email verification, and password reset.
- Customer event-request creation and review.
- Customer request detail, provider discovery/invitations, quote comparison, and commitment history.
- Provider profile and coverage setup, eligible-request inbox, invitation response, quote editor, and accepted-commitment view.
- Business profile, representative and permission management, and verification status.
- Protected administrative verification, moderation, configuration, and audit views.

Detailed route design remains subject to the missing approved route map and design system.

## Useful interaction patterns

No patterns can be attributed to the inaccessible reference. HiddenStage should use clear request steps, explicit review before submission, eligibility explanations, comparable quote summaries, visible status and expiry, scoped acceptance confirmation, and clear loading/error/empty states. These are implementation requirements or recommendations derived from the HiddenStage prompt, not observed Add to Event behavior.

## Differences and non-copying requirements

HiddenStage's approved scope is India-focused, denominated in INR, and uses Asia/Kolkata as its default timezone. It has explicit business-identity, partial-acceptance, audited-release, privacy, and concurrency rules. Do not infer that the reference shares these rules. Use the reference only for workflow research when access becomes available; do not copy its branding, logo, text, visual identity, or proprietary assets.

## Unavailable pages and assumptions

- The Add to Event site was blocked before any product content loaded; no page-level observations are claimed.
- Logged-in, registration, and provider-only reference areas were not reached.
- No Add to Event workflow assumptions are used as implementation facts.
- PostHog's published free allowance was visible on the research date, but no project key, consent configuration, or event delivery has been verified. Analytics is not active.

## Follow-up research

Repeat the reference audit when the site is accessible. Record the exact routes visited, access restrictions, responsive behavior, and observed flows before using the findings to refine HiddenStage screens.
