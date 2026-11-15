import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useMatches, useParams } from 'react-router-dom'
import { customerEventPath, providerQuotePath, routes } from '../../app/routes/routePaths'
import { useAuth } from '../../app/auth/useAuth'
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Input, Modal, Select, Spinner, Textarea, useToast } from '../../shared/ui'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { networkApi } from '../../shared/api/backend/network'
import { profilesApi } from '../../shared/api/backend/profiles'
import { useApiData } from '../../shared/api/backend/useApiData'
import {
  formatDate,
  formatPaise,
  formatShortDate,
  formatTimeRange,
  parseRupeesToPaise,
  verificationStatusLabels,
} from '../../shared/api/backend/format'
import type {
  ApiCommitment,
  ApiInvitation,
  ApiProviderOpportunity,
  ApiProviderProfile,
  ApiProviderService,
  ApiQuotation,
  ApiQuoteRevision,
  ProviderKind,
} from '../../shared/api/backend/types'
import { isApiError } from '../../shared/api/client'
import { CommitmentStatusBadge, InvitationStatusBadge, QuoteBreakdown, RevisionStatusBadge } from '../marketplace/MarketplaceUI'
import { latestRevision } from '../../shared/api/backend/quoteSelection'
import '../customer/customer.css'
import '../marketplace/marketplace.css'
import './provider.css'

type Page = 'providerHome' | 'providerProfile' | 'providerServices' | 'providerCoverage' | 'providerOpportunities' | 'providerRequests' | 'providerQuotes' | 'providerQuoteEditor' | 'providerCommitments'

const providerKindLabels = { MANAGER: 'Manager', WORKER: 'Independent worker' } as const

export default function ProviderPages() {
  const page = (useMatches().at(-1)?.handle as { page?: Page } | undefined)?.page ?? 'providerHome'
  if (page === 'providerProfile') return <ProfilePage />
  if (page === 'providerServices') return <ServicesPage />
  if (page === 'providerCoverage') return <CoveragePage />
  if (page === 'providerOpportunities') return <OpportunitiesPage />
  if (page === 'providerRequests') return <InboxPage />
  if (page === 'providerQuotes') return <QuotationsPage />
  if (page === 'providerQuoteEditor') return <QuoteEditorPage />
  if (page === 'providerCommitments') return <CommitmentsPage />
  return <DashboardPage />
}

function useCategories() {
  return useApiData(() => eventsApi.categories(), [])
}

function PageHeading({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro: string; action?: ReactNode }) {
  return <div className="customer-page__heading">
    <div><span className="eyebrow eyebrow--accent">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>
    {action}
  </div>
}

function DashboardPage() {
  const auth = useAuth()
  const data = useApiData(async () => {
    const [opportunities, invitations, quotations, commitments, profile, network, networkInvitations, assignments] = await Promise.all([
      marketplaceApi.listProviderOpportunities(),
      marketplaceApi.listProviderInvitations(),
      marketplaceApi.listProviderQuotations(),
      marketplaceApi.listProviderCommitments(),
      profilesApi.getProviderProfile(),
      networkApi.listAssociations(),
      networkApi.listInvitations(),
      networkApi.listAssignments(),
    ])
    return { opportunities, invitations, quotations, commitments, profile, network, networkInvitations, assignments }
  }, [])
  const pending = (data.data?.invitations ?? []).filter((item) => item.status === 'PENDING')
  const openQuotes = (data.data?.quotations ?? []).filter((item) => item.status === 'OPEN')
  const activeCommitments = (data.data?.commitments ?? []).filter((item) => item.status === 'ACTIVE')
  const profile = data.data?.profile
  const activeNetwork = (data.data?.network ?? []).filter((item) => item.status === 'ACTIVE')
  const pendingNetwork = (data.data?.networkInvitations ?? []).filter((item) => item.status === 'PENDING')
  const assignmentInvitations = (data.data?.assignments ?? []).filter((item) => item.status === 'SENT')
  const upcomingAssignments = (data.data?.assignments ?? []).filter((item) => ['ACCEPTED', 'IN_PROGRESS'].includes(item.status))
  const user = auth.status === 'authenticated' ? auth.user : undefined

  return <section className="customer-page">
    <PageHeading
      eyebrow="PROFESSIONAL WORKSPACE"
      title={`Welcome${user ? `, ${user.fullName.split(' ')[0]}` : ''}.`}
      intro="Review invitations, prepare quotations against the organiser's brief, and track the services they choose."
      action={<ButtonLink to={routes.provider.requests}>Open invitations</ButtonLink>}
    />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading your workspace" />}
    {!data.loading && <>
      <div className="stat-grid">
        <Card className="dashboard-stat"><span className="dashboard-stat__label">Matched opportunities</span><strong>{data.data?.opportunities.length ?? 0}</strong><p>Open requests you can quote directly.</p></Card>
        <Card className="dashboard-stat"><span className="dashboard-stat__label">Invitations awaiting reply</span><strong>{pending.length}</strong><p>Organisers waiting for your answer.</p></Card>
        <Card className="dashboard-stat"><span className="dashboard-stat__label">Open quotations</span><strong>{openQuotes.length}</strong><p>Quotes you can revise or track.</p></Card>
        <Card className="dashboard-stat"><span className="dashboard-stat__label">Active commitments</span><strong>{activeCommitments.length}</strong><p>Services an organiser has chosen.</p></Card>
        <Card className="dashboard-stat"><span className="dashboard-stat__label">Profile</span><strong className="dashboard-stat__text">{profile ? verificationStatusLabels[profile.verification_status] : '—'}</strong><p>{profile?.completed_at ? 'Published to matching organisers.' : 'Complete your profile to be matched.'}</p></Card>
      </div>

      {profile && profile.verification_status !== 'VERIFIED' && <div className="callout callout--muted">
        <strong>Verification is separate from your profile.</strong> You can receive invitations and quote with {verificationStatusLabels[profile.verification_status].toLowerCase()} status, but a verified badge is only shown when HiddenStage has reviewed your business.
      </div>}

      <div className="dashboard-columns">
        <Card className="dashboard-panel">
          <div className="dashboard-panel__head"><div><h2>Latest invitations</h2><p>Events matched to your services and coverage.</p></div><ButtonLink to={routes.provider.requests} variant="quiet" size="sm">View all</ButtonLink></div>
          {(data.data?.invitations.length ?? 0) === 0
            ? <p className="dashboard-subtle">No invitations yet. Keep your services, coverage and response time current — organisers invite professionals whose declared coverage matches their event.</p>
            : <ul className="dashboard-quotes">{(data.data?.invitations ?? []).slice(0, 4).map((invitation) => <li key={invitation.id}>
              <div><strong>{invitation.event_name}</strong><small>{invitation.requirement_title ?? 'All services'} · {formatShortDate(invitation.created_at)}</small></div>
              <InvitationStatusBadge status={invitation.status} />
              <Link className="text-link" to={invitation.status === 'ACCEPTED' ? providerQuotePath(invitation.event) : routes.provider.requests}>{invitation.status === 'ACCEPTED' ? 'Quote' : 'Review'}</Link>
            </li>)}</ul>}
        </Card>
        <div className="dashboard-side">
          <Card className="profile-card">
            <span className="eyebrow eyebrow--accent">YOUR PRESENCE</span>
            <h2>{profile?.display_name ?? 'Your profile'}</h2>
            <p>{profile?.description || 'Add a short description so organisers understand your work.'}</p>
            <div className="profile-card__actions"><ButtonLink to={routes.provider.profile} variant="secondary" size="sm">Edit profile</ButtonLink></div>
          </Card>
          <Card className="quick-card">
            <span className="eyebrow">SHORTCUTS</span>
            <Link to={routes.provider.opportunities}>Browse matched opportunities</Link>
            <Link to={routes.provider.services}>Manage services and prices</Link>
            <Link to={routes.provider.coverage}>Review coverage</Link>
            <Link to={routes.provider.quotes}>Your quotations</Link>
            <Link to={routes.provider.commitments}>Commitments</Link>
          </Card>
        </div>
      </div>

      <Card className="dashboard-panel network-dashboard">
        <div className="dashboard-panel__head"><div><h2>{profile?.kind === 'WORKER' ? 'Managers and assignments' : 'Your network and team'}</h2><p>{profile?.kind === 'WORKER' ? 'Independent relationships across every Manager you work with.' : 'Workers you can assign to accepted customer events.'}</p></div><ButtonLink to={routes.provider.network} variant="quiet" size="sm">Open network</ButtonLink></div>
        <div className="network-dashboard__metrics">
          <div><span>{profile?.kind === 'WORKER' ? 'Active Managers' : 'Active Workers'}</span><strong>{activeNetwork.length}</strong></div>
          <div><span>{profile?.kind === 'WORKER' ? 'Network invitations' : 'Invitations pending'}</span><strong>{pendingNetwork.length}</strong></div>
          <div><span>Assignment invitations</span><strong>{assignmentInvitations.length}</strong></div>
          <div><span>Upcoming assignments</span><strong>{upcomingAssignments.length}</strong></div>
        </div>
        <div className="network-dashboard__links"><Link to={routes.provider.network}>My network</Link><Link to={routes.provider.assignments}>Assignments</Link>{profile?.kind === 'MANAGER' && <Link to={routes.provider.networkDiscover}>Discover Workers</Link>}</div>
      </Card>
    </>}
  </section>
}

function ProfilePage() {
  const { showToast } = useToast()
  const categoriesState = useCategories()
  const data = useApiData(() => profilesApi.getProviderProfile(), [])
  const [values, setValues] = useState({ displayName: '', description: '', contact: '' })
  const [kind, setKind] = useState<ProviderKind>('MANAGER')
  const [selected, setSelected] = useState<string[]>([])
  const [coverage, setCoverage] = useState<ApiProviderProfile['coverage']>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!data.data) return
    setValues({ displayName: data.data.display_name, description: data.data.description, contact: data.data.contact })
    setKind(data.data.kind)
    setSelected(data.data.categories)
    setCoverage(data.data.coverage)
  }, [data.data])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (!selected.length) { setError('Choose at least one service category.'); return }
    setSaving(true); setError(''); setFieldErrors({})
    try {
      await profilesApi.saveProviderProfile({
        display_name: values.displayName.trim(),
        kind,
        description: values.description.trim(),
        contact: values.contact.trim(),
        categories: selected,
        coverage: coverage.map(({ pin_code, locality, city, state }) => ({ pin_code, locality, city, state })),
      })
      showToast('Profile updated.', 'success')
      data.reload()
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.')
    } finally { setSaving(false) }
  }

  const profile = data.data
  return <section className="customer-page">
    <PageHeading eyebrow="PROFILE" title="How organisers see you" intro="Your display name, description and categories are shown on your profile and in matching. Coverage decides which events you are invited to." action={<ButtonLink to={routes.provider.coverage} variant="secondary">Manage coverage</ButtonLink>} />
    {profile && <div className="profile-status">
      <Badge tone={profile.verification_status === 'VERIFIED' ? 'success' : 'neutral'}>{verificationStatusLabels[profile.verification_status]}</Badge>
      <span>{providerKindLabels[profile.kind]} · {profile.completed_at ? `Profile completed ${formatShortDate(profile.completed_at)}` : 'Profile not complete — organisers cannot see you yet.'}</span>
    </div>}
    {data.loading && <Spinner label="Loading your profile" />}
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {profile && <form className="customer-form" onSubmit={submit} noValidate>
      <Input label="Professional or business name" name="displayName" required minLength={2} maxLength={150} value={values.displayName} onChange={(event) => setValues((current) => ({ ...current, displayName: event.target.value }))} error={fieldErrors.display_name} />
      <Textarea label="Short description" name="description" rows={4} required minLength={20} maxLength={500} value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} hint="20–500 characters. What you do, and how you work." error={fieldErrors.description} />
      <Input label="Contact phone or email" name="contact" required minLength={5} value={values.contact} onChange={(event) => setValues((current) => ({ ...current, contact: event.target.value }))} hint="Only shared with an organiser who chooses you." error={fieldErrors.contact} />
      <Select label="How you work" name="kind" value={kind} onChange={(event) => setKind(event.target.value as ProviderKind)} required hint="Managers coordinate events and can recruit workers. Independent workers quote customers directly and can also work with managers.">
        <option value="MANAGER">Manager — coordinate events and build a team</option>
        <option value="WORKER">Independent worker — deliver services and quote directly</option>
      </Select>
      <fieldset className="provider-onboarding__categories">
        <legend>Service categories</legend>
        <p>Removing a category hides it from matching. Existing quotations keep their history.</p>
        <div>{(categoriesState.data ?? []).map((category) => <label key={category.code}>
          <input type="checkbox" checked={selected.includes(category.code)} onChange={() => setSelected((current) => current.includes(category.code) ? current.filter((code) => code !== category.code) : [...current, category.code])} />
          {category.name}
        </label>)}</div>
      </fieldset>
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="customer-form__actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button></div>
    </form>}
  </section>
}

function ServicesPage() {
  const { showToast } = useToast()
  const categoriesState = useCategories()
  const data = useApiData(() => profilesApi.listProviderServices(), [])
  const services: ApiProviderService[] = data.data ?? []
  const categories = categoriesState.data ?? []
  const available = categories.filter((category) => !services.some((service) => service.category === category.code))
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ApiProviderService | null>(null)
  const [busy, setBusy] = useState(false)

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newCategory) { setError('Choose a category to add.'); return }
    setBusy(true); setError('')
    try {
      await profilesApi.createProviderService({ category: newCategory })
      setNewCategory('')
      showToast('Service added. Add a title and price so organisers understand it.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add that service.') } finally { setBusy(false) }
  }

  return <section className="customer-page">
    <PageHeading eyebrow="SERVICES" title="What you offer" intro="Each category you offer becomes a service. Titles and prices are optional, but a clear offer wins more invitations." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading services" />}
    {!data.loading && services.length === 0 && <EmptyState title="No services yet" description="Add a service category so organisers can find you. You can refine titles and prices at any time." />}

    {services.length > 0 && <div className="service-manage-list">{services.map((service) => <Card className={`service-manage ${service.is_active ? '' : 'service-manage--inactive'}`} key={service.id}>
      <div>
        <div className="service-manage__title"><h3>{service.title || service.category_name}</h3><Badge tone={service.is_active ? 'success' : 'neutral'}>{service.is_active ? 'Active' : 'Hidden'}</Badge></div>
        <small>{service.category_name}{service.base_price_paise !== null ? ` · from ${formatPaise(service.base_price_paise)}` : ' · price on request'}</small>
        {service.description && <p>{service.description}</p>}
      </div>
      <div className="service-manage__actions">
        <Button type="button" size="sm" variant="quiet" onClick={() => setEditing(service)}>Edit</Button>
        <Button type="button" size="sm" variant="quiet" onClick={() => void profilesApi.updateProviderService(service.id, { is_active: !service.is_active }).then(() => data.reload())}>{service.is_active ? 'Hide' : 'Show'}</Button>
      </div>
    </Card>)}</div>}

    <Card className="customer-form">
      <h2>Add a service category</h2>
      {available.length === 0
        ? <p className="muted-note">You offer every category in the catalogue.</p>
        : <form className="inline-form" onSubmit={add}>
          <Select label="Category" name="newCategory" value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
            <option value="">Choose a category</option>
            {available.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
          </Select>
          <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add service'}</Button>
        </form>}
      {error && <p className="customer-error" role="alert">{error}</p>}
    </Card>

    {editing && <ServiceDialog service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); data.reload(); showToast('Service updated.', 'success') }} />}
  </section>
}

function ServiceDialog({ service, onClose, onSaved }: { service: ApiProviderService; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(service.title)
  const [description, setDescription] = useState(service.description)
  const [price, setPrice] = useState(service.base_price_paise === null ? '' : String(service.base_price_paise / 100))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return <Modal open title={`Edit ${service.category_name}`} onClose={onClose}>
    <div className="modal-stack">
      <Input label="Service title" name="serviceTitle" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={service.category_name} />
      <Textarea label="Description" name="serviceDescription" rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
      <Input label="Typical starting price in ₹ (optional)" name="servicePrice" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9.]/g, ''))} hint="A guide only — quotes are prepared per event." />
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={async () => {
          setSaving(true); setError('')
          try {
            await profilesApi.updateProviderService(service.id, { title: title.trim(), description: description.trim(), base_price_paise: parseRupeesToPaise(price) })
            onSaved()
          } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this service.') } finally { setSaving(false) }
        }}>{saving ? 'Saving…' : 'Save service'}</Button>
      </div>
    </div>
  </Modal>
}

function CoveragePage() {
  const { showToast } = useToast()
  const data = useApiData(() => profilesApi.listProviderCoverage(), [])
  const coverage = data.data ?? []
  const [values, setValues] = useState({ pinCode: '', locality: '', city: '', state: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    setSaving(true); setError('')
    try {
      await profilesApi.createProviderCoverage({ pin_code: values.pinCode, locality: values.locality.trim(), city: values.city.trim(), state: values.state.trim() })
      setValues({ pinCode: '', locality: '', city: '', state: '' })
      showToast('Coverage added. Matching organisers in that area can now find you.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add that location.') } finally { setSaving(false) }
  }

  return <section className="customer-page">
    <PageHeading eyebrow="COVERAGE" title="Where you work" intro="Matching uses only the exact PIN codes you list. A city name alone does not imply coverage of every area within it." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading coverage" />}
    {coverage.length === 0 && !data.loading && <EmptyState title="No coverage locations yet" description="Add at least one PIN code so organisers in that area can match with you." />}
    {coverage.length > 0 && <div className="coverage-list">{coverage.map((location) => <Card className="coverage-row" key={location.id}>
      <div><strong>{location.locality}</strong><small>{location.city}, {location.state} · {location.pin_code}</small></div>
      <Button type="button" size="sm" variant="quiet" onClick={() => void profilesApi.deleteProviderCoverage(location.id).then(() => { showToast('Coverage removed.', 'success'); data.reload() })}>Remove</Button>
    </Card>)}</div>}

    <Card className="customer-form">
      <h2>Add a coverage location</h2>
      <form className="customer-form" onSubmit={submit} noValidate>
        <Input label="PIN code" name="pinCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={values.pinCode} onChange={(event) => setValues((current) => ({ ...current, pinCode: event.target.value.replace(/\D/g, '') }))} />
        <Input label="Locality" name="locality" required minLength={2} value={values.locality} onChange={(event) => setValues((current) => ({ ...current, locality: event.target.value }))} />
        <div className="event-form-grid">
          <Input label="City" name="city" required minLength={2} value={values.city} onChange={(event) => setValues((current) => ({ ...current, city: event.target.value }))} />
          <Input label="State" name="state" required minLength={2} value={values.state} onChange={(event) => setValues((current) => ({ ...current, state: event.target.value }))} />
        </div>
        {error && <p className="customer-error" role="alert">{error}</p>}
        <div className="customer-form__actions"><Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add location'}</Button></div>
      </form>
    </Card>
  </section>
}

function OpportunitiesPage() {
  const data = useApiData(() => marketplaceApi.listProviderOpportunities(), [])
  const opportunities: ApiProviderOpportunity[] = data.data ?? []
  return <section className="customer-page">
    <PageHeading
      eyebrow="MATCHED REQUESTS"
      title="Opportunities for your services"
      intro="Open event requests that match your declared services and coverage. You can prepare a quotation without waiting for an invitation; customer contact details and the exact venue stay private until the organiser chooses you."
      action={<ButtonLink to={routes.provider.requests} variant="secondary">Invitations</ButtonLink>}
    />
    {data.loading && <Spinner label="Loading matched requests" />}
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {!data.loading && !data.error && opportunities.length === 0 && <EmptyState
      title="No matched requests yet"
      description="Add the services you deliver and the PIN codes or cities you cover. New public requests that match both will appear here."
      action={<ButtonLink to={routes.provider.services}>Review your services</ButtonLink>}
    />}
    <div className="opportunity-list">
      {opportunities.map((opportunity) => <Card as="article" className="opportunity-card" key={opportunity.id}>
        <div className="opportunity-card__head">
          <div>
            <span className="eyebrow">{opportunity.event_type.toUpperCase()}</span>
            <h2>{opportunity.name}</h2>
            <p>{formatDate(opportunity.event_date)} · {formatTimeRange(opportunity.start_time, opportunity.end_time)} · {opportunity.guest_count} guests</p>
            <p>{opportunity.locality}, {opportunity.city}, {opportunity.state}</p>
          </div>
          <div className="opportunity-card__status">
            {opportunity.invitation_status === 'ACCEPTED' && <Badge tone="success">Invitation accepted</Badge>}
            {opportunity.invitation_status === 'PENDING' && <Badge tone="warning">Invited</Badge>}
            {opportunity.already_quoted && <Badge tone="neutral">Quotation started</Badge>}
          </div>
        </div>
        <div className="opportunity-card__requirements">
          {opportunity.requirements.map((requirement) => <div key={requirement.id}>
            <strong>{requirement.title}</strong>
            <span>{requirement.category_name} · {requirement.budget_paise === null ? 'No budget given' : `Budget ${formatPaise(requirement.budget_paise)}`}</span>
            {requirement.description && <p>{requirement.description}</p>}
          </div>)}
        </div>
        <div className="opportunity-card__actions">
          <ButtonLink to={providerQuotePath(opportunity.id)}>{opportunity.already_quoted ? 'Continue quotation' : 'Prepare quotation'}</ButtonLink>
        </div>
      </Card>)}
    </div>
  </section>
}

function InboxPage() {
  const { showToast } = useToast()
  const data = useApiData(() => marketplaceApi.listProviderInvitations(), [])
  const invitations = data.data ?? []
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('ALL')
  const filtered = tab === 'PENDING' ? invitations.filter((item) => item.status === 'PENDING') : invitations

  async function respond(invitation: ApiInvitation, accept: boolean) {
    setPendingId(invitation.id); setError('')
    try {
      await marketplaceApi.respondToInvitation(invitation.id, accept)
      showToast(accept ? 'Invitation accepted. You can now prepare a quotation.' : 'Invitation declined.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not respond to this invitation.') } finally { setPendingId('') }
  }

  return <section className="customer-page">
    <PageHeading eyebrow="INVITATIONS" title="Requests for you" intro="An invitation means an organiser has read your profile and wants a quotation for a specific event." />
    {error && <p className="customer-error" role="alert">{error}</p>}
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading invitations" />}
    {!data.loading && invitations.length === 0 && <EmptyState title="No invitations yet" description="Complete your profile and coverage so matching organisers can find you." action={<ButtonLink to={routes.provider.profile}>Edit your profile</ButtonLink>} />}
    {invitations.length > 0 && <>
      <div className="segment-control" role="group" aria-label="Filter invitations">
        <button type="button" aria-pressed={tab === 'PENDING'} className={tab === 'PENDING' ? 'segment-control__active' : ''} onClick={() => setTab('PENDING')}>Awaiting reply ({invitations.filter((item) => item.status === 'PENDING').length})</button>
        <button type="button" aria-pressed={tab === 'ALL'} className={tab === 'ALL' ? 'segment-control__active' : ''} onClick={() => setTab('ALL')}>All ({invitations.length})</button>
      </div>
      {filtered.length === 0 && <EmptyState title="Nothing awaiting your reply" description="Older invitations are still available under All." />}
      <div className="invitation-cards">{filtered.map((invitation) => <Card className="invitation-card" key={invitation.id}>
        <div className="invitation-card__head">
          <div>
            <span className="eyebrow">EVENT INVITATION</span>
            <h2>{invitation.event_name}</h2>
            {invitation.event_detail && <p>{formatDate(invitation.event_detail.event_date)} · {formatTimeRange(invitation.event_detail.start_time, invitation.event_detail.end_time)} · {invitation.event_detail.guest_count} guests · {invitation.event_detail.locality}, {invitation.event_detail.city} {invitation.event_detail.pin_code}</p>}
          </div>
          <InvitationStatusBadge status={invitation.status} />
        </div>
        {invitation.requirement_title && <p className="invitation-card__scope">Requested service: <strong>{invitation.requirement_title}</strong></p>}
        {invitation.message && <blockquote className="invitation-card__message">“{invitation.message}”</blockquote>}
        {invitation.event_detail && <div className="invitation-card__requirements">
          <h3>Services in this request</h3>
          <ul>{invitation.event_detail.requirements.map((requirement) => <li key={requirement.id}>
            <span>{requirement.title}</span>
            <small>{requirement.budget_paise === null ? 'No budget given' : `Budget ${formatPaise(requirement.budget_paise)}`} · {requirement.status.toLowerCase()}</small>
          </li>)}</ul>
        </div>}
        <div className="invitation-card__actions">
          {invitation.status === 'PENDING' && <>
            <Button type="button" variant="secondary" disabled={pendingId === invitation.id} onClick={() => void respond(invitation, false)}>Decline</Button>
            <Button type="button" disabled={pendingId === invitation.id} onClick={() => void respond(invitation, true)}>{pendingId === invitation.id ? 'Saving…' : 'Accept and quote'}</Button>
          </>}
          {invitation.status === 'ACCEPTED' && <ButtonLink to={providerQuotePath(invitation.event)}>Prepare quotation</ButtonLink>}
          {invitation.status === 'DECLINED' && <span className="muted-note">You declined this invitation.</span>}
          {invitation.status === 'WITHDRAWN' && <span className="muted-note">The organiser withdrew this invitation.</span>}
        </div>
      </Card>)}</div>
    </>}
  </section>
}

function QuotationsPage() {
  const data = useApiData(() => marketplaceApi.listProviderQuotations(), [])
  const quotations = data.data ?? []
  return <section className="customer-page">
    <PageHeading eyebrow="QUOTATIONS" title="Quotes you have prepared" intro="A submitted revision is what the organiser sees. Revisions keep the full history of what changed." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading quotations" />}
    {!data.loading && quotations.length === 0 && <EmptyState title="No quotations yet" description="Accept an invitation, then prepare a quotation against the organiser's brief." action={<ButtonLink to={routes.provider.requests}>Open invitations</ButtonLink>} />}
    <div className="quote-list">{quotations.map((quotation) => <Card className="provider-quote-row" key={quotation.id}>
      <div className="provider-quote-row__head">
        <div>
          <span className="eyebrow">{quotation.status === 'WITHDRAWN' ? 'WITHDRAWN' : 'QUOTATION'}</span>
          <h2>{quotation.event_name}</h2>
          <p>{quotation.revisions.length} revision{quotation.revisions.length === 1 ? '' : 's'}{latestRevision(quotation)?.valid_until ? ` · valid until ${formatShortDate(latestRevision(quotation)?.valid_until)}` : ''}</p>
        </div>
        <div className="provider-quote-row__amount"><strong>{formatPaise(latestRevision(quotation)?.total_paise ?? 0)}</strong>{latestRevision(quotation) && <RevisionStatusBadge status={latestRevision(quotation)!.status} />}</div>
      </div>
      {latestRevision(quotation) && <QuoteBreakdown revision={latestRevision(quotation)!} />}
      <div className="provider-quote-row__actions">
        <Link className="text-link" to={customerEventPath(quotation.event)}>View request</Link>
        <div>
          {quotation.status === 'OPEN' && <ButtonLink to={providerQuotePath(quotation.event)} size="sm" variant="secondary">{latestRevision(quotation)?.status === 'SUBMITTED' ? 'Revise quote' : 'Continue quote'}</ButtonLink>}
          {quotation.status === 'OPEN' && latestRevision(quotation)?.status === 'SUBMITTED' && <Button type="button" size="sm" variant="quiet" onClick={() => void marketplaceApi.withdrawQuotation(quotation.id).then(() => data.reload())}>Withdraw</Button>}
        </div>
      </div>
    </Card>)}</div>
  </section>
}

type DraftItem = { requirementId: string; include: boolean; title: string; description: string; price: string }

function QuoteEditorPage() {
  const { eventId = '' } = useParams()
  const { showToast } = useToast()
  const data = useApiData(async () => {
    const [opportunities, invitations, quotations] = await Promise.all([
      marketplaceApi.listProviderOpportunities(),
      marketplaceApi.listProviderInvitations(),
      marketplaceApi.listProviderQuotations(),
    ])
    return { opportunities, invitations, quotations }
  }, [eventId])
  const invitation = (data.data?.invitations ?? []).find((item) => item.event === eventId)
  const opportunity = (data.data?.opportunities ?? []).find((item) => item.id === eventId)
  const quotation: ApiQuotation | undefined = (data.data?.quotations ?? []).find((item) => item.event === eventId)
  const draftRevision: ApiQuoteRevision | undefined = quotation?.revisions.find((revision) => revision.status === 'DRAFT')
  const [items, setItems] = useState<DraftItem[]>([])
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
  const [dateBounds] = useState(() => ({
    min: new Date().toISOString().slice(0, 10),
    max: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
  }))
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const brief = invitation?.event_detail ?? opportunity
  const requirements = useMemo(() => brief?.requirements ?? [], [brief])
  const openRequirements = useMemo(() => requirements.filter((requirement) => requirement.status === 'OPEN'), [requirements])
  useEffect(() => {
    if (!requirements.length) return
    setItems((current) => current.length ? current : requirements.map((requirement) => ({
      requirementId: requirement.id,
      include: false,
      title: requirement.title,
      description: '',
      price: '',
    })))
  }, [requirements])
  useEffect(() => {
    if (!draftRevision) return
    setNotes(draftRevision.notes)
    if (draftRevision.valid_until) setValidUntil(draftRevision.valid_until)
    if (draftRevision.items.length) setItems(draftRevision.items.map((item) => ({
      requirementId: item.requirement,
      include: true,
      title: item.title,
      description: item.description,
      price: String(item.amount_paise / 100),
    })))
  }, [draftRevision])

  function updateItem(requirementId: string, field: keyof DraftItem, value: string | boolean) {
    setItems((current) => current.map((item) => item.requirementId === requirementId ? { ...item, [field]: value } : item))
  }

  async function ensureDraft() {
    if (!quotation) throw new Error('Start the quotation first.')
    if (draftRevision) return draftRevision
    return marketplaceApi.createRevision(quotation.id)
  }

  async function saveDraft() {
    setBusy('save'); setError('')
    try {
      const revision = await ensureDraft()
      await marketplaceApi.updateRevision(quotation!.id, revision.id, {
        notes: notes.trim(),
        valid_until: validUntil,
        items: items.filter((item) => item.include).map((item) => ({
          requirement_id: item.requirementId,
          kind: 'LINE' as const,
          title: item.title.trim() || 'Service',
          description: item.description.trim(),
          amount_paise: parseRupeesToPaise(item.price) ?? 0,
        })),
      })
      showToast('Draft quotation saved.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the quotation.') } finally { setBusy('') }
  }

  async function submit() {
    const chosen = items.filter((item) => item.include)
    if (!chosen.length) { setError('Select at least one service and add a price.'); return }
    if (chosen.some((item) => (parseRupeesToPaise(item.price) ?? 0) <= 0)) { setError('Every selected service needs a price greater than zero.'); return }
    if (!validUntil) { setError('Choose how long this quotation is valid.'); return }
    setBusy('submit'); setError('')
    try {
      const revision = await ensureDraft()
      await marketplaceApi.updateRevision(quotation!.id, revision.id, {
        notes: notes.trim(),
        valid_until: validUntil,
        items: chosen.map((item) => ({
          requirement_id: item.requirementId,
          kind: 'LINE' as const,
          title: item.title.trim() || 'Service',
          description: item.description.trim(),
          amount_paise: parseRupeesToPaise(item.price) ?? 0,
        })),
      })
      await marketplaceApi.submitRevision(quotation!.id, revision.id)
      showToast('Quotation submitted. The organiser can now review it.', 'success')
      data.reload()
    } catch (caught) {
      if (isApiError(caught)) setError(caught.message)
      else setError(caught instanceof Error ? caught.message : 'Could not submit the quotation.')
    } finally { setBusy('') }
  }

  if (data.loading) return <section className="customer-page"><Spinner label="Loading the request" /></section>
  if (data.error) return <section className="customer-page"><ErrorState description={data.error} onRetry={data.reload} /></section>
  if (!invitation && !opportunity) return <section className="customer-page"><EmptyState title="This request is not available" description="This event is not matched to your services and coverage, and you have not been invited to it." action={<ButtonLink to={routes.provider.opportunities}>Back to opportunities</ButtonLink>} /></section>
  if (!opportunity && invitation && invitation.status !== 'ACCEPTED') return <section className="customer-page">
    <PageHeading eyebrow="QUOTATION" title="Accept the invitation first" intro="The organiser asked you to quote, but the invitation is not accepted yet." />
    <ButtonLink to={routes.provider.requests}>Respond to the invitation</ButtonLink>
  </section>

  const total = items.filter((item) => item.include).reduce((sum, item) => sum + (parseRupeesToPaise(item.price) ?? 0), 0)
  const latestSubmitted = quotation?.revisions.find((revision) => revision.status === 'SUBMITTED')

  return <section className="customer-page">
    <PageHeading
      eyebrow="QUOTATION"
      title={invitation?.event_name ?? opportunity?.name ?? 'Matched request'}
      intro={brief ? `${formatDate(brief.event_date)} · ${formatTimeRange(brief.start_time, brief.end_time)} · ${brief.guest_count} guests · ${brief.city}${'pin_code' in brief ? ` ${brief.pin_code}` : ''}` : 'Prepare your quotation against the organiser’s brief.'}
      action={<ButtonLink to={routes.provider.quotes} variant="secondary">All quotations</ButtonLink>}
    />
    {invitation?.message && <blockquote className="invitation-card__message">“{invitation.message}”</blockquote>}
    {opportunity && invitation?.status !== 'ACCEPTED' && <p className="form-note">This request matches your declared services and coverage, so you can quote it directly. The customer’s contact details appear only after they choose your quotation.</p>}

    {!quotation && <Card className="customer-form">
      <h2>Start a quotation</h2>
      <p className="detail-card__hint">A quotation starts as a draft revision only you can see. The organiser sees it when you submit.</p>
      <div className="customer-form__actions"><Button type="button" disabled={busy === 'start'} onClick={async () => {
        setBusy('start'); setError('')
        try { await marketplaceApi.createQuotation(eventId); showToast('Quotation started. Add your prices.', 'success'); data.reload() }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start the quotation.') }
        finally { setBusy('') }
      }}>{busy === 'start' ? 'Starting…' : 'Start quotation'}</Button></div>
      {error && <p className="customer-error" role="alert">{error}</p>}
    </Card>}

    {quotation && latestSubmitted && !draftRevision && <Card className="submitted-quote">
      <div className="submitted-quote__head">
        <div><span className="eyebrow">SUBMITTED</span><h2>Revision {latestSubmitted.revision_number} is with the organiser</h2><p>They can compare it with other quotations and choose the services they want.</p></div>
        <RevisionStatusBadge status={latestSubmitted.status} />
      </div>
      <QuoteBreakdown revision={latestSubmitted} />
      {quotation.status === 'OPEN' && openRequirements.length > 0 && <div className="submitted-quote__actions">
        <Button type="button" disabled={busy === 'revise'} onClick={async () => {
          setBusy('revise'); setError('')
          try { await marketplaceApi.createRevision(quotation.id); showToast('New revision started.', 'success'); data.reload() }
          catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start a new revision.') }
          finally { setBusy('') }
        }}>{busy === 'revise' ? 'Starting…' : 'Prepare a revision'}</Button>
      </div>}
      {quotation.status === 'OPEN' && openRequirements.length === 0 && <p className="muted-note">Every service in this request is committed. Revisions are unavailable in this release.</p>}
      {error && <p className="customer-error" role="alert">{error}</p>}
    </Card>}

    {quotation && (draftRevision || !latestSubmitted) && <Card className="customer-form quote-editor">
      <div className="quote-editor__head"><div><h2>{draftRevision ? `Draft revision ${draftRevision.revision_number}` : 'New quotation'}</h2><p>Price only the services you can deliver. The organiser sees the total and each line.</p></div></div>
      <div className="quote-editor__items">
        {requirements.length === 0 && <p className="muted-note">This request has no service lines available to quote.</p>}
        {items.map((item) => {
          const requirement = requirements.find((entry) => entry.id === item.requirementId)
          const selectable = requirement?.status === 'OPEN'
          return <div className={`quote-editor__item ${item.include ? 'quote-editor__item--on' : ''}`} key={item.requirementId}>
            <label className="quote-editor__toggle">
              <input type="checkbox" checked={item.include} disabled={!selectable} onChange={(event) => updateItem(item.requirementId, 'include', event.target.checked)} />
              <span><strong>{requirement?.title ?? item.title}</strong><small>{requirement?.budget_paise === null || requirement?.budget_paise === undefined ? 'No budget given' : `Organiser budget ${formatPaise(requirement.budget_paise)}`}</small></span>
            </label>
            {item.include && <div className="quote-editor__fields">
              <Input label="Line title" name={`title-${item.requirementId}`} value={item.title} onChange={(event) => updateItem(item.requirementId, 'title', event.target.value)} />
              <Input label="Price in ₹" name={`price-${item.requirementId}`} inputMode="decimal" required value={item.price} onChange={(event) => updateItem(item.requirementId, 'price', event.target.value.replace(/[^0-9.]/g, ''))} />
              <Textarea label="What is included" name={`description-${item.requirementId}`} rows={2} maxLength={1000} value={item.description} onChange={(event) => updateItem(item.requirementId, 'description', event.target.value)} hint="Deliverables, exclusions, crew, travel." />
            </div>}
          </div>
        })}
      </div>
      <Textarea label="Message to the organiser" name="quoteNotes" rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} hint="Explain your approach, assumptions or any additional costs." />
      <Input label="Quotation valid until" name="validUntil" type="date" required value={validUntil} min={dateBounds.min} max={dateBounds.max} onChange={(event) => setValidUntil(event.target.value)} hint="Up to 90 days from today." />
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="quote-editor__total"><span>Quotation total</span><strong>{formatPaise(total)}</strong></div>
      <div className="customer-form__actions">
        <Button type="button" variant="secondary" disabled={busy !== ''} onClick={() => void saveDraft()}>{busy === 'save' ? 'Saving…' : 'Save draft'}</Button>
        <Button type="button" disabled={busy !== ''} onClick={() => void submit()}>{busy === 'submit' ? 'Submitting…' : 'Submit quotation'}</Button>
      </div>
      <p className="form-note">Submitted revisions are locked. Start a revision to change a price or add detail; the organiser keeps the history.</p>
    </Card>}
  </section>
}

function CommitmentsPage() {
  const data = useApiData(async () => {
    const [profile, commitments] = await Promise.all([
      profilesApi.getProviderProfile(),
      marketplaceApi.listProviderCommitments(),
    ])
    return { profile, commitments }
  }, [])
  const commitments: ApiCommitment[] = data.data?.commitments ?? []
  const isManager = data.data?.profile?.kind === 'MANAGER'
  return <section className="customer-page">
    <PageHeading eyebrow="COMMITMENTS" title="Services chosen by organisers" intro="When an organiser selects your quotation, the agreed scope and price are recorded here for both sides." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading commitments" />}
    {!data.loading && commitments.length === 0 && <EmptyState title="No commitments yet" description="A commitment appears when an organiser chooses services from one of your quotations." action={<ButtonLink to={routes.provider.quotes}>Your quotations</ButtonLink>} />}
    <div className="commitment-list">{commitments.map((commitment) => <Card className="commitment-card" key={commitment.id}>
      <div className="commitment-card__head">
        <div><span className="eyebrow">EVENT</span><h2>{commitment.event_name}</h2><p>{formatDate(commitment.event_date)} · accepted {formatShortDate(commitment.accepted_at)}</p></div>
        <div className="commitment-card__amount"><strong>{formatPaise(commitment.total_paise)}</strong><CommitmentStatusBadge status={commitment.status} /></div>
      </div>
      <ul className="commitment-lines">{commitment.lines.map((line) => <li key={line.id}><span>{line.title}<small>{line.package_key ? `Package · ${line.package_key}` : line.requirement_title}</small></span><strong>{formatPaise(line.amount_paise)}</strong></li>)}</ul>
      {commitment.status === 'RELEASED' && <p className="muted-note">Released {formatShortDate(commitment.released_at)}{commitment.release_reason ? ` — ${commitment.release_reason}` : ''}. The history stays available to both sides.</p>}
      {isManager && commitment.status === 'ACTIVE' && <div className="commitment-card__actions"><ButtonLink size="sm" to={`${routes.provider.assignments}?commitment=${commitment.id}`}>Manage team</ButtonLink><Link className="text-link" to={`${routes.provider.assignments}?commitment=${commitment.id}`}>Assign Workers</Link></div>}
    </Card>)}</div>
  </section>
}
