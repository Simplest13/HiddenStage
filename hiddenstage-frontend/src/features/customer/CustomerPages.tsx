import { useEffect, useMemo, useState } from 'react'
import { Link, useMatches, useNavigate } from 'react-router-dom'
import { customerEventPath, routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions } from '../../app/auth/useAuth'
import type { CustomerEvent, CustomerProfile } from '../../shared/api/customerContracts'
import { Badge, Button, ButtonLink, Card, Input, Select } from '../../shared/ui'
import { EmptyState, ErrorState, Spinner } from '../../shared/ui/feedback'
import { customerEventApi } from '../events/services/customerEventApi'
import './customer.css'

const today = new Date().toISOString().slice(0, 10)
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function EventRow({ event }: { event: CustomerEvent }) {
  return <tr>
    <td>
      <Link className="event-cell__name" to={customerEventPath(event.id)}>{event.name}</Link>
      <span className="event-cell__type">{event.type}</span>
    </td>
    <td>{formatDate(event.date)}</td>
    <td>{event.city}</td>
    <td>{event.guestCount}</td>
    <td><Badge tone={event.status === 'Submitted' ? 'accent' : 'neutral'}>{event.status}</Badge></td>
    <td className="event-cell__action"><Link className="text-link" to={customerEventPath(event.id)}>View <span aria-hidden="true">→</span></Link></td>
  </tr>
}

function EventCard({ event }: { event: CustomerEvent }) {
  return <Card as="article" className="customer-event-card">
    <div className="customer-event-card__top"><Badge tone="accent">{event.status}</Badge><span>{formatDate(event.date)}</span></div>
    <h2><Link to={customerEventPath(event.id)}>{event.name}</Link></h2>
    <p>{event.type} · {event.city} · {event.guestCount} guests</p>
    <Link className="text-link" to={customerEventPath(event.id)}>View event details →</Link>
  </Card>
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <Card className="dashboard-stat"><span className="dashboard-stat__label">{label}</span><strong>{value}</strong><p>{detail}</p></Card>
}

export default function CustomerPages() {
  const page = (useMatches().at(-1)?.handle as { page?: string } | undefined)?.page ?? 'customerHome'
  const auth = useAuth(); const actions = useAuthActions(); const navigate = useNavigate()
  const [events, setEvents] = useState<CustomerEvent[]>([]); const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [type, setType] = useState('all'); const [sort, setSort] = useState<'soonest' | 'latest'>('soonest')

  useEffect(() => {
    let active = true
    Promise.all([customerEventApi.listEvents(), customerEventApi.getCustomerProfile()]).then(([items, customerProfile]) => {
      if (active) { setEvents(items); setProfile(customerProfile) }
    }).catch(() => { if (active) setError('Could not load your event and profile data.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const types = useMemo(() => [...new Set(events.map((event) => event.type).filter(Boolean))].sort(), [events])
  const filtered = useMemo(() => events.filter((event) =>
    (status === 'all' || event.status === status) && (type === 'all' || event.type === type) &&
    `${event.name} ${event.city} ${event.type}`.toLowerCase().includes(query.trim().toLowerCase()),
  ).sort((a, b) => sort === 'soonest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)), [events, query, status, type, sort])

  if (loading) return <div className="customer-page"><Spinner label="Loading your demo events" /></div>
  if (error) return <div className="customer-page"><ErrorState description={error} onRetry={() => window.location.reload()} /></div>

  if (page === 'customerRequests') return <section className="customer-page">
    <div className="customer-page__heading">
      <div><span className="eyebrow">My requests</span><h1>My events</h1><p>Event requests saved in this browser’s demo workspace.</p></div>
      <ButtonLink to={routes.customer.newRequest}>Create event</ButtonLink>
    </div>
    <div className="event-filters">
      <Input label="Search events" name="event-search" placeholder="Event name, type, or city" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select label="Status" name="event-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="Submitted">Submitted</option></Select>
      <Select label="Event type" name="event-type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All event types</option>{types.map((eventType) => <option key={eventType}>{eventType}</option>)}</Select>
      <Select label="Sort by date" name="event-sort" value={sort} onChange={(event) => setSort(event.target.value as 'soonest' | 'latest')}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></Select>
    </div>
    <div className="results-head"><p><strong>{filtered.length}</strong> of {events.length} requests</p></div>
    {filtered.length ? <div className="customer-event-grid">{filtered.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title={events.length ? 'No events match these filters' : 'Your event list is ready when you are'} description={events.length ? 'Try a different search or filter.' : 'Create your first demo event to keep your plans together.'} action={events.length ? <Button variant="secondary" onClick={() => { setQuery(''); setStatus('all'); setType('all') }}>Clear filters</Button> : <ButtonLink to={routes.customer.newRequest}>Create your first event</ButtonLink>} />}
    <p className="demo-storage-note">Events and profile details persist in this browser only. No providers are invited and no booking or payment is made.</p>
  </section>

  const activeEvents = events.filter((event) => event.status === 'Submitted')
  const upcoming = activeEvents.filter((event) => event.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
  const recent = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
  const customerName = auth.status === 'authenticated' ? auth.customer?.fullName ?? profile?.fullName ?? 'there' : 'there'

  return <section className="customer-page">
    <header className="customer-page__heading">
      <div><span className="eyebrow">Customer workspace · demo</span><h1>Welcome, {customerName.split(' ')[0]}.</h1><p>Keep your gathering details together as your plans take shape.</p></div>
      <ButtonLink to={routes.customer.newRequest}>Create an event <span aria-hidden="true">→</span></ButtonLink>
    </header>

    {events.length === 0 ? <div className="dashboard-empty">
      <span className="eyebrow">A thoughtful start</span>
      <h2>Your first event begins with a few details.</h2>
      <p>Tell us when and where you’re gathering, then add each service you’re considering. This demo keeps those details together; it does not invite providers.</p>
      <div className="dashboard-empty__steps"><span>01 · Share your event</span><span>02 · Add service needs</span><span>03 · Review your plan</span></div>
      <ButtonLink to={routes.customer.newRequest}>Create your first event</ButtonLink>
    </div> : <>
      <div className="stat-grid">
        <SummaryCard label="Total event requests" value={events.length} detail="Saved in your demo workspace" />
        <SummaryCard label="Active events" value={activeEvents.length} detail="Submitted requests in demo data" />
        <SummaryCard label="Awaiting responses" value={0} detail="No provider invitations are sent in demo mode" />
        <SummaryCard label="With quotations" value={0} detail="Quotations are not connected in this preview" />
      </div>

      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <div className="dashboard-panel__head"><div><h2>Upcoming events</h2><p>Your next saved requests</p></div><Link className="section-link" to={routes.customer.requests}>See all events <span aria-hidden="true">→</span></Link></div>
          {upcoming.length ? <div className="table-scroll"><table className="data-table">
            <thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">City</th><th scope="col">Guests</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{upcoming.map((event) => <EventRow key={event.id} event={event} />)}</tbody>
          </table></div> : <p className="dashboard-subtle">No upcoming event dates in your saved requests.</p>}
        </section>

        <aside className="dashboard-side">
          <Card className="profile-card">
            <span className="eyebrow">Your profile</span>
            <h2>{profile?.fullName ?? customerName}</h2>
            <p>{profile ? `${profile.locality}, ${profile.city}, ${profile.state} · ${profile.phone}` : 'Your contact and location details are saved for this demo.'}</p>
            <div className="completion-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><span /></div>
            <small>Profile complete</small>
          </Card>
          <Card className="quick-card">
            <span className="eyebrow">Quick links</span>
            <Link to={routes.customer.requests}>View all my events <span aria-hidden="true">→</span></Link>
            <Link to={routes.services}>Explore service categories <span aria-hidden="true">→</span></Link>
            <Link to={routes.customer.quotes}>Compare quotations <span aria-hidden="true">→</span></Link>
            <button className="text-link customer-logout" type="button" onClick={() => actions.logout().then(() => navigate(routes.home))}>Log out of demo account</button>
          </Card>
        </aside>
      </div>

      <section className="dashboard-panel">
        <div className="dashboard-panel__head"><div><h2>Recently created</h2><p>The latest requests in your workspace</p></div></div>
        <div className="dashboard-activity">
          {recent.map((event) => <Link key={event.id} to={customerEventPath(event.id)}>
            <span>{event.name}</span>
            <small>Created {new Date(event.createdAt).toLocaleDateString()} · {event.type}</small>
            <Badge tone="accent">{event.status}</Badge>
          </Link>)}
        </div>
      </section>
    </>}
    <p className="demo-storage-note">Events and profile details persist in this browser only. No providers are invited and no booking or payment is made.</p>
  </section>
}
