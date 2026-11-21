import type { CommitmentStatus, EventStatus, InvitationStatus, QuoteRevisionStatus, QuotationStatus, RequirementStatus, VerificationStatus } from './types'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 })

/** Money is stored as integer paise everywhere; render it as INR in the UI. */
export function formatPaise(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return 'Not specified'
  return inr.format(paise / 100)
}

export function parseRupeesToPaise(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, '')
  if (!trimmed) return null
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < 0) return null
  return Math.round(amount * 100)
}

export function paiseToRupeeInput(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return ''
  return String(paise / 100)
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** The API sends `HH:MM:SS`; display it in 12-hour form. */
export function formatTime(value: string | null | undefined) {
  if (!value) return '—'
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  if (!Number.isFinite(hour)) return value
  const suffix = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minuteText ?? '00'} ${suffix}`
}

export function formatTimeRange(start: string | null | undefined, end: string | null | undefined) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function addDays(iso: string | null | undefined, days: number = 1): string {
  if (!iso) return ''
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatEventSchedule(
  eventDate: string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  endDate?: string | null | undefined
): string {
  if (!eventDate) return '—'
  const isOvernight = Boolean(
    (endDate && endDate > eventDate) ||
    (startTime && endTime && endTime <= startTime)
  )
  const effectiveEndDate = endDate || (isOvernight ? addDays(eventDate, 1) : eventDate)
  if (isOvernight && effectiveEndDate && effectiveEndDate !== eventDate) {
    return `${formatDate(eventDate)} at ${formatTime(startTime)} – ${formatDate(effectiveEndDate)} at ${formatTime(endTime)} (Overnight)`
  }
  return `${formatDate(eventDate)} · ${formatTimeRange(startTime, endTime)}`
}

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function isPastDate(iso: string | null | undefined) {
  const days = daysUntil(iso)
  return days !== null && days < 0
}

export const eventStatusLabels: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Open for quotes',
  WITHDRAWN: 'Withdrawn',
  CLOSED: 'Closed',
}

export const requirementStatusLabels: Record<RequirementStatus, string> = {
  OPEN: 'Open',
  COMMITTED: 'Committed',
  CANCELLED: 'Cancelled',
}

export const invitationStatusLabels: Record<InvitationStatus, string> = {
  PENDING: 'Awaiting reply',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
}

export const quotationStatusLabels: Record<QuotationStatus, string> = {
  OPEN: 'Open',
  WITHDRAWN: 'Withdrawn by provider',
}

export const revisionStatusLabels: Record<QuoteRevisionStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  SUPERSEDED: 'Replaced',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
}

export const commitmentStatusLabels: Record<CommitmentStatus, string> = {
  ACTIVE: 'Active',
  RELEASED: 'Released',
}

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  UNVERIFIED: 'Unverified',
  PENDING: 'Verification pending',
  VERIFIED: 'Verified',
  REJECTED: 'Verification rejected',
}

/** Tone mapping used by the shared Badge component. */
export function eventStatusTone(status: EventStatus): 'neutral' | 'accent' | 'success' | 'warning' {
  if (status === 'SUBMITTED') return 'accent'
  if (status === 'CLOSED') return 'success'
  if (status === 'DRAFT') return 'warning'
  return 'neutral'
}

export function revisionStatusTone(status: QuoteRevisionStatus): 'neutral' | 'accent' | 'success' | 'warning' {
  if (status === 'SUBMITTED') return 'accent'
  if (status === 'DRAFT') return 'warning'
  if (status === 'EXPIRED' || status === 'WITHDRAWN') return 'neutral'
  return 'neutral'
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'HS'
}
