import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useMatches, useParams, useSearchParams } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { networkApi } from '../../shared/api/backend/network'
import { profilesApi } from '../../shared/api/backend/profiles'
import { useApiData } from '../../shared/api/backend/useApiData'
import { formatDate, formatPaise, formatShortDate, formatTimeRange, parseRupeesToPaise } from '../../shared/api/backend/format'
import type {
  ApiAvailability,
  ApiCategory,
  ApiCommitment,
  ApiNetworkAssociation,
  ApiNetworkInvitation,
  ApiWorkerAssignment,
  ApiWorkerDiscovery,
  AssignmentStatus,
} from '../../shared/api/backend/types'
import { isApiError } from '../../shared/api/client'
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Input, Modal, Select, Spinner, Textarea, useToast } from '../../shared/ui'
import '../customer/customer.css'
import '../provider/provider.css'
import './network.css'

type Page = 'network' | 'networkDiscover' | 'assignments' | 'assignmentDetail'

const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Awaiting response',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REASSIGNED: 'Reassigned',
}

function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const tone = status === 'ACCEPTED' || status === 'COMPLETED'
    ? 'success'
    : status === 'IN_PROGRESS' || status === 'SENT'
      ? 'accent'
      : status === 'DECLINED' || status === 'CANCELLED'
        ? 'warning'
        : 'neutral'
  return <Badge tone={tone}>{assignmentStatusLabels[status]}</Badge>
}

function assignmentPath(id: string) {
  return routes.provider.assignmentDetail.replace(':assignmentId', encodeURIComponent(id))
}

function PageHeading({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro: string; action?: ReactNode }) {
  return <div className="customer-page__heading">
    <div><span className="eyebrow eyebrow--accent">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>
    {action}
  </div>
}

export default function NetworkPages() {
  const page = (useMatches().at(-1)?.handle as { page?: Page } | undefined)?.page ?? 'network'
  if (page === 'networkDiscover') return <WorkerDiscoveryPage />
  if (page === 'assignments') return <AssignmentsPage />
  if (page === 'assignmentDetail') return <AssignmentDetailPage />
  return <NetworkPage />
}

function NetworkPage() {
  const { showToast } = useToast()
  const data = useApiData(async () => {
    const [profile, associations, invitations] = await Promise.all([
      profilesApi.getProviderProfile(),
      networkApi.listAssociations(true),
      networkApi.listInvitations(),
    ])
    return { profile, associations, invitations }
  }, [])
  const [ending, setEnding] = useState<ApiNetworkAssociation | null>(null)
  const [endReason, setEndReason] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const profile = data.data?.profile
  const associations = data.data?.associations ?? []
  const invitations = data.data?.invitations ?? []
  const active = associations.filter((item) => item.status === 'ACTIVE')
  const ended = associations.filter((item) => item.status === 'ENDED')
  const pending = invitations.filter((item) => item.status === 'PENDING')

  async function respond(invitation: ApiNetworkInvitation, accept: boolean) {
    setBusy(invitation.id); setError('')
    try {
      await networkApi.respondToInvitation(invitation.id, accept)
      showToast(accept ? 'Manager added to your network.' : 'Network invitation declined.', accept ? 'success' : 'info')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not answer the invitation.') }
    finally { setBusy('') }
  }

  async function cancel(invitation: ApiNetworkInvitation) {
    setBusy(invitation.id); setError('')
    try {
      await networkApi.cancelInvitation(invitation.id)
      showToast('Network invitation cancelled.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not cancel the invitation.') }
    finally { setBusy('') }
  }

  async function confirmEnd() {
    if (!ending) return
    setBusy(ending.id); setError('')
    try {
      await networkApi.endAssociation(ending.id, endReason.trim())
      showToast(profile?.kind === 'WORKER' ? 'You left the network.' : 'Worker removed from your active network.', 'success')
      setEnding(null); setEndReason(''); data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not end the association.') }
    finally { setBusy('') }
  }

  if (data.loading) return <section className="customer-page"><Spinner label="Loading your network" /></section>
  if (data.error) return <section className="customer-page"><ErrorState description={data.error} onRetry={data.reload} /></section>

  return <section className="customer-page">
    <PageHeading
      eyebrow="NETWORK"
      title={profile?.kind === 'WORKER' ? 'Managers you work with' : 'Build your professional team'}
      intro={profile?.kind === 'WORKER'
        ? 'Your network is non-exclusive. You can work with several Managers while continuing to quote customers independently.'
        : 'Invite independent Workers, keep your team in one place, and assign them to accepted events. Workers can belong to several Managers.'}
      action={profile?.kind === 'MANAGER' ? <ButtonLink to={routes.provider.networkDiscover}>Discover Workers</ButtonLink> : <ButtonLink to={routes.provider.assignments} variant="secondary">My assignments</ButtonLink>}
    />
    {error && <p className="customer-error" role="alert">{error}</p>}

    <div className="stat-grid network-stats">
      <Card className="dashboard-stat"><span className="dashboard-stat__label">{profile?.kind === 'WORKER' ? 'Active Managers' : 'Active Workers'}</span><strong>{active.length}</strong><p>Current network relationships.</p></Card>
      <Card className="dashboard-stat"><span className="dashboard-stat__label">{profile?.kind === 'WORKER' ? 'Invitations to review' : 'Invitations sent'}</span><strong>{pending.length}</strong><p>{profile?.kind === 'WORKER' ? 'Managers waiting for your answer.' : 'Workers who have not answered yet.'}</p></Card>
      <Card className="dashboard-stat"><span className="dashboard-stat__label">Past associations</span><strong>{ended.length}</strong><p>History is retained when a relationship ends.</p></Card>
    </div>

    {profile?.kind === 'MANAGER' && pending.length > 0 && <section className="network-section">
      <div className="section-toolbar"><div><h2>Pending invitations</h2><p>Workers who have not answered your invitation yet. Invitations expire automatically.</p></div><Badge>{pending.length}</Badge></div>
      <div className="network-list">{pending.map((invitation) => <Card className="network-card" key={invitation.id}>
        <div className="network-card__head">
          <div className="network-card__identity"><Avatar name={invitation.worker_profile?.display_name ?? invitation.worker_name} /><div><h3>{invitation.worker_profile?.display_name ?? invitation.worker_name}</h3><p>{invitation.worker_profile?.description || 'Independent Worker'}</p></div></div>
          <Badge tone="accent">Awaiting response</Badge>
        </div>
        {invitation.message && <blockquote className="network-message">“{invitation.message}”</blockquote>}
        <p className="network-meta">Sent {formatShortDate(invitation.created_at)} · expires {formatShortDate(invitation.expires_at)}</p>
        <div className="network-actions"><Button type="button" size="sm" variant="quiet" disabled={busy === invitation.id} onClick={() => void cancel(invitation)}>Cancel invitation</Button></div>
      </Card>)}</div>
    </section>}

    {profile?.kind === 'WORKER' && pending.length > 0 && <section className="network-section">
      <div className="section-toolbar"><div><h2>Network invitations</h2><p>Review the Manager and decide whether to join their network.</p></div><Badge>{pending.length}</Badge></div>
      <div className="network-list">{pending.map((invitation) => <Card className="network-card" key={invitation.id}>
        <div className="network-card__head">
          <div className="network-card__identity">
            <Avatar name={invitation.manager_profile?.display_name ?? invitation.manager_name} />
            <div><h3>{invitation.manager_profile?.display_name ?? invitation.manager_name}</h3><p>{invitation.manager_profile?.description || 'Manager on HiddenStage'}</p></div>
          </div>
          <Badge tone="accent">Invitation pending</Badge>
        </div>
        {invitation.message && <blockquote className="network-message">“{invitation.message}”</blockquote>}
        <div className="network-tags">{(invitation.manager_profile?.categories ?? []).map((code) => <Badge key={code}>{code}</Badge>)}</div>
        <p className="network-meta">Invited {formatShortDate(invitation.created_at)} · expires {formatShortDate(invitation.expires_at)}</p>
        <div className="network-actions">
          <Button type="button" disabled={busy === invitation.id} onClick={() => void respond(invitation, true)}>Accept invitation</Button>
          <Button type="button" variant="secondary" disabled={busy === invitation.id} onClick={() => void respond(invitation, false)}>Decline</Button>
        </div>
      </Card>)}</div>
    </section>}

    <section className="network-section">
      <div className="section-toolbar"><div><h2>{profile?.kind === 'WORKER' ? 'Your Managers' : 'Active Workers'}</h2><p>{profile?.kind === 'WORKER' ? 'Associations do not give a Manager ownership of your account or independent work.' : 'Workers remain independent and may also work with other Managers.'}</p></div><Badge>{active.length}</Badge></div>
      {active.length === 0
        ? <EmptyState title={profile?.kind === 'WORKER' ? 'No active Manager associations' : 'Your network is empty'} description={profile?.kind === 'WORKER' ? 'When you accept a Manager invitation, the association appears here.' : 'Discover independent Workers and invite them to join your network.'} action={profile?.kind === 'MANAGER' ? <ButtonLink to={routes.provider.networkDiscover}>Discover Workers</ButtonLink> : undefined} />
        : <div className="network-list">{active.map((association) => <Card className="network-card" key={association.id}>
          <div className="network-card__head">
            <div className="network-card__identity">
              <Avatar name={association.counterpart_profile?.display_name ?? 'HiddenStage'} />
              <div><h3>{association.counterpart_profile?.display_name ?? 'Professional'}</h3><p>{association.counterpart_profile?.description || 'HiddenStage professional'}</p></div>
            </div>
            <Badge tone="success">Active</Badge>
          </div>
          <div className="network-tags">{(association.counterpart_profile?.categories ?? []).map((code) => <Badge key={code}>{code}</Badge>)}</div>
          <p className="network-meta">Connected {formatShortDate(association.associated_at)} · {association.active_assignments} active · {association.completed_assignments} completed assignment{association.completed_assignments === 1 ? '' : 's'}</p>
          <div className="network-actions">
            {profile?.kind === 'MANAGER'
              ? <ButtonLink to={`${routes.provider.assignments}?worker=${association.counterpart_user_id}`} size="sm">Assign Worker</ButtonLink>
              : <ButtonLink to={routes.provider.assignments} size="sm" variant="secondary">View assignments</ButtonLink>}
            <Button type="button" variant="quiet" size="sm" onClick={() => { setEnding(association); setEndReason('') }}>{profile?.kind === 'WORKER' ? 'Leave network' : 'Remove from network'}</Button>
          </div>
        </Card>)}</div>}
    </section>

    {ended.length > 0 && <section className="network-section">
      <div className="section-toolbar"><div><h2>Previous associations</h2><p>Ending a relationship does not erase assignment history.</p></div><Badge>{ended.length}</Badge></div>
      <div className="network-list">{ended.map((association) => <Card className="network-card network-card--ended" key={association.id}>
        <div className="network-card__head"><div className="network-card__identity"><Avatar name={association.counterpart_profile?.display_name ?? 'HiddenStage'} /><div><h3>{association.counterpart_profile?.display_name ?? 'Professional'}</h3><p>{association.ended_reason || 'Association ended'}</p></div></div><Badge>Ended</Badge></div>
        <p className="network-meta">Connected {formatShortDate(association.associated_at)} · ended {formatShortDate(association.ended_at)}</p>
      </Card>)}</div>
    </section>}

    <Modal open={Boolean(ending)} title={profile?.kind === 'WORKER' ? 'Leave this network?' : 'Remove this Worker?'} onClose={() => setEnding(null)}>
      <p>{profile?.kind === 'WORKER'
        ? 'Your accepted assignments and independent customer commitments are not cancelled. Assignment history stays available to both sides.'
        : 'The Worker is removed from your active network and cannot receive new assignments from you. Existing assignments and history remain.'}</p>
      <Textarea label="Reason (optional)" name="endReason" rows={3} maxLength={1000} value={endReason} onChange={(event) => setEndReason(event.target.value)} />
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEnding(null)} disabled={Boolean(busy)}>Cancel</Button><Button type="button" disabled={Boolean(busy)} onClick={() => void confirmEnd()}>{busy ? 'Ending…' : profile?.kind === 'WORKER' ? 'Leave network' : 'Remove Worker'}</Button></div>
    </Modal>
  </section>
}

function WorkerDiscoveryPage() {
  const { showToast } = useToast()
  const profileState = useApiData(() => profilesApi.getProviderProfile(), [])
  const categories = useApiData(() => eventsApi.categories(), [])
  const [filters, setFilters] = useState({ category: '', city: '', pin_code: '', locality: '' })
  const [applied, setApplied] = useState(filters)
  const workers = useApiData(() => networkApi.discoverWorkers(applied), [applied])
  const [target, setTarget] = useState<ApiWorkerDiscovery | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const profile = profileState.data

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplied({ ...filters })
  }

  async function invite() {
    if (!target) return
    setBusy(true); setError('')
    try {
      await networkApi.inviteWorker(target.user_id, message.trim())
      showToast(`Invitation sent to ${target.display_name}.`, 'success')
      setTarget(null); setMessage(''); workers.reload()
    } catch (caught) {
      if (isApiError(caught)) setError(caught.message)
      else setError(caught instanceof Error ? caught.message : 'Could not send the invitation.')
    } finally { setBusy(false) }
  }

  if (profileState.loading) return <section className="customer-page"><Spinner label="Loading worker discovery" /></section>
  if (profileState.error) return <section className="customer-page"><ErrorState description={profileState.error} onRetry={profileState.reload} /></section>
  if (profile?.kind !== 'MANAGER') return <section className="customer-page"><EmptyState title="Manager workspace only" description="Worker discovery and network invitations are available to Manager accounts." action={<ButtonLink to={routes.provider.network}>Back to your network</ButtonLink>} /></section>

  return <section className="customer-page">
    <PageHeading eyebrow="DISCOVER" title="Find independent Workers" intro="Search by the services and locations Workers have explicitly declared. A Worker can join several Managers' networks." action={<ButtonLink to={routes.provider.network} variant="secondary">My network</ButtonLink>} />
    <form className="network-filters" onSubmit={apply}>
      <Select label="Service category" name="category" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
        <option value="">All categories</option>
        {(categories.data ?? []).map((category: ApiCategory) => <option key={category.code} value={category.code}>{category.name}</option>)}
      </Select>
      <Input label="City" name="city" value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} />
      <Input label="PIN code" name="pin_code" inputMode="numeric" maxLength={6} value={filters.pin_code} onChange={(event) => setFilters((current) => ({ ...current, pin_code: event.target.value.replace(/\D/g, '').slice(0, 6) }))} />
      <Input label="Locality" name="locality" value={filters.locality} onChange={(event) => setFilters((current) => ({ ...current, locality: event.target.value }))} />
      <div className="network-filters__actions"><Button type="submit">Search Workers</Button><Button type="button" variant="quiet" onClick={() => { const empty = { category: '', city: '', pin_code: '', locality: '' }; setFilters(empty); setApplied(empty) }}>Clear</Button></div>
    </form>
    {error && <p className="customer-error" role="alert">{error}</p>}
    {workers.loading && <Spinner label="Searching Workers" />}
    {workers.error && <ErrorState description={workers.error} onRetry={workers.reload} />}
    {!workers.loading && !workers.error && (workers.data ?? []).length === 0 && <EmptyState title="No Workers match these filters" description="Try another category, city or PIN code. Only completed Worker profiles are shown." />}
    <div className="network-list">{(workers.data ?? []).map((worker) => <Card className="network-card" key={worker.id}>
      <div className="network-card__head">
        <div className="network-card__identity"><Avatar name={worker.display_name} /><div><h3>{worker.display_name}</h3><p>{worker.description || 'Independent Worker'}</p></div></div>
        <Badge tone={worker.relationship === 'ASSOCIATED' ? 'success' : worker.relationship === 'INVITED' ? 'accent' : 'neutral'}>{worker.relationship === 'ASSOCIATED' ? 'In your network' : worker.relationship === 'INVITED' ? 'Invitation sent' : 'Independent Worker'}</Badge>
      </div>
      <div className="network-tags">{worker.categories.map((code) => <Badge key={code}>{code}</Badge>)}</div>
      <p className="network-meta">Covers {worker.coverage.map((location) => `${location.locality}, ${location.city} ${location.pin_code}`).join(' · ') || 'no declared locations'}</p>
      <div className="network-actions">
        {worker.relationship === 'NONE' && <Button type="button" size="sm" onClick={() => { setTarget(worker); setMessage('') }}>Add to My Network</Button>}
        {worker.relationship === 'ASSOCIATED' && <ButtonLink to={`${routes.provider.assignments}?worker=${worker.user_id}`} size="sm" variant="secondary">Assign Worker</ButtonLink>}
      </div>
    </Card>)}</div>
    <Modal open={Boolean(target)} title={`Invite ${target?.display_name ?? 'Worker'} to your network`} onClose={() => setTarget(null)}>
      <p>This is a non-exclusive association. The Worker can accept invitations from other Managers and keep quoting customers independently.</p>
      <Textarea label="Message (optional)" name="networkMessage" rows={4} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} hint="Tell the Worker about your business and the kind of work you coordinate." />
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setTarget(null)} disabled={busy}>Cancel</Button><Button type="button" onClick={() => void invite()} disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</Button></div>
    </Modal>
  </section>
}

function AssignmentsPage() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const commitmentFilter = searchParams.get('commitment') ?? ''
  const workerFilter = searchParams.get('worker') ?? ''
  const replacesId = searchParams.get('replaces') ?? ''
  const data = useApiData(async () => {
    const [profile, assignments, associations, commitments] = await Promise.all([
      profilesApi.getProviderProfile(),
      networkApi.listAssignments(commitmentFilter ? { commitment: commitmentFilter } : {}),
      networkApi.listAssociations(),
      marketplaceApi.listProviderCommitments(),
    ])
    return { profile, assignments, associations, commitments }
  }, [commitmentFilter])
  const [dialog, setDialog] = useState<{ assignment: ApiWorkerAssignment; action: 'decline' | 'complete' | 'cancel' } | null>(null)
  const [dialogText, setDialogText] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const profile = data.data?.profile
  const assignments = data.data?.assignments ?? []
  const associations = data.data?.associations ?? []
  const commitments = (data.data?.commitments ?? []).filter((commitment) => commitment.status === 'ACTIVE')
  const replaces = assignments.find((assignment) => assignment.id === replacesId)
  const pending = assignments.filter((assignment) => assignment.status === 'SENT')
  const active = assignments.filter((assignment) => ['ACCEPTED', 'IN_PROGRESS'].includes(assignment.status))
  const history = assignments.filter((assignment) => !['SENT', 'ACCEPTED', 'IN_PROGRESS'].includes(assignment.status))

  async function act(assignment: ApiWorkerAssignment, action: 'accept' | 'start' | 'decline' | 'complete' | 'cancel', text = '') {
    setBusy(assignment.id); setError('')
    try {
      await networkApi.assignmentAction(assignment.id, action, action === 'decline' || action === 'cancel' ? { reason: text } : { completion_notes: text })
      showToast(action === 'accept' ? 'Assignment accepted.' : action === 'decline' ? 'Assignment declined.' : action === 'start' ? 'Assignment started.' : action === 'complete' ? 'Assignment completed.' : 'Assignment cancelled.', 'success')
      setDialog(null); setDialogText(''); data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update the assignment.') }
    finally { setBusy('') }
  }

  function requestAction(assignment: ApiWorkerAssignment, action: 'decline' | 'complete' | 'cancel') {
    setDialog({ assignment, action }); setDialogText('')
  }

  if (data.loading) return <section className="customer-page"><Spinner label="Loading assignments" /></section>
  if (data.error) return <section className="customer-page"><ErrorState description={data.error} onRetry={data.reload} /></section>

  return <section className="customer-page">
    <PageHeading
      eyebrow="ASSIGNMENTS"
      title={profile?.kind === 'MANAGER' ? 'Build the event team' : 'Your work assignments'}
      intro={profile?.kind === 'MANAGER'
        ? 'Assign Workers from your network to accepted customer events. Availability is checked across every Manager they work with.'
        : 'Accept or decline work from Managers. These assignments are separate from your independent customer commitments.'}
      action={<ButtonLink to={routes.provider.network} variant="secondary">My network</ButtonLink>}
    />
    {error && <p className="customer-error" role="alert">{error}</p>}

    {profile?.kind === 'MANAGER' && <ManagerAssignmentForm
      commitments={commitments}
      associations={associations}
      initialCommitment={commitmentFilter}
      initialWorker={workerFilter}
      replaces={replaces}
      onSaved={() => { data.reload(); showToast('Assignment sent to the Worker.', 'success') }}
    />}

    {profile?.kind === 'WORKER' && <>
      <AssignmentSection title="Assignment invitations" description="Review the Manager, role, schedule and location before accepting." items={pending} busy={busy} onAction={act} onDialog={requestAction} />
      <AssignmentSection title="Active work" description="Accepted and in-progress assignments." items={active} busy={busy} onAction={act} onDialog={requestAction} />
      <AssignmentSection title="Assignment history" description="Declined, cancelled, reassigned and completed work remains visible." items={history} busy={busy} onAction={act} onDialog={requestAction} />
    </>}

    {profile?.kind === 'MANAGER' && <>
      {commitmentFilter && <p className="network-meta">Showing assignments for one accepted commitment. <Link to={routes.provider.assignments}>Show all assignments</Link>.</p>}
      <section className="network-section">
        <div className="section-toolbar"><div><h2>All assignments</h2><p>Track responses, unfilled roles and completed work.</p></div><Badge>{assignments.length}</Badge></div>
        {assignments.length === 0 ? <EmptyState title="No assignments yet" description="Select an active commitment above, then assign a Worker from your network." /> : <div className="assignment-list">{assignments.map((assignment) => <Card className="assignment-card" key={assignment.id}>
          <div className="assignment-card__head"><div><span className="eyebrow">{assignment.event_name}</span><h3>{assignment.role}</h3><p>{formatDate(assignment.event_date)} · {formatTimeRange(assignment.start_time, assignment.end_time)} · {assignment.worker_profile?.display_name ?? assignment.worker_name}</p></div><AssignmentStatusBadge status={assignment.status} /></div>
          <p className="network-meta">{assignment.event_locality}, {assignment.event_city}{assignment.compensation_paise !== null ? ` · ${formatPaise(assignment.compensation_paise)} recorded` : ''}</p>
          {assignment.response_note && <p className="network-meta">Worker note: {assignment.response_note}</p>}
          {assignment.cancellation_reason && <p className="network-meta">Cancellation: {assignment.cancellation_reason}</p>}
          <div className="network-actions"><Link className="text-link" to={assignmentPath(assignment.id)}>View details</Link>{assignment.actions.cancel && <Button type="button" size="sm" variant="quiet" onClick={() => requestAction(assignment, 'cancel')}>Cancel</Button>}{assignment.actions.reassign && <ButtonLink size="sm" to={`${routes.provider.assignments}?commitment=${assignment.commitment}&replaces=${assignment.id}`}>Reassign</ButtonLink>}</div>
        </Card>)}</div>}
      </section>
      {commitments.length === 0 && <p className="muted-note">You need an active customer commitment before you can assign Workers.</p>}
    </>}

    <Modal open={Boolean(dialog)} title={dialog?.action === 'decline' ? 'Decline this assignment?' : dialog?.action === 'complete' ? 'Complete this assignment' : 'Cancel this assignment?'} onClose={() => setDialog(null)}>
      <p>{dialog?.action === 'decline' ? 'The Manager will see that the position is unfilled and can assign another Worker.' : dialog?.action === 'complete' ? 'Add a short completion note for the Manager.' : 'The Worker will see that the assignment was cancelled. The record stays in both histories.'}</p>
      <Textarea label={dialog?.action === 'complete' ? 'Completion notes' : 'Reason'} name="assignmentActionText" rows={4} maxLength={2000} value={dialogText} onChange={(event) => setDialogText(event.target.value)} />
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={Boolean(busy)}>Keep as is</Button><Button type="button" disabled={Boolean(busy)} onClick={() => dialog && void act(dialog.assignment, dialog.action, dialogText)}>{busy ? 'Saving…' : dialog?.action === 'decline' ? 'Decline assignment' : dialog?.action === 'complete' ? 'Submit completion' : 'Cancel assignment'}</Button></div>
    </Modal>
  </section>
}

function AssignmentSection({ title, description, items, busy, onAction, onDialog }: {
  title: string
  description: string
  items: ApiWorkerAssignment[]
  busy: string
  onAction: (assignment: ApiWorkerAssignment, action: 'accept' | 'start') => Promise<void>
  onDialog: (assignment: ApiWorkerAssignment, action: 'decline' | 'complete') => void
}) {
  if (!items.length) return null
  return <section className="network-section">
    <div className="section-toolbar"><div><h2>{title}</h2><p>{description}</p></div><Badge>{items.length}</Badge></div>
    <div className="assignment-list">{items.map((assignment) => <Card className="assignment-card" key={assignment.id}>
      <div className="assignment-card__head"><div><span className="eyebrow">{assignment.manager_profile?.display_name ?? assignment.manager_name}</span><h3>{assignment.role} · {assignment.event_name}</h3><p>{formatDate(assignment.event_date)} · report {assignment.reporting_time ? formatTimeRange(assignment.reporting_time, assignment.end_time) : formatTimeRange(assignment.start_time, assignment.end_time)}</p></div><AssignmentStatusBadge status={assignment.status} /></div>
      <p className="assignment-task">{assignment.task_description}</p>
      <p className="network-meta">{assignment.location || `${assignment.event_locality}, ${assignment.event_city}`}{assignment.compensation_paise !== null ? ` · ${formatPaise(assignment.compensation_paise)} recorded` : ' · fee not recorded'}</p>
      <div className="network-actions"><Link className="text-link" to={assignmentPath(assignment.id)}>View details</Link>{assignment.actions.accept && <Button type="button" size="sm" disabled={busy === assignment.id} onClick={() => void onAction(assignment, 'accept')}>Accept</Button>}{assignment.actions.decline && <Button type="button" size="sm" variant="secondary" disabled={busy === assignment.id} onClick={() => onDialog(assignment, 'decline')}>Decline</Button>}{assignment.actions.start && <Button type="button" size="sm" disabled={busy === assignment.id} onClick={() => void onAction(assignment, 'start')}>Start work</Button>}{assignment.actions.complete && <Button type="button" size="sm" disabled={busy === assignment.id} onClick={() => onDialog(assignment, 'complete')}>Complete</Button>}</div>
    </Card>)}</div>
  </section>
}

function ManagerAssignmentForm({ commitments, associations, initialCommitment, initialWorker, replaces, onSaved }: {
  commitments: ApiCommitment[]
  associations: ApiNetworkAssociation[]
  initialCommitment: string
  initialWorker: string
  replaces?: ApiWorkerAssignment
  onSaved: () => void
}) {
  const [commitmentId, setCommitmentId] = useState(initialCommitment || commitments[0]?.id || '')
  const [workerId, setWorkerId] = useState(initialWorker || '')
  const [role, setRole] = useState(replaces?.role ?? '')
  const [task, setTask] = useState(replaces?.task_description ?? '')
  const [startTime, setStartTime] = useState(replaces?.start_time?.slice(0, 5) ?? '10:00')
  const [endTime, setEndTime] = useState(replaces?.end_time?.slice(0, 5) ?? '18:00')
  const [reporting, setReporting] = useState(replaces?.reporting_time?.slice(0, 5) ?? '')
  const [location, setLocation] = useState(replaces?.location ?? '')
  const [instructions, setInstructions] = useState(replaces?.instructions ?? '')
  const [fee, setFee] = useState(replaces?.compensation_paise ? String(replaces.compensation_paise / 100) : '')
  const [availability, setAvailability] = useState<ApiAvailability | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const commitment = commitments.find((item) => item.id === commitmentId)
  const workers = associations.filter((association) => association.status === 'ACTIVE')

  useEffect(() => {
    if (!workerId || !commitment) return
    let active = true
    networkApi.availability({ worker_id: workerId, event_date: commitment.event_date, start_time: startTime, end_time: endTime })
      .then((result) => { if (active) setAvailability(result) })
      .catch(() => { if (active) setAvailability(null) })
    return () => { active = false }
  }, [workerId, commitment, startTime, endTime])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (!commitmentId || !workerId) { setError('Choose an accepted commitment and a Worker.'); return }
    setSaving(true); setError('')
    try {
      await networkApi.createAssignment({
        commitment_id: commitmentId,
        worker_id: workerId,
        role: role.trim(),
        task_description: task.trim(),
        start_time: startTime,
        end_time: endTime,
        reporting_time: reporting || null,
        location: location.trim(),
        instructions: instructions.trim(),
        compensation_paise: parseRupeesToPaise(fee),
        replaces_id: replaces?.id ?? null,
      })
      onSaved()
      setRole(''); setTask(''); setInstructions(''); setFee(''); setAvailability(null)
    } catch (caught) {
      if (isApiError(caught)) setError(caught.message)
      else setError(caught instanceof Error ? caught.message : 'Could not create the assignment.')
    } finally { setSaving(false) }
  }

  if (!commitments.length) return null

  return <Card className="customer-form assignment-form">
    <div className="assignment-form__head"><div><span className="eyebrow eyebrow--accent">{replaces ? 'REASSIGN' : 'NEW ASSIGNMENT'}</span><h2>{replaces ? 'Offer this role to another Worker' : 'Assign a Worker to an event'}</h2><p>Only Workers in your active network can be assigned. This is a work allocation, not a customer quotation.</p></div>{replaces && <Badge tone="warning">Replacing a declined or cancelled assignment</Badge>}</div>
    <form onSubmit={submit} noValidate>
      <Select label="Accepted commitment" name="commitment" value={commitmentId} onChange={(event) => { setCommitmentId(event.target.value); setAvailability(null) }} required hint={commitment ? `${commitment.event_name} · ${formatDate(commitment.event_date)}` : 'Only active commitments can receive assignments.'}>
        <option value="">Choose an accepted commitment</option>
        {commitments.map((item) => <option key={item.id} value={item.id}>{item.event_name} · {formatDate(item.event_date)}</option>)}
      </Select>
      <Select label="Worker" name="worker" value={workerId} onChange={(event) => { setWorkerId(event.target.value); setAvailability(null) }} required>
        <option value="">Choose a Worker in your network</option>
        {workers.map((association) => <option key={association.id} value={association.counterpart_user_id}>{association.counterpart_profile?.display_name ?? 'Worker'}</option>)}
      </Select>
      <Input label="Assigned role" name="role" required maxLength={120} value={role} onChange={(event) => setRole(event.target.value)} />
      <Textarea label="Task and duties" name="task" rows={3} required maxLength={4000} value={task} onChange={(event) => setTask(event.target.value)} />
      <div className="assignment-form__times">
        <Input label="Start time" name="startTime" type="time" required value={startTime} onChange={(event) => { setStartTime(event.target.value); setAvailability(null) }} />
        <Input label="End time" name="endTime" type="time" required value={endTime} onChange={(event) => { setEndTime(event.target.value); setAvailability(null) }} />
        <Input label="Reporting time (optional)" name="reporting" type="time" value={reporting} onChange={(event) => setReporting(event.target.value)} />
        <Input label="Agreed fee in ₹ (optional)" name="fee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value.replace(/[^0-9.]/g, ''))} hint="Recorded only. HiddenStage does not process payment." />
      </div>
      <Input label="Location" name="location" value={location} onChange={(event) => setLocation(event.target.value)} hint="Share only the location detail the Worker needs for this assignment." />
      <Textarea label="Instructions" name="instructions" rows={3} maxLength={4000} value={instructions} onChange={(event) => setInstructions(event.target.value)} />
      {availability && <p className={`availability ${availability.available ? 'availability--ok' : 'availability--conflict'}`} role="status">{availability.available ? 'Available: no accepted assignment overlaps this schedule.' : 'Potential conflict: this Worker has another accepted assignment at this time. They will not be able to accept this one until it is resolved.'}</p>}
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="customer-form__actions"><Button type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send assignment invitation'}</Button></div>
      <p className="form-note">Sending an assignment does not block the Worker's calendar until they accept. Pending invitations are visible to the Worker only.</p>
    </form>
  </Card>
}

function AssignmentDetailPage() {
  const { assignmentId = '' } = useParams()
  const { showToast } = useToast()
  const data = useApiData(() => networkApi.assignment(assignmentId), [assignmentId])
  const [dialog, setDialog] = useState<'decline' | 'complete' | 'cancel' | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function act(action: 'accept' | 'start' | 'decline' | 'complete' | 'cancel') {
    if (!data.data) return
    setBusy(true); setError('')
    try {
      await networkApi.assignmentAction(data.data.id, action, action === 'decline' || action === 'cancel' ? { reason: text } : { completion_notes: text })
      showToast('Assignment updated.', 'success'); setDialog(null); data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update the assignment.') }
    finally { setBusy(false) }
  }

  if (data.loading) return <section className="customer-page"><Spinner label="Loading assignment" /></section>
  if (data.error) return <section className="customer-page"><ErrorState description={data.error} onRetry={data.reload} /></section>
  if (!data.data) return <section className="customer-page"><EmptyState title="Assignment not found" description="This assignment is not available to your account." action={<ButtonLink to={routes.provider.assignments}>Back to assignments</ButtonLink>} /></section>
  const assignment = data.data
  const managerView = Boolean(assignment.actions.cancel || assignment.actions.reassign)
  return <section className="customer-page">
    <PageHeading eyebrow="ASSIGNMENT" title={assignment.role} intro={`${assignment.event_name} · ${formatDate(assignment.event_date)}`} action={<ButtonLink to={routes.provider.assignments} variant="secondary">All assignments</ButtonLink>} />
    <Card className="assignment-detail">
      <div className="assignment-card__head"><div><h2>{assignment.worker_profile?.display_name ?? assignment.worker_name} · {assignment.manager_profile?.display_name ?? assignment.manager_name}</h2><p>{assignment.event_locality}, {assignment.event_city}</p></div><AssignmentStatusBadge status={assignment.status} /></div>
      <dl className="assignment-facts">
        <div><dt>Schedule</dt><dd>{formatDate(assignment.event_date)} · {formatTimeRange(assignment.start_time, assignment.end_time)}</dd></div>
        <div><dt>Reporting time</dt><dd>{assignment.reporting_time ?? 'Not set'}</dd></div>
        <div><dt>Location</dt><dd>{assignment.location || 'Not disclosed'}</dd></div>
        <div><dt>Agreed fee</dt><dd>{assignment.compensation_paise === null ? 'Not recorded' : `${formatPaise(assignment.compensation_paise)} (recorded only)`}</dd></div>
        <div><dt>Response deadline</dt><dd>{assignment.response_deadline ? formatDate(assignment.response_deadline) : 'Not set'}</dd></div>
        <div><dt>Contact</dt><dd>{assignment.counterpart_contact ?? 'Available after the assignment is accepted'}</dd></div>
      </dl>
      <section className="assignment-copy"><h3>Task</h3><p>{assignment.task_description}</p>{assignment.instructions && <><h3>Instructions</h3><p>{assignment.instructions}</p></>}</section>
      {assignment.response_note && <p className="muted-note">Response: {assignment.response_note}</p>}
      {assignment.cancellation_reason && <p className="muted-note">Cancellation: {assignment.cancellation_reason}</p>}
      {assignment.completion_notes && <p className="muted-note">Completion notes: {assignment.completion_notes}</p>}
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="network-actions">
        {assignment.actions.accept && <Button type="button" disabled={busy} onClick={() => void act('accept')}>Accept assignment</Button>}
        {assignment.actions.decline && <Button type="button" variant="secondary" disabled={busy} onClick={() => setDialog('decline')}>Decline</Button>}
        {assignment.actions.start && <Button type="button" disabled={busy} onClick={() => void act('start')}>Start work</Button>}
        {assignment.actions.complete && <Button type="button" disabled={busy} onClick={() => setDialog('complete')}>Submit completion</Button>}
        {assignment.actions.cancel && <Button type="button" variant="secondary" disabled={busy} onClick={() => setDialog('cancel')}>{managerView ? 'Cancel assignment' : 'Cancel'}</Button>}
        {assignment.actions.reassign && <ButtonLink to={`${routes.provider.assignments}?commitment=${assignment.commitment}&replaces=${assignment.id}`}>Reassign this role</ButtonLink>}
      </div>
    </Card>
    <Modal open={Boolean(dialog)} title={dialog === 'decline' ? 'Decline this assignment?' : dialog === 'complete' ? 'Complete this assignment' : 'Cancel this assignment?'} onClose={() => setDialog(null)}>
      <Textarea label={dialog === 'complete' ? 'Completion notes' : 'Reason'} name="detailActionText" rows={4} maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} />
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button><Button type="button" disabled={busy} onClick={() => dialog && void act(dialog)}>{busy ? 'Saving…' : 'Confirm'}</Button></div>
    </Modal>
  </section>
}
