# Graph Report - HiddenStage  (2026-11-22)

## Corpus Check
- 263 files · ~314,858 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3816 nodes · 9095 edges · 175 communities (138 shown, 37 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 757 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163

## God Nodes (most connected - your core abstractions)
1. `ProviderProfile` - 63 edges
2. `User` - 61 edges
3. `Event` - 59 edges
4. `Commitment` - 45 edges
5. `react` - 39 edges
6. `formatPaise()` - 39 edges
7. `Button` - 39 edges
8. `connectSSE()` - 38 edges
9. `ServiceCategory` - 38 edges
10. `EventStatus` - 37 edges

## Surprising Connections (you probably didn't know these)
- `Phase 4 — Manager Search & Network Association Requests` --references--> `NetworkInvitation`  [INFERRED]
  docs/FUNCTIONAL_UPGRADE_IMPLEMENTATION_PLAN.md → hiddenstage-backend/apps/network/models.py
- `Feature matrix` --references--> `UserRole`  [INFERRED]
  docs/WORKFLOW_GAP_ANALYSIS.md → hiddenstage-backend/apps/accounts/models.py
- `1. Media storage (was: local-only, unsafe on ephemeral hosts) — CLOSED` --references--> `EventAttachmentDownloadView`  [INFERRED]
  docs/PRODUCTION_READINESS_AUDIT.md → hiddenstage-backend/apps/events/views.py
- `7. Permission rules` --references--> `Commitment`  [INFERRED]
  docs/MILESTONE_3_COMPLETION_REPORT.md → hiddenstage-backend/apps/commitments/models.py
- `9. Availability logic` --references--> `User`  [INFERRED]
  docs/MILESTONE_3_COMPLETION_REPORT.md → hiddenstage-backend/apps/accounts/models.py

## Import Cycles
- None detected.

## Communities (175 total, 37 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (83): 4. Generated API schema — CLOSED, 6. Verified clean (no action), HIGH-4 — OpenAPI schema silently omits the network endpoints (OPEN), Changes delivered in Milestone 3, AssignmentStatus, AssociationStatus, ChatMessage, Meta (+75 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (145): absolutizeUrls(), addManualContextText(), applyGlobalBarLabelState(), applyOriginalAttrsToSvelteAnchor(), applyParamDefaults(), applyParamValue(), applyPlaceholderSizingStyles(), applySavedParamValues() (+137 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (87): PublicPages, providerDetailPath(), serviceCategoryPath(), AdminAuditPage(), AdminBusinessesPage(), AdminModerationPage(), AdminOverviewPage(), AdminPages() (+79 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (72): useAuth(), useAuthActions(), useTheme(), AdminLoginPage, RequireAdmin(), RequireAdminOrLogin(), RequireAuthentication(), RequireCompletedProvider() (+64 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (36): Migration, Migration, Migration, Migration, Migration, Migration, Migration, CommitmentAction (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (77): customerEventEditPath(), EventDetailPage(), EventProvidersPage(), EventQuotesPage(), EventWorkspacePage(), refreshAll(), run(), InviteDialog() (+69 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (92): abortSvelteComponentInjection(), applySavedSessionMeta(), buildParamsPanel(), clampVariantIndex(), clearHandled(), closedClipPath(), completeParameterGenerationIfReady(), completeParameterPublication() (+84 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (37): Approved constraints, Phase 2 — Functional Bug Fixes, Executive Summary, 2.1 Authoritative Neon PostgreSQL Database Models, Changes delivered in Milestone 4 (Functional Upgrade & Professional Architecture), InvalidOrExpiredToken, can_access_event_attachments(), EventAttachmentDownloadView (+29 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (36): Phase 1 — Codebase Reconnaissance & Schema Synchronization, 1. Existing functionality reused, UserRole, AdminAuthorizationTests, AdminWorkflowTests, CommitmentStatus, PackageAcceptanceTests, ensure_categories() (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (40): CommitmentAdmin, CommitmentAuditInline, CommitmentLineInline, Commitment, Meta, CommitmentAudit, Meta, CommitmentLine (+32 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (53): providerQuotePath(), submit(), providerAuth, providerKinds, providerProfile(), renderProviderDashboard(), renderWorkspace(), getProviderDashboardPresentation() (+45 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (68): applyLiveBarPreference(), beginNewLiveConfiguration(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup(), cleanupAcceptedSession(), clearAnnotations() (+60 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (40): AdminBusinessRepSerializer, Meta, AdminBusinessSerializer, Meta, AdminBusinessUpdateSerializer, AdminCategorySerializer, Meta, AdminCategoryUpdateSerializer (+32 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (20): 2. Existing functionality reused, Notification, Meta, PasswordResetToken, Meta, ThemePreference, User, Meta (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (30): normalize_pin_code(), normalize_text(), validate_pin_code(), EventAdmin, EventAttachmentInline, ServiceRequirementInline, Event, Meta (+22 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (37): AdminAuditAction, AdminAuditLog, Meta, create_category_as_admin(), get_overview_metrics(), _log(), release_commitment_as_admin(), set_provider_verification() (+29 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (31): CustomerBookingsPage, CustomerNetworkPage, CustomerPaymentsPage, HomepageMyNetworksPage, LIFECYCLE_STEPS, CustomerPaymentsPage(), handleSimulatePayment(), loadData() (+23 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (54): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+46 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (52): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+44 more)

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, run, defaults, env, name, runs-on (+37 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (29): vitest@^5.1.0, App(), anonymousAuthState, AuthActions, AuthContext, authenticated(), AuthProvider(), toSessionUser() (+21 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (35): EventPages, allowedTypes, Attachments(), handleDownload(), BasicDetails(), blankRequirement(), blankValues(), budgetToPaise() (+27 more)

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (6): attachment_url(), AttachmentStorageTests, MediaStorageConfigurationTests, _database_from_url(), env_int(), _samesite()

### Community 24 - "Community 24"
Cohesion: 0.05
Nodes (39): 10. Remaining blockers, 11. Exact next steps to deploy, 1. What changed, 3. How the switch works, 4. Authentication test results, 5. Production build, 6. Backend checks, 7. Database status (+31 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (41): abandonForeignSession(), abandonSupersededGo(), applyEditing(), buildLocatorForLeaf(), collectEditableTextRows(), visit(), copyEditContainerContext(), copyEditLeafContext() (+33 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (33): Apply at system scale, Audit before choosing, Choose a strategy, Contrast and perception, Live-mode signature params, Verify, Visitor mode, Step 1: Parse the request (+25 more)

### Community 27 - "Community 27"
Cohesion: 0.06
Nodes (31): Baseline verification, Completed work, Failed or blocked work, HiddenStage Development Recovery Report, Last known checkpoint, Partially completed work, Pending work, Recommended continuation (+23 more)

### Community 28 - "Community 28"
Cohesion: 0.06
Nodes (26): Impeccable Documenter, Input Contract, Output Contract, Workflow, Comps, Directions, Operate, Comps (+18 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (9): CustomerProfileSerializer, Meta, ManagerSearchSerializer, Meta, ProviderProfileSerializer, Meta, CustomerProfileView, ManagerSearchView (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (18): ARTIFACTS, completeCustomerOnboarding(), completeProviderOnboarding(), login(), optionalFill(), PASSWORD, publishEventRequest(), register() (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (27): adminApi, AdminAuditEntry, AdminBusiness, AdminCategory, AdminCommitment, AdminEvent, AdminOverviewData, AdminProvider (+19 more)

### Community 32 - "Community 32"
Cohesion: 0.06
Nodes (10): AccountsConfig, AdministrationConfig, CommitmentsConfig, CoreConfig, EventsConfig, InvitationsConfig, MatchingConfig, NetworkConfig (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (29): concurrency, cancel-in-progress, group, run, VITE_API_BASE_URL, jobs, vite, name (+21 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (28): devDependencies, jsdom@^29.1.1, oxlint@^1.89.0, @playwright/test@^1.64.1, @testing-library/dom@^10.4.2, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+20 more)

### Community 35 - "Community 35"
Cohesion: 0.07
Nodes (28): 10. Notification behavior, 11. Tests performed and actual results, 12. Known limitations, 13. Deferred decisions, 14. Remaining work for the next milestone, 15. Files changed for this milestone, 1. What was implemented, 3. New database models and fields (+20 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (27): build, command, depends_on, env_file, environment, ports, condition, environment (+19 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (27): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+19 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (25): Assess Adaptation Challenge, Breakpoints: Content-Driven, Content Adaptation, Desktop Adaptation (Mobile → Desktop), Detect Input Method, Not Just Screen Size, Email Adaptation (Web → Email), Implement Adaptations, Layout Adaptation Patterns (+17 more)

### Community 39 - "Community 39"
Cohesion: 0.08
Nodes (22): Adaptation Strategies, Assess Adaptation Challenge, Implement & Verify, Orientation & foldables, Phone → Tablet (iPad / large screens), Platform → platform (iOS ↔ Android), Web → native (porting a website or web app), Color & materials (+14 more)

### Community 40 - "Community 40"
Cohesion: 0.08
Nodes (23): Android platform, Color & theming, Components & motion, Layout & structure, The Android slop test, Touch targets, Typography, Verifying the build (+15 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (24): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), detectPageTheme(), ensureAgentPollTooltip(), ensureSpinKeyframes(), hideAgentPollTooltip() (+16 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (14): invite_and_accept(), Invitation, Meta, InvitationStatus, InvitationCreateSerializer, InvitationSerializer, Meta, create_invitation() (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (23): averageRgb01(), captureAndEmit(), captureChromeNodes(), captureElementFromRenderedAncestor(), captureElementToBlob(), checkpointPayload(), compileShader(), cssColorToRgb01() (+15 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (20): Accessibility and control, Choose material by meaning, Find the job, Hover, Implement to the runtime, Set the motion thesis, Timing and easing, Verify (+12 more)

### Community 46 - "Community 46"
Cohesion: 0.09
Nodes (17): Before you finish, Scope is sovereign, The amplification, The skeleton test, Why it reads flat, Craft (deprecated alias), /impeccable foundations, What "done" means (+9 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (22): Assess Onboarding Needs, Context Over Ceremony, Contextual Help, Design Onboarding Experiences, Documentation & Help, Empty State Design, Feature Discovery & Adoption, Guided Tours & Walkthroughs (+14 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (3): QuotationLifecycleTests, QuotationPermissionTests, QuotationVerificationSwitchTests

### Community 49 - "Community 49"
Cohesion: 0.09
Nodes (22): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, jsx, lib, module (+14 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (3): AcceptanceSetup, AcceptanceVerificationSwitchTests, SimpleAcceptanceTests

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (18): Core Rule, Decision Comps, Impeccable Asset Producer, Input Contract, Output Contract, Review handoff, The job, Act on the receipt (+10 more)

### Community 52 - "Community 52"
Cohesion: 0.10
Nodes (18): Craft floor, Refuse, Verify, Constraints, Failure modes, Flow, /impeccable hooks, Routing (+10 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (20): Animate complex properties, Assess What "Extraordinary" Means Here, For data-heavy interfaces, For functional UI, For performance-critical UI, For visual/marketing surfaces, Implement with Discipline, Interact with the device (+12 more)

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (19): 10. Running migrations, 11. Production verification checklist, 12. Rollback, 13. Common failures, 1. Prerequisites, 2. Create the Vercel project, 3. Environment variables, 4. Custom domain (recommended) (+11 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (15): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal() (+7 more)

### Community 56 - "Community 56"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (13): customerEventPath(), CustomerBookingsPage(), handleCompleteEvent(), loadBookings(), CustomerPages(), DashboardPage(), firstName(), latestTotal() (+5 more)

### Community 58 - "Community 58"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, lib, module, moduleDetection, noEmit (+11 more)

### Community 59 - "Community 59"
Cohesion: 0.12
Nodes (5): 2. What was preserved, EmailVerificationToken, Meta, VerificationDisabledRegistrationTests, RegisterView

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (19): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords() (+11 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (9): PasswordResetConfirmSerializer, TokenSerializer, CheckUsernameView, CsrfTokenView, EmailResendView, EmailVerifyView, LogoutView, MarkNotificationsReadView (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.21
Nodes (7): EventSerializer, Meta, get_owned_event(), EventAttachmentDeleteView, EventDetailView, EventSubmitView, EventWithdrawView

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (5): EmailBackend, normalize_email_address(), UserManager, EmailOnlySerializer, PasswordResetRequestView

### Community 65 - "Community 65"
Cohesion: 0.26
Nodes (18): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+10 more)

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (17): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), commitAcceptedSvelteComponentToDom(), commitAcceptedVariantToDom(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey() (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.13
Nodes (10): 1. Environment, 2. Scenario results, 3. Defects found and fixed, 4. Console and network observations, 5. Not covered by browser QA, 6. Artifacts, Browser QA Report, EventAttachmentSerializer (+2 more)

### Community 69 - "Community 69"
Cohesion: 0.21
Nodes (3): NetworkAssociationSerializer, Meta, provider_summary()

### Community 70 - "Community 70"
Cohesion: 0.12
Nodes (15): 1. Accessibility (A11y), 2. Performance, 3. Theming, 4. Responsive Design, 5. Implementation Integrity (CRITICAL), Audit Health Score, Detailed Findings by Severity, Diagnostic Scan (+7 more)

### Community 71 - "Community 71"
Cohesion: 0.12
Nodes (16): 1. Read the screenshot (if present), 2. Wrap the element, 3. Load the action's reference, 4. Plan three variants: identity first, then mode, then axes, 5. Apply the freeform prompt (if present), 6. Deliver variants, 7. Parameters (composition-sized, 0-4 per variant), 8. Signal done (+8 more)

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (8): QuotationRevisionSerializer, Meta, RevisionWriteSerializer, ProviderQuotationWithdrawView, ProviderRevisionCreateView, ProviderRevisionDetailView, ProviderRevisionSubmitView, _revision_with_items()

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (7): _frontend_link(), send_password_reset_email(), send_verification_email(), detect_content_type(), scan_attachment(), validate_attachment_upload(), ScanStatus

### Community 74 - "Community 74"
Cohesion: 0.13
Nodes (14): 10. Environment variables (backend), 1. Topology at a glance, 2. Frontend — Vercel, 3. Backend — persistent Python host, 4. Database — Neon PostgreSQL, 5. How the browser talks to the API, 6. CORS and CSRF, 7. Media (attachments) (+6 more)

### Community 75 - "Community 75"
Cohesion: 0.13
Nodes (14): 10. Open decisions, 11. Verification plan, 2. New models (`apps/network`), 3. State transitions and rules, 4. Availability, 5. API surface, 6. Frontend changes, 7. Permissions (+6 more)

### Community 76 - "Community 76"
Cohesion: 0.20
Nodes (8): AccountSettingsSerializer, LoginSerializer, UserSerializer, Meta, AccountSettingsView, AvatarUploadView, LoginView, MeView

### Community 77 - "Community 77"
Cohesion: 0.14
Nodes (14): 1. Decide what is already true, 2. Ask what will change the work, 3. Choose the right amount of invention, 4. Commit the world, 5. Record the decision, 6. Build with full commitment, 7. Inspect and finish, Both paths (+6 more)

### Community 78 - "Community 78"
Cohesion: 0.14
Nodes (13): Animation Performance, Assess Performance Issues, Core Web Vitals Optimization, Cumulative Layout Shift (CLS < 0.1), Interaction to Next Paint (INP < 200ms), Largest Contentful Paint (LCP < 2.5s), Loading Performance, Network Optimization (+5 more)

### Community 79 - "Community 79"
Cohesion: 0.23
Nodes (4): CustomerBookingSerializer, Meta, CustomerBookingDetailView, CustomerBookingsListView

### Community 81 - "Community 81"
Cohesion: 0.15
Nodes (13): Component translation rules, Narrative mapping, Scan mode (approach C: auto-extract, then confirm descriptive language), Schema, Step 1: Find the design assets, Step 2: Auto-extract what can be auto-extracted, Step 2b: Stage the frontmatter, Step 3: Ask the user for qualitative language (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.14
Nodes (6): Application shape, Data and API boundaries, Decisions and constraints, Frontend Architecture, Route and access model, NotificationDropdown()

### Community 83 - "Community 83"
Cohesion: 0.17
Nodes (11): Action Summary, Ask the User, Assessment A: Design Review, Assessment B: Detector + Browser Evidence, Assessment Orchestration, Deliver the Report, Hard Invariants, Persist the Snapshot (+3 more)

### Community 84 - "Community 84"
Cohesion: 0.17
Nodes (11): Assess Current State, Code Simplification, Content Simplification, Document Removed Complexity, Information Architecture, Interaction Simplification, Layout Simplification, Plan Simplification (+3 more)

### Community 85 - "Community 85"
Cohesion: 0.17
Nodes (11): Accessibility Resilience, Assess Hardening Needs, Edge Cases & Boundary Conditions, Error Handling, Hardening Dimensions, Input Validation & Sanitization, Internationalization (i18n), Performance Resilience (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.23
Nodes (6): QuotationAdmin, QuotationItemInline, QuotationRevisionAdmin, QuotationRevisionInline, QuotationItem, Meta

### Community 88 - "Community 88"
Cohesion: 0.24
Nodes (4): IsCustomer, IsCustomerOrProvider, IsProvider, ReadOnly

### Community 89 - "Community 89"
Cohesion: 0.18
Nodes (10): 1. MANAGER, 2. INDIVIDUAL SERVICE PROVIDER, 3. ASSOCIATED SERVICE PROVIDER, 4. TALENT, 5. WORKER, Assistant Delegation Model (`ProfileTeamMember`), HiddenStage Professional Identity Architecture, Overview (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.18
Nodes (10): Actions and navigation, Audit the language, Errors and permissions, Forms, Help and instructional text, Loading, empty, and success states, Rewrite by function, Set the message hierarchy (+2 more)

### Community 91 - "Community 91"
Cohesion: 0.18
Nodes (11): 10. Help and Documentation, 1. Visibility of System Status, 2. Match Between System and Real World, 3. User Control and Freedom, 4. Consistency and Standards, 5. Error Prevention, 6. Recognition Rather Than Recall, 7. Flexibility and Efficiency of Use (+3 more)

### Community 92 - "Community 92"
Cohesion: 0.18
Nodes (10): Pitfalls, Seed mode, Step 1: Route through new-work's workshop, Step 2: Write seed DESIGN.md, Step 3: Confirm, Style guidelines, The frontmatter: token schema, The markdown body: eight sections (canonical order) (+2 more)

### Community 93 - "Community 93"
Cohesion: 0.18
Nodes (10): 1. Establish the system, 2. Gather the evidence, 3. Triage, 4. Polish the whole path, 5. Verify and finish, Color, imagery, and icons, Content and code, Flow and hierarchy (+2 more)

### Community 94 - "Community 94"
Cohesion: 0.18
Nodes (10): Assess Current State, Color Refinement, Composition Refinement, Motion Reduction, Plan Refinement, Refine the Design, Simplification, Verify Quality (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.18
Nodes (5): customerEvent, customerProfile, customerSession, providerProfile, providerSession

### Community 97 - "Community 97"
Cohesion: 0.24
Nodes (4): InvitationAdmin, NetworkAssociationAdmin, NetworkInvitationAdmin, WorkerAssignmentAdmin

### Community 98 - "Community 98"
Cohesion: 0.20
Nodes (9): 1. Overview & Objective, 2. Architecture & Data Model, 3.1 Public Discovery & Profile Endpoints (`apps/matching`), 3.2 Provider Self-Management Endpoints (`apps/profiles`), 3. API Infrastructure, 4.1 Unified Profile Management (`/app/provider/profile`), 4.2 Customer-Facing Public Profile (`/providers/:id` & `/providers/:username`), 4. Frontend Experience & WedMeGood Structure (+1 more)

### Community 99 - "Community 99"
Cohesion: 0.20
Nodes (9): Differences and non-copying requirements, Follow-up research, HiddenStage mechanics to preserve, Observed workflows and mechanics, Reference Product Analysis, Screens and routes to plan, Sources and access, Unavailable pages and assumptions (+1 more)

### Community 100 - "Community 100"
Cohesion: 0.20
Nodes (9): Canonical source recommendations, Documentation recovery, Duplicate and conflicting copies, Findings at a glance, GitHub access check, HiddenStage-named candidates, HiddenStage Repository and Documentation Recovery, Other Git repositories inspected (+1 more)

### Community 101 - "Community 101"
Cohesion: 0.20
Nodes (10): Design Health Score, Design Specificity Verdict, Generate Combined Critique Report, Minor Observations, Overall Impression, Persona Red Flags, Priority Issues, Questions to Consider (+2 more)

### Community 102 - "Community 102"
Cohesion: 0.20
Nodes (9): Cognitive Load Assessment, Cognitive Load Checklist, Critique rubric, Extraneous Load: Bad Design, Germane Load: Learning Effort, Heuristics Scoring Guide, Intrinsic Load: The Task Itself, The Working Memory Rule (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.20
Nodes (10): Completion gate, Init flow, Step 1: Load current state, Step 2: Explore the project, Step 3: Interview for product truth, Step 4: Write PRODUCT.md, Step 5: Record workflow defaults, Step 6: Wrap up or resume (+2 more)

### Community 104 - "Community 104"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 105 - "Community 105"
Cohesion: 0.29
Nodes (4): ProviderInvitationSerializer, Meta, ProviderInvitationDeclineView, ProviderInvitationRespondView

### Community 106 - "Community 106"
Cohesion: 0.27
Nodes (5): QuotationCreateSerializer, QuotationSerializer, Meta, ProviderQuotationListCreateView, _quotation_with_revisions()

### Community 107 - "Community 107"
Cohesion: 0.22
Nodes (8): API and data constraints, Backend domain boundaries, External integrations, HiddenStage Architecture, Not yet decided, Repository boundaries, Status, System shape

### Community 108 - "Community 108"
Cohesion: 0.22
Nodes (8): 1. Triggers, 2. Backend job, 3. Frontend job, 4. Security posture, 5. Interpreting failures, 6. Running the same checks locally, 7. Status of this pipeline, Continuous Integration Pipeline Guide

### Community 109 - "Community 109"
Cohesion: 0.22
Nodes (8): Global Constraints, HiddenStage Functional Upgrade Implementation Plan, Phase 3 — Professional Identity Architecture & Onboarding, Phase 4 — Manager Search & Network Association Requests, Phase 5 — Profile & Portfolio Management Upgrade, Phase 6 — Discovery, Dashboard, & UI Polish, Phase 7 — Verification & Documentation, Phase Breakdown

### Community 110 - "Community 110"
Cohesion: 0.22
Nodes (8): 1. Playwright Functional Upgrade E2E Suite (`e2e/functional-upgrade.spec.ts`), 2. Attachment Download Authorization Suite (`apps.events.test_attachments`), 3. Backend Unit & Regression Suites, 4. Frontend Vitest & Build Verification, Architectural Conclusions, Detailed Test Logs & Verification Evidence, HiddenStage Functional Upgrade & Professional Architecture Test Report, Test Execution Matrix

### Community 111 - "Community 111"
Cohesion: 0.22
Nodes (8): Backend, Deployment, Frontend, Known gaps at launch, Launch gate, Pre-Launch Final Checklist, Quality, Security

### Community 112 - "Community 112"
Cohesion: 0.22
Nodes (8): Changes delivered in Milestone 2, Decisions requiring approval, Feature matrix, HiddenStage Workflow Gap Analysis, Remaining work, in dependency order, Status at a glance, Verification performed, Verification screenshots

### Community 113 - "Community 113"
Cohesion: 0.22
Nodes (9): 1. The Wall of Options, 2. The Memory Bridge, 3. The Hidden Navigation, 4. The Jargon Barrier, 5. The Visual Noise Floor, 6. The Inconsistent Pattern, 7. The Multi-Task Demand, 8. The Context Switch (+1 more)

### Community 114 - "Community 114"
Cohesion: 0.22
Nodes (8): Monorepo notes, Opting out of the boot check, Step 1: Run the pass, Step 2: Act by severity, Step 3: Deprecated fields are binding, Step 4: Do not overclaim on truth drift, Step 5: Compact DESIGN.md only with consent, What this owns, and what it does not

### Community 115 - "Community 115"
Cohesion: 0.22
Nodes (8): Cadence, Confirm and stop, Phase 1: Discovery interview, Phase 2: Resolve the design direction, Phase 3: Write the brief, Round 1: purpose, people, and outcome, Round 2: material, behavior, and boundaries, Shape

### Community 116 - "Community 116"
Cohesion: 0.22
Nodes (8): Apply, Line breaks, Live-mode signature params, Optical alignment, Set the system, Two isolated assessments, Verify, Visitor mode

### Community 117 - "Community 117"
Cohesion: 0.25
Nodes (3): EventWriteSerializer, Meta, EventListCreateView

### Community 119 - "Community 119"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:e2e, test:watch (+1 more)

### Community 120 - "Community 120"
Cohesion: 0.29
Nodes (4): BusinessAdmin, CustomerProfileAdmin, ProviderProfileAdmin, ServiceCategoryAdmin

### Community 121 - "Community 121"
Cohesion: 0.29
Nodes (3): format_paise(), paise_to_rupees(), rupees_to_paise()

### Community 122 - "Community 122"
Cohesion: 0.25
Nodes (8): 1. Impatient Power User: "Alex", 2. Confused First-Timer: "Jordan", 3. Accessibility-Dependent User: "Sam", 4. Deliberate Stress Tester: "Riley", 5. Distracted Mobile User: "Casey", Persona-Based Design Testing, Project-Specific Personas, Selecting Personas

### Community 123 - "Community 123"
Cohesion: 0.25
Nodes (7): Extract Flow, Step 1: Discover the Design System, Step 2: Identify Patterns, Step 3: Plan Extraction, Step 4: Extract & Enrich, Step 5: Migrate, Step 6: Document

### Community 124 - "Community 124"
Cohesion: 0.29
Nodes (3): hash_token(), SingleUseToken, Meta

### Community 125 - "Community 125"
Cohesion: 0.25
Nodes (4): AcceptanceSerializer, QuotationItemInputSerializer, QuotationItemSerializer, Meta

### Community 126 - "Community 126"
Cohesion: 0.25
Nodes (8): dependencies, kubai-icons-react@^0.13.1, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, @tanstack/react-query@^5.105.3, react-dom, @tanstack/react-query

### Community 127 - "Community 127"
Cohesion: 0.29
Nodes (3): CustomerNetworkPage(), handleConnect(), loadData()

### Community 128 - "Community 128"
Cohesion: 0.29
Nodes (6): Checks, in order, Disposition, Impeccable Finish Reviewer, Input Contract, Output Contract, Verdict Pass

### Community 129 - "Community 129"
Cohesion: 0.29
Nodes (6): Checks, Entry Atomicity, Impeccable Manual Edit Applier, Input Contract, Output Contract, Workflow

### Community 130 - "Community 130"
Cohesion: 0.29
Nodes (6): Checks, in order, Disposition, Impeccable Finish Reviewer, Input Contract, Output Contract, Verdict Pass

### Community 131 - "Community 131"
Cohesion: 0.29
Nodes (6): Checks, Entry Atomicity, Impeccable Manual Edit Applier, Input Contract, Output Contract, Workflow

### Community 132 - "Community 132"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 134 - "Community 134"
Cohesion: 0.29
Nodes (6): buildCommand, framework, installCommand, outputDirectory, rewrites, $schema

### Community 135 - "Community 135"
Cohesion: 0.33
Nodes (5): Checks, in order, Impeccable Motion Reviewer, Input Contract, Output Contract, Verdict Pass

### Community 138 - "Community 138"
Cohesion: 0.33
Nodes (5): Design System, Responsive and motion behavior, Shared controls, Tokens, Visual direction

### Community 139 - "Community 139"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 140 - "Community 140"
Cohesion: 0.33
Nodes (5): HiddenStage Frontend, Project map, Quality commands, Requirements, Setup

### Community 141 - "Community 141"
Cohesion: 0.40
Nodes (4): Impeccable Documenter, Input Contract, Output Contract, Workflow

### Community 144 - "Community 144"
Cohesion: 0.40
Nodes (4): HiddenStage, HiddenStage, HiddenStage, HiddenStage

### Community 145 - "Community 145"
Cohesion: 0.50
Nodes (3): Before writing ANY RocketRide code, Documentation, RocketRide: AI Pipeline & App Platform

### Community 146 - "Community 146"
Cohesion: 0.50
Nodes (3): HiddenStage Decision Log, Unresolved decisions, Workspace decisions for this restart

### Community 147 - "Community 147"
Cohesion: 0.50
Nodes (3): Constraints honoured, Environment, Production Hardening Plan

### Community 148 - "Community 148"
Cohesion: 0.50
Nodes (3): Before writing ANY RocketRide code, Documentation, RocketRide: AI Pipeline & App Platform

### Community 149 - "Community 149"
Cohesion: 0.50
Nodes (4): Issue Severity (P0–P3), Reference Material, Score Summary, Scoring the report

## Knowledge Gaps
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 13` to `Community 64`, `Community 0`, `Community 35`, `Community 67`, `Community 7`, `Community 8`, `Community 42`, `Community 75`, `Community 76`, `Community 12`, `Community 14`, `Community 15`, `Community 24`, `Community 59`, `Community 61`, `Community 62`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 36 inferred relationships involving `ProviderProfile` (e.g. with `Phase 1 — Codebase Reconnaissance & Schema Synchronization` and `1. Existing functionality reused`) actually correct?**
  _`ProviderProfile` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0391304347826087 - nodes in this community are weakly interconnected._
- **Why does `ProviderProfile` connect `Community 8` to `Community 0`, `Community 67`, `Community 4`, `Community 7`, `Community 9`, `Community 42`, `Community 137`, `Community 12`, `Community 14`, `Community 15`, `Community 125`, `Community 29`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `User` (e.g. with `2. Existing functionality reused` and `9. Availability logic`) actually correct?**
  _`User` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.027203579418344517 - nodes in this community are weakly interconnected._
- **Why does `Event` connect `Community 14` to `Community 4`, `Community 7`, `Community 8`, `Community 9`, `Community 42`, `Community 72`, `Community 12`, `Community 13`, `Community 106`, `Community 15`, `Community 79`, `Community 80`, `Community 117`, `Community 63`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._