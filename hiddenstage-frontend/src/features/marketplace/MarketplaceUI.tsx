import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Checkbox, Modal, Textarea } from '../../shared/ui'
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
  formatPaise,
  formatShortDate,
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

export function QuoteComparison({ quotations, showEvent = false }: { quotations: ApiQuotation[]; showEvent?: boolean }) {
  return <div className="compare-scroll">
    <table className="compare-table">
      <caption className="sr-only">Supplier quotations compared by total, validity and scope</caption>
      <thead><tr>
        <th scope="col">Supplier</th>
        {showEvent && <th scope="col">Request</th>}
        <th scope="col">Quoted total</th>
        <th scope="col">Valid until</th>
        <th scope="col">Services priced</th>
        <th scope="col">Status</th>
      </tr></thead>
      <tbody>{quotations.map((quotation) => {
        const revision = latestRevision(quotation)
        return <tr key={quotation.id}>
          <th scope="row">{quotation.provider_display_name}</th>
          {showEvent && <td>{quotation.event_name}</td>}
          <td>{formatPaise(revision?.total_paise ?? 0)}</td>
          <td>{revision?.valid_until ? formatShortDate(revision.valid_until) : '—'}</td>
          <td>{revision?.items.length ?? 0}</td>
          <td>{revision ? <RevisionStatusBadge status={revision.status} /> : '—'}</td>
        </tr>
      })}</tbody>
    </table>
  </div>
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
