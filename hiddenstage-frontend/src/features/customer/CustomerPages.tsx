import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useMatches } from 'react-router-dom'
import { Award, Calendar, CircleCheck, Folder, Sparkles } from 'kubai-icons-react'
import { customerEventPath, routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions, useTheme } from '../../app/auth/useAuth'
import { Avatar, Button, ButtonLink, Card, EmptyState, ErrorState, Input, Select, Spinner } from '../../shared/ui'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { profilesApi } from '../../shared/api/backend/profiles'
import { sessionApi } from '../../shared/api/backend/session'
import { resolveMediaUrl } from '../../shared/api/client'
import { useApiData } from '../../shared/api/backend/useApiData'
import { formatDate, formatPaise, formatShortDate, formatTimeRange } from '../../shared/api/backend/format'
import type { ApiEventListItem, ApiQuotation } from '../../shared/api/backend/types'
import { EventStatusBadge } from '../marketplace/MarketplaceUI'
import './customer.css'

type Page = 'customerHome' | 'customerRequests' | 'customerSettings'

export default function CustomerPages() {
  const auth = useAuth()
  const location = useLocation()
  const page = (useMatches().at(-1)?.handle as { page?: Page } | undefined)?.page ?? 'customerHome'
  if (page === 'customerRequests') return <RequestsPage />
  if (page === 'customerSettings') {
    if (auth.status === 'authenticated' && auth.user?.accountType === 'PROVIDER' && location.pathname === routes.app.settings) {
      return <Navigate to={routes.provider.settings} replace />
    }
    return <SettingsPage />
  }
  return <DashboardPage />
}

function useOrganiserData() {
  const events = useApiData(() => eventsApi.list(), [], { key: 'customer-events' })
  const commitments = useApiData(() => marketplaceApi.listCommitments(), [], { key: 'customer-commitments' })
  const quotations = useApiData(async () => {
    const list = await marketplaceApi.listCustomerQuotations().catch(() => [])
    return list.map((quotation) => ({
      quotation,
      event: {
        id: quotation.event,
        name: quotation.event_name,
        event_date: quotation.event_date ?? '',
      },
    }))
  }, [], { key: 'customer-quotations' })
  const profile = useApiData(() => profilesApi.getCustomerProfile(), [], { key: 'customer-profile' })
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
    <div className="dashboard-welcome-hero">
      <div className="dashboard-welcome-hero__body">
        <span className="dashboard-welcome-hero__tag">
          <Sparkles size={14} color="#f8b6c1" />
          <span>Event Concierge</span>
        </span>
        <h1>
          Welcome back{user ? `, ${firstName(user.fullName)}` : ''}.
          <br />
          Make room for your next <em>celebration.</em>
        </h1>
        <p>{openRequests.length
          ? `${openRequests.length} request${openRequests.length === 1 ? ' is' : 's are'} open for quotes. Compare transparent supplier bids with zero agency markup.`
          : 'Describe your occasion, dates and services to receive direct quotations from verified professionals across your area.'}</p>
        <div className="dashboard-welcome-hero__chips">
          <span><CircleCheck size={13} color="#f8b6c1" /> Verified specialists</span>
          <span><CircleCheck size={13} color="#f8b6c1" /> 0% agency markup</span>
          <span><CircleCheck size={13} color="#f8b6c1" /> Direct quotation comparison</span>
        </div>
      </div>
      <div className="dashboard-welcome-hero__actions">
        <ButtonLink to={routes.customer.newRequest} size="lg" className="button--saffron-hero">Create a request →</ButtonLink>
      </div>
    </div>

    {loading && <Spinner label="Loading your workspace" />}

    {!loading && <div className="stat-grid">
      <Card className="dashboard-stat">
        <div className="dashboard-stat__top">
          <span className="stat-icon-wrap"><Calendar size={20} color="#ff7a00" /></span>
          <span className="dashboard-stat__label">Open requests</span>
        </div>
        <strong>{openRequests.length}</strong>
        <p>Requests matching professionals can quote on.</p>
      </Card>
      <Card className="dashboard-stat">
        <div className="dashboard-stat__top">
          <span className="stat-icon-wrap"><Sparkles size={20} color="#f8b6c1" /></span>
          <span className="dashboard-stat__label">Quotations received</span>
        </div>
        <strong>{quotes.length}</strong>
        <p>{quotes.length ? 'Compare totals, scope and validity.' : waitingQuotes ? 'Invite professionals to speed this up.' : 'No quotes yet.'}</p>
      </Card>
      <Card className="dashboard-stat">
        <div className="dashboard-stat__top">
          <span className="stat-icon-wrap"><Award size={20} color="#ff7a00" /></span>
          <span className="dashboard-stat__label">Active commitments</span>
        </div>
        <strong>{activeCommitments.length}</strong>
        <p>Suppliers chosen for specific services.</p>
      </Card>
      <Card className="dashboard-stat">
        <div className="dashboard-stat__top">
          <span className="stat-icon-wrap"><Folder size={20} color="#6b3e26" /></span>
          <span className="dashboard-stat__label">Drafts</span>
        </div>
        <strong>{events.filter((event) => event.status === 'DRAFT').length}</strong>
        <p>Unpublished requests only you can see.</p>
      </Card>
    </div>}

    {!loading && events.length === 0 && <div className="dashboard-empty">
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
  const data = useApiData(() => eventsApi.list(), [], { key: 'customer-events' })
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
  const authActions = useAuthActions()
  const currentTheme = useTheme()
  const user = auth.status === 'authenticated' ? auth.user : undefined
  const profile = useApiData(() => profilesApi.getCustomerProfile(), [])

  // Identity Form State
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<{ available?: boolean; message?: string }>({})
  const [savingDetails, setSavingDetails] = useState(false)
  const [detailsNotice, setDetailsNotice] = useState('')
  const [detailsError, setDetailsError] = useState('')

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Location/Profile State
  const [values, setValues] = useState({ pinCode: '', locality: '', city: '', state: '', bio: '' })
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setUsername(user.username || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setAvatarPreview(user.avatarUrl || null)
    }
  }, [user])

  useEffect(() => {
    if (!profile.data) return
    setValues({
      pinCode: profile.data.pin_code,
      locality: profile.data.locality,
      city: profile.data.city,
      state: profile.data.state,
      bio: profile.data.bio || '',
    })
  }, [profile.data])

  // Debounced username availability check
  useEffect(() => {
    const clean = username.trim().replace(/^@/, '')
    if (!clean || clean === user?.username) {
      setUsernameStatus({})
      return
    }
    const timer = setTimeout(async () => {
      try {
        setUsernameChecking(true)
        const res = await sessionApi.checkUsername(clean)
        setUsernameStatus(res)
      } catch {
        setUsernameStatus({ available: false, message: 'Could not check username.' })
      } finally {
        setUsernameChecking(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [username, user?.username])

  async function handleAvatarUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size must be 5MB or less.')
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      setAvatarError('Only JPG, PNG, and WebP images are allowed.')
      return
    }
    setAvatarError('')
    setUploadingAvatar(true)
    const localUrl = URL.createObjectURL(file)
    setAvatarPreview(localUrl)
    try {
      const updatedUser = await sessionApi.uploadAvatar(file)
      const refreshed = await authActions.refresh(updatedUser)
      const newUrl = refreshed?.avatarUrl || (updatedUser.avatar_url ? resolveMediaUrl(updatedUser.avatar_url) : null)
      if (newUrl) {
        setAvatarPreview(`${newUrl}${newUrl.includes('?') ? '&' : '?'}t=${Date.now()}`)
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to upload photo.')
      setAvatarPreview(user?.avatarUrl || null)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true)
    setAvatarError('')
    try {
      const updatedUser = await sessionApi.removeAvatar()
      setAvatarPreview(null)
      await authActions.refresh(updatedUser)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to remove photo.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleSaveDetails(e: FormEvent) {
    e.preventDefault()
    setSavingDetails(true)
    setDetailsError('')
    setDetailsNotice('')
    try {
      const cleanUsername = username.trim().replace(/^@/, '')
      await sessionApi.updateSettings({
        full_name: fullName.trim(),
        username: cleanUsername || undefined,
        email: email.trim(),
        phone: phone.trim(),
      })
      await authActions.refresh()
      setDetailsNotice('Account details updated successfully.')
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Could not update account details.')
    } finally {
      setSavingDetails(false)
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
      return
    }
    setSavingPassword(true)
    setPasswordError('')
    setPasswordNotice('')
    try {
      await sessionApi.changePassword(currentPassword, newPassword)
      setPasswordNotice('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSaveLocation(e: FormEvent) {
    e.preventDefault()
    setSavingLocation(true)
    setLocationError('')
    setLocationNotice('')
    try {
      await profilesApi.saveCustomerProfile({
        pin_code: values.pinCode,
        locality: values.locality,
        city: values.city,
        state: values.state,
        bio: values.bio.trim() || undefined,
      })
      setLocationNotice('Profile and default location updated.')
      profile.reload()
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSavingLocation(false)
    }
  }

  return (
    <section className="customer-page">
      <div className="customer-page__heading">
        <div>
          <span className="eyebrow eyebrow--accent">ACCOUNT</span>
          <h1>Account Settings</h1>
          <p>Manage your profile picture, username identity, sign-in details, and display preferences.</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-main" style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Profile Picture Card */}
          <Card className="detail-card">
            <h2>Profile Picture</h2>
            <p className="detail-card__hint">Your profile photo appears across conversations, proposals, and your account menu.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  position: 'relative',
                  width: '5.5rem',
                  height: '5.5rem',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--color-rose-soft)',
                  border: '3px solid var(--color-orange)',
                  boxShadow: '0 4px 14px rgba(255, 122, 0, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user?.fullName ?? 'Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Avatar name={user?.fullName ?? 'Account'} size="lg" />
                )}
                {uploadingAvatar && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    …
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleAvatarUpload(f)
                  }}
                />
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? 'Replace Photo' : 'Upload Photo'}
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      size="sm"
                      variant="quiet"
                      disabled={uploadingAvatar}
                      onClick={() => void handleRemoveAvatar()}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  JPG, PNG or WebP under 5MB. Circular preview automatically applied.
                </span>
                {avatarError && <span style={{ fontSize: '0.78rem', color: 'var(--color-danger)' }}>{avatarError}</span>}
              </div>
            </div>
          </Card>

          {/* Account Identity Form */}
          <Card className="detail-card">
            <h2>Personal Information &amp; Username</h2>
            <p className="detail-card__hint">Your username lets specialists identify you cleanly on HiddenStage.</p>

            <form onSubmit={handleSaveDetails} className="customer-form" style={{ marginTop: '1rem' }}>
              <div className="field">
                <label className="field__label" htmlFor="settings-username">
                  Username
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span
                    style={{
                      padding: '0.65rem 0.8rem',
                      background: 'var(--color-tint)',
                      border: '1px solid var(--color-line)',
                      borderRight: 'none',
                      borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                      color: 'var(--color-muted)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    @
                  </span>
                  <input
                    id="settings-username"
                    className="control"
                    style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
                    value={username.replace(/^@/, '')}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    placeholder="your_unique_username"
                    maxLength={50}
                  />
                </div>
                {usernameChecking ? (
                  <span className="field__hint">Checking availability…</span>
                ) : usernameStatus.message ? (
                  <span
                    className={usernameStatus.available ? 'field__hint' : 'field__error'}
                    style={{ color: usernameStatus.available ? 'var(--color-success)' : undefined }}
                  >
                    {usernameStatus.available ? '✓ ' : '✗ '}
                    {usernameStatus.message}
                  </span>
                ) : (
                  <span className="field__hint">Lowercase letters, numbers, underscores and periods allowed.</span>
                )}
              </div>

              <Input
                label="Full Name"
                name="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Mobile Number"
                name="phone"
                placeholder="10-digit Indian mobile (e.g. 9876543210)"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />

              {detailsError && <p className="customer-error" role="alert">{detailsError}</p>}
              {detailsNotice && <p className="form-success" role="status">{detailsNotice}</p>}

              <div className="customer-form__actions">
                <Button type="submit" disabled={savingDetails}>
                  {savingDetails ? 'Saving…' : 'Save Account Details'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Customer Profile & Default Location */}
          <Card className="detail-card">
            <h2>Default Location &amp; Bio</h2>
            <p className="detail-card__hint">Pre-fills location information when submitting new service requests.</p>
            {profile.loading ? (
              <Spinner label="Loading your profile" />
            ) : (
              <form className="customer-form" onSubmit={handleSaveLocation} style={{ marginTop: '1rem' }}>
                <Input
                  label="Short Bio"
                  name="bio"
                  placeholder="Tell specialists about your preferred event styles or requirements…"
                  value={values.bio}
                  onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
                />
                <Input
                  label="PIN Code"
                  name="pinCode"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={values.pinCode}
                  onChange={(e) => setValues((v) => ({ ...v, pinCode: e.target.value.replace(/\D/g, '') }))}
                />
                <Input
                  label="Locality"
                  name="locality"
                  required
                  minLength={2}
                  value={values.locality}
                  onChange={(e) => setValues((v) => ({ ...v, locality: e.target.value }))}
                />
                <div className="event-form-grid">
                  <Input
                    label="City"
                    name="city"
                    required
                    minLength={2}
                    value={values.city}
                    onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
                  />
                  <Input
                    label="State"
                    name="state"
                    required
                    minLength={2}
                    value={values.state}
                    onChange={(e) => setValues((v) => ({ ...v, state: e.target.value }))}
                  />
                </div>
                {locationError && <p className="customer-error" role="alert">{locationError}</p>}
                {locationNotice && <p className="form-success" role="status">{locationNotice}</p>}
                <div className="customer-form__actions">
                  <Button type="submit" disabled={savingLocation}>
                    {savingLocation ? 'Saving…' : 'Save Default Location'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <aside className="settings-side" style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Theme Preferences Card */}
          <Card className="detail-card">
            <h2>Theme Preference</h2>
            <p className="detail-card__hint">Select your preferred viewing mode across HiddenStage.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => authActions.setTheme('light')}
                style={{
                  padding: '0.85rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  border: currentTheme === 'light' ? '2px solid var(--color-orange)' : '1px solid var(--color-line)',
                  background: '#FFF9FC',
                  color: '#1a1215',
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: currentTheme === 'light' ? '0 4px 14px rgba(255, 122, 0, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>🌸</div>
                <strong style={{ display: 'block', fontSize: '0.85rem' }}>Light Pink</strong>
                <span style={{ fontSize: '0.7rem', color: '#705860' }}>#FFF9FC Canvas</span>
              </button>

              <button
                type="button"
                onClick={() => authActions.setTheme('dark')}
                style={{
                  padding: '0.85rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  border: currentTheme === 'dark' ? '2px solid var(--color-orange)' : '1px solid var(--color-line)',
                  background: '#111019',
                  color: '#F4F0F8',
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: currentTheme === 'dark' ? '0 4px 14px rgba(255, 122, 0, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>🌙</div>
                <strong style={{ display: 'block', fontSize: '0.85rem' }}>Dark Mode</strong>
                <span style={{ fontSize: '0.7rem', color: '#A8A0B8' }}>#111019 Canvas</span>
              </button>
            </div>
          </Card>

          {/* Password & Security Card */}
          <Card className="detail-card">
            <h2>Password &amp; Security</h2>
            <p className="detail-card__hint">Protect your account with a secure password.</p>
            <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block' }}>Password</span>
                <strong style={{ fontSize: '1.1rem', letterSpacing: '0.15em' }}>••••••••••••</strong>
              </div>

              {!showPasswordForm ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Change Password
                </Button>
              ) : (
                <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '0.65rem', marginTop: '0.5rem' }}>
                  <Input
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    label="New Password"
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {passwordError && <p className="customer-error" role="alert">{passwordError}</p>}
                  {passwordNotice && <p className="form-success" role="status">{passwordNotice}</p>}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Button type="submit" size="sm" disabled={savingPassword}>
                      {savingPassword ? 'Updating…' : 'Update Password'}
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => setShowPasswordForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>

          <Card className="detail-card">
            <h2>Privacy &amp; Data Sharing</h2>
            <p className="detail-card__hint">
              Event specialists only see your event requirements and city. Direct contact details are shared only when you confirm quotations.
            </p>
            <Link className="text-link" to={routes.privacy}>
              Read Privacy Policy →
            </Link>
          </Card>
        </aside>
      </div>
    </section>
  )
}
