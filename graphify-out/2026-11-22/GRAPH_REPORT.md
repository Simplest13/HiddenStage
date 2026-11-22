# Graph Report - HiddenStage  (2026-11-21)

## Corpus Check
- 309 files · ~273,678 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .css 12, (none) 5, .example 2)

## Summary
- 3555 nodes · 8899 edges · 158 communities (132 shown, 26 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 727 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c5d40fc3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Auth Guards & Admin Routing
- Events Domain Models & APIs
- Quotation UI & Acceptance Dialogs
- Administration Serializers
- Quotation Models & Revisions
- Admin Pages & Moderation UI
- AuthProvider.tsx
- quotations/services.py
- Provider Catalog & Routing
- events/models.py
- CI/CD Workflows
- test_attachments.py
- Network & Assignment Serializers
- types.ts
- Commitment
- network/services.py
- Module 16
- Module 17
- Module 18
- live-browser.js
- Module 20
- Module 21
- resumeSession
- connectSSE
- modern-screenshot.umd.js
- Module 25
- el
- make_customer
- Module 28
- initPageChat
- Module 31
- User
- ProfileTeamMember
- verification_required
- showToast
- new-work.md
- profiles/views.py
- Module 38
- Module 39
- live.md
- HiddenStage Development Recovery Report
- Module 42
- RegisterSerializer
- SKILL.md
- Module 45
- submitted_quotation
- updatePendingCounter
- Module 48
- ProviderProfile
- Responsive Design
- HiddenStage — Milestone 3 Completion Report
- Module 52
- Module 53
- CustomerProfile
- initGlobalBar
- captureElementToBlob
- animate.md
- Module 58
- Module 59
- onboard.md
- Impeccable Asset Producer
- The Toolkit
- Production Readiness Audit
- Module 64
- Vercel Deployment Guide
- createLiveBrowserDomHelpers
- Module 67
- createLiveBrowserSessionState
- Launch Readiness Report
- react
- onAnnotDown
- actOnAgentTarget
- scheduleAcceptCleanup
- Generate Report
- Module 75
- audit.native.md
- Module 77
- Module 78
- Handle `generate`
- Deployment Architecture
- new-work-world.md
- AdminPages.tsx
- Module 83
- New visual work
- Module 85
- Module 86
- Module 87
- optimize.md
- Scan mode (approach C: auto-extract, then confirm descriptive language)
- 0002_immutability_triggers.py
- VerificationDisabledRegistrationTests
- Module 92
- critique.md
- Simplify the Design
- Hardening Dimensions
- Milestone 3 — Manager–Worker Network & Assignment Management Plan
- The 5 Professional Types
- clarify.md
- Nielsen's 10 Heuristics
- document.md
- polish.md
- quieter.md
- Reference Product Analysis
- HiddenStage Repository and Documentation Recovery
- Generate Combined Critique Report
- Cognitive Load Assessment
- Init flow
- syncEditBadgeHitProxies
- HiddenStage Architecture
- Continuous Integration Pipeline Guide
- Detailed Test Logs & Verification Evidence
- Pre-Launch Final Checklist
- Common Cognitive Load Violations
- iOS platform
- Operate mode depth (and Read notes)
- Shape
- adapt.native.md
- Android platform
- Persona-Based Design Testing
- Extract Flow
- Browser QA Report
- Impeccable Finish Reviewer
- Impeccable Manual Edit Applier
- Impeccable Finish Reviewer
- Impeccable Manual Edit Applier
- live-browser-ignores.js
- Impeccable Motion Reviewer
- Design System
- Frontend Architecture
- HiddenStage Frontend
- Impeccable Documenter
- Impeccable Documenter
- Visualize: Direction Comps & Asset Production
- parseRupeesToPaise
- README.md
- RocketRide: AI Pipeline & App Platform
- 3. New database models and fields
- Production Hardening Plan
- RocketRide: AI Pipeline & App Platform
- Scoring the report
- HiddenStage Engineering Roadmap
- hasTextRows
- parse_time
- ROUTE_MAP.md
- generated/README.md

## God Nodes (most connected - your core abstractions)
1. `Button` - 70 edges
2. `ProviderProfile` - 59 edges
3. `User` - 52 edges
4. `Event` - 50 edges
5. `Spinner()` - 49 edges
6. `Badge()` - 44 edges
7. `useApiData()` - 42 edges
8. `make_customer()` - 41 edges
9. `Input` - 41 edges
10. `Commitment` - 40 edges

## Surprising Connections (you probably didn't know these)
- `Feature matrix` --references--> `UserRole`  [INFERRED]
  docs/WORKFLOW_GAP_ANALYSIS.md → hiddenstage-backend/apps/accounts/models.py
- `9. Availability logic` --references--> `User`  [INFERRED]
  docs/MILESTONE_3_COMPLETION_REPORT.md → hiddenstage-backend/apps/accounts/models.py
- `4. Availability` --references--> `User`  [INFERRED]
  docs/MILESTONE_3_IMPLEMENTATION_PLAN.md → hiddenstage-backend/apps/accounts/models.py
- `7. Permission rules` --references--> `Commitment`  [INFERRED]
  docs/MILESTONE_3_COMPLETION_REPORT.md → hiddenstage-backend/apps/commitments/models.py
- `Assignment management` --references--> `Commitment`  [INFERRED]
  docs/MILESTONE_3_COMPLETION_REPORT.md → hiddenstage-backend/apps/commitments/models.py

## Import Cycles
- None detected.

## Communities (158 total, 26 thin omitted)

### Community 0 - "Auth Guards & Admin Routing"
Cohesion: 0.06
Nodes (58): SessionUser, useAuth(), useAuthActions(), AdminLoginPage, RequireAdmin(), RequireAdminOrLogin(), RequireAuthentication(), RequireCompletedProvider() (+50 more)

### Community 1 - "Events Domain Models & APIs"
Cohesion: 0.05
Nodes (28): 3. Defects found and fixed, Phase 2 — Functional Bug Fixes, detect_content_type(), scan_attachment(), validate_attachment_upload(), Event, Meta, ScanStatus (+20 more)

### Community 2 - "Quotation UI & Acceptance Dialogs"
Cohesion: 0.06
Nodes (53): QuotesPage, customerEventEditPath(), Entry, EventDetailPage(), EventProvidersPage(), EventQuotesPage(), EventWorkspacePage(), refreshAll() (+45 more)

### Community 3 - "Administration Serializers"
Cohesion: 0.07
Nodes (48): AdminAuditAction, AdminBusinessRepSerializer, Meta, AdminBusinessSerializer, Meta, AdminBusinessUpdateSerializer, AdminCategorySerializer, Meta (+40 more)

### Community 4 - "Quotation Models & Revisions"
Cohesion: 0.07
Nodes (30): QuotationAdmin, QuotationItemInline, QuotationRevisionAdmin, QuotationRevisionInline, Quotation, Meta, QuotationItem, Meta (+22 more)

### Community 5 - "Admin Pages & Moderation UI"
Cohesion: 0.09
Nodes (50): providerQuotePath(), AdminAuditPage(), AdminBusinessesPage(), AdminModerationPage(), AdminOverviewPage(), AdminPages(), CommitmentsPage(), QuotesPage() (+42 more)

### Community 6 - "AuthProvider.tsx"
Cohesion: 0.16
Nodes (17): anonymousAuthState, AuthActions, AuthContext, authenticated(), AuthProvider(), toSessionUser(), AccountRole, AuthState (+9 more)

### Community 7 - "quotations/services.py"
Cohesion: 0.09
Nodes (32): verification_satisfied(), get_overview_metrics(), BusinessRuleViolation, Conflict, event_status(), EventStatus, RequirementStatus, validate_event_can_be_edited() (+24 more)

### Community 8 - "Provider Catalog & Routing"
Cohesion: 0.07
Nodes (43): PublicPages, providerDetailPath(), serviceCategoryPath(), categoryName(), DemoProvider, demoProviders, serviceCategories, ServiceCategory (+35 more)

### Community 9 - "events/models.py"
Cohesion: 0.05
Nodes (35): Migration, Migration, AdminAuditLog, Meta, Migration, money_field(), non_negative_check(), TimeStampedModel (+27 more)

### Community 10 - "CI/CD Workflows"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, run, defaults, env, name, runs-on (+37 more)

### Community 11 - "test_attachments.py"
Cohesion: 0.07
Nodes (6): attachment_url(), AttachmentStorageTests, MediaStorageConfigurationTests, _database_from_url(), env_int(), _samesite()

### Community 12 - "Network & Assignment Serializers"
Cohesion: 0.08
Nodes (31): 4. Generated API schema — CLOSED, HIGH-4 — OpenAPI schema silently omits the network endpoints (OPEN), IsProvider, AssignmentActionSerializer, AssignmentCreateSerializer, AvailabilityQuerySerializer, AvailabilityResponseSerializer, NetworkAssociationEndSerializer (+23 more)

### Community 13 - "types.ts"
Cohesion: 0.05
Nodes (59): assignmentStatusLabels, Page, eventsApi, EventWritePayload, RequirementPayload, DiscoveryParams, PublicDirectoryParams, QuoteItemPayload (+51 more)

### Community 14 - "Commitment"
Cohesion: 0.05
Nodes (34): 2. Existing functionality reused, CommitmentAdmin, CommitmentAuditInline, CommitmentLineInline, Commitment, Meta, CommitmentAction, CommitmentAudit (+26 more)

### Community 15 - "network/services.py"
Cohesion: 0.08
Nodes (43): 2. New models (`apps/network`), `NetworkAssociation`, `NetworkInvitation`, `WorkerAssignment`, 6. Verified clean (no action), Changes delivered in Milestone 3, AssignmentStatus, AssociationStatus (+35 more)

### Community 16 - "Module 16"
Cohesion: 0.08
Nodes (32): devDependencies, jsdom@^29.1.1, oxlint@^1.89.0, @playwright/test@^1.64.1, @testing-library/dom@^10.4.2, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+24 more)

### Community 17 - "Module 17"
Cohesion: 0.07
Nodes (49): EventPages, allowedTypes, Attachments(), handleDownload(), BasicDetails(), blankRequirement(), blankValues(), budgetToPaise() (+41 more)

### Community 18 - "Module 18"
Cohesion: 0.06
Nodes (10): AccountsConfig, AdministrationConfig, CommitmentsConfig, CoreConfig, EventsConfig, InvitationsConfig, MatchingConfig, NetworkConfig (+2 more)

### Community 19 - "live-browser.js"
Cohesion: 0.03
Nodes (145): absolutizeUrls(), addManualContextText(), applyGlobalBarLabelState(), applyOriginalAttrsToSvelteAnchor(), applyParamDefaults(), applyParamValue(), applyPlaceholderSizingStyles(), applySavedParamValues() (+137 more)

### Community 20 - "Module 20"
Cohesion: 0.07
Nodes (29): concurrency, cancel-in-progress, group, run, VITE_API_BASE_URL, jobs, vite, name (+21 more)

### Community 21 - "Module 21"
Cohesion: 0.17
Nodes (18): ARTIFACTS, completeCustomerOnboarding(), completeProviderOnboarding(), login(), optionalFill(), PASSWORD, publishEventRequest(), register() (+10 more)

### Community 22 - "resumeSession"
Cohesion: 0.05
Nodes (92): abortSvelteComponentInjection(), applySavedSessionMeta(), buildParamsPanel(), clampVariantIndex(), clearHandled(), closedClipPath(), completeParameterGenerationIfReady(), completeParameterPublication() (+84 more)

### Community 23 - "connectSSE"
Cohesion: 0.09
Nodes (68): applyLiveBarPreference(), beginNewLiveConfiguration(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup(), cleanupAcceptedSession(), clearAnnotations() (+60 more)

### Community 24 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 25 - "Module 25"
Cohesion: 0.07
Nodes (27): build, command, depends_on, env_file, environment, ports, condition, environment (+19 more)

### Community 26 - "el"
Cohesion: 0.08
Nodes (54): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+46 more)

### Community 27 - "make_customer"
Cohesion: 0.06
Nodes (16): UserRole, AdminAuthorizationTests, AdminWorkflowTests, AcceptanceVerificationSwitchTests, ensure_categories(), invite_and_accept(), make_customer(), make_event() (+8 more)

### Community 28 - "Module 28"
Cohesion: 0.14
Nodes (14): get_owned_event(), Invitation, Meta, InvitationCreateSerializer, InvitationSerializer, Meta, ProviderInvitationSerializer, Meta (+6 more)

### Community 30 - "initPageChat"
Cohesion: 0.08
Nodes (52): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+44 more)

### Community 31 - "Module 31"
Cohesion: 0.09
Nodes (22): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, jsx, lib, module (+14 more)

### Community 32 - "User"
Cohesion: 0.08
Nodes (12): UserAdmin, User, Meta, normalize_phone(), normalize_pin_code(), normalize_text(), validate_indian_mobile(), validate_pin_code() (+4 more)

### Community 33 - "ProfileTeamMember"
Cohesion: 0.05
Nodes (33): Approved constraints, HiddenStage Decision Log, Unresolved decisions, Workspace decisions for this restart, Global Constraints, HiddenStage Functional Upgrade Implementation Plan, Phase 1 — Codebase Reconnaissance & Schema Synchronization, Phase 3 — Professional Identity Architecture & Onboarding (+25 more)

### Community 34 - "verification_required"
Cohesion: 0.13
Nodes (3): verification_required(), RegistrationTests, VerificationPolicyTests

### Community 35 - "showToast"
Cohesion: 0.08
Nodes (41): abandonForeignSession(), abandonSupersededGo(), applyEditing(), buildLocatorForLeaf(), collectEditableTextRows(), visit(), copyEditContainerContext(), copyEditLeafContext() (+33 more)

### Community 36 - "new-work.md"
Cohesion: 0.06
Nodes (29): Craft (deprecated alias), Monorepo notes, Opting out of the boot check, Step 1: Run the pass, Step 2: Act by severity, Step 3: Deprecated fields are binding, Step 4: Do not overclaim on truth drift, Step 5: Compact DESIGN.md only with consent (+21 more)

### Community 37 - "profiles/views.py"
Cohesion: 0.06
Nodes (27): 3.1 Public Discovery & Profile Endpoints (`apps/matching`), IsCustomer, ReadOnly, HealthView, DiscoveryQuerySerializer, OpportunityRequirementSerializer, ProviderDetailSerializer, ProviderMatchSerializer (+19 more)

### Community 38 - "Module 38"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, lib, module, moduleDetection, noEmit (+11 more)

### Community 39 - "Module 39"
Cohesion: 0.12
Nodes (16): _frontend_link(), send_password_reset_email(), send_verification_email(), EmailOnlySerializer, LoginSerializer, TokenSerializer, UserSerializer, Meta (+8 more)

### Community 40 - "live.md"
Cohesion: 0.06
Nodes (33): Apply at system scale, Audit before choosing, Choose a strategy, Contrast and perception, Live-mode signature params, Verify, Visitor mode, Step 1: Parse the request (+25 more)

### Community 41 - "HiddenStage Development Recovery Report"
Cohesion: 0.06
Nodes (31): Baseline verification, Completed work, Failed or blocked work, HiddenStage Development Recovery Report, Last known checkpoint, Partially completed work, Pending work, Recommended continuation (+23 more)

### Community 42 - "Module 42"
Cohesion: 0.23
Nodes (11): customerEventPath(), CustomerPages(), DashboardPage(), firstName(), latestTotal(), Page, RequestRow(), RequestsPage() (+3 more)

### Community 44 - "SKILL.md"
Cohesion: 0.07
Nodes (25): Before you finish, Scope is sovereign, The amplification, The skeleton test, Why it reads flat, Craft floor, Refuse, Verify (+17 more)

### Community 45 - "Module 45"
Cohesion: 0.17
Nodes (8): hash_token(), PasswordResetToken, Meta, SingleUseToken, Meta, PasswordResetConfirmSerializer, InvalidOrExpiredToken, PasswordResetConfirmView

### Community 46 - "submitted_quotation"
Cohesion: 0.12
Nodes (6): AcceptanceSetup, commitment_id(), PackageAcceptanceTests, SimpleAcceptanceTests, submitted_quotation(), QuotationLifecycleTests

### Community 47 - "updatePendingCounter"
Cohesion: 0.17
Nodes (27): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+19 more)

### Community 48 - "Module 48"
Cohesion: 0.21
Nodes (9): App(), AppProviders(), queryClient, routeConfig, router, customer, renderRoute(), renderRoute() (+1 more)

### Community 49 - "ProviderProfile"
Cohesion: 0.05
Nodes (29): 1. Existing functionality reused, 1. Overview & Objective, 2.1 Authoritative Neon PostgreSQL Database Models, 2. Architecture & Data Model, 3.2 Provider Self-Management Endpoints (`apps/profiles`), 3. API Infrastructure, 4.1 Unified Profile Management (`/app/provider/profile`), 4.2 Customer-Facing Public Profile (`/providers/:id` & `/providers/:username`) (+21 more)

### Community 50 - "Responsive Design"
Cohesion: 0.08
Nodes (25): Assess Adaptation Challenge, Breakpoints: Content-Driven, Content Adaptation, Desktop Adaptation (Mobile → Desktop), Detect Input Method, Not Just Screen Size, Email Adaptation (Web → Email), Implement Adaptations, Layout Adaptation Patterns (+17 more)

### Community 51 - "HiddenStage — Milestone 3 Completion Report"
Cohesion: 0.08
Nodes (24): 10. Notification behavior, 11. Tests performed and actual results, 12. Known limitations, 13. Deferred decisions, 14. Remaining work for the next milestone, 15. Files changed for this milestone, 1. What was implemented, 4. Migrations (+16 more)

### Community 52 - "Module 52"
Cohesion: 0.14
Nodes (3): EmailBackend, normalize_email_address(), UserManager

### Community 54 - "CustomerProfile"
Cohesion: 0.12
Nodes (9): CustomerProfile, Meta, CustomerProfileSerializer, Meta, ManagerSearchSerializer, Meta, CustomerProfileView, ManagerSearchView (+1 more)

### Community 55 - "initGlobalBar"
Cohesion: 0.12
Nodes (24): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), detectPageTheme(), ensureAgentPollTooltip(), ensureSpinKeyframes(), hideAgentPollTooltip() (+16 more)

### Community 56 - "captureElementToBlob"
Cohesion: 0.11
Nodes (23): averageRgb01(), captureAndEmit(), captureChromeNodes(), captureElementFromRenderedAncestor(), captureElementToBlob(), checkpointPayload(), compileShader(), cssColorToRgb01() (+15 more)

### Community 57 - "animate.md"
Cohesion: 0.09
Nodes (20): Accessibility and control, Choose material by meaning, Find the job, Hover, Implement to the runtime, Set the motion thesis, Timing and easing, Verify (+12 more)

### Community 58 - "Module 58"
Cohesion: 0.18
Nodes (5): customerEvent, customerProfile, customerSession, providerProfile, providerSession

### Community 60 - "onboard.md"
Cohesion: 0.09
Nodes (22): Assess Onboarding Needs, Context Over Ceremony, Contextual Help, Design Onboarding Experiences, Documentation & Help, Empty State Design, Feature Discovery & Adoption, Guided Tours & Walkthroughs (+14 more)

### Community 61 - "Impeccable Asset Producer"
Cohesion: 0.10
Nodes (18): Core Rule, Decision Comps, Impeccable Asset Producer, Input Contract, Output Contract, Review handoff, The job, Act on the receipt (+10 more)

### Community 62 - "The Toolkit"
Cohesion: 0.10
Nodes (20): Animate complex properties, Assess What "Extraordinary" Means Here, For data-heavy interfaces, For functional UI, For performance-critical UI, For visual/marketing surfaces, Implement with Discipline, Interact with the device (+12 more)

### Community 63 - "Production Readiness Audit"
Cohesion: 0.10
Nodes (19): 1. Media storage (was: local-only, unsafe on ephemeral hosts) — CLOSED, 1. Method and evidence, 2. Blockers, 2. Production static files — CLOSED, 3. Dependency pinning — CLOSED, 3. High priority, 4. Medium priority, 5. Browser-based verification — CLOSED (+11 more)

### Community 64 - "Module 64"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:e2e, test:watch (+1 more)

### Community 65 - "Vercel Deployment Guide"
Cohesion: 0.10
Nodes (19): 10. Running migrations, 11. Production verification checklist, 12. Rollback, 13. Common failures, 1. Prerequisites, 2. Create the Vercel project, 3. Environment variables, 4. Custom domain (recommended) (+11 more)

### Community 66 - "createLiveBrowserDomHelpers"
Cohesion: 0.16
Nodes (15): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal() (+7 more)

### Community 67 - "Module 67"
Cohesion: 0.29
Nodes (3): format_paise(), paise_to_rupees(), rupees_to_paise()

### Community 68 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 69 - "Launch Readiness Report"
Cohesion: 0.11
Nodes (18): 10. Remaining blockers, 11. Exact next steps to deploy, 1. What changed, 3. How the switch works, 4. Authentication test results, 5. Production build, 6. Backend checks, 7. Database status (+10 more)

### Community 70 - "react"
Cohesion: 0.12
Nodes (12): Tabs(), Drawer(), OverlayProps, useOverlay(), ButtonProps, FieldProps, InputProps, ToastMessage (+4 more)

### Community 71 - "onAnnotDown"
Cohesion: 0.18
Nodes (19): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords() (+11 more)

### Community 72 - "actOnAgentTarget"
Cohesion: 0.26
Nodes (18): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+10 more)

### Community 73 - "scheduleAcceptCleanup"
Cohesion: 0.18
Nodes (17): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), commitAcceptedSvelteComponentToDom(), commitAcceptedVariantToDom(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey() (+9 more)

### Community 74 - "Generate Report"
Cohesion: 0.12
Nodes (15): 1. Accessibility (A11y), 2. Performance, 3. Theming, 4. Responsive Design, 5. Implementation Integrity (CRITICAL), Audit Health Score, Detailed Findings by Severity, Diagnostic Scan (+7 more)

### Community 75 - "Module 75"
Cohesion: 0.29
Nodes (6): buildCommand, framework, installCommand, outputDirectory, rewrites, $schema

### Community 76 - "audit.native.md"
Cohesion: 0.12
Nodes (15): 1. Accessibility (VoiceOver / TalkBack), 2. Performance, 3. Appearance & Theming, 4. Platform Conformance (CRITICAL), 5. Adaptivity, Audit Health Score, Detailed Findings by Severity, Diagnostic Scan (+7 more)

### Community 77 - "Module 77"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 78 - "Module 78"
Cohesion: 0.29
Nodes (7): dependencies, kubai-icons-react@^0.13.1, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, @tanstack/react-query@^5.105.3, react-dom

### Community 79 - "Handle `generate`"
Cohesion: 0.12
Nodes (16): 1. Read the screenshot (if present), 2. Wrap the element, 3. Load the action's reference, 4. Plan three variants: identity first, then mode, then axes, 5. Apply the freeform prompt (if present), 6. Deliver variants, 7. Parameters (composition-sized, 0-4 per variant), 8. Signal done (+8 more)

### Community 80 - "Deployment Architecture"
Cohesion: 0.13
Nodes (14): 10. Environment variables (backend), 1. Topology at a glance, 2. Frontend — Vercel, 3. Backend — persistent Python host, 4. Database — Neon PostgreSQL, 5. How the browser talks to the API, 6. CORS and CSRF, 7. Media (attachments) (+6 more)

### Community 81 - "new-work-world.md"
Cohesion: 0.13
Nodes (11): Comps, Directions, Operate, Comps, Directions, Persuade and Experience, Comps, Directions (+3 more)

### Community 82 - "AdminPages.tsx"
Cohesion: 0.20
Nodes (11): AdminPages, adminApi, AdminAuditEntry, AdminBusiness, AdminCategory, AdminCommitment, AdminEvent, AdminOverviewData (+3 more)

### Community 84 - "New visual work"
Cohesion: 0.14
Nodes (14): 1. Decide what is already true, 2. Ask what will change the work, 3. Choose the right amount of invention, 4. Commit the world, 5. Record the decision, 6. Build with full commitment, 7. Inspect and finish, Both paths (+6 more)

### Community 85 - "Module 85"
Cohesion: 0.60
Nodes (3): NetworkAssociationAdmin, NetworkInvitationAdmin, WorkerAssignmentAdmin

### Community 88 - "optimize.md"
Cohesion: 0.14
Nodes (13): Animation Performance, Assess Performance Issues, Core Web Vitals Optimization, Cumulative Layout Shift (CLS < 0.1), Interaction to Next Paint (INP < 200ms), Largest Contentful Paint (LCP < 2.5s), Loading Performance, Network Optimization (+5 more)

### Community 89 - "Scan mode (approach C: auto-extract, then confirm descriptive language)"
Cohesion: 0.15
Nodes (13): Component translation rules, Narrative mapping, Scan mode (approach C: auto-extract, then confirm descriptive language), Schema, Step 1: Find the design assets, Step 2: Auto-extract what can be auto-extracted, Step 2b: Stage the frontmatter, Step 3: Ask the user for qualitative language (+5 more)

### Community 91 - "VerificationDisabledRegistrationTests"
Cohesion: 0.17
Nodes (4): 2. What was preserved, EmailVerificationToken, Meta, VerificationDisabledRegistrationTests

### Community 93 - "critique.md"
Cohesion: 0.17
Nodes (11): Action Summary, Ask the User, Assessment A: Design Review, Assessment B: Detector + Browser Evidence, Assessment Orchestration, Deliver the Report, Hard Invariants, Persist the Snapshot (+3 more)

### Community 94 - "Simplify the Design"
Cohesion: 0.17
Nodes (11): Assess Current State, Code Simplification, Content Simplification, Document Removed Complexity, Information Architecture, Interaction Simplification, Layout Simplification, Plan Simplification (+3 more)

### Community 95 - "Hardening Dimensions"
Cohesion: 0.17
Nodes (11): Accessibility Resilience, Assess Hardening Needs, Edge Cases & Boundary Conditions, Error Handling, Hardening Dimensions, Input Validation & Sanitization, Internationalization (i18n), Performance Resilience (+3 more)

### Community 96 - "Milestone 3 — Manager–Worker Network & Assignment Management Plan"
Cohesion: 0.18
Nodes (10): 10. Open decisions, 11. Verification plan, 3. State transitions and rules, 4. Availability, 5. API surface, 6. Frontend changes, 7. Permissions, 8. Notifications (+2 more)

### Community 97 - "The 5 Professional Types"
Cohesion: 0.18
Nodes (10): 1. MANAGER, 2. INDIVIDUAL SERVICE PROVIDER, 3. ASSOCIATED SERVICE PROVIDER, 4. TALENT, 5. WORKER, Assistant Delegation Model (`ProfileTeamMember`), HiddenStage Professional Identity Architecture, Overview (+2 more)

### Community 98 - "clarify.md"
Cohesion: 0.18
Nodes (10): Actions and navigation, Audit the language, Errors and permissions, Forms, Help and instructional text, Loading, empty, and success states, Rewrite by function, Set the message hierarchy (+2 more)

### Community 99 - "Nielsen's 10 Heuristics"
Cohesion: 0.18
Nodes (11): 10. Help and Documentation, 1. Visibility of System Status, 2. Match Between System and Real World, 3. User Control and Freedom, 4. Consistency and Standards, 5. Error Prevention, 6. Recognition Rather Than Recall, 7. Flexibility and Efficiency of Use (+3 more)

### Community 111 - "document.md"
Cohesion: 0.18
Nodes (10): Pitfalls, Seed mode, Step 1: Route through new-work's workshop, Step 2: Write seed DESIGN.md, Step 3: Confirm, Style guidelines, The frontmatter: token schema, The markdown body: eight sections (canonical order) (+2 more)

### Community 112 - "polish.md"
Cohesion: 0.18
Nodes (10): 1. Establish the system, 2. Gather the evidence, 3. Triage, 4. Polish the whole path, 5. Verify and finish, Color, imagery, and icons, Content and code, Flow and hierarchy (+2 more)

### Community 113 - "quieter.md"
Cohesion: 0.18
Nodes (10): Assess Current State, Color Refinement, Composition Refinement, Motion Reduction, Plan Refinement, Refine the Design, Simplification, Verify Quality (+2 more)

### Community 115 - "Reference Product Analysis"
Cohesion: 0.20
Nodes (9): Differences and non-copying requirements, Follow-up research, HiddenStage mechanics to preserve, Observed workflows and mechanics, Reference Product Analysis, Screens and routes to plan, Sources and access, Unavailable pages and assumptions (+1 more)

### Community 116 - "HiddenStage Repository and Documentation Recovery"
Cohesion: 0.20
Nodes (9): Canonical source recommendations, Documentation recovery, Duplicate and conflicting copies, Findings at a glance, GitHub access check, HiddenStage-named candidates, HiddenStage Repository and Documentation Recovery, Other Git repositories inspected (+1 more)

### Community 117 - "Generate Combined Critique Report"
Cohesion: 0.20
Nodes (10): Design Health Score, Design Specificity Verdict, Generate Combined Critique Report, Minor Observations, Overall Impression, Persona Red Flags, Priority Issues, Questions to Consider (+2 more)

### Community 118 - "Cognitive Load Assessment"
Cohesion: 0.20
Nodes (9): Cognitive Load Assessment, Cognitive Load Checklist, Critique rubric, Extraneous Load: Bad Design, Germane Load: Learning Effort, Heuristics Scoring Guide, Intrinsic Load: The Task Itself, The Working Memory Rule (+1 more)

### Community 119 - "Init flow"
Cohesion: 0.20
Nodes (10): Completion gate, Init flow, Step 1: Load current state, Step 2: Explore the project, Step 3: Interview for product truth, Step 4: Write PRODUCT.md, Step 5: Record workflow defaults, Step 6: Wrap up or resume (+2 more)

### Community 120 - "syncEditBadgeHitProxies"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 121 - "HiddenStage Architecture"
Cohesion: 0.22
Nodes (8): API and data constraints, Backend domain boundaries, External integrations, HiddenStage Architecture, Not yet decided, Repository boundaries, Status, System shape

### Community 122 - "Continuous Integration Pipeline Guide"
Cohesion: 0.22
Nodes (8): 1. Triggers, 2. Backend job, 3. Frontend job, 4. Security posture, 5. Interpreting failures, 6. Running the same checks locally, 7. Status of this pipeline, Continuous Integration Pipeline Guide

### Community 123 - "Detailed Test Logs & Verification Evidence"
Cohesion: 0.22
Nodes (8): 1. Playwright Functional Upgrade E2E Suite (`e2e/functional-upgrade.spec.ts`), 2. Attachment Download Authorization Suite (`apps.events.test_attachments`), 3. Backend Unit & Regression Suites, 4. Frontend Vitest & Build Verification, Architectural Conclusions, Detailed Test Logs & Verification Evidence, HiddenStage Functional Upgrade & Professional Architecture Test Report, Test Execution Matrix

### Community 124 - "Pre-Launch Final Checklist"
Cohesion: 0.22
Nodes (8): Backend, Deployment, Frontend, Known gaps at launch, Launch gate, Pre-Launch Final Checklist, Quality, Security

### Community 125 - "Common Cognitive Load Violations"
Cohesion: 0.22
Nodes (9): 1. The Wall of Options, 2. The Memory Bridge, 3. The Hidden Navigation, 4. The Jargon Barrier, 5. The Visual Noise Floor, 6. The Inconsistent Pattern, 7. The Multi-Task Demand, 8. The Context Switch (+1 more)

### Community 126 - "iOS platform"
Cohesion: 0.22
Nodes (9): Color & materials, Components & controls, iOS platform, Layout & structure, Motion, The iOS slop test, Touch targets, Typography (+1 more)

### Community 127 - "Operate mode depth (and Read notes)"
Cohesion: 0.22
Nodes (9): Color, Components, Layout, Motion, Operate mode depth (and Read notes), Product constraints, Product permissions, The product slop test (+1 more)

### Community 128 - "Shape"
Cohesion: 0.22
Nodes (8): Cadence, Confirm and stop, Phase 1: Discovery interview, Phase 2: Resolve the design direction, Phase 3: Write the brief, Round 1: purpose, people, and outcome, Round 2: material, behavior, and boundaries, Shape

### Community 129 - "adapt.native.md"
Cohesion: 0.25
Nodes (7): Adaptation Strategies, Assess Adaptation Challenge, Implement & Verify, Orientation & foldables, Phone → Tablet (iPad / large screens), Platform → platform (iOS ↔ Android), Web → native (porting a website or web app)

### Community 130 - "Android platform"
Cohesion: 0.25
Nodes (8): Android platform, Color & theming, Components & motion, Layout & structure, The Android slop test, Touch targets, Typography, Verifying the build

### Community 131 - "Persona-Based Design Testing"
Cohesion: 0.25
Nodes (8): 1. Impatient Power User: "Alex", 2. Confused First-Timer: "Jordan", 3. Accessibility-Dependent User: "Sam", 4. Deliberate Stress Tester: "Riley", 5. Distracted Mobile User: "Casey", Persona-Based Design Testing, Project-Specific Personas, Selecting Personas

### Community 132 - "Extract Flow"
Cohesion: 0.25
Nodes (7): Extract Flow, Step 1: Discover the Design System, Step 2: Identify Patterns, Step 3: Plan Extraction, Step 4: Extract & Enrich, Step 5: Migrate, Step 6: Document

### Community 133 - "Browser QA Report"
Cohesion: 0.29
Nodes (6): 1. Environment, 2. Scenario results, 4. Console and network observations, 5. Not covered by browser QA, 6. Artifacts, Browser QA Report

### Community 134 - "Impeccable Finish Reviewer"
Cohesion: 0.29
Nodes (6): Checks, in order, Disposition, Impeccable Finish Reviewer, Input Contract, Output Contract, Verdict Pass

### Community 135 - "Impeccable Manual Edit Applier"
Cohesion: 0.29
Nodes (6): Checks, Entry Atomicity, Impeccable Manual Edit Applier, Input Contract, Output Contract, Workflow

### Community 136 - "Impeccable Finish Reviewer"
Cohesion: 0.29
Nodes (6): Checks, in order, Disposition, Impeccable Finish Reviewer, Input Contract, Output Contract, Verdict Pass

### Community 137 - "Impeccable Manual Edit Applier"
Cohesion: 0.29
Nodes (6): Checks, Entry Atomicity, Impeccable Manual Edit Applier, Input Contract, Output Contract, Workflow

### Community 138 - "live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 139 - "Impeccable Motion Reviewer"
Cohesion: 0.33
Nodes (5): Checks, in order, Impeccable Motion Reviewer, Input Contract, Output Contract, Verdict Pass

### Community 140 - "Design System"
Cohesion: 0.33
Nodes (5): Design System, Responsive and motion behavior, Shared controls, Tokens, Visual direction

### Community 141 - "Frontend Architecture"
Cohesion: 0.33
Nodes (5): Application shape, Data and API boundaries, Decisions and constraints, Frontend Architecture, Route and access model

### Community 142 - "HiddenStage Frontend"
Cohesion: 0.33
Nodes (5): HiddenStage Frontend, Project map, Quality commands, Requirements, Setup

### Community 143 - "Impeccable Documenter"
Cohesion: 0.40
Nodes (4): Impeccable Documenter, Input Contract, Output Contract, Workflow

### Community 144 - "Impeccable Documenter"
Cohesion: 0.40
Nodes (4): Impeccable Documenter, Input Contract, Output Contract, Workflow

### Community 145 - "Visualize: Direction Comps & Asset Production"
Cohesion: 0.40
Nodes (5): After approval: the comp becomes a spec, Generate three compositional options, One approval point, Plates and provenance, Visualize: Direction Comps & Asset Production

### Community 146 - "parseRupeesToPaise"
Cohesion: 0.50
Nodes (5): submit(), ensureDraft(), saveDraft(), submit(), parseRupeesToPaise()

### Community 147 - "README.md"
Cohesion: 0.40
Nodes (4): HiddenStage, HiddenStage, HiddenStage, HiddenStage

### Community 148 - "RocketRide: AI Pipeline & App Platform"
Cohesion: 0.50
Nodes (3): Before writing ANY RocketRide code, Documentation, RocketRide: AI Pipeline & App Platform

### Community 149 - "3. New database models and fields"
Cohesion: 0.50
Nodes (4): 3. New database models and fields, `NetworkAssociation`, `NetworkInvitation`, `WorkerAssignment`

### Community 150 - "Production Hardening Plan"
Cohesion: 0.50
Nodes (3): Constraints honoured, Environment, Production Hardening Plan

### Community 151 - "RocketRide: AI Pipeline & App Platform"
Cohesion: 0.50
Nodes (3): Before writing ANY RocketRide code, Documentation, RocketRide: AI Pipeline & App Platform

### Community 152 - "Scoring the report"
Cohesion: 0.50
Nodes (4): Issue Severity (P0–P3), Reference Material, Score Summary, Scoring the report

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `Milestone 3 — Manager–Worker Network & Assignment Management Plan`, `Events Domain Models & APIs`, `verification_required`, `Administration Serializers`, `ProfileTeamMember`, `profiles/views.py`, `Module 39`, `quotations/services.py`, `events/models.py`, `VerificationDisabledRegistrationTests`, `RegisterSerializer`, `Commitment`, `network/services.py`, `ProviderProfile`, `HiddenStage — Milestone 3 Completion Report`, `make_customer`, `Module 28`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 34 inferred relationships involving `ProviderProfile` (e.g. with `Phase 1 — Codebase Reconnaissance & Schema Synchronization` and `1. Existing functionality reused`) actually correct?**
  _`ProviderProfile` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Should `Auth Guards & Admin Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.06394027913015254 - nodes in this community are weakly interconnected._
- **Why does `ProviderProfile` connect `ProviderProfile` to `User`, `ProfileTeamMember`, `Administration Serializers`, `Quotation Models & Revisions`, `profiles/views.py`, `quotations/services.py`, `events/models.py`, `Network & Assignment Serializers`, `Commitment`, `network/services.py`, `CustomerProfile`, `make_customer`, `Module 28`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `User` (e.g. with `2. Existing functionality reused` and `9. Availability logic`) actually correct?**
  _`User` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Should `Events Domain Models & APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.04680365296803653 - nodes in this community are weakly interconnected._
- **Why does `HiddenStage — Milestone 3 Completion Report` connect `HiddenStage — Milestone 3 Completion Report` to `3. New database models and fields`, `Commitment`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._