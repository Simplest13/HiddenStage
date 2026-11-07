import type { AttachmentRecord, CreateEventInput, CustomerApi, CustomerEvent, CustomerIdentity, CustomerProfile, LoginInput, RegisterInput, RequirementInput } from '../../../shared/api/customerContracts'

const SESSION_KEY = 'hiddenstage.demo.session.v1'
const PROFILE_KEY = 'hiddenstage.demo.customer-profile.v1'
const EVENTS_KEY = 'hiddenstage.demo.events.v1'
const accounts = new Map<string, { password: string; identity: CustomerIdentity }>([
  ['demo@hiddenstage.test', { password: 'Preview123!', identity: { id: 'demo-customer', fullName: 'Demo Customer', email: 'demo@hiddenstage.test', emailVerified: true, profileCompleted: false, accountType: 'CUSTOMER' } }],
])

function readStored<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
function saveStored<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)) }
function sessionIdentity() { return readStoredFrom(sessionStorage, SESSION_KEY, null) as CustomerIdentity | null }
function profileStorageKey() { return `${PROFILE_KEY}.${sessionIdentity()?.id ?? 'anonymous'}` }
function eventsStorageKey() { return `${EVENTS_KEY}.${sessionIdentity()?.id ?? 'anonymous'}` }
function readStoredFrom<T>(storage: Storage, key: string, fallback: T): T {
  try { const raw = storage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
function saveSession(identity: CustomerIdentity) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity)) }
function makeId() { return globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
function normalizeEvent(value: unknown): CustomerEvent {
  const old = value as Record<string, unknown>
  const requirements = Array.isArray(old.requirements) ? old.requirements.map((item) => {
    const requirement = item as Record<string, unknown>
    return { id: String(requirement.id ?? makeId()), category: String(requirement.category ?? ''), title: String(requirement.title ?? requirement.category ?? 'Service request'), description: String(requirement.description ?? ''), budget: typeof requirement.budget === 'number' ? requirement.budget : null, instructions: String(requirement.instructions ?? '') }
  }) : []
  const createdAt = String(old.createdAt ?? new Date().toISOString())
  return { ...(old as unknown as CustomerEvent), description: String(old.description ?? ''), venueName: String(old.venueName ?? old.venue ?? ''), address: String(old.address ?? old.venue ?? ''), requirements, createdAt, updatedAt: String(old.updatedAt ?? createdAt) }
}

export const demoCustomerApi: CustomerApi & { getSession(): CustomerIdentity | null } = {
  getSession: sessionIdentity,
  async getCurrentUser() { return sessionIdentity() },
  async setProfileCompleted() { const session = sessionIdentity(); if (session) saveSession({ ...session, profileCompleted: true }) },
  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase()
    if (accounts.has(email)) throw new Error('An account with this email already exists in this preview.')
    const identity: CustomerIdentity = { id: makeId(), fullName: input.fullName.trim(), email, emailVerified: false, profileCompleted: false, accountType: input.accountType ?? 'CUSTOMER' }
    accounts.set(email, { password: input.password, identity })
    saveSession(identity)
    return identity
  },
  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase()
    const account = accounts.get(email)
    if (!account || account.password !== input.password) throw new Error('Email or password did not match a demo account.')
    saveSession(account.identity)
    return account.identity
  },
  async logout() { sessionStorage.removeItem(SESSION_KEY) },
  async verifyEmail(email: string) {
    const session = sessionIdentity()
    if (!session || session.email !== email.toLowerCase()) throw new Error('No matching demo registration is active.')
    const identity = { ...session, emailVerified: true }
    saveSession(identity)
    const account = accounts.get(identity.email)
    if (account) accounts.set(identity.email, { ...account, identity })
    return identity
  },
  async resendVerification(_email: string) { /* Demo mode intentionally performs no email delivery. */ },
  async requestPasswordReset(_email: string) {
    // Preview response only. No mail transport is called.
  },
  async resetPassword(email: string, newPassword: string) {
    const account = accounts.get(email.trim().toLowerCase())
    if (!account) throw new Error('That email is not registered in the current preview session.')
    accounts.set(account.identity.email, { ...account, password: newPassword })
  },
  async getCustomerProfile() { return readStored<CustomerProfile | null>(profileStorageKey(), null) },
  async updateCustomerProfile(profile: CustomerProfile) {
    saveStored(profileStorageKey(), profile)
    const session = sessionIdentity()
    if (session) saveSession({ ...session, profileCompleted: true })
    return profile
  },
  async listEvents() { return readStored<unknown[]>(eventsStorageKey(), []).map(normalizeEvent) },
  async createEvent(input: CreateEventInput) {
    const now = new Date().toISOString()
    const event: CustomerEvent = { ...input, id: makeId(), status: 'Submitted', createdAt: now, updatedAt: now }
    saveStored(eventsStorageKey(), [event, ...await this.listEvents()])
    return event
  },
  async retrieveEvent(eventId: string) { return (await this.listEvents()).find((event) => event.id === eventId) ?? null },
  async updateEvent(eventId: string, input: CreateEventInput) {
    const events = await this.listEvents()
    const existing = events.find((event) => event.id === eventId)
    if (!existing) throw new Error('This demo event could not be found.')
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() }
    saveStored(eventsStorageKey(), events.map((event) => event.id === eventId ? updated : event))
    return updated
  },
  async createServiceRequirement(eventId: string, input: RequirementInput) {
    const event = await this.retrieveEvent(eventId)
    if (!event) throw new Error('This demo event could not be found.')
    return this.updateEvent(eventId, { ...event, requirements: [...event.requirements, input] })
  },
  async uploadAttachment(file: File): Promise<AttachmentRecord> {
    // Metadata only: the file bytes never leave the browser or enter storage.
    return { id: makeId(), name: file.name, type: file.type || 'application/octet-stream', size: file.size }
  },
}
