import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { useAuth } from '../../app/auth/useAuth'
import { networkApi } from '../../shared/api/backend/ecosystem'
import { Avatar, Badge, Button, ButtonLink, Card, Input, Spinner } from '../../shared/ui'
import { Icon } from '../../shared/ui/Icon'

const CATEGORIES = [
  { id: 'ALL', label: 'All Specialists' },
  { id: 'CATERING', label: 'Catering' },
  { id: 'PHOTOGRAPHY', label: 'Photography' },
  { id: 'VENUE', label: 'Venues' },
  { id: 'DJ', label: 'DJs & Music' },
  { id: 'DECOR', label: 'Decor & Floral' },
  { id: 'PLANNER', label: 'Event Managers' },
]

export function HomepageMyNetworksPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [providers, setProviders] = useState<
    Array<{
      id: string
      name: string
      username: string | null
      avatar: string | null
      business_name: string
      category: string
      city: string
      is_connected: boolean
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())

  const isAuthenticated = auth.status === 'authenticated'
  const isProvider = isAuthenticated && (auth.user.accountType === 'PROVIDER' || auth.roles?.includes('PROVIDER'))
  const chatPath = isProvider ? routes.provider.customerNetwork : routes.customer.network

  async function fetchProviders(q: string = search, cat: string = category) {
    try {
      setLoading(true)
      const data = await networkApi.searchProviders(q, cat === 'ALL' ? undefined : cat)
      setProviders(data)
      const initiallyConnected = new Set(data.filter((p) => p.is_connected).map((p) => p.id))
      setConnectedIds(initiallyConnected)
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProviders(search, category)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, category])

  async function handleConnect(providerId: string) {
    if (!isAuthenticated) {
      navigate(`${routes.auth.login}?from=${encodeURIComponent(routes.myNetworks)}`, {
        state: { from: routes.myNetworks },
      })
      return
    }

    if (auth.user.id === providerId) {
      alert('This is your own profile.')
      return
    }

    try {
      setConnectingId(providerId)
      await networkApi.connect(providerId)
      setConnectedIds((prev) => new Set([...prev, providerId]))
    } catch (err: any) {
      alert(err.message || 'Failed to connect')
    } finally {
      setConnectingId(null)
    }
  }

  return (
    <div className="homepage-networks-page" style={{ padding: '2.5rem 1rem 5rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Hero section */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: 'var(--color-orange, #e05822)',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          Specialist Directory & Direct Network
        </span>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, margin: '0 0 1rem', fontFamily: 'serif', lineHeight: 1.15 }}>
          Connect directly with top event professionals.
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--color-fg-muted)', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Build your trusted circle of caterers, photographers, managers, and entertainers.
          Search by @username, view verified portfolios, and chat in your private workspace.
        </p>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '600px', margin: '0 auto' }}>
          <Input
            label=""
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by @username, business name, or city…"
            style={{ width: '100%', fontSize: '1rem' }}
          />
          {search && (
            <Button variant="secondary" onClick={() => setSearch('')}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '2.5rem',
        }}
      >
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={category === cat.id ? 'primary' : 'secondary'}
            onClick={() => setCategory(cat.id)}
            style={{ borderRadius: '24px', padding: '0.45rem 1.15rem' }}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Trust banner */}
      <div
        style={{
          background: 'var(--color-bg-subtle)',
          borderRadius: '16px',
          padding: '1.25rem 2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Icon name="shieldCheck" size={25} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Verified Credentials</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>Background-checked event professionals</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Icon name="message" size={25} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Direct Messaging</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>Communicate & share files with zero barriers</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Icon name="award" size={25} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Zero Agency Markup</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-fg-muted)' }}>Pay transparent, line-item supplier rates</span>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Spinner label="Searching verified specialists…" />
        </div>
      ) : providers.length === 0 ? (
        <Card style={{ padding: '3.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No specialists found</h3>
          <p style={{ color: 'var(--color-fg-muted)', marginBottom: '1.5rem' }}>
            We could not find any active suppliers matching &ldquo;{search}&rdquo;. Try another name or category.
          </p>
          <Button variant="secondary" onClick={() => { setSearch(''); setCategory('ALL') }}>
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {providers.map((p) => {
            const isConnected = connectedIds.has(p.id)
            const isConnecting = connectingId === p.id

            return (
              <Card
                key={p.id}
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <Avatar name={p.business_name || p.name} size="lg" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                          {p.business_name}
                        </h3>
                        <Badge tone="success">Verified</Badge>
                      </div>

                      {p.username && (
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          <Link
                            to={routes.providerDetail.replace(':providerId', p.username || p.id)}
                            style={{ color: 'var(--color-orange, #e05822)', textDecoration: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            title={`View @${p.username}'s portfolio`}
                          >
                            @{p.username}
                          </Link>
                        </div>
                      )}

                      <div style={{ fontSize: '0.85rem', color: 'var(--color-fg-muted)', marginTop: '0.2rem' }}>
                        {p.city ? <><Icon name="mapPin" size={14} /> {p.city}</> : 'National Service'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <Badge tone="neutral">{p.category}</Badge>
                    <Badge tone="accent">Direct Escrow Ready</Badge>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <Link
                    to={routes.providerDetail.replace(':providerId', p.id)}
                    style={{ flex: 1 }}
                  >
                    <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                      Portfolio
                    </Button>
                  </Link>

                  {isAuthenticated && auth.user.id === p.id ? (
                    <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                      Your profile
                    </span>
                  ) : isConnected ? (
                    <ButtonLink
                      size="sm"
                      to={`${chatPath}?user=${p.id}`}
                      style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
                    >
                      <Icon name="circleCheck" size={14} /> Chat in App
                    </ButtonLink>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isConnecting}
                      onClick={() => void handleConnect(p.id)}
                      style={{ flex: 1 }}
                    >
                      {isConnecting ? 'Connecting…' : '+ Add to Network'}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HomepageMyNetworksPage
