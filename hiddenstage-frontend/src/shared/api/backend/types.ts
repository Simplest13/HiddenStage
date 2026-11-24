/**
 * DTOs for the HiddenStage Django API (`/api/v1`).
 *
 * These mirror the DRF serializers exactly. Money is always integer paise; times
 * are `HH:MM:SS` and dates `YYYY-MM-DD` in Asia/Kolkata. Nothing here is mock data.
 */

export type AccountRole = 'CUSTOMER' | 'PROVIDER'

export type ApiUser = {
  id: string
  email: string
  username?: string | null
  full_name: string
  phone: string
  avatar_url?: string | null
  theme_preference?: 'light' | 'dark'
  role: AccountRole
  is_staff?: boolean
  is_superuser?: boolean
  email_verified: boolean
  email_verification_required: boolean
  email_verified_at: string | null
  profile_completed: boolean
  terms_accepted_at: string | null
  date_joined: string
  verification_email_sent?: boolean
}

export type ApiNotification = {
  id: string
  event?: string | null
  title: string
  message: string
  notification_type: string
  action_url?: string
  is_read: boolean
  created_at: string
}

export type ApiCustomerConnection = {
  id: string
  customer?: string
  provider: string
  provider_name: string
  provider_username?: string | null
  provider_avatar?: string | null
  business_name: string
  category: string
  city: string
  notes?: string
  has_active_booking: boolean
  unread_messages_count: number
  customer_details?: {
    id: string
    full_name: string
    username?: string | null
    email: string
    phone?: string
    avatar?: string | null
    city?: string
    locality?: string
    state?: string
    pin_code?: string
    bio?: string
    joined_at: string
  }
  created_at: string
}

export type ApiChatMessage = {
  id: string
  conversation: string
  sender: string
  sender_name: string
  sender_username?: string | null
  sender_avatar?: string | null
  is_me: boolean
  content: string
  attachment?: string | null
  is_read: boolean
  read_at?: string | null
  created_at: string
}

export type ApiConversation = {
  id: string
  customer: string
  provider: string
  event?: string | null
  other_user: {
    id: string
    name: string
    username?: string | null
    avatar?: string | null
    business_name: string
  }
  latest_message?: {
    id: string
    content: string
    sender_id: string
    created_at: string
    is_read: boolean
  } | null
  unread_count: number
  created_at: string
  updated_at: string
}

export type ApiInvoice = {
  id: string
  invoice_number: string
  commitment?: string | null
  event: string
  event_name: string
  event_date?: string | null
  customer: string
  customer_name: string
  provider: string
  provider_name: string
  provider_business: string
  issue_date: string
  due_date?: string | null
  amount_paise: number
  tax_paise: number
  status: 'NOT_DUE' | 'PAYMENT_PENDING' | 'ADVANCE_PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'REFUND_PENDING' | 'REFUNDED' | 'CANCELLED'
  items: Array<{ description: string; amount_paise: number }>
  pdf_url?: string
  created_at: string
}

export type ApiPaymentTransaction = {
  id: string
  invoice?: string | null
  invoice_number?: string
  customer: string
  amount_paise: number
  method: string
  reference: string
  status: string
  paid_at: string
  created_at: string
}

export type ApiBookingCommitment = {
  id: string
  provider_id: string
  provider_name: string
  provider_username?: string | null
  provider_avatar?: string | null
  business_name: string
  quotation_id: string
  total_paise: number
  accepted_at: string
  status: string
}

export type ApiBooking = {
  id: string
  name: string
  event_type: string
  description: string
  event_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  guest_count: number | null
  pin_code: string
  locality: string
  city: string
  state: string
  venue_name: string
  venue_address: string
  status: string
  submitted_at: string | null
  requirements: ApiRequirement[]
  commitments: ApiBookingCommitment[]
  quotations_count: number
  lifecycle_stage: string
  lifecycle_label: string
  financial_summary: {
    total_booked_paise: number
    total_invoiced_paise: number
    total_paid_paise: number
    total_pending_paise: number
  }
  created_at: string
  updated_at: string
}

export type ApiPublicFeedEvent = {
  id: string
  name: string
  event_type: string
  city: string
  state: string
  event_date: string | null
  guest_count: number | null
  requirements: Array<{
    id: string
    category_code: string
    category_name: string
    title: string
    description: string
    budget_paise: number | null
  }>
  anonymized_host: string
  created_at: string
}

export type ApiCategory = {
  id: string
  code: string
  name: string
  description: string
  sort_order: number
}

export type RequirementStatus = 'OPEN' | 'COMMITTED' | 'CANCELLED'
export type RequirementCustomReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED'

export type ApiRequirement = {
  id: string
  category: string
  category_detail: ApiCategory
  custom_service_name?: string
  custom_service_description?: string
  custom_review_status?: RequirementCustomReviewStatus
  title: string
  description: string
  budget_paise: number | null
  instructions: string
  status: RequirementStatus
  position: number
  created_at: string
  updated_at: string
}

export type ApiAttachment = {
  id: string
  original_name: string
  content_type: string
  size_bytes: number
  scan_status: 'PENDING' | 'CLEAN' | 'REJECTED' | 'SKIPPED'
  download_url: string
  created_at: string
}

export type EventStatus = 'DRAFT' | 'SUBMITTED' | 'WITHDRAWN' | 'CLOSED'

export type ApiEvent = {
  id: string
  name: string
  event_type: string
  description: string
  event_date: string
  end_date?: string | null
  start_time: string
  end_time: string
  guest_count: number
  pin_code: string
  locality: string
  city: string
  state: string
  venue_name: string
  venue_address: string
  status: EventStatus
  submitted_at: string | null
  withdrawn_at: string | null
  closed_at: string | null
  requirements: ApiRequirement[]
  attachments: ApiAttachment[]
  created_at: string
  updated_at: string
}

export type ApiEventListItem = {
  id: string
  name: string
  event_type: string
  event_date: string
  end_date?: string | null
  start_time: string
  end_time: string
  city: string
  pin_code: string
  status: EventStatus
  requirement_count: number
  created_at: string
  updated_at: string
}

export type ApiCoverage = {
  id: string
  pin_code: string
  locality: string
  city: string
  state: string
}

export type ApiCustomerProfile = {
  id: string
  full_name: string
  email: string
  phone: string
  pin_code: string
  locality: string
  city: string
  state: string
  avatar?: string | null
  bio?: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ApiProviderService = {
  id: string
  category: string
  category_name: string
  title: string
  description: string
  base_price_paise: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'

export type ProviderKind =
  | 'MANAGER'
  | 'INDIVIDUAL_SERVICE_PROVIDER'
  | 'ASSOCIATED_SERVICE_PROVIDER'
  | 'TALENT'
  | 'WORKER'

export type ApiOpportunityRequirement = {
  id: string
  title: string
  category: string
  category_name: string
  description: string
  instructions: string
  budget_paise: number | null
  status: RequirementStatus
}

export type ApiProviderOpportunity = {
  id: string
  name: string
  event_type: string
  event_date: string
  start_time: string
  end_time: string
  guest_count: number
  locality: string
  city: string
  state: string
  requirements: ApiOpportunityRequirement[]
  invitation_status: InvitationStatus | null
  already_quoted: boolean
  quotation_status: QuotationStatus | null
  latest_revision_status: QuoteRevisionStatus | null
}

export type ApiNetworkProfile = {
  id: string
  user_id: string
  display_name: string
  kind: ProviderKind
  description: string
  verification_status: VerificationStatus
  categories: string[]
  coverage: ApiCoverage[]
}

export type ApiWorkerDiscovery = {
  id: string
  user_id: string
  display_name: string
  description: string
  verification_status: VerificationStatus
  categories: string[]
  coverage: ApiCoverage[]
  relationship: 'NONE' | 'INVITED' | 'ASSOCIATED'
  association_id: string | null
  invitation_id: string | null
}

export type NetworkInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED'

export type ApiNetworkInvitation = {
  id: string
  manager: string
  manager_name: string
  manager_profile: ApiNetworkProfile | null
  worker: string
  worker_name: string
  worker_profile: ApiNetworkProfile | null
  message: string
  status: NetworkInvitationStatus
  expires_at: string
  responded_at: string | null
  created_at: string
  updated_at: string
}

export type ApiNetworkAssociation = {
  id: string
  manager: string
  worker: string
  counterpart_user_id: string
  counterpart_profile: ApiNetworkProfile | null
  status: 'ACTIVE' | 'ENDED'
  associated_at: string
  ended_at: string | null
  ended_reason: string
  active_assignments: number
  completed_assignments: number
}

export type AssignmentStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REASSIGNED'

export type ApiWorkerAssignment = {
  id: string
  manager: string
  manager_name: string
  manager_profile: ApiNetworkProfile | null
  worker: string
  worker_name: string
  worker_profile: ApiNetworkProfile | null
  commitment: string
  event: string
  event_name: string
  event_city: string
  event_locality: string
  role: string
  task_description: string
  instructions: string
  event_date: string
  start_time: string
  end_time: string
  reporting_time: string | null
  location: string
  compensation_paise: number | null
  response_deadline: string | null
  status: AssignmentStatus
  responded_at: string | null
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  response_note: string
  cancellation_reason: string
  completion_notes: string
  replaces: string | null
  counterpart_contact: string | null
  actions: Record<string, boolean>
  created_at: string
  updated_at: string
}

export type ApiAvailability = {
  available: boolean
  conflict: boolean
  event_date: string
  start_time: string
  end_time: string
}

export type ApiProviderProfile = {
  id: string
  display_name: string
  username?: string
  headline?: string
  kind: ProviderKind
  primary_category?: string | null
  talent_category?: string
  specializations?: string[] | string
  performance_styles?: string[] | string
  experience_summary?: string
  languages?: string[] | string
  website?: string
  instagram?: string
  youtube?: string
  availability_note?: string
  logo?: string | null
  cover_image?: string | null
  is_public?: boolean
  onboarding_step?: number
  onboarding_completed_at?: string | null
  role_data?: Record<string, unknown>
  description: string
  contact: string
  categories: string[]
  coverage: ApiCoverage[]
  services: ApiProviderService[]
  verification_status: VerificationStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type PortfolioMediaKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK'
export type PortfolioVisibility = 'PUBLIC' | 'PRIVATE'

export type ApiPortfolioItem = {
  id: string
  owner: string
  provider: string | null
  title: string
  description: string
  category: string
  event_date: string | null
  media: string | null
  external_url: string
  media_kind: PortfolioMediaKind
  visibility: PortfolioVisibility
  position: number
  created_at: string
  updated_at: string
}

export type ProfileTeamPermission =
  | 'MANAGE_BUSINESS_PROFILE'
  | 'MANAGE_PORTFOLIO'
  | 'MANAGE_SERVICES'
  | 'MANAGE_TEAM'
  | 'VIEW_EVENTS'
  | 'MANAGE_EVENTS'

export type ApiProfileTeamMember = {
  id: string
  owner: string
  member: string
  member_email: string
  member_name: string
  permissions: ProfileTeamPermission[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ApiManagerSearchResult = {
  id: string
  user_id: string
  display_name: string
  username: string
  manager_id?: string
  business_name: string
  headline: string
  description: string
  logo: string | null
  cover_image: string | null
  verification_status: VerificationStatus
  categories: string[]
}

export type ApiProviderMatch = {
  id: string
  user_id: string
  display_name: string
  kind: ProviderKind
  description: string
  verification_status: VerificationStatus
  categories: string[]
  matching_coverage: ApiCoverage[]
  exact_pin_match: boolean
  already_invited: boolean
}

export type ApiProviderDetail = {
  id: string
  display_name: string
  username?: string | null
  headline?: string | null
  kind: ProviderKind
  description: string
  contact: string
  verification_status: VerificationStatus
  categories: string[]
  coverage: ApiCoverage[]
  primary_category?: string | null
  primary_category_name?: string | null
  talent_category?: string | null
  specializations?: string[]
  performance_styles?: string[]
  experience_summary?: string | null
  languages?: string[]
  website?: string | null
  instagram?: string | null
  youtube?: string | null
  availability_note?: string | null
  logo?: string | null
  cover_image?: string | null
  is_public?: boolean
  completed_at?: string | null
  services?: ApiProviderService[]
  portfolio_items?: ApiPortfolioItem[]
  team_members?: string[]
  rating?: number | null
  review_count?: number
}

export type ApiPublicDirectoryProvider = {
  id: string
  display_name: string
  username?: string | null
  headline?: string | null
  kind: ProviderKind
  description: string
  verification_status: VerificationStatus
  categories: string[]
  primary_category?: string | null
  logo?: string | null
  cover_image?: string | null
  city?: string | null
  state?: string | null
  locality?: string | null
  pin_code?: string | null
  starting_price_paise?: number | null
  coverage_count: number
  rating?: number | null
  review_count: number
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED'

export type ApiInvitationEventDetail = {
  id: string
  name: string
  event_type: string
  event_date: string
  start_time: string
  end_time: string
  guest_count: number
  city: string
  locality: string
  pin_code: string
  status: EventStatus
  requirements: Array<{ id: string; title: string; category: string; budget_paise: number | null; status: RequirementStatus }>
}

export type ApiInvitation = {
  id: string
  event: string
  event_name: string
  provider: string
  provider_display_name: string
  requirement: string | null
  requirement_title: string | null
  message: string
  status: InvitationStatus
  expires_at: string | null
  responded_at: string | null
  created_at: string
  event_detail?: ApiInvitationEventDetail
}

export type QuoteItemKind = 'LINE' | 'PACKAGE'

export type ApiQuoteItem = {
  id: string
  requirement: string
  requirement_title: string
  kind: QuoteItemKind
  package_key: string
  title: string
  description: string
  amount_paise: number
  position: number
}

export type QuoteRevisionStatus = 'DRAFT' | 'SUBMITTED' | 'SUPERSEDED' | 'WITHDRAWN' | 'EXPIRED'

export type ApiQuoteRevision = {
  id: string
  revision_number: number
  status: QuoteRevisionStatus
  notes: string
  valid_until: string | null
  total_paise: number
  submitted_at: string | null
  created_at: string
  is_acceptance_eligible: boolean
  items: ApiQuoteItem[]
}

export type QuotationStatus = 'OPEN' | 'WITHDRAWN'

export type ApiQuotation = {
  id: string
  event: string
  event_name: string
  event_date?: string | null
  provider: string
  provider_display_name: string
  provider_profile_id: string | null
  status: QuotationStatus
  current_revision: string | null
  created_at: string
  updated_at: string
  revisions: ApiQuoteRevision[]
}

export type CommitmentStatus = 'ACTIVE' | 'RELEASED'

export type ApiCommitmentLine = {
  id: string
  requirement: string
  requirement_title: string
  package_key: string
  title: string
  amount_paise: number
}

export type ApiCommitment = {
  id: string
  event: string
  event_name: string
  event_date: string
  customer: string
  provider: string
  provider_display_name: string
  quotation: string
  quotation_revision: number
  status: CommitmentStatus
  total_paise: number
  accepted_at: string
  released_at: string | null
  release_reason: string
  lines: ApiCommitmentLine[]
  created_at: string
  audit_entries?: Array<{ id: string; action: string; actor_email: string | null; note: string; created_at: string }>
}

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] }
