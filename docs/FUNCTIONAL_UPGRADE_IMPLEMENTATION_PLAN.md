# HiddenStage Functional Upgrade Implementation Plan

> **Governing Standards:** Enforces `/gravitas` verification, `/karpathy-guidelines` surgical changes, and `/using-superpowers`.

**Goal:** Fix core functional defects, formalize the five-role professional identity architecture, implement team/assistant delegation, and deliver a comprehensive portfolio/profile management system for both professionals and customers.

**Architecture:** Extend existing Django modular monolith (`apps/profiles`, `apps/events`, `apps/network`, `apps/matching`) and React 19 / TypeScript frontend without replacing working architecture. Reconcile backend models with the authoritative Neon PostgreSQL schema already containing `PortfolioItem`, `ProfileTeamMember`, and 5-way `ProviderKind`.

**Tech Stack:** Django 5.2, DRF, Neon PostgreSQL, React 19, TypeScript, React Router 7, Vite, Playwright.

---

## Global Constraints

1. **Non-destructive:** Existing records, customer requests, quotations, commitments, Manager functionality, and independent Worker workflows must be preserved.
2. **Authoritative Neon DB:** Match existing PostgreSQL schema; do not attempt to delete or overwrite existing tables (`profiles_portfolioitem`, `profiles_profileteammember`, etc.).
3. **No Auth Token in localStorage:** Maintain HttpOnly session cookies + CSRF tokens.
4. **Independent Account Ownership:** Workers and Associated Service Providers maintain independent accounts; associations are non-exclusive.
5. **Private Attachments:** Files remain private by default; downloads require explicit authentication and authorization.

---

## Phase Breakdown

### Phase 1 — Codebase Reconnaissance & Schema Synchronization
- Synchronize Python models in `apps/profiles/models.py`, `apps/events/models.py`, and `apps/network/models.py` with the authoritative Neon database schema.
- Models updated:
  - `ServiceRequirement`: add `custom_service_name`, `custom_service_description`, `custom_review_status` (`PENDING`, `APPROVED`, `REJECTED`, `NOT_REQUIRED`).
  - `ProviderProfile`: add 5 `ProviderKind` choices (`MANAGER`, `INDIVIDUAL_SERVICE_PROVIDER`, `ASSOCIATED_SERVICE_PROVIDER`, `TALENT`, `WORKER`), `username`, `headline`, `primary_category`, `talent_category`, `specializations`, `performance_styles`, `experience_summary`, `languages`, `website`, `instagram`, `youtube`, `availability_note`, `logo`, `cover_image`, `is_public`.
  - `CustomerProfile`: add `avatar`, `bio`.
  - `PortfolioItem`: add model for professional and customer portfolio items (`owner`, `provider`, `title`, `description`, `category`, `event_date`, `media`, `external_url`, `media_kind`, `visibility`, `position`).
  - `ProfileTeamMember`: add model for manager assistants/delegates (`owner`, `member`, `permissions`, `is_active`).
  - `NetworkInvitation`: add `initiated_by` (`MANAGER_INVITES`, `PROFESSIONAL_REQUESTS`).
- Generate and synchronize migration state safely without altering existing Neon production data.

### Phase 2 — Functional Bug Fixes
1. **Logo Authentication & Navigation:**
   - Verify logo navigation in `PublicLayout` and `WorkspaceLayout` across all 5 professional types, customer, and admin.
   - Retain session and route directly to workspace home.
2. **Multi-Day Event Request Date Selection:**
   - Support independent `event_date` (Start Date) and `end_date` (End Date) in `EventPages.tsx` and backend serializers.
   - Support single-day, 2-day, 3-day, and 7-day events with validation: end date cannot precede start date.
   - Display full date range across Customer, Manager, and Worker interfaces.
3. **Event Request Attachment Downloads:**
   - Update `EventAttachmentDownloadView` in `apps/events/views.py` to authorize:
     - Event owner (Customer).
     - Invited / matched / quoting / committed Providers.
     - Admin staff.
   - Reject unauthorized access with 403 Forbidden.
   - Enhance frontend attachment list with filename, file size, content type, preview, download, and delete actions.
4. **Custom Service Categories Through "Other":**
   - Support selecting "Other" in service category picker.
   - Reveal custom service title and description inputs.
   - Store in `ServiceRequirement` with `custom_review_status='PENDING'`.
   - Prevent matching engine (`apps/matching/`) from incorrectly matching custom requirements to standard providers.

### Phase 3 — Professional Identity Architecture & Onboarding
- Expose 5 distinct professional options in `ProviderOnboardingPage.tsx`:
  1. `MANAGER` (Multiple categories, team building, business profile).
  2. `INDIVIDUAL_SERVICE_PROVIDER` (Strictly 1 primary service category).
  3. `ASSOCIATED_SERVICE_PROVIDER` (Works with Managers, search & network request integration).
  4. `TALENT` (Talent category, biography, performance styles, media links).
  5. `WORKER` (Operations & ground crew, roles, certifications).
- Enforce validation rules on onboarding and profile update endpoints.

### Phase 4 — Manager Search & Network Association Requests
- Add API endpoint `/api/v1/network/managers/search/?q=` to search managers by display name, username, or business name.
- Allow Associated Service Providers to send network requests (`NetworkInvitation` with `initiated_by='PROFESSIONAL_REQUESTS'`).
- Allow Managers to review, accept, or decline association requests.

### Phase 5 — Profile & Portfolio Management Upgrade
- Add Portfolio API endpoints `/api/v1/profiles/portfolio/` (List, Create, Update, Delete, Reorder).
- Support image upload, document upload, external video link, visibility (`PUBLIC` vs `PRIVATE`).
- Customer profile: private personal event gallery, profile picture (`avatar`), and biography.
- Manager profile: business logo, cover banner image, business overview, team management.
- Manager Assistant delegation: `/api/v1/profiles/team/` allows granting/revoking permissions (`MANAGE_BUSINESS_PROFILE`, `MANAGE_PORTFOLIO`, `MANAGE_SERVICES`, `MANAGE_TEAM`, `VIEW_EVENTS`, `MANAGE_EVENTS`).

### Phase 6 — Discovery, Dashboard, & UI Polish
- Update provider discovery filters for all 5 professional types.
- Ensure responsive design at 1440px desktop, 768px tablet, and 390px mobile.

### Phase 7 — Verification & Documentation
- Execute unit test suites in backend (`manage.py test`) and frontend (`npm test && npm run typecheck`).
- Execute Playwright E2E browser tests for:
  - Test A: Logo authentication across all roles.
  - Test B: Multi-day event creation (1, 2, 3, 7 days) and date validation.
  - Test C: Attachment upload, preview, authorized download, unauthorized download rejection.
  - Test D: Custom service requirement creation with "Other" and review status.
  - Test E: 5-role onboarding and restriction enforcement.
  - Test F: Portfolio and profile management with assistant permissions.
- Compile final report with execution evidence.
