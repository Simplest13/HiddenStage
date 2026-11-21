# Graph Report - HiddenStage  (2026-11-21)

## Corpus Check
- 387 files · ~187,765 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: .css 12, (none) 4, .example 2)

## Summary
- 1992 nodes · 5533 edges · 111 communities (68 shown, 43 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 545 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth Guards & Admin Routing
- Events Domain Models & APIs
- Quotation UI & Acceptance Dialogs
- Administration Serializers
- Quotation Models & Revisions
- Admin Pages & Moderation UI
- Frontend Auth State & Context
- Administration Tests
- Provider Catalog & Routing
- Django Shared Infrastructure
- CI/CD Workflows
- Gravitas Project Detector
- Network & Assignment Serializers
- Network Assignment Pages UI
- Commitments & Verification Policy
- Module 15
- Module 16
- Module 17
- Module 18
- Module 19
- Module 20
- Module 21
- Module 22
- Module 23
- Module 24
- Module 25
- Module 26
- Module 27
- Module 28
- Module 30
- Module 31
- Module 32
- Module 33
- Module 34
- Module 35
- Module 36
- Module 37
- Module 38
- Module 39
- Module 40
- Module 41
- Module 42
- Module 43
- Module 44
- Module 45
- Module 46
- Module 47
- Module 48
- Module 49
- Module 50
- Module 51
- Module 52
- Module 53
- Module 54
- Module 55
- Module 56
- Module 57
- Module 58
- Module 59
- Module 60
- Module 61
- Module 62
- Module 63
- Module 64
- Module 65
- Module 66
- Module 67
- Module 68
- Module 69
- Module 70
- Module 71
- Module 72
- Module 73
- Module 74
- Module 75
- Module 76
- Module 77
- Module 78
- Module 79
- Module 81
- Module 82
- Module 83
- Module 84
- Module 85
- Module 86
- Module 87
- Module 88
- Module 90
- Module 91
- Module 92
- Module 95
- Module 99

## God Nodes (most connected - your core abstractions)
1. `Button` - 63 edges
2. `ProviderProfile` - 53 edges
3. `Event` - 48 edges
4. `User` - 44 edges
5. `Spinner()` - 44 edges
6. `make_customer()` - 41 edges
7. `Badge()` - 39 edges
8. `Card()` - 38 edges
9. `Input` - 37 edges
10. `make_provider()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `ServiceRequirementInline` --uses--> `ServiceRequirement`  [INFERRED]
  hiddenstage-backend/apps/events/admin.py → hiddenstage-backend/apps/events/models.py
- `ProviderCoverageInline` --uses--> `ProviderCoverage`  [INFERRED]
  hiddenstage-backend/apps/profiles/admin.py → hiddenstage-backend/apps/profiles/models.py
- `ProviderServiceInline` --uses--> `ProviderService`  [INFERRED]
  hiddenstage-backend/apps/profiles/admin.py → hiddenstage-backend/apps/profiles/models.py
- `QuotationRevisionInline` --uses--> `QuotationRevision`  [INFERRED]
  hiddenstage-backend/apps/quotations/admin.py → hiddenstage-backend/apps/quotations/models.py
- `RegisterSerializer` --uses--> `UserRole`  [INFERRED]
  hiddenstage-backend/apps/accounts/serializers.py → hiddenstage-backend/apps/accounts/models.py

## Import Cycles
- None detected.

## Communities (111 total, 43 thin omitted)

### Community 0 - "Auth Guards & Admin Routing"
Cohesion: 0.05
Nodes (66): useAuth(), useAuthActions(), AdminLoginPage, RequireAdmin(), RequireAdminOrLogin(), RequireAuthentication(), RequireCompletedProvider(), RequireCustomerOnboarding() (+58 more)

### Community 1 - "Events Domain Models & APIs"
Cohesion: 0.06
Nodes (28): Event, Meta, ServiceRequirement, Meta, validate_event_can_be_edited(), EventListSerializer, Meta, EventRequirementInputSerializer (+20 more)

### Community 2 - "Quotation UI & Acceptance Dialogs"
Cohesion: 0.05
Nodes (57): QuotesPage, Entry, AcceptQuoteDialog(), confirm(), groupItems(), ItemGroup, eventsApi, EventWritePayload (+49 more)

### Community 3 - "Administration Serializers"
Cohesion: 0.08
Nodes (40): AdminBusinessRepSerializer, Meta, AdminBusinessSerializer, Meta, AdminBusinessUpdateSerializer, AdminCategorySerializer, Meta, AdminCategoryUpdateSerializer (+32 more)

### Community 4 - "Quotation Models & Revisions"
Cohesion: 0.09
Nodes (29): ItemKind, Quotation, Meta, QuotationRevision, Meta, QuotationStatus, RevisionStatus, QuotationCreateSerializer (+21 more)

### Community 5 - "Admin Pages & Moderation UI"
Cohesion: 0.13
Nodes (39): providerQuotePath(), AdminAuditPage(), AdminBusinessesPage(), AdminModerationPage(), AdminOverviewPage(), AdminPages(), CommitmentsPage(), QuotesPage() (+31 more)

### Community 6 - "Frontend Auth State & Context"
Cohesion: 0.07
Nodes (43): anonymousAuthState, AuthActions, AuthContext, authenticated(), AuthProvider(), toSessionUser(), AccountRole, AuthState (+35 more)

### Community 7 - "Administration Tests"
Cohesion: 0.09
Nodes (17): ensure_categories(), event_status(), make_event(), EventStatus, RequirementStatus, InvitationAdmin, Invitation, Meta (+9 more)

### Community 8 - "Provider Catalog & Routing"
Cohesion: 0.10
Nodes (38): providerDetailPath(), serviceCategoryPath(), categoryName(), DemoProvider, demoProviders, serviceCategories, ServiceCategory, ProviderCard() (+30 more)

### Community 9 - "Django Shared Infrastructure"
Cohesion: 0.10
Nodes (17): Migration, Migration, Migration, money_field(), non_negative_check(), TimeStampedModel, Meta, UUIDModel (+9 more)

### Community 10 - "CI/CD Workflows"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, run, defaults, env, name, runs-on (+37 more)

### Community 11 - "Gravitas Project Detector"
Cohesion: 0.07
Nodes (13): count_source_files(), detect_language(), main(), suggest_budget(), imported_plugin_names(), main(), sha256(), main() (+5 more)

### Community 12 - "Network & Assignment Serializers"
Cohesion: 0.12
Nodes (21): IsProvider, AssignmentActionSerializer, AssignmentCreateSerializer, AvailabilityQuerySerializer, AvailabilityResponseSerializer, NetworkAssociationEndSerializer, NetworkInvitationCreateSerializer, WorkerDiscoverySerializer (+13 more)

### Community 13 - "Network Assignment Pages UI"
Cohesion: 0.10
Nodes (29): AssignmentDetailPage(), assignmentPath(), AssignmentSection(), AssignmentsPage(), AssignmentStatusBadge(), assignmentStatusLabels, ManagerAssignmentForm(), submit() (+21 more)

### Community 14 - "Commitments & Verification Policy"
Cohesion: 0.09
Nodes (17): CommitmentAdmin, CommitmentAuditInline, CommitmentLineInline, Commitment, Meta, CommitmentAction, CommitmentAudit, Meta (+9 more)

### Community 15 - "Module 15"
Cohesion: 0.15
Nodes (20): AssignmentStatus, AssociationStatus, WorkerAssignment, Meta, cancel_assignment(), cancel_network_invitation(), complete_assignment(), create_assignment() (+12 more)

### Community 16 - "Module 16"
Cohesion: 0.09
Nodes (31): devDependencies, jsdom@^29.1.1, oxlint@^1.89.0, @testing-library/dom@^10.4.2, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/node@^24.19.2 (+23 more)

### Community 17 - "Module 17"
Cohesion: 0.11
Nodes (29): allowedTypes, Attachments(), BasicDetails(), blankRequirement(), blankValues(), budgetToPaise(), cryptoKey(), EventPages() (+21 more)

### Community 18 - "Module 18"
Cohesion: 0.06
Nodes (10): AccountsConfig, AdministrationConfig, CommitmentsConfig, CoreConfig, EventsConfig, InvitationsConfig, MatchingConfig, NetworkConfig (+2 more)

### Community 19 - "Module 19"
Cohesion: 0.13
Nodes (17): AcceptanceRequestSerializer, CommitmentAuditSerializer, Meta, CommitmentDetailSerializer, Meta, CommitmentLineSerializer, Meta, CommitmentSerializer (+9 more)

### Community 20 - "Module 20"
Cohesion: 0.07
Nodes (29): concurrency, cancel-in-progress, group, run, VITE_API_BASE_URL, jobs, vite, name (+21 more)

### Community 21 - "Module 21"
Cohesion: 0.17
Nodes (19): ARTIFACTS, completeCustomerOnboarding(), completeProviderOnboarding(), login(), optionalFill(), PASSWORD, publishEventRequest(), register() (+11 more)

### Community 22 - "Module 22"
Cohesion: 0.09
Nodes (13): EventAdmin, EventAttachmentInline, ServiceRequirementInline, detect_content_type(), scan_attachment(), validate_attachment_upload(), EventAttachment, Meta (+5 more)

### Community 23 - "Module 23"
Cohesion: 0.14
Nodes (17): AdminAuditAction, AdminAuditLog, Meta, create_category_as_admin(), get_overview_metrics(), _log(), release_commitment_as_admin(), set_provider_verification() (+9 more)

### Community 24 - "Module 24"
Cohesion: 0.08
Nodes (24): clients, CONTENT_DIR, crypto, debounceTimers, frameTemplate, fs, helperScript, http (+16 more)

### Community 25 - "Module 25"
Cohesion: 0.07
Nodes (27): build, command, depends_on, env_file, environment, ports, condition, environment (+19 more)

### Community 26 - "Module 26"
Cohesion: 0.13
Nodes (21): customerEventEditPath(), EventDetailPage(), EventProvidersPage(), EventQuotesPage(), EventWorkspacePage(), refreshAll(), run(), InviteDialog() (+13 more)

### Community 27 - "Module 27"
Cohesion: 0.11
Nodes (5): invite_and_accept(), make_provider(), make_user(), ProviderOpportunityTests, QuotationPermissionTests

### Community 28 - "Module 28"
Cohesion: 0.17
Nodes (11): InvitationCreateSerializer, InvitationSerializer, Meta, ProviderInvitationSerializer, Meta, expire_stale_invitations(), EventInvitationListCreateView, EventInvitationWithdrawView (+3 more)

### Community 30 - "Module 30"
Cohesion: 0.14
Nodes (7): assignment_conflicts(), check_availability(), respond_to_assignment(), accepted_commitment(), assignment_payload(), AssignmentTests, make_provider_of_kind()

### Community 31 - "Module 31"
Cohesion: 0.09
Nodes (22): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, jsx, lib, module (+14 more)

### Community 32 - "Module 32"
Cohesion: 0.14
Nodes (8): normalize_pin_code(), normalize_text(), validate_pin_code(), _coverage_matches(), discover_providers(), matching_coverage_q(), CustomerProfileSerializer, Meta

### Community 33 - "Module 33"
Cohesion: 0.18
Nodes (11): NetworkAssociation, Meta, NetworkInvitation, Meta, NetworkInvitationStatus, expire_stale_network_invitations(), _require_verified(), respond_to_network_invitation() (+3 more)

### Community 34 - "Module 34"
Cohesion: 0.13
Nodes (3): RegistrationTests, VerificationDisabledRegistrationTests, make_customer()

### Community 35 - "Module 35"
Cohesion: 0.10
Nodes (9): ProviderSummarySerializer, ProviderCoverage, Meta, ProviderCoverageSerializer, Meta, ProviderPublicSerializer, Meta, ProviderCoverageDetailView (+1 more)

### Community 36 - "Module 36"
Cohesion: 0.18
Nodes (7): NetworkAssociationSerializer, Meta, NetworkInvitationSerializer, Meta, provider_summary(), WorkerAssignmentSerializer, Meta

### Community 37 - "Module 37"
Cohesion: 0.19
Nodes (8): DiscoveryQuerySerializer, OpportunityRequirementSerializer, ProviderDetailSerializer, ProviderMatchSerializer, ProviderOpportunitySerializer, ProviderDetailView, ProviderDiscoveryView, ProviderOpportunityListView

### Community 38 - "Module 38"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, lib, module, moduleDetection, noEmit (+11 more)

### Community 39 - "Module 39"
Cohesion: 0.19
Nodes (10): LoginSerializer, TokenSerializer, UserSerializer, Meta, CsrfTokenView, EmailVerifyView, LoginView, LogoutView (+2 more)

### Community 40 - "Module 40"
Cohesion: 0.16
Nodes (3): verification_required(), verification_satisfied(), VerificationPolicyTests

### Community 41 - "Module 41"
Cohesion: 0.17
Nodes (9): ProviderService, Meta, ProviderServiceSerializer, Meta, ServiceCategorySerializer, Meta, ProviderServiceDetailView, ProviderServiceListCreateView (+1 more)

### Community 42 - "Module 42"
Cohesion: 0.22
Nodes (13): LegacyEventRedirect, customerEventPath(), CustomerPages(), DashboardPage(), firstName(), latestTotal(), Page, RequestRow() (+5 more)

### Community 43 - "Module 43"
Cohesion: 0.15
Nodes (3): User, Meta, RegisterSerializer

### Community 44 - "Module 44"
Cohesion: 0.16
Nodes (8): QuotationAdmin, QuotationItemInline, QuotationRevisionAdmin, QuotationRevisionInline, QuotationItem, Meta, QuotationItemSerializer, Meta

### Community 45 - "Module 45"
Cohesion: 0.16
Nodes (8): EmailVerificationToken, Meta, hash_token(), PasswordResetToken, Meta, SingleUseToken, Meta, UserRole

### Community 46 - "Module 46"
Cohesion: 0.28
Nodes (3): AcceptanceSetup, SimpleAcceptanceTests, submitted_quotation()

### Community 47 - "Module 47"
Cohesion: 0.21
Nodes (3): attachment_url(), AttachmentStorageTests, MediaStorageConfigurationTests

### Community 48 - "Module 48"
Cohesion: 0.21
Nodes (9): App(), AppProviders(), queryClient, routeConfig, router, customer, renderRoute(), renderRoute() (+1 more)

### Community 49 - "Module 49"
Cohesion: 0.18
Nodes (9): BusinessAdmin, BusinessRepresentativeInline, CustomerProfileAdmin, ProviderCoverageInline, ProviderProfileAdmin, ProviderServiceInline, ServiceCategoryAdmin, BusinessRepresentative (+1 more)

### Community 50 - "Module 50"
Cohesion: 0.22
Nodes (6): _frontend_link(), send_password_reset_email(), send_verification_email(), EmailOnlySerializer, EmailResendView, PasswordResetRequestView

### Community 55 - "Module 55"
Cohesion: 0.22
Nodes (11): bootstrapPage(), getNewestScreen(), handleRequest(), isAuthorized(), isFullDocument(), isRegularFileInsideContentDir(), parseCookies(), pathnameOf() (+3 more)

### Community 56 - "Module 56"
Cohesion: 0.22
Nodes (9): broadcast(), computeAcceptKey(), decodeFrame(), encodeFrame(), handleMessage(), handleUpgrade(), isAllowedWebSocketOrigin(), startServer() (+1 more)

### Community 57 - "Module 57"
Cohesion: 0.58
Nodes (10): log_fail(), log_info(), log_pass(), log_warn(), verify.sh script, detect_language(), verify_go(), verify_python() (+2 more)

### Community 58 - "Module 58"
Cohesion: 0.18
Nodes (5): customerEvent, customerProfile, customerSession, providerProfile, providerSession

### Community 60 - "Module 60"
Cohesion: 0.42
Nodes (7): connect(), nextReconnectDelay(), reloadAfterRecovery(), sessionKey(), setStatus(), showTombstone(), websocketUrl()

### Community 61 - "Module 61"
Cohesion: 0.22
Nodes (8): browserLauncherForPlatform(), chmodOwnerOnly(), companionUrl(), generateToken(), initialToken(), maybeOpenBrowser(), onListen(), urlHostForHttp()

### Community 64 - "Module 64"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, preview, test, test:e2e, test:watch (+1 more)

### Community 65 - "Module 65"
Cohesion: 0.39
Nodes (5): combineGraphs(), extractDotBlocks(), extractGraphBody(), main(), renderToSvg()

### Community 67 - "Module 67"
Cohesion: 0.29
Nodes (3): format_paise(), paise_to_rupees(), rupees_to_paise()

### Community 70 - "Module 70"
Cohesion: 0.36
Nodes (5): ToastMessage, ToastProvider(), ToastContext, ToastContextValue, ToastTone

### Community 71 - "Module 71"
Cohesion: 0.52
Nodes (6): command_has_server_id(), command_line_for_pid(), is_brainstorm_server(), mark_stopped(), read_expected_server_id(), stop-server.sh script

### Community 72 - "Module 72"
Cohesion: 0.38
Nodes (3): PasswordResetConfirmSerializer, InvalidOrExpiredToken, PasswordResetConfirmView

### Community 74 - "Module 74"
Cohesion: 0.33
Nodes (3): CustomerProfile, Meta, _normalize_location()

### Community 75 - "Module 75"
Cohesion: 0.29
Nodes (6): buildCommand, framework, installCommand, outputDirectory, rewrites, $schema

### Community 77 - "Module 77"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 78 - "Module 78"
Cohesion: 0.33
Nodes (6): dependencies, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, @tanstack/react-query@^5.105.3, react-dom

### Community 79 - "Module 79"
Cohesion: 0.40
Nodes (5): brandMarkup(), escapeHtmlText(), renderBranding(), waitingPage(), wrapInFrame()

### Community 85 - "Module 85"
Cohesion: 0.60
Nodes (3): NetworkAssociationAdmin, NetworkInvitationAdmin, WorkerAssignmentAdmin

## Knowledge Gaps
- **1 isolated node(s):** `RFC-6455`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 673 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ProviderProfile` connect `Module 15` to `Module 32`, `Administration Serializers`, `Module 35`, `Module 37`, `Quotation Models & Revisions`, `Administration Tests`, `Django Shared Infrastructure`, `Module 41`, `Network & Assignment Serializers`, `Module 49`, `Module 19`, `Module 54`, `Module 23`, `Module 27`, `Module 28`, `Module 30`, `Module 63`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `ProviderProfile` (e.g. with `AdminProviderSerializer` and `get_overview_metrics()`) actually correct?**
  _`ProviderProfile` has 28 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-6455` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Auth Guards & Admin Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.05280875236692615 - nodes in this community are weakly interconnected._
- **Why does `User` connect `Module 43` to `Module 33`, `Module 34`, `Administration Serializers`, `Module 68`, `Module 39`, `Module 40`, `Django Shared Infrastructure`, `Administration Tests`, `Module 45`, `Module 15`, `Module 81`, `Module 50`, `Module 84`, `Module 22`, `Module 23`, `Module 27`, `Module 28`, `Module 30`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `Event` (e.g. with `AdminEventSerializer` and `get_overview_metrics()`) actually correct?**
  _`Event` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Should `Events Domain Models & APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.060764587525150904 - nodes in this community are weakly interconnected._