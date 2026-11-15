import { useMemo, useState } from 'react'
import { Link, useMatches, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { customerEventEditPath, routes } from '../../app/routes/routePaths'
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Modal, Select, Spinner, Textarea, useToast } from '../../shared/ui'
import { downloadApiFile } from '../../shared/api/client'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { useApiData } from '../../shared/api/backend/useApiData'
import type { ApiEvent, ApiProviderMatch } from '../../shared/api/backend/types'
import {
  formatDate,
  formatDateTime,
  formatPaise,
  formatShortDate,
  formatTimeRange,
  requirementStatusLabels,
  verificationStatusLabels,
} from '../../shared/api/backend/format'
import {
  CommitmentStatusBadge,
  EventStatusBadge,
  InvitationRow,
  QuoteCard,
  QuoteComparison,
  ReleaseCommitmentDialog,
} from '../marketplace/MarketplaceUI'
import '../customer/customer.css'
import '../marketplace/marketplace.css'
import './events.css'

type TabKey = 'overview' | 'providers' | 'quotes' | 'commitments'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Request details' },
  { key: 'providers', label: 'Suggested professionals' },
  { key: 'quotes', label: 'Quotations' },
  { key: 'commitments', label: 'Commitments' },
]

export default function EventWorkspacePage({ initialTab }: { initialTab?: TabKey }) {
  const { eventId = '' } = useParams()
  const handle = (useMatches().at(-1)?.handle as { page?: string } | undefined)?.page
  const fallbackTab: TabKey = handle === 'eventProviderDiscovery' ? 'providers' : handle === 'customerEventQuotes' ? 'quotes' : 'overview'
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as TabKey | null) ?? initialTab ?? fallbackTab
  const navigate = useNavigate()
  const { showToast } = useToast()

  const eventState = useApiData(() => eventsApi.get(eventId), [eventId])
  const categoriesState = useApiData(() => eventsApi.categories(), [])
  const invitationsState = useApiData(() => marketplaceApi.listEventInvitations(eventId), [eventId])
  const quotationsState = useApiData(() => marketplaceApi.listEventQuotations(eventId), [eventId])
  const commitmentsState = useApiData(() => marketplaceApi.listCommitments(), [])
  const matchesState = useApiData(
    () => tab === 'providers' ? marketplaceApi.discover({ event: eventId }) : Promise.resolve<ApiProviderMatch[]>([]),
    [eventId, tab],
  )

  const event = eventState.data
  const invitations = invitationsState.data ?? []
  const quotations = quotationsState.data ?? []
  const commitments = (commitmentsState.data ?? []).filter((item) => item.event === eventId)
  const categories = useMemo(() => categoriesState.data ?? [], [categoriesState.data])
  const categoryName = useMemo(() => Object.fromEntries(categories.map((category) => [category.code, category.name])), [categories])
  const pendingInvitations = invitations.filter((item) => item.status === 'PENDING')
  const editable = event ? event.status === 'DRAFT' || (event.status === 'SUBMITTED' && pendingInvitations.length === 0) : false

  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmAction, setConfirmAction] = useState<'withdraw' | 'delete' | 'publish' | null>(null)
  const [inviteTarget, setInviteTarget] = useState<ApiProviderMatch | null>(null)
  const [releaseTarget, setReleaseTarget] = useState<string | null>(null)

  function refreshAll() {
    eventState.reload(); invitationsState.reload(); quotationsState.reload(); commitmentsState.reload()
    if (tab === 'providers') matchesState.reload()
  }

  function changeTab(next: TabKey) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  async function run(label: string, action: () => Promise<unknown>, success: string) {
    setBusy(label); setActionError('')
    try { await action(); showToast(success, 'success'); refreshAll() }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : 'That action could not be completed.') }
    finally { setBusy(''); setConfirmAction(null) }
  }

  if (eventState.loading) return <div className="customer-page"><Spinner label="Loading your request" /></div>
  if (eventState.error) return <div className="customer-page"><ErrorState description={eventState.error} onRetry={eventState.reload} /></div>
  if (!event) return <div className="customer-page"><EmptyState title="Request not found" description="This request is not available to your account." action={<ButtonLink to={routes.customer.requests} variant="secondary">Back to my requests</ButtonLink>} /></div>

  return <section className="customer-page event-workspace">
    <div className="event-workspace__head">
      <div>
        <Link className="text-link" to={routes.customer.requests}>← My requests</Link>
        <div className="event-workspace__badges">
          <EventStatusBadge status={event.status} />
          <span>{event.event_type}</span>
          <span>·</span>
          <span>{event.city} {event.pin_code}</span>
        </div>
        <h1>{event.name}</h1>
        <p>{formatDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)} · {event.guest_count} guests</p>
      </div>
      <div className="event-workspace__actions">
        {editable && <ButtonLink to={customerEventEditPath(event.id)} variant="secondary">Edit request</ButtonLink>}
        {event.status === 'DRAFT' && <Button type="button" disabled={busy === 'publish'} onClick={() => setConfirmAction('publish')}>Publish request</Button>}
        {event.status === 'SUBMITTED' && <Button type="button" variant="secondary" disabled={busy === 'withdraw'} onClick={() => setConfirmAction('withdraw')}>Withdraw request</Button>}
        {event.status === 'DRAFT' && <Button type="button" variant="quiet" disabled={busy === 'delete'} onClick={() => setConfirmAction('delete')}>Delete draft</Button>}
      </div>
    </div>

    {event.status === 'DRAFT' && <div className="callout">
      <strong>This request is still a draft.</strong> Only you can see it. Publish it when the details and services are ready so HiddenStage can match it with professionals.
    </div>}
    {event.status === 'SUBMITTED' && pendingInvitations.length > 0 && <div className="callout callout--muted">
      <strong>This request can no longer be edited.</strong> {pendingInvitations.length === 1 ? 'An invitation is' : `${pendingInvitations.length} invitations are`} awaiting a supplier reply, so the brief is locked. Withdraw the request and publish a new one to change it.
    </div>}
    {actionError && <p className="customer-error" role="alert">{actionError}</p>}

    <nav className="request-tabs" aria-label="Request sections">
      {tabs.map((entry) => <button
        key={entry.key}
        type="button"
        className={tab === entry.key ? 'request-tabs__active' : ''}
        aria-current={tab === entry.key ? 'page' : undefined}
        onClick={() => changeTab(entry.key)}
      >
        {entry.label}
        {entry.key === 'providers' && invitations.length > 0 && <span>{invitations.length}</span>}
        {entry.key === 'quotes' && quotations.length > 0 && <span>{quotations.length}</span>}
        {entry.key === 'commitments' && commitments.length > 0 && <span>{commitments.length}</span>}
      </button>)}
    </nav>

    {tab === 'overview' && <div className="event-detail-layout">
      <div className="event-detail-main">
        <Card className="detail-card">
          <h2>Request details</h2>
          <dl className="detail-list">
            <div><dt>Date and time</dt><dd>{formatDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)}</dd></div>
            <div><dt>Guest count</dt><dd>{event.guest_count} guests</dd></div>
            <div><dt>Venue</dt><dd><strong>{event.venue_name || 'Not specified'}</strong><br />{event.venue_address || 'No street address provided'}<br />{event.locality}, {event.city}, {event.state} {event.pin_code}</dd></div>
            <div><dt>About this event</dt><dd>{event.description || 'No description provided.'}</dd></div>
          </dl>
        </Card>

        <Card className="detail-card">
          <div className="detail-card__heading"><h2>Services requested</h2><Badge>{event.requirements.length} service{event.requirements.length === 1 ? '' : 's'}</Badge></div>
          {event.requirements.length ? event.requirements.map((item, index) => <div className="event-detail-requirement" key={item.id}>
            <div className="event-detail-requirement__head">
              <span className="requirement-index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <Badge>{categoryName[item.category] ?? item.category_detail?.name ?? item.category}</Badge>
                <h3>{item.title}</h3>
              </div>
              <Badge tone={item.status === 'OPEN' ? 'accent' : 'success'}>{requirementStatusLabels[item.status]}</Badge>
            </div>
            {item.description && <p>{item.description}</p>}
            <div className="event-detail-requirement__meta">
              <small>Budget: {item.budget_paise === null ? 'Not specified' : formatPaise(item.budget_paise)}</small>
              {item.instructions && <small>Instructions: {item.instructions}</small>}
            </div>
          </div>) : <p className="detail-card__hint">No services were added to this request.</p>}
        </Card>

        <Card className="detail-card">
          <h2>Attachments</h2>
          <p className="detail-card__hint">Files are private to you and the suppliers you invite.</p>
          {event.attachments.length ? event.attachments.map((file) => <div className="attachment-row" key={file.id}>
            <div><strong>{file.original_name}</strong><small>{file.content_type} · {(file.size_bytes / 1024).toFixed(0)} KB</small></div>
            <Button type="button" size="sm" variant="quiet" onClick={() => downloadApiFile(file.download_url, file.original_name).catch(() => setActionError('That file could not be downloaded.'))}>Download</Button>
          </div>) : <p className="detail-card__hint">No reference files were attached.</p>}
        </Card>
      </div>

      <aside className="event-detail-side">
        <Card className="event-next-step">
          <span className="eyebrow">Progress</span>
          <ul className="request-progress">
            <li className="request-progress__done"><span>01</span><div><strong>Request saved</strong><small>{formatDateTime(event.created_at)}</small></div></li>
            <li className={event.submitted_at ? 'request-progress__done' : ''}><span>02</span><div><strong>Published for quotes</strong><small>{event.submitted_at ? formatDateTime(event.submitted_at) : 'Not published yet'}</small></div></li>
            <li className={invitations.length ? 'request-progress__done' : ''}><span>03</span><div><strong>Professionals invited</strong><small>{invitations.length ? `${invitations.length} invited` : 'None invited yet'}</small></div></li>
            <li className={quotations.length ? 'request-progress__done' : ''}><span>04</span><div><strong>Quotations received</strong><small>{quotations.length ? `${quotations.length} quote${quotations.length === 1 ? '' : 's'}` : 'Waiting for quotes'}</small></div></li>
            <li className={commitments.length ? 'request-progress__done' : ''}><span>05</span><div><strong>Supplier chosen</strong><small>{commitments.length ? `${commitments.length} commitment${commitments.length === 1 ? '' : 's'}` : 'Not chosen yet'}</small></div></li>
          </ul>
          {event.status === 'SUBMITTED' && <ButtonLink to={`${routes.customer.requestDetail.replace(':eventId', event.id)}?tab=providers`} variant="secondary">Find professionals</ButtonLink>}
        </Card>
        <Card className="event-side-note">
          <span className="eyebrow">Privacy</span>
          <p>Suppliers see your event type, date, area and service brief. Your name, phone and exact address are only shared once you choose them.</p>
        </Card>
      </aside>
    </div>}

    {tab === 'providers' && <>
      <div className="section-toolbar">
        <div>
          <h2>Suggested professionals</h2>
          <p>Matched on the services you requested and the exact locations each professional covers.</p>
        </div>
        <Badge>{matchesState.data?.length ?? 0} available</Badge>
      </div>
      {matchesState.loading && <Spinner label="Finding professionals" />}
      {matchesState.error && <ErrorState description={matchesState.error} onRetry={matchesState.reload} />}
      {!matchesState.loading && !matchesState.error && (matchesState.data?.length ?? 0) === 0 && <EmptyState
        title="No professionals match yet"
        description="Professionals appear here when they offer one of your service categories and explicitly cover your PIN code or city and state. Coverage is never inferred from nearby areas."
        action={<ButtonLink to={routes.services} variant="secondary">Browse service categories</ButtonLink>}
      />}
      <div className="match-grid">
        {(matchesState.data ?? []).map((match) => <Card as="article" className="match-card" key={match.id}>
          <div className="match-card__head">
            <div><h3>{match.display_name}</h3><p>{match.description || 'No description provided.'}</p></div>
            <Badge tone={match.verification_status === 'VERIFIED' ? 'success' : 'neutral'}>{verificationStatusLabels[match.verification_status]}</Badge>
          </div>
          <div className="match-card__tags">
            <Badge tone="accent">{match.kind === 'WORKER' ? 'Independent worker' : 'Manager'}</Badge>
            {match.categories.map((code) => <Badge key={code}>{categoryName[code] ?? code}</Badge>)}
          </div>
          <p className="match-card__coverage">
            Covers {match.matching_coverage.map((location) => `${location.locality} ${location.pin_code}`).join(', ')}
            {match.exact_pin_match && <Badge tone="accent">Exact PIN match</Badge>}
          </p>
          <div className="match-card__actions">
            {match.already_invited
              ? <span className="match-card__invited">Invitation sent</span>
              : <Button type="button" onClick={() => setInviteTarget(match)}>Invite to quote</Button>}
          </div>
        </Card>)}
      </div>

      <section className="request-subsection">
        <div className="section-toolbar">
          <div><h2>Invitations</h2><p>Invitations ask a professional to review your request and quote.</p></div>
          <Badge>{invitations.length}</Badge>
        </div>
        {invitations.length
          ? <ul className="invitation-list">{invitations.map((invitation) => <InvitationRow key={invitation.id} invitation={invitation} onWithdraw={(target) => {
            setBusy(`invitation-${target.id}`)
            marketplaceApi.withdrawInvitation(event.id, target.id)
              .then(() => { showToast('Invitation withdrawn.', 'success'); refreshAll() })
              .catch((caught: unknown) => setActionError(caught instanceof Error ? caught.message : 'Could not withdraw the invitation.'))
              .finally(() => setBusy(''))
          }} />)}</ul>
          : <p className="muted-note">No invitations yet. Publishing the request makes it visible to matching professionals; an invitation nudges a specific one.</p>}
      </section>
    </>}

    {tab === 'quotes' && <>
      <div className="section-toolbar">
        <div><h2>Quotations</h2><p>Every submitted revision from professionals matched to this request.</p></div>
        <Badge>{quotations.length} received</Badge>
      </div>
      {quotationsState.loading && <Spinner label="Loading quotations" />}
      {quotationsState.error && <ErrorState description={quotationsState.error} onRetry={quotationsState.reload} />}
      {!quotationsState.loading && quotations.length === 0 && <EmptyState
        title="No quotations yet"
        description="A supplier can quote after accepting your invitation. Quotes show their priced services, message and validity."
        action={<Button type="button" variant="secondary" onClick={() => changeTab('providers')}>Review suggested professionals</Button>}
      />}
      {quotations.length > 0 && <QuoteComparison quotations={quotations} />}
      <div className="quote-list">
        {quotations.map((quotation) => <QuoteCard key={quotation.id} quotation={quotation} event={event} onAccepted={() => { showToast('Supplier chosen. The commitment is recorded in your workspace.', 'success'); refreshAll() }} />)}
      </div>
      <p className="muted-note">HiddenStage does not run an in-platform chat in this release. Use the supplier contact shown on a quote, and keep the commitment recorded here as your agreed scope.</p>
    </>}

    {tab === 'commitments' && <>
      <div className="section-toolbar">
        <div><h2>Commitments for this request</h2><p>A commitment records the services and price you agreed with a supplier.</p></div>
        <Badge>{commitments.length}</Badge>
      </div>
      {commitmentsState.loading && <Spinner label="Loading commitments" />}
      {commitmentsState.error && <ErrorState description={commitmentsState.error} onRetry={commitmentsState.reload} />}
      {!commitmentsState.loading && commitments.length === 0 && <EmptyState title="No supplier chosen yet" description="Choose the services you want from a quotation to record a commitment." action={<Button type="button" variant="secondary" onClick={() => changeTab('quotes')}>View quotations</Button>} />}
      {commitments.map((commitment) => <Card className="commitment-card" key={commitment.id}>
        <div className="commitment-card__head">
          <div><span className="eyebrow">SUPPLIER</span><h3>{commitment.provider_display_name}</h3><p>Revision {commitment.quotation_revision} · accepted {formatShortDate(commitment.accepted_at)}</p></div>
          <div><strong>{formatPaise(commitment.total_paise)}</strong><CommitmentStatusBadge status={commitment.status} /></div>
        </div>
        <ul className="commitment-lines">{commitment.lines.map((line) => <li key={line.id}><span>{line.title}{line.package_key ? <small>Package: {line.package_key}</small> : <small>{line.requirement_title}</small>}</span><strong>{formatPaise(line.amount_paise)}</strong></li>)}</ul>
        {commitment.status === 'ACTIVE'
          ? <div className="commitment-card__actions"><Button type="button" variant="secondary" size="sm" onClick={() => setReleaseTarget(commitment.id)}>Release commitment</Button></div>
          : <p className="muted-note">Released {formatShortDate(commitment.released_at)}. {commitment.release_reason}</p>}
      </Card>)}
      <p className="muted-note">A commitment is not a booking, payment or guarantee. It records agreed scope and price; release keeps the history for both sides.</p>
    </>}

    {inviteTarget && <InviteDialog
      event={event}
      match={inviteTarget}
      busy={busy === 'invite'}
      onClose={() => setInviteTarget(null)}
      onInvite={async (message, requirementId) => {
        setBusy('invite'); setActionError('')
        try {
          await marketplaceApi.inviteProvider(event.id, { provider_id: inviteTarget.user_id, requirement_id: requirementId, message })
          showToast(`Invitation sent to ${inviteTarget.display_name}.`, 'success')
          setInviteTarget(null)
          refreshAll()
        } catch (caught) { setActionError(caught instanceof Error ? caught.message : 'The invitation could not be sent.') }
        finally { setBusy('') }
      }}
    />}

    {releaseTarget && <ReleaseCommitmentDialog
      onClose={() => setReleaseTarget(null)}
      onRelease={async (reason) => {
        try {
          await marketplaceApi.releaseCommitment(releaseTarget, reason)
          showToast('Commitment released. The history is kept.', 'success')
          setReleaseTarget(null)
          refreshAll()
        } catch (caught) { setActionError(caught instanceof Error ? caught.message : 'The commitment could not be released.') }
      }}
    />}

    {confirmAction && <Modal
      open
      title={confirmAction === 'withdraw' ? 'Withdraw this request?' : confirmAction === 'delete' ? 'Delete this draft?' : 'Publish this request?'}
      onClose={() => setConfirmAction(null)}
    >
      <div className="modal-stack">
        <p>{confirmAction === 'withdraw'
          ? 'Outstanding invitations will be withdrawn and suppliers can no longer quote. The request is kept in your history as withdrawn.'
          : confirmAction === 'delete'
            ? 'This draft and its services will be removed. This cannot be undone.'
            : 'Publishing makes the request open to quotes from matching professionals. You can still edit it until a supplier invitation is awaiting a reply.'}</p>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button
            type="button"
            variant={confirmAction === 'delete' ? 'danger' : 'primary'}
            disabled={Boolean(busy)}
            onClick={() => {
              if (confirmAction === 'withdraw') void run('withdraw', () => eventsApi.withdraw(event.id), 'Request withdrawn.')
              else if (confirmAction === 'delete') void run('delete', async () => { await eventsApi.remove(event.id); navigate(routes.customer.requests) }, 'Draft deleted.')
              else void run('publish', () => eventsApi.submit(event.id), 'Request published. Matching professionals can now quote.')
            }}
          >{busy ? 'Working…' : confirmAction === 'withdraw' ? 'Withdraw request' : confirmAction === 'delete' ? 'Delete draft' : 'Publish request'}</Button>
        </div>
      </div>
    </Modal>}
  </section>
}

function InviteDialog({ event, match, busy, onClose, onInvite }: {
  event: ApiEvent
  match: ApiProviderMatch
  busy: boolean
  onClose: () => void
  onInvite: (message: string, requirementId: string | null) => Promise<void>
}) {
  const [message, setMessage] = useState('')
  const [requirementId, setRequirementId] = useState('')
  return <Modal open title={`Invite ${match.display_name} to quote`} onClose={onClose}>
    <div className="modal-stack">
      <p>An invitation asks this professional to review your request and send a quotation. It is free and does not commit you to anything.</p>
      <Select label="Scope" value={requirementId} onChange={(event) => setRequirementId(event.target.value)}>
        <option value="">All services in this request</option>
        {event.requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}
      </Select>
      <Textarea label="Message (optional)" name="inviteMessage" rows={4} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} hint="Tell them what matters most about your event." />
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="button" onClick={() => void onInvite(message, requirementId || null)} disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</Button>
      </div>
    </div>
  </Modal>
}

export function EventDetailPage() { return <EventWorkspacePage initialTab="overview" /> }
export function EventProvidersPage() { return <EventWorkspacePage initialTab="providers" /> }
export function EventQuotesPage() { return <EventWorkspacePage initialTab="quotes" /> }
