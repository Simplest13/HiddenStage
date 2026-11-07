export type CustomerProfile = {
  fullName: string
  email: string
  phone: string
  city: string
  pinCode: string
  locality: string
  state: string
  completedAt: string
}

export type RequirementInput = {
  id: string
  category: string
  title: string
  description: string
  budget: number | null
  instructions: string
}

export type AttachmentRecord = { id: string; name: string; type: string; size: number }

export type CreateEventInput = {
  name: string
  type: string
  description: string
  date: string
  startTime: string
  endTime: string
  guestCount: number
  pinCode: string
  locality: string
  city: string
  state: string
  venueName: string
  address: string
  requirements: RequirementInput[]
  attachments: AttachmentRecord[]
}

export type CustomerEvent = CreateEventInput & {
  id: string
  status: 'Submitted'
  createdAt: string
  updatedAt: string
}

export type DemoAccountType = 'CUSTOMER' | 'PROVIDER'
export type CustomerIdentity = { id: string; fullName: string; email: string; emailVerified: boolean; profileCompleted: boolean; accountType: DemoAccountType }
export type RegisterInput = { fullName: string; email: string; password: string; accountType?: DemoAccountType }
export type LoginInput = { email: string; password: string }

/** Backend-independent customer boundary; endpoint paths and server DTOs remain unspecified. */
export interface CustomerApi {
  register(input: RegisterInput): Promise<CustomerIdentity>
  login(input: LoginInput): Promise<CustomerIdentity>
  logout(): Promise<void>
  getCurrentUser(): Promise<CustomerIdentity | null>
  setProfileCompleted(): Promise<void>
  verifyEmail(email: string): Promise<CustomerIdentity>
  resendVerification(email: string): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(email: string, newPassword: string): Promise<void>
  getCustomerProfile(): Promise<CustomerProfile | null>
  updateCustomerProfile(profile: CustomerProfile): Promise<CustomerProfile>
  listEvents(): Promise<CustomerEvent[]>
  createEvent(input: CreateEventInput): Promise<CustomerEvent>
  retrieveEvent(eventId: string): Promise<CustomerEvent | null>
  updateEvent(eventId: string, input: CreateEventInput): Promise<CustomerEvent>
  createServiceRequirement(eventId: string, input: RequirementInput): Promise<CustomerEvent>
  uploadAttachment(file: File): Promise<AttachmentRecord>
}

export type ProviderCoverageLocation = { pinCode: string; locality: string; city: string; state: string }
export type ProviderProfile = { displayName: string; description: string; categories: string[]; coverage: ProviderCoverageLocation[]; contact: string; completedAt: string }
export type ProviderApi = { completeProviderOnboarding(profile: ProviderProfile): Promise<ProviderProfile>; getProviderProfile(): Promise<ProviderProfile | null> }
