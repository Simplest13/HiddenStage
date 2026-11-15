import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useMatches } from 'react-router-dom'
import { customerEventPath, routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions } from '../../app/auth/useAuth'
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Input, Select, Spinner } from '../../shared/ui'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { profilesApi } from '../../shared/api/backend/profiles'
import { useApiData } from '../../shared/api/backend/useApiData'
import { formatDate, formatPaise, formatShortDate, formatTimeRange } from '../../shared/api/backend/format'
import type { ApiEventListItem, ApiQuotation } from '../../shared/api/backend/types'
import { EventStatusBadge } from '../marketplace/MarketplaceUI'
import './customer.css'

type Page = 'customerHome' | 'customerRequests' | 'customerSettings'

export default function CustomerPages() {
  const page = (useMatches().at(-1)?.handle as { page?: Page } | undefined)?.page ?? 'customerHome'
  if (page === 'customerRequests') return <RequestsPage />
  if (page === 'customerSettings') return <SettingsPage />
  return <DashboardPage />
}

function useOrganiserData() {
  const events = useApiData(() => eventsApi.list(), [])
  const commitments = useApiData(() => marketplaceApi.listCommitments(), [])
  const quotations = useApiData(async () => {
    const list = await eventsApi.list()
    const live = list.filter((event) => event.status === 'SUBMITTED' || event.status === 'CLOSED')
    const groups = await Promise.all(live.map(async (event) => {
      const quotes = await marketplaceApi.listEventQuotations(event.id).catch(() => [])
      return quotes.map((quotation) => ({ quotation, event }))
    }))
    return groups.flat()
  }, [])
  const profile = useApiData(() => profilesApi.getCustomerProfile(), [])
  return { events, commitments, quotations, profile }
}

function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'there' }

function DashboardPage() {
  const auth = useAuth()
  const actions = useAuthActions()
  const data = useOrganiserData()
  const user = auth.status === 'authenticated' ? auth.user : undefined
  const events = data.events.data ?? []
  const commitments = data.commitments.data ?? []
  const quotes = data.quotations.data ?? []
  const openRequests = events.filter((event) => event.status === 'SUBMITTED')
  const activeCommitments = commitments.filter((item) => item.status === 'ACTIVE')
  const waitingQuotes = openRequests.length > 0 && quotes.length === 0
  const loading = data.events.loading || data.commitments.loading

  if (data.events.error) return <section className="customer-page"><ErrorState description={data.events.error} onRetry={data.events.reload} /></section>

  return <section className="customer-page">
    <div className="customer-page__heading">
      <div>
        <span className="eyebrow eyebrow--accent">YOUR WORKSPACE</span>
        <h1>Welcome back{user ? `, ${firstName(user.fullName)}` : ''}.</h1>
        <p>{openRequests.length
          ? `${openRequests.length} request${openRequests.length === 1 ? ' is' : 's are'} open for quotes. Compare what suppliers offer before you choose.`
          : 'Start with a request. Describe what you need and matching professionals can send you quotations.'}</p>
      </div>
      <ButtonLink to={routes.customer.newRequest}>Create a request</ButtonLink>
    </div>

    {loading && <Spinner label="Loading your workspace" />}

    {!loading && <div className="stat-grid">
      <Card className="dashboard-stat"><span className="dashboard-stat__label">Open requests</span><strong>{openRequests.length}</strong><p>Requests matching professionals can quote on.</p></Card>
      <Card className="dashboard-stat"><span className="dashboard-stat__label">Quotations received</span><strong>{quotes.length}</strong><p>{quotes.length ? 'Compare totals, scope and validity.' : waitingQuotes ? 'Invite professionals to speed this up.' : 'No quotes yet.'}</p></Card>
      <Card className="dashboard-stat"><span className="dashboard-stat__label">Active commitments</span><strong>{activeCommitments.length}</strong><p>Suppliers chosen for specific services.</p></Card>
      <Card className="dashboard-stat"><span className="dashboard-stat__label">Drafts</span><strong>{events.filter((event) => event.status === 'DRAFT').length}</strong><p>Unpublished requests only you can see.</p></Card>
    </div>}

    {!loading && events.length === 0 && <div className="dashboard-empty">
      <span className="eyebrow eyebrow--accent">A CLEARER WAY TO PLAN</span>
      <h2>Your first request takes a few minutes.</h2>
      <p>Tell us the occasion, where it is and which services you need. HiddenStage matches it to professionals who explicitly cover your area — then you compare real quotations and choose.</p>
      <div className="dashboard-empty__steps"><span>1 · Describe the event</span><span>2 · Add services</span><span>3 · Compare quotes</span><span>4 · Choose suppliers</span></div>
      <ButtonLink to={routes.customer.newRequest}>Create your first request</ButtonLink>
    </div>}

    {events.length > 0 && <div className="dashboard-columns">
      <Card className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div><h2>Your requests</h2><p>The brief suppliers see, and where each one stands.</p></div>
          <ButtonLink to={routes.customer.requests} variant="quiet" size="sm">View all</ButtonLink>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th scope="col">Request</th><th scope="col">Event date</th><th scope="col">Services</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
            <tbody>{events.slice(0, 5).map((event) => <tr key={event.id}>
              <td><Link className="event-cell__name" to={customerEventPath(event.id)}>{event.name}</Link><span className="event-cell__type">{event.event_type} · {event.city} {event.pin_code}</span></td>
              <td>{formatDate(event.event_date)}</td>
              <td>{event.requirement_count}</td>
              <td><EventStatusBadge status={event.status} /></td>
              <td className="event-cell__action"><Link className="text-link" to={customerEventPath(event.id)}>Open</Link></td>
            </tr>)}</tbody>
          </table>
        </div>
      </Card>

      <div className="dashboard-side">
        <Card className="profile-card">
          <span className="eyebrow eyebrow--accent">YOUR DETAILS</span>
          <h2>{user?.fullName ?? 'Your account'}</h2>
          <p>{user?.email}</p>
          <p>{data.profile.data ? `${data.profile.data.locality}, ${data.profile.data.city} ${data.profile.data.pin_code}` : 'Add your usual location to pre-fill new requests.'}</p>
          <div className="profile-card__actions"><ButtonLink to={routes.app.settings} variant="secondary" size="sm">Account settings</ButtonLink></div>
        </Card>
        <Card className="quick-card">
          <span className="eyebrow">SHORTCUTS</span>
          <Link to={routes.customer.quotes}>Compare received quotations</Link>
          <Link to={routes.customer.commitments}>Review commitments</Link>
          <Link to={routes.customer.requests}>Manage event requests</Link>
          <button type="button" className="customer-logout" onClick={() => void actions.logout().then(() => { window.location.assign(routes.home) })}>Sign out</button>
        </Card>
      </div>
    </div>}

    {quotes.length > 0 && <Card className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div><h2>Latest quotations</h2><p>Newest supplier proposals across your open requests.</p></div>
        <ButtonLink to={routes.customer.quotes} variant="quiet" size="sm">Compare all</ButtonLink>
      </div>
      <ul className="dashboard-quotes">{quotes.slice(0, 4).map(({ quotation, event }) => <li key={quotation.id}>
        <div><strong>{quotation.provider_display_name}</strong><small>{event.name} · {formatShortDate(event.event_date)}</small></div>
        <span>{formatPaise(latestTotal(quotation))}</span>
        <Link className="text-link" to={`${customerEventPath(event.id)}?tab=quotes`}>Review</Link>
      </li>)}</ul>
    </Card>}
  </section>
}

function latestTotal(quotation: ApiQuotation) {
  return quotation.revisions.find((revision) => revision.status === 'SUBMITTED')?.total_paise ?? 0
}

function RequestsPage() {
  const data = useApiData(() => eventsApi.list(), [])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [sort, setSort] = useState('soonest')
  const [view, setView] = useState<'list' | 'grid'>('list')

  const filtered = useMemo(() => {
    const events = data.data ?? []
    const term = query.trim().toLowerCase()
    return events
      .filter((event) => status === 'ALL' || event.status === status)
      .filter((event) => !term || [event.name, event.event_type, event.city, event.pin_code].some((value) => value.toLowerCase().includes(term)))
      .sort((a, b) => sort === 'newest' ? b.created_at.localeCompare(a.created_at) : a.event_date.localeCompare(b.event_date))
  }, [data.data, query, status, sort])

  return <section className="customer-page">
    <div className="customer-page__heading">
      <div>
        <span className="eyebrow eyebrow--accent">EVENT REQUESTS</span>
        <h1>My event requests</h1>
        <p>Every request you have saved, published or closed, with the quotes and commitments attached to it.</p>
      </div>
      <ButtonLink to={routes.customer.newRequest}>Create a request</ButtonLink>
    </div>

    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading your requests" />}

    {!data.loading && !data.error && (data.data?.length ?? 0) === 0 && <EmptyState
      title="No requests yet"
      description="Create a request to describe your event and the services you need. It stays private until you publish it."
      action={<ButtonLink to={routes.customer.newRequest}>Create your first request</ButtonLink>}
    />}

    {(data.data?.length ?? 0) > 0 && <>
      <div className="event-filters">
        <Input label="Search requests" name="search" type="search" placeholder="Name, type, city or PIN" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select label="Status" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Drafts</option>
          <option value="SUBMITTED">Open for quotes</option>
          <option value="CLOSED">Closed</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </Select>
        <Select label="Sort by" name="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="soonest">Event date — soonest</option>
          <option value="newest">Recently created</option>
        </Select>
        <div className="view-toggle" role="group" aria-label="Layout">
          <Button type="button" size="sm" variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')}>List</Button>
          <Button type="button" size="sm" variant={view === 'grid' ? 'primary' : 'secondary'} onClick={() => setView('grid')}>Cards</Button>
        </div>
      </div>

      <div className="results-head"><p><strong>{filtered.length}</strong> request{filtered.length === 1 ? '' : 's'}</p>{filtered.length !== (data.data?.length ?? 0) && <Button type="button" variant="quiet" size="sm" onClick={() => { setQuery(''); setStatus('ALL') }}>Clear filters</Button>}</div>

      {filtered.length === 0 && <EmptyState title="No requests match those filters" description="Try a different status or search term." action={<Button type="button" variant="secondary" onClick={() => { setQuery(''); setStatus('ALL') }}>Clear filters</Button>} />}

      {filtered.length > 0 && view === 'grid' && <div className="customer-event-grid">{filtered.map((event) => <Card className="customer-event-card" key={event.id}>
        <div className="customer-event-card__top"><EventStatusBadge status={event.status} /><span>{formatShortDate(event.event_date)}</span></div>
        <h2><Link to={customerEventPath(event.id)}>{event.name}</Link></h2>
        <p>{event.event_type} · {event.city} {event.pin_code} · {event.requirement_count} service{event.requirement_count === 1 ? '' : 's'}</p>
        <Link className="text-link" to={customerEventPath(event.id)}>View request</Link>
      </Card>)}</div>}

      {filtered.length > 0 && view === 'list' && <Card className="dashboard-panel">
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th scope="col">Request</th><th scope="col">Event date</th><th scope="col">Time</th><th scope="col">Services</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
          <tbody>{filtered.map((event) => <RequestRow event={event} key={event.id} />)}</tbody>
        </table></div>
      </Card>}
    </>}
  </section>
}

function RequestRow({ event }: { event: ApiEventListItem }) {
  return <tr>
    <td><Link className="event-cell__name" to={customerEventPath(event.id)}>{event.name}</Link><span className="event-cell__type">{event.event_type} · {event.city} {event.pin_code}</span></td>
    <td>{formatDate(event.event_date)}</td>
    <td>{formatTimeRange(event.start_time, event.end_time)}</td>
    <td>{event.requirement_count}</td>
    <td><EventStatusBadge status={event.status} /></td>
    <td className="event-cell__action"><Link className="text-link" to={customerEventPath(event.id)}>Open</Link></td>
  </tr>
}

function SettingsPage() {
  const auth = useAuth()
  const user = auth.status === 'authenticated' ? auth.user : undefined
  const profile = useApiData(() => profilesApi.getCustomerProfile(), [])
  const [values, setValues] = useState({ pinCode: '', locality: '', city: '', state: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!profile.data) return
    setValues({ pinCode: profile.data.pin_code, locality: profile.data.locality, city: profile.data.city, state: profile.data.state })
  }, [profile.data])

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    setSaving(true); setError(''); setNotice('')
    try {
      await profilesApi.saveCustomerProfile({ pin_code: values.pinCode, locality: values.locality, city: values.city, state: values.state })
      setNotice('Your default location has been updated.')
      profile.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save your location.') }
    finally { setSaving(false) }
  }

  return <section className="customer-page">
    <div className="customer-page__heading">
      <div><span className="eyebrow eyebrow--accent">ACCOUNT</span><h1>Account settings</h1><p>Your sign-in identity, default location and security.</p></div>
    </div>

    <div className="settings-layout">
      <div className="settings-main">
        <Card className="detail-card">
          <h2>Your details</h2>
          <dl className="detail-list">
            <div><dt>Full name</dt><dd>{user?.fullName ?? '—'}</dd></div>
            <div><dt>Email</dt><dd>{user?.email ?? '—'} {user?.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Not verified</Badge>}</dd></div>
            <div><dt>Mobile</dt><dd>{user?.phone || 'Not added'}</dd></div>
          </dl>
          <p className="form-note">Your name, email and mobile are tied to your sign-in. Contact HiddenStage if one of them needs to change.</p>
        </Card>

        <Card className="detail-card">
          <h2>Default location</h2>
          <p className="detail-card__hint">Pre-fills new requests. Every request can use a different location.</p>
          {profile.loading ? <Spinner label="Loading your profile" /> : <form className="customer-form" onSubmit={submit} noValidate>
            <Input label="PIN code" name="pinCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={values.pinCode} onChange={(event) => update('pinCode', event.target.value.replace(/\D/g, ''))} />
            <Input label="Locality" name="locality" required minLength={2} value={values.locality} onChange={(event) => update('locality', event.target.value)} />
            <div className="event-form-grid">
              <Input label="City" name="city" required minLength={2} value={values.city} onChange={(event) => update('city', event.target.value)} />
              <Input label="State" name="state" required minLength={2} value={values.state} onChange={(event) => update('state', event.target.value)} />
            </div>
            {error && <p className="customer-error" role="alert">{error}</p>}
            {notice && <p className="form-success" role="status">{notice}</p>}
            <div className="customer-form__actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save location'}</Button></div>
          </form>}
        </Card>
      </div>

      <aside className="settings-side">
        <Card className="detail-card">
          <h2>Security</h2>
          <p className="detail-card__hint">We never show your password. Use the reset flow to choose a new one.</p>
          <ButtonLink to={routes.auth.forgotPassword} variant="secondary" size="sm">Reset password</ButtonLink>
        </Card>
        <Card className="detail-card">
          <h2>Where details are shared</h2>
          <p className="detail-card__hint">Suppliers see your event brief and area. Your name, phone and street address are shared only with a supplier you choose.</p>
          <Link className="text-link" to={routes.privacy}>Read the privacy notice</Link>
        </Card>
      </aside>
    </div>
  </section>
}
