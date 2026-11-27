# HiddenStage — Functional Test Report

**Date:** 27 November 2026
**Method:** live HTTP journeys (`qa-audit/scripts/api_journey.py`, 108 assertions), Playwright browser journeys, Playwright route crawl (136 page loads), and targeted source inspection.
**Environment:** isolated SQLite database built from migrations, seeded with one account per role (`qa-audit/scripts/seed_audit_data.py`); Django on `127.0.0.1:8010`, Vite on `127.0.0.1:5174`. The configured Neon database was read-only.

---

## 1. Interactive element audit

No placeholder patterns were found: a search for `onClick={() => {}}`, `href="#"`, `TODO`, `FIXME`, "coming soon" and "not implemented" across `hiddenstage-frontend/src` returned **0 matches**. Every visible control in the crawled pages is wired to a handler, a route, or a modal.

| Element class | How it was exercised | Result |
|---|---|---|
| Primary/secondary buttons | Browser journeys (register, sign in, onboarding, create event, quote, accept, assign, save profile) | Pass |
| Navigation links and sidebar | Route crawl as every role; active state and destination checked | Pass |
| Public nav and footer links | Route crawl of all 14 public routes | Pass |
| Dropdowns/selects | Event type, service category, provider kind, sorting filters, admin role filter | Pass |
| Tabs | Admin users/categories tabs, profile/coverage tabs | Pass (rendered, switched) |
| Search fields | Provider directory, event list, admin users, audit | Pass |
| Filters and sorting | Event list filters, provider discovery by category/PIN | Pass |
| Pagination | Admin and list endpoints use the shared paginator; UI lists render | Pass (backend pagination verified) |
| Modals | Publish-request confirmation, admin user/category modals | Pass (open/close) |
| Forms and validation | Registration, onboarding, event wizard, quotation editor, assignment form | Pass with findings below |
| Date/time pickers | Native date/time inputs in event wizard | Pass |
| Upload controls | Avatar, portfolio, event attachment | Pass after fix (HS-008) |
| Save/delete/edit/cancel | Profile, services, coverage, portfolio, quotations | Pass |
| Logout | Sign out from every workspace | Pass |
| Notifications | Bell and `/auth/notifications/` | Pass (endpoint, empty state) |

**Dead/incorrect controls found:** the admin login "Fill default admin credentials" button (HS-001) — removed. No other dead control was found.

---

## 2. Customer journey

### A. Registration and onboarding — PASS
- Valid registration returns `201`, establishes a session immediately, and `/auth/me/` succeeds.
- Missing username, weak password, invalid email, missing terms → `400` with field errors.
- Duplicate email → `400` with enumeration-safe wording.
- Customer profile (PIN, locality, city, state, bio) persists and is returned on refresh.
- Logout clears the session; login restores it; refresh keeps it.
- Password reset request returns `202` (email delivery not exercised).

### B. Homepage and discovery — PASS
- All public routes load with correct headings (see `WEBSITE_PAGE_AUDIT.md`).
- Category discovery, provider directory, provider detail and search/filter pages render real API data.
- Provider detail hides contact unless the viewer is the owner or a committed customer (verified).

### C. Event creation — PASS
- Multi-requirement event created through the API and through the wizard.
- Validation verified: past date, end before start, missing name/type, budget parsing.
- Requirements persist with title, description, budget (paise), instructions and position.
- Event submit transitions `DRAFT → SUBMITTED` and is visible on refresh.
- Attachments upload and download for the owner; foreign download refused.

### D. Category navigation and custom categories — **PARTIAL / NOT IMPLEMENTED**
- Category pages open directly (`/services/:slug`) with no intermediate screen.
- Selecting a normal category works and is stored by code.
- **Custom category for customers is not available in the UI** (HS-007). The custom-category *API* works and was verified:
  - empty name → 400; one character → 400; >80 characters → 400.
  - unique name → 201 with `is_custom=true` and its own slug.
  - duplicate (same and different case) → 200 returning the existing row, no duplicate.
  - special characters → 201.
  - persists in the public catalogue and survives refresh.
  - used as an event requirement, it is stored under **its own code**, not as `other`.
- The legacy `category="other"` + `custom_service_name` path is rejected on a database built from migrations (`Unknown service category: other.`), because `other` is not seeded. Production contains an ad-hoc `other` row, so behaviour differs between environments.

### E. Requests and quotations — PASS
- Event request persists; invitation to a provider persists and appears in the provider inbox.
- Provider accepts invitation, creates quotation, saves two priced lines, submits.
- Server computes the revision total (₹10,000.00); resubmission supersedes the prior revision; a second submit of the same revision is refused (`409`).
- Customer sees the quotation, accepts one line, and a commitment for that line is created (₹7,500.00) and listed.

### F. Profile and communication — PASS
- Account settings update (theme preference) persists.
- Notifications endpoint returns the list; network/messages pages render.
- Customer network page renders connections and chat selection (unit test + crawl).

---

## 3. Event Manager journey

### A. Registration and profile — PASS
- Provider registration, multi-step onboarding, Manager kind persistence.
- Display name, contact, description, categories, coverage, portfolio, logo fields persist.
- Profile edit and completion state persist across refresh.

### B. Dashboard — PASS
- Manager navigation only (execution, network, assignments); no Worker/Talent-only navigation.
- Metrics reflect the seeded commitment (1 active commitment, 1 active worker, 1 assignment invitation).
- Dashboard first paint was slow in development (HS-011), not incorrect.

### C. Opportunities and quotations — PASS
- Opportunity feed includes the submitted event matching declared category/coverage.
- Invitation inbox shows the customer invitation; accept works.
- Quote editor: draft → items → submit; revision history and totals correct.

### D. Event execution — **PARTIAL**
- Accepted commitments are listed and openable.
- Eligible Worker network is visible; assignments can be created for an associated Worker.
- Assignment invitation, worker accept, duplicate-accept refusal, and availability conflict were exercised.
- **Product gap:** there are no event tasks, checklists, milestones or per-service execution boards. This was **not** fabricated as a passing test. Assignment start/complete/cancel services exist but were not driven end-to-end in the browser.

### E. Team and network management — PASS
- Worker discovery, profile view, invitation, acceptance, active association, association list.
- Ending an association exists (`POST /network/associations/{id}/end/`); not exercised in the browser.
- Availability response is privacy-safe (no event/customer/location/instructions).

### F. Manager data security — PASS
- Manager cannot read another manager's quotation (`403`).
- Assignment creation without an active association is refused.
- Customer cannot create assignments; non-manager providers cannot create assignments.
- Foreign customer cannot read the event or its quotations (`403/404`).

---

## 4. Professional journeys

| Role | Registration | Profile | Services/coverage | Opportunities | Quotations | Commitments | Notes |
|---|---|---|---|---|---|---|---|
| Individual Service Provider | Pass | Pass | Pass | Pass | Pass | Pass | One-primary-category restriction still enforced (`400` for two categories). |
| Associated Service Provider | Pass | Pass | Pass | Pass | Pass | Pass | Independent identity preserved. **Multiple simultaneous Manager associations not executed.** |
| Talent | Pass | Pass | Pass | Pass | Pass | Pass | `talent_category`, `performance_styles`, `experience_summary`, Instagram URL persist and render; talent-specific dashboard copy. |
| Worker / Crew | Pass | Pass | Pass | Scoped feed | Pass | Pass | Network invitation, association, assignment invitation, accept, availability conflict, duplicate accept refusal. |

Worker scheduling conflict: a second overlapping assignment for the same worker/date/time is blocked by the availability check; the UI shows "unavailable". Declining an invitation does not create an accepted assignment (state machine verified by service tests).

---

## 5. Image and media uploads

| Case | Avatar | Portfolio | Event attachment |
|---|---|---|---|
| Valid PNG | **Pass** (200, served back) | **Pass** (201) | **Pass** (201, owner download 200) |
| Valid JPEG | Not executed | Not executed | Not executed |
| Valid WebP | Not executed | Not executed | Not executed |
| Oversized (>5 MB) | **Pass** (400) | Not executed | Not executed (limit configured) |
| Unsupported format (.txt/.exe) | **Pass** (400) | **Pass** (400) | **Pass** (400) |
| Empty file | **Pass after fix** (400) | **Pass** (400) | **Pass** (400) |
| Content/type mismatch | **Pass after fix** (400 for script named .png) | Extension-only check (HS-016) | **Pass** (400 when bytes and declared type disagree) |
| Duplicate file | Not applicable (single avatar) | Allowed as separate item | Allowed |
| Network interruption during upload | **Not tested** | **Not tested** | **Not tested** |
| Upload cancellation | **Not implemented** | **Not implemented** | **Not implemented** |
| Persistence after refresh/new login | **Pass** (avatar URL stable) | **Pass** | **Pass** |
| Replacement / deletion | Avatar replace and remove pass | Delete endpoint exists; not executed in browser | Delete endpoint exists; not executed in browser |
| Storage | Local `private-media/`; files served through authorising views | Same | Same |
| Broken records after failure | Rejected uploads left no stored file (verified for empty/spoofed avatar) | Not explicitly verified | Not explicitly verified |

Not tested: Cloudinary/S3 storage round-trip, very large multipart uploads, concurrent uploads, image decompression bombs. These require a configured bucket and are recorded as limitations.

---

## 6. Browser journey results

| Spec | Result | Notes |
|---|---|---|
| `file-upload-restrictions.spec.ts` | **Pass** | Strict extension restrictions across portfolio, attachments and chat. |
| `customer-journey.spec.ts` | **Pass (1.3 min)** | Browse → register → customer onboarding → 5-step event wizard → publish. |
| `manager-journey.spec.ts` | **Pass (2.3 min)** | Register → provider onboarding → opportunity feed → quotation draft/submit. |
| `network-journey.spec.ts` | **Pass (2.7 min)** | Manager invites independent worker; worker accepts and becomes associated. |
| `responsive.spec.ts` | **Not completed (harness)** | Timed out twice on a full-page navigation after several minutes of continuous browser work. Layout was independently verified by the crawl: **8 tablet + 8 mobile loads, 0 px overflow** (§7 of `WEBSITE_PAGE_AUDIT.md`). |
| `profile-portfolio.spec.ts` | Not re-run after the helper change | Earlier run failed on onboarding selectors; recorded as test debt. |
| `auth.spec.ts` | 3 pass / 2 fail | Fails are obsolete expectations (HS-010). |

**Test-only fixes applied to make the suite meaningful:** the date label (`Event date` → `Event start date`) and the onboarding category selection (the helper picked the first category, while the event requests Photography, so the manager was correctly not matched). Neither change touches product behaviour.

**Important:** the earlier red runs were caused by the harness, not the product — concurrent page crawling starved the Vite dev server, and the original 90-second per-test budget was consumed by multi-account setup. With the crawl stopped and a 240-second budget, the journeys pass. The remaining auth-spec rewrites are recorded as debt, not as product failures.

---

## 7. Category and custom-category test matrix

| Case | Expected | Actual | Result |
|---|---|---|---|
| Open category from homepage | Category page | `/services/photography` opens directly | Pass |
| Reach providers without intermediate screen | Provider list | Provider list renders | Pass |
| Select existing category in event form | Stored by code | Stored by code | Pass |
| Select "Other" | Custom fields | **No option in customer UI** | **Not implemented** |
| Create custom category (API) | 201, own slug | 201, `is_custom=true`, slug | Pass |
| Empty custom name | 400 | 400 | Pass |
| One-character name | 400 | 400 | Pass |
| >80 characters | 400 | 400 | Pass |
| Duplicate name (same case) | Existing row | 200, same id | Pass |
| Duplicate name (different case) | Existing row | 200, same id | Pass |
| Special characters | Accepted | 201 | Pass |
| Persistence after refresh | Present | Present in catalogue and requirement | Pass |
| Distinct custom category not stored as "Other" | Own code | Own code | Pass |
| Generic "other" requirement | Accepted with name | 400 on a migrated DB; accepted only if an `other` row exists | **Inconsistent (HS-007)** |
