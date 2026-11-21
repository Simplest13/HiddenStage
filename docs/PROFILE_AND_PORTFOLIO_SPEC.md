# HiddenStage — Event Professional Profile & Portfolio System Specification

## 1. Overview & Objective
HiddenStage upgraded its professional profiles into a customer-facing business, showcase, and booking experience inspired by WedMeGood (`https://www.wedmegood.com/profile/Oh-Yes-Events-898343`).

The system enables event professionals (Managers, Individual Service Providers, Associated Service Providers, Talent/Performers, and Workers/Crew) to manage their business identity, showcase high-resolution albums and YouTube/Vimeo video performances, publish services with transparent starting prices, declare exact PIN-level service coverage, delegate profile management to assistants, and receive direct quote enquiries seamlessly from customers.

---

## 2. Architecture & Data Model

### 2.1 Authoritative Neon PostgreSQL Database Models
Built upon the shared Neon PostgreSQL database with zero breaking schema migrations:
- **`ProviderProfile`** (`apps/profiles/models.py`):
  - Identity: `user`, `display_name`, `username` (unique slug for clean URL `/providers/:username`), `kind` (`MANAGER`, `INDIVIDUAL_SERVICE_PROVIDER`, `ASSOCIATED_SERVICE_PROVIDER`, `TALENT`, `WORKER`), `verification_status` (`UNVERIFIED`, `PENDING`, `VERIFIED`).
  - Presentation & Media: `headline`, `description`, `experience_summary`, `logo`, `cover_image`, `is_public`.
  - Categories & Talent: `categories`, `primary_category`, `talent_category`, `performance_styles` (ArrayField), `specializations` (ArrayField), `languages` (ArrayField).
  - Contact & Social: `contact`, `website`, `instagram`, `youtube`, `availability_note`.
- **`ProviderService`** (`apps/profiles/models.py`):
  - `provider`, `category`, `title`, `description`, `base_price_paise`, `is_active`.
  - Individual Service Providers enforce single primary category specialization.
- **`ProviderCoverage`** (`apps/profiles/models.py`):
  - `provider`, `pin_code` (6-digit), `locality`, `city`, `state`.
  - Strict matching requirement: event matching uses exact PIN code coverage.
- **`PortfolioItem`** (`apps/profiles/models.py`):
  - `profile`, `title`, `description`, `category`, `event_date`, `media` (Cloud/local file upload), `external_url` (YouTube/Vimeo link), `media_kind` (`IMAGE`, `VIDEO`, `DOCUMENT`, `LINK`), `visibility` (`PUBLIC`, `PRIVATE`), `position`.
- **`ProfileTeamMember`** (`apps/profiles/models.py`):
  - `profile`, `user`, `permissions` (`MANAGE_BUSINESS_PROFILE`, `MANAGE_PORTFOLIO`, `MANAGE_SERVICES`, `MANAGE_TEAM`, `VIEW_EVENTS`, `MANAGE_EVENTS`).

---

## 3. API Infrastructure

### 3.1 Public Discovery & Profile Endpoints (`apps/matching`)
- **`GET /api/v1/directory/providers/` (`PublicDirectoryView`)**:
  - Filterable by `q` (name, headline, description, city), `category`, `kind`, and `location` (city, locality, PIN code).
  - Returns public, verified/approved active profiles (`is_public=True`) with cover images, logos, metrics, and starting prices.
- **`GET /api/v1/providers/<pk_or_username>/` (`ProviderDetailView`)**:
  - Permissions: `AllowAny`.
  - Dual lookup: resolves either by UUID `id` or string `username` (slug).
  - Returns comprehensive profile payload:
    - Business details, badges, verification status, kind, contact.
    - Active services with starting prices in rupees/paise.
    - Public portfolio items categorized into photo albums and video embeds.
    - Public team members (for managers).
    - Service coverage PIN codes, localities, and cities.
    - Rating & authentic review counts.

### 3.2 Provider Self-Management Endpoints (`apps/profiles`)
- `GET /api/v1/me/provider-profile/` & `PUT /api/v1/me/provider-profile/`: Full profile updates including `is_public`, social links, media, and experience summary.
- `GET/POST /api/v1/me/provider-services/` & `PATCH/DELETE /api/v1/me/provider-services/<id>/`: Granular service lifecycle and price configuration.
- `GET/POST /api/v1/me/provider-coverage/` & `DELETE /api/v1/me/provider-coverage/<id>/`: Direct coverage location management.
- `GET/POST /api/v1/profiles/portfolio/` & `DELETE /api/v1/profiles/portfolio/<id>/`: Multipart upload and showcase management.
- `GET/POST /api/v1/profiles/team-members/` & `DELETE /api/v1/profiles/team-members/<id>/`: Delegated assistant management.

---

## 4. Frontend Experience & WedMeGood Structure

### 4.1 Unified Profile Management (`/app/provider/profile`)
1. **Consolidated Architecture**: Removed separate standalone Coverage page from sidebar navigation; redirected `/app/provider/coverage` to `/app/provider/profile?tab=coverage`.
2. **Tabbed Navigation**:
   - `Profile Details`: Business name, clean username, headline, role, talent specifics, story/description, experience & track record, languages, specializations, contacts, social media, logo URL, cover URL, and public listing toggle.
   - `Services & Pricing`: List of active/hidden services, edit modal for starting price and description, add service category (with 1-category enforcement for Individual SP).
   - `Service Coverage`: Add/remove exact PIN codes, localities, cities, and states.
   - `Portfolio & Showcase`: Add photo/video showcase items with category, description, and visibility toggle.
   - `Team & Delegation`: Manager-only delegation of profile & quoting permissions.
   - `Manager Affiliation`: Associated Service Provider connection to management agencies.
3. **Readiness & Strength Meter**: Real-time calculated score (0-100%) indicating completeness across identity, story, coverage, services, social, and showcase items.
4. **Preview Public Profile**: 1-click CTA previewing public profile in new tab.

### 4.2 Customer-Facing Public Profile (`/providers/:id` & `/providers/:username`)
Structured with 12 distinct WedMeGood sections:
1. **Hero Header**: 16:9 full-width cover banner, high-res avatar/logo, verified badge, quick metrics strip (4.9 ★ Rating, Verified Business, Starting Price, Coverage Cities).
2. **Sticky Navigation Bar**: Smooth-scrolling tabs (`About`, `Services & Packages`, `Photos`, `Videos`, `Experience`, `Coverage`, `Reviews`).
3. **Main Content Grid & Sticky Enquiry Card**:
   - Left 68%: Comprehensive section breakdowns.
   - Right 32%: Sticky "Send Enquiry / Request Quote" card displaying direct starting price, phone/contact reveal, and instant quote wizard CTA.
4. **Mobile Bottom Action Bar**: Fixed at bottom of mobile viewports with quick Call and "Request Quote" buttons.
5. **Interactive Media Showcase**:
   - Photo Albums with grid layouts and full-screen `LightboxModal` supporting Next/Previous arrow navigation and keyboard escape.
   - Embedded responsive 16:9 iframe players for YouTube and Vimeo video performances.
6. **Enquiry & Direct Quoting**: "Request a Quote" opens `/app/events/new?provider=:id&category=:cat&providerName=:name`, pre-populates event brief, displays direct request banner, and automatically invites the provider on publish.
