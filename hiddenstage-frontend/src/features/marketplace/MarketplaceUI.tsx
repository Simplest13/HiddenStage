import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Checkbox, Modal, Textarea } from '../../shared/ui'
import { Icon } from '../../shared/ui/Icon'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import {
  acceptanceOptions,
  actionableRevision,
  latestRevision,
  selectionFromOptions,
  selectionTotal,
} from '../../shared/api/backend/quoteSelection'
import {
  daysUntil,
  formatDate,
  formatPaise,
  formatShortDate,
  formatTimeRange,
  revisionStatusLabels,
  revisionStatusTone,
  verificationStatusLabels,
} from '../../shared/api/backend/format'
import type {
  ApiEvent,
  ApiInvitation,
  ApiProviderDetail,
  ApiQuotation,
  ApiQuoteRevision,
  CommitmentStatus,
  EventStatus,
  InvitationStatus,
  QuoteRevisionStatus,
} from '../../shared/api/backend/types'
import './marketplace.css'

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const tone = status === 'SUBMITTED' ? 'accent' : status === 'CLOSED' ? 'success' : status === 'DRAFT' ? 'warning' : 'neutral'
  const label = status === 'SUBMITTED' ? 'Open for quotes' : status === 'DRAFT' ? 'Draft' : status === 'CLOSED' ? 'Closed' : 'Withdrawn'
  return <Badge tone={tone}>{label}</Badge>
}

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const tone = status === 'ACCEPTED' ? 'success' : status === 'PENDING' ? 'warning' : 'neutral'
  const label = status === 'PENDING' ? 'Awaiting reply' : status === 'ACCEPTED' ? 'Accepted' : status === 'DECLINED' ? 'Declined' : status === 'EXPIRED' ? 'Expired' : 'Withdrawn'
  return <Badge tone={tone}>{label}</Badge>
}

export function CommitmentStatusBadge({ status }: { status: CommitmentStatus }) {
  return <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'}>{status === 'ACTIVE' ? 'Active' : 'Released'}</Badge>
}

export function RevisionStatusBadge({ status }: { status: QuoteRevisionStatus }) {
  return <Badge tone={revisionStatusTone(status)}>{revisionStatusLabels[status]}</Badge>
}

type ItemGroup = { key: string; kind: 'PACKAGE' | 'LINE'; title: string; description: string; total: number; items: ApiQuoteRevision['items'] }

function groupItems(revision: ApiQuoteRevision): ItemGroup[] {
  const groups = new Map<string, ItemGroup>()
  for (const item of revision.items) {
    const key = item.package_key ? `package:${item.package_key}` : `line:${item.requirement}`
    const existing = groups.get(key)
    if (existing) {
      existing.total += item.amount_paise
      existing.items = [...existing.items, item]
      continue
    }
    groups.set(key, {
      key,
      kind: item.package_key ? 'PACKAGE' : 'LINE',
      title: item.package_key
        ? item.package_key.replace(/[-_]+/g, ' ').replace(/^\w/, (character) => character.toUpperCase())
        : item.requirement_title || item.title,
      description: item.description || '',
      total: item.amount_paise,
      items: [item],
    })
  }
  return [...groups.values()]
}

export function QuoteBreakdown({ revision }: { revision: ApiQuoteRevision }) {
  const groups = useMemo(() => groupItems(revision), [revision])
  const daysLeft = daysUntil(revision.valid_until)
  return <div className="quote-breakdown">
    <div className="quote-breakdown__meta">
      <span>Revision {revision.revision_number} · <RevisionStatusBadge status={revision.status} /></span>
      <span>Valid until {revision.valid_until ? formatShortDate(revision.valid_until) : 'not set'}
        {revision.valid_until && daysLeft !== null && daysLeft >= 0 && <small> · {daysLeft === 0 ? 'expires today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}</small>}
      </span>
    </div>
    {revision.notes && <p className="quote-breakdown__notes">“{revision.notes}”</p>}
    <ul className="quote-lines">
      {groups.map((group) => <li key={group.key}>
        <div className="quote-lines__head">
          <strong>{group.title}</strong>
          {group.kind === 'PACKAGE' && <Badge tone="neutral">Package · all services included</Badge>}
          {group.kind === 'LINE' && group.items[0]?.requirement_title && group.items[0].requirement_title !== group.title && <small>{group.items[0].requirement_title}</small>}
        </div>
        {group.items.map((item) => <div className="quote-lines__item" key={item.id}>
          <span>{item.title !== group.title ? item.title : null}{item.description ? <small>{item.description}</small> : null}</span>
          <strong>{formatPaise(item.amount_paise)}</strong>
        </div>)}
      </li>)}
    </ul>
    <div className="quote-breakdown__total"><span>Quoted total</span><strong>{formatPaise(revision.total_paise)}</strong></div>
    <p className="quote-breakdown__note">The total is the sum of the supplier's priced lines. Taxes, travel or extras are only included if the supplier listed them above.</p>
  </div>
}

export function ProviderContact({ providerId }: { providerId: string }) {
  const [detail, setDetail] = useState<ApiProviderDetail | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  async function load() {
    setState('loading')
    try { setDetail(await marketplaceApi.providerDetail(providerId)); setState('idle') }
    catch { setState('error') }
  }
  if (detail) return <div className="provider-contact">
    <span>Contact {detail.display_name}</span>
    <strong>{detail.contact}</strong>
    <small>{verificationStatusLabels[detail.verification_status]} · HiddenStage does not run an in-platform chat, so arrange details directly.</small>
  </div>
  return <div className="provider-contact">
    <Button type="button" variant="quiet" size="sm" onClick={load} disabled={state === 'loading'}>
      {state === 'loading' ? 'Loading contact…' : 'Show supplier contact'}
    </Button>
    {state === 'error' && <small role="alert">Contact details could not be loaded.</small>}
  </div>
}

export function AcceptQuoteDialog({
  quotation,
  revision,
  event,
  onClose,
  onAccepted,
}: {
  quotation: ApiQuotation
  revision: ApiQuoteRevision
  event: ApiEvent | null
  onClose: () => void
  onAccepted: () => void
}) {
  const options = useMemo(() => acceptanceOptions(revision), [revision])
  const committed = useMemo(() => new Set(event?.requirements.filter((item) => item.status !== 'OPEN').map((item) => item.id) ?? []), [event])
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const unavailable = (optionId: string) => {
    const option = options.find((item) => item.id === optionId)
    if (!option) return false
    return option.items.some((item) => committed.has(item.requirement))
  }
  const toggle = (optionId: string) => setSelected((current) => current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId])
  const total = selectionTotal(options, selected)

  async function confirm() {
    const selection = selectionFromOptions(options, selected)
    if (!selection.packageKeys.length && !selection.requirementIds.length) { setError('Select at least one service to choose this supplier for.'); return }
    setSaving(true); setError('')
    try {
      await marketplaceApi.acceptQuotation(quotation.id, {
        revision_id: revision.id,
        package_keys: selection.packageKeys,
        requirement_ids: selection.requirementIds,
      })
      onAccepted()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The supplier could not be chosen for this selection.')
    } finally { setSaving(false) }
  }

  return <Modal open title={`Choose ${quotation.provider_display_name}`} onClose={onClose}>
    <div className="accept-dialog">
      <p>Select the services you want this supplier to deliver. A commitment is recorded for each selected service; it is not a booking or payment.</p>
      <div className="accept-options">
        {options.map((option) => {
          const blocked = unavailable(option.id)
          return <label key={option.id} className={`accept-option ${blocked ? 'accept-option--blocked' : ''}`}>
            <Checkbox
              label={option.title}
              checked={selected.includes(option.id)}
              disabled={blocked || saving}
              onChange={() => toggle(option.id)}
            />
            <span className="accept-option__meta">
              <small>{option.kind === 'PACKAGE' ? 'Package — every included service is committed together' : 'Individual service line'}</small>
              <strong>{formatPaise(option.amountPaise)}</strong>
              {blocked && <em>Already committed to another supplier</em>}
            </span>
          </label>
        })}
      </div>
      <div className="accept-total"><span>Commitment total</span><strong>{formatPaise(total)}</strong></div>
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="button" onClick={confirm} disabled={saving || !selected.length}>{saving ? 'Recording…' : 'Confirm selection'}</Button>
      </div>
    </div>
  </Modal>
}

export function QuoteCard({
  quotation,
  event,
  onAccepted,
  showEventLink = false,
}: {
  quotation: ApiQuotation
  event: ApiEvent | null
  onAccepted: () => void
  showEventLink?: boolean
}) {
  const revision = latestRevision(quotation)
  const committedRequirementIds = new Set((event?.requirements ?? []).filter((item) => item.status !== 'OPEN').map((item) => item.id))
  const fullyCommitted = Boolean(revision?.items.length && revision.items.every((item) => committedRequirementIds.has(item.requirement)))
  const actionable = fullyCommitted ? null : actionableRevision(quotation)
  const [accepting, setAccepting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  return <article className="quote-card">
    <header className="quote-card__head">
      <div>
        <span className="eyebrow">SUPPLIER</span>
        <h3>{quotation.provider_display_name}</h3>
        <p>
          {showEventLink && <><Link to={`/app/events/${quotation.event}`}>{quotation.event_name}</Link> · </>}
          {revision ? `Revision ${revision.revision_number}` : 'No submitted revision'}
          {quotation.status === 'WITHDRAWN' && ' · withdrawn by supplier'}
        </p>
      </div>
      <div className="quote-card__number">
        <span>Quoted total</span>
        <strong>{formatPaise(revision?.total_paise ?? 0)}</strong>
        {revision && <RevisionStatusBadge status={revision.status} />}
      </div>
    </header>

    {revision && <QuoteBreakdown revision={revision} />}

    <footer className="quote-card__actions">
      <div className="quote-card__links">
        {quotation.revisions.length > 1 && <button type="button" className="text-link" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Hide revision history' : `Revision history (${quotation.revisions.length})`}
        </button>}
        <ProviderContact providerId={quotation.provider_profile_id ?? quotation.provider} />
      </div>
      {actionable
        ? <Button type="button" onClick={() => setAccepting(true)}>Choose supplier</Button>
        : <span className="quote-card__inactive">{fullyCommitted ? 'Already committed' : `Not available to choose${revision?.status === 'EXPIRED' ? ' — this quote has expired' : ''}`}</span>}
    </footer>

    {expanded && <ol className="revision-history">
      {quotation.revisions.map((entry) => <li key={entry.id}>
        <span>Revision {entry.revision_number}</span>
        <RevisionStatusBadge status={entry.status} />
        <strong>{formatPaise(entry.total_paise)}</strong>
        <small>Valid until {entry.valid_until ? formatShortDate(entry.valid_until) : 'not set'}</small>
      </li>)}
    </ol>}

    <p className="quote-card__decline-note">Not the right fit? Simply leave this quote unselected. HiddenStage does not send a decline message in this release.</p>

    {accepting && actionable && <AcceptQuoteDialog
      quotation={quotation}
      revision={actionable}
      event={event}
      onClose={() => setAccepting(false)}
      onAccepted={onAccepted}
    />}
  </article>
}

export function QuoteComparison({
  quotations,
  showEvent = false,
  event = null,
  onAccepted,
}: {
  quotations: ApiQuotation[]
  showEvent?: boolean
  event?: ApiEvent | null
  onAccepted?: () => void
}) {
  const [activeQuotation, setActiveQuotation] = useState<ApiQuotation | null>(null)

  return (
    <>
      <div className="compare-scroll">
        <table className="compare-table">
          <caption className="sr-only">Supplier quotations compared by total, validity and scope</caption>
          <thead>
            <tr>
              <th scope="col">Supplier</th>
              {showEvent && <th scope="col">Request</th>}
              <th scope="col">Quoted total</th>
              <th scope="col">Valid until</th>
              <th scope="col">Services priced</th>
              <th scope="col">Status</th>
              <th scope="col" className="compare-table__action-col">Action</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((quotation) => {
              const revision = latestRevision(quotation)
              return (
                <tr key={quotation.id}>
                  <th scope="row">
                    <button
                      type="button"
                      className="text-link compare-table__provider-btn"
                      onClick={() => setActiveQuotation(quotation)}
                    >
                      {quotation.provider_display_name}
                    </button>
                  </th>
                  {showEvent && <td>{quotation.event_name}</td>}
                  <td><strong>{formatPaise(revision?.total_paise ?? 0)}</strong></td>
                  <td>{revision?.valid_until ? formatShortDate(revision.valid_until) : '—'}</td>
                  <td>{revision?.items.length ?? 0}</td>
                  <td>{revision ? <RevisionStatusBadge status={revision.status} /> : <Badge tone="neutral">Pending</Badge>}</td>
                  <td className="compare-table__action-cell">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveQuotation(quotation)}
                    >
                      Show quote
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {activeQuotation && (
        <ProfessionalQuoteDialog
          quotation={activeQuotation}
          event={event}
          onClose={() => setActiveQuotation(null)}
          onAccepted={() => {
            setActiveQuotation(null)
            onAccepted?.()
          }}
        />
      )}
    </>
  )
}

export function ProfessionalQuoteDialog({
  quotation,
  event,
  onClose,
  onAccepted,
}: {
  quotation: ApiQuotation
  event: ApiEvent | null
  onClose: () => void
  onAccepted?: () => void
}) {
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>(() => {
    return latestRevision(quotation)?.id ?? quotation.revisions[0]?.id ?? ''
  })

  const revision = useMemo(() => {
    return quotation.revisions.find((r) => r.id === selectedRevisionId) ?? latestRevision(quotation)
  }, [quotation, selectedRevisionId])

  const eventDetail = event ?? quotation.event_detail
  const committedRequirementIds = useMemo(
    () => new Set((eventDetail?.requirements ?? []).filter((item) => item.status !== 'OPEN').map((item) => item.id)),
    [eventDetail]
  )
  const fullyCommitted = Boolean(revision?.items.length && revision.items.every((item) => committedRequirementIds.has(item.requirement)))
  const actionable = fullyCommitted ? null : actionableRevision(quotation)
  const [accepting, setAccepting] = useState(false)

  const quoteRef = `HS-QTE-${quotation.id.slice(0, 8).toUpperCase()}`

  function handlePrint() {
    window.print()
  }

  function handleDownloadHtml() {
    if (!revision) return
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation ${quoteRef} - ${quotation.provider_display_name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #111; line-height: 1.5; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; color: #0b0c10; margin: 0; }
    .ref { color: #718096; font-size: 14px; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
    .party-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #a0aec0; margin-bottom: 6px; }
    .party-name { font-size: 18px; font-weight: bold; margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { text-align: left; background: #f7fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 13px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; vertical-align: top; }
    .amount-col { text-align: right; }
    .total-box { margin-left: auto; width: 300px; padding: 16px; background: #f7fafc; border-radius: 8px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
    .total-row.final { font-size: 18px; font-weight: bold; border-top: 2px solid #e2e8f0; padding-top: 8px; color: #e11d48; }
    .notes { margin-top: 30px; padding: 16px; border-left: 4px solid #f59e0b; background: #fffbeb; }
    .footer { margin-top: 40px; text-align: center; color: #a0aec0; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">HiddenStage Quotation</h1>
      <div class="ref">Reference: ${quoteRef} · Revision ${revision.revision_number}</div>
    </div>
    <div style="text-align: right;">
      <div><strong>Status:</strong> ${revision.status}</div>
      <div><strong>Issued:</strong> ${formatShortDate(revision.submitted_at || quotation.created_at)}</div>
      <div><strong>Valid until:</strong> ${revision.valid_until ? formatShortDate(revision.valid_until) : '14 days'}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="party-title">Supplier / Issued By</div>
      <div class="party-name">${quotation.provider_display_name}</div>
      <div>HiddenStage Verified Provider</div>
    </div>
    <div>
      <div class="party-title">Client / Prepared For</div>
      <div class="party-name">${eventDetail?.name || quotation.event_name}</div>
      <div>${eventDetail?.event_date ? formatShortDate(eventDetail.event_date) : ''} · ${eventDetail?.guest_count ? `${eventDetail.guest_count} guests` : ''}</div>
      <div>${[eventDetail?.locality, eventDetail?.city].filter(Boolean).join(', ')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Service Item & Scope</th>
        <th>Type</th>
        <th class="amount-col">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${revision.items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${item.title}</strong>
            ${item.requirement_title ? `<div style="color: #718096; font-size: 12px;">Requirement: ${item.requirement_title}</div>` : ''}
            ${item.description ? `<div style="margin-top: 4px; color: #4a5568;">${item.description}</div>` : ''}
          </td>
          <td>${item.kind === 'PACKAGE' ? `Package: ${item.package_key}` : 'Service Line'}</td>
          <td class="amount-col">₹${(item.amount_paise / 100).toLocaleString('en-IN')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-row"><span>Subtotal:</span><span>₹${(revision.total_paise / 100).toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span>Platform Commission:</span><span>₹0 (Free)</span></div>
    <div class="total-row final"><span>Total Quoted:</span><span>₹${(revision.total_paise / 100).toLocaleString('en-IN')}</span></div>
  </div>

  ${revision.notes ? `
    <div class="notes">
      <strong>Supplier Notes & Conditions:</strong>
      <p style="margin: 4px 0 0;">${revision.notes}</p>
    </div>
  ` : ''}

  <div class="footer">
    Generated via HiddenStage Event Services Marketplace · www.hiddenstage.in
  </div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `HiddenStage-Quotation-${quoteRef}.html`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Modal
        open
        title={`Quotation ${quoteRef} — ${quotation.provider_display_name}`}
        onClose={onClose}
        className="modal--wide"
      >
        <div className="quote-template-wrapper">
          <div className="quote-template-actions no-print">
            <div className="quote-template-actions__left">
              <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
                <Icon name="receipt" size={15} /> Download / Print PDF
              </Button>
              <Button type="button" variant="quiet" size="sm" onClick={handleDownloadHtml}>
                <Icon name="fileText" size={15} /> Download HTML
              </Button>
            </div>
            <div className="quote-template-actions__right">
              {actionable ? (
                <Button type="button" size="sm" onClick={() => setAccepting(true)}>
                  Choose supplier
                </Button>
              ) : (
                <span className="quote-card__inactive">
                  {fullyCommitted ? 'Already committed' : (revision?.status === 'EXPIRED' ? 'Expired' : 'Not available to choose')}
                </span>
              )}
            </div>
          </div>

          <article className="professional-quote-sheet" id="quote-printable-document">
            <header className="quote-sheet__header">
              <div className="quote-sheet__brand">
                <div className="quote-sheet__logo-badge">
                  <span className="quote-sheet__logo-text">HIDDENSTAGE</span>
                  <span className="quote-sheet__logo-sub">Event Services Marketplace</span>
                </div>
                <span className="quote-sheet__doc-type">OFFICIAL SUPPLIER QUOTATION</span>
              </div>
              <div className="quote-sheet__ref-block">
                <div className="quote-sheet__ref-row">
                  <span>Reference:</span>
                  <strong>{quoteRef}</strong>
                </div>
                {revision && (
                  <div className="quote-sheet__ref-row">
                    <span>Revision:</span>
                    <strong>Revision {revision.revision_number}</strong>
                  </div>
                )}
                {revision && (
                  <div className="quote-sheet__ref-row">
                    <span>Status:</span>
                    <RevisionStatusBadge status={revision.status} />
                  </div>
                )}
                <div className="quote-sheet__ref-row">
                  <span>Date:</span>
                  <strong>{formatShortDate(revision?.submitted_at || quotation.created_at)}</strong>
                </div>
                {revision?.valid_until && (
                  <div className="quote-sheet__ref-row">
                    <span>Valid until:</span>
                    <strong>{formatShortDate(revision.valid_until)}</strong>
                  </div>
                )}
              </div>
            </header>

            <div className="quote-sheet__parties-grid">
              <div className="quote-sheet__party-card">
                <span className="quote-sheet__party-label">PREPARED BY / SUPPLIER</span>
                <h3 className="quote-sheet__party-name">{quotation.provider_display_name}</h3>
                <div className="quote-sheet__party-meta no-print">
                  <ProviderContact providerId={quotation.provider_profile_id ?? quotation.provider} />
                </div>
              </div>

              <div className="quote-sheet__party-card">
                <span className="quote-sheet__party-label">PREPARED FOR / CLIENT</span>
                <h3 className="quote-sheet__party-name">{eventDetail?.name || quotation.event_name || 'Event Request'}</h3>
                <div className="quote-sheet__party-details">
                  {(eventDetail?.event_date || quotation.event_date) && (
                    <p>
                      <strong>Date:</strong> {formatDate(eventDetail?.event_date || quotation.event_date!)}
                      {eventDetail?.start_time && ` (${formatTimeRange(eventDetail.start_time, eventDetail.end_time)})`}
                    </p>
                  )}
                  {eventDetail?.guest_count ? <p><strong>Guests:</strong> {eventDetail.guest_count} attendees</p> : null}
                  {(eventDetail?.locality || eventDetail?.city) && (
                    <p><strong>Location:</strong> {[eventDetail?.locality, eventDetail?.city, eventDetail?.pin_code].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>
            </div>

            {!revision && (
              <div className="quote-sheet__empty-state">
                <h4>Quotation Pending Submission</h4>
                <p>This supplier accepted your invitation and is currently preparing the formal price breakdown. Once submitted, each priced line and validity will appear here.</p>
              </div>
            )}

            {revision && (
              <>
                <div className="quote-sheet__table-wrap">
                  <table className="quote-sheet__table">
                    <thead>
                      <tr>
                        <th style={{ width: '3rem' }}>#</th>
                        <th>Service Deliverable & Scope</th>
                        <th style={{ width: '9rem' }}>Type</th>
                        <th style={{ width: '8rem', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revision.items.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{item.title}</strong>
                            {item.requirement_title && item.requirement_title !== item.title && (
                              <div className="quote-sheet__item-req">Requirement: {item.requirement_title}</div>
                            )}
                            {item.description && (
                              <p className="quote-sheet__item-desc">{item.description}</p>
                            )}
                          </td>
                          <td>
                            {item.kind === 'PACKAGE' ? (
                              <span className="quote-sheet__pkg-tag">Package · {item.package_key}</span>
                            ) : (
                              <span className="quote-sheet__line-tag">Individual Service</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>{formatPaise(item.amount_paise)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="quote-sheet__financials">
                  <div className="quote-sheet__notes-block">
                    {revision.notes ? (
                      <>
                        <span className="quote-sheet__party-label">SUPPLIER NOTES & INCLUSIONS</span>
                        <p className="quote-sheet__notes-text">{revision.notes}</p>
                      </>
                    ) : (
                      <p className="quote-sheet__disclaimer">
                        All services, deliverables, crew, and materials are specified above. Unlisted items or overtime are subject to separate mutual agreement.
                      </p>
                    )}
                  </div>
                  <div className="quote-sheet__totals-box">
                    <div className="quote-sheet__total-row">
                      <span>Services Subtotal:</span>
                      <strong>{formatPaise(revision.total_paise)}</strong>
                    </div>
                    <div className="quote-sheet__total-row">
                      <span>HiddenStage Booking Fee:</span>
                      <strong>₹0 (0% Commission)</strong>
                    </div>
                    <div className="quote-sheet__total-row quote-sheet__total-row--final">
                      <span>Total Quoted:</span>
                      <strong>{formatPaise(revision.total_paise)}</strong>
                    </div>
                  </div>
                </div>

                {quotation.revisions.length > 1 && (
                  <div className="quote-sheet__history-selector no-print">
                    <span className="quote-sheet__party-label">REVISION HISTORY</span>
                    <div className="quote-sheet__history-pills">
                      {quotation.revisions.map((rev) => (
                        <button
                          key={rev.id}
                          type="button"
                          className={`quote-sheet__history-pill ${rev.id === revision.id ? 'quote-sheet__history-pill--active' : ''}`}
                          onClick={() => setSelectedRevisionId(rev.id)}
                        >
                          Rev {rev.revision_number} · {formatPaise(rev.total_paise)} ({rev.status})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <footer className="quote-sheet__footer">
              <p>Generated via HiddenStage Event Services Marketplace. Official binding record upon client confirmation.</p>
            </footer>
          </article>
        </div>
      </Modal>

      {accepting && actionable && (
        <AcceptQuoteDialog
          quotation={quotation}
          revision={actionable}
          event={event}
          onClose={() => setAccepting(false)}
          onAccepted={() => {
            setAccepting(false)
            onClose()
            onAccepted?.()
          }}
        />
      )}
    </>
  )
}

export function ReleaseCommitmentDialog({ onClose, onRelease }: { onClose: () => void; onRelease: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return <Modal open title="Release this commitment" onClose={onClose}>
    <div className="modal-stack">
      <p>Releasing records that you no longer intend to proceed. Both sides keep the history and the agreed terms stay visible.</p>
      <Textarea label="Reason (optional)" name="releaseReason" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Keep commitment</Button>
        <Button type="button" variant="danger" disabled={saving} onClick={async () => {
          setSaving(true); setError('')
          try { await onRelease(reason) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not release this commitment.') } finally { setSaving(false) }
        }}>{saving ? 'Releasing…' : 'Release commitment'}</Button>
      </div>
    </div>
  </Modal>
}

export function InvitationRow({ invitation, onWithdraw }: { invitation: ApiInvitation; onWithdraw?: (invitation: ApiInvitation) => void }) {
  return <li className="invitation-row">
    <div>
      <strong>{invitation.provider_display_name ?? 'Supplier'}</strong>
      <small>{invitation.requirement_title ? `For: ${invitation.requirement_title}` : 'All services in this request'}</small>
      {invitation.message && <p>“{invitation.message}”</p>}
      <small>Sent {formatShortDate(invitation.created_at)}{invitation.expires_at ? ` · reply by ${formatShortDate(invitation.expires_at)}` : ''}</small>
    </div>
    <div className="invitation-row__actions">
      <InvitationStatusBadge status={invitation.status} />
      {onWithdraw && invitation.status === 'PENDING' && <Button type="button" size="sm" variant="quiet" onClick={() => onWithdraw(invitation)}>Withdraw</Button>}
    </div>
  </li>
}
