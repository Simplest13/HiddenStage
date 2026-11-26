import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { providerDetailPath, routes, serviceCategoryPath } from '../../app/routes/routePaths'
import { Badge, Button, ButtonLink, Card, Input, Select } from '../../shared/ui/primitives'
import { EmptyState, Spinner } from '../../shared/ui/feedback'
import { Modal } from '../../shared/ui/overlays'
import { Breadcrumb } from '../../shared/ui/navigation'
import { categoryName, demoProviders, serviceCategories } from './data/catalog'
import { categoryIconName, providerInitials } from '../../shared/ui/monogram'
import { CategoryIcon } from '../../shared/ui/CategoryIcon'
import { Icon } from '../../shared/ui/Icon'
import { Clock, MapPin, Phone, ShieldCheck } from 'kubai-icons-react'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { networkApi } from '../../shared/api/backend/ecosystem'
import { useApiData } from '../../shared/api/backend/useApiData'
import { formatPaise } from '../../shared/api/backend/format'
import { useAuth } from '../../app/auth/useAuth'
import { useToast } from '../../shared/ui/useToast'
import type {
  ApiPortfolioItem,
  ApiProviderDetail,
  ApiProviderService,
  ApiPublicDirectoryProvider,
  ProviderKind,
} from '../../shared/api/backend/types'
import './discovery.css'

export function ServiceDiscoveryPage() {
  const { categorySlug } = useParams()
  const navigate = useNavigate()
  const selectedCategory = categorySlug ?? ''
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const items = useMemo(() => serviceCategories.filter((category) => {
    const hasCoverage = !location || demoProviders.some((provider) => provider.categories.includes(category.slug) && `${provider.locality} ${provider.city} ${provider.pinCode} ${provider.coverage.join(' ')}`.toLowerCase().includes(location.toLowerCase()))
    return (!selectedCategory || category.slug === selectedCategory) && hasCoverage && `${category.name} ${category.description} ${category.sampleOffering}`.toLowerCase().includes(search.toLowerCase())
  }), [selectedCategory, search, location])

  return <div className="listing-page">
    <header className="listing-hero">
      <div className="wrap">
        <Breadcrumb items={[{ label: 'Home', href: routes.home }, { label: 'Services' }]} />
        <span className="eyebrow">Browse event services</span>
        <h1>{selectedCategory ? categoryName(selectedCategory) : 'Explore event services'}</h1>
        <p>From the table to the soundtrack, find the service categories that shape your gathering. Every listing in this preview is fictional demo content.</p>
      </div>
    </header>
    <div className="listing-search">
      <div className="wrap listing-search__inner">
        <Input label="Search services" name="service-search" placeholder="Try photography or catering" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select label="Category" name="service-category" value={selectedCategory} onChange={(event) => navigate(event.target.value ? serviceCategoryPath(event.target.value) : routes.services)}>
          <option value="">All categories</option>
          {serviceCategories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </Select>
        <Input label="Location" name="service-location" placeholder="City or PIN code" value={location} onChange={(event) => setLocation(event.target.value)} />
      </div>
    </div>
    <div className="wrap listing-body">
      <div className="results-head">
        <div>
          <h2>{items.length} service {items.length === 1 ? 'category' : 'categories'}</h2>
          {location && <p className="results-head__note">Showing categories with demo coverage matching “{location}”. <Link to={`${routes.providers}?location=${encodeURIComponent(location)}`}>See matching professionals</Link>.</p>}
        </div>
        <Link className="section-link" to={routes.providers}>Browse professionals <Icon name="arrowRight" size={14} /></Link>
      </div>
      {items.length ? <div className="service-grid">
        {items.map((category, index) => <article className="service-tile" key={category.slug}>
          <div className={`service-tile__media service-tile__media--${index % 5}`} aria-hidden="true">
            <div className="service-tile__icon-wrap">
              <CategoryIcon slug={category.slug} size={36} color="#ffffff" />
            </div>
          </div>
          <div className="service-tile__body">
            <h2>{category.name}</h2>
            <p>{category.description}</p>
            <span className="service-tile__sample">Example: {category.sampleOffering}</span>
            <ButtonLink to={`${routes.providers}?category=${category.slug}${location ? `&location=${encodeURIComponent(location)}` : ''}`} variant="secondary" size="sm">Explore demo providers</ButtonLink>
          </div>
        </article>)}
      </div> : <EmptyState title="No categories match" description="Try a different search or clear the category filter." action={<Button type="button" variant="secondary" onClick={() => { setSearch(''); setLocation(''); if (selectedCategory) navigate(routes.services) }}>Clear filters</Button>} />}
      <p className="demo-note">All listings and examples on this page are fictional demo content. No service provider is currently bookable here.</p>
    </div>
  </div>
}

function toVideoEmbedUrl(url: string): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/)
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`
  }
  return null
}

const kindBadges: Record<ProviderKind, string> = {
  MANAGER: 'Event Management / Agency',
  INDIVIDUAL_SERVICE_PROVIDER: 'Individual Service Provider',
  ASSOCIATED_SERVICE_PROVIDER: 'Associated Service Provider',
  TALENT: 'Talent & Performer',
  WORKER: 'Event Operations Crew',
}

function CoverageLocationsDisplay({
  locations,
  fallbackCount,
}: {
  locations: string[]
  fallbackCount?: number
}) {
  const [expanded, setExpanded] = useState(false)

  if (!locations || locations.length === 0) {
    if (fallbackCount && fallbackCount > 0) {
      return (
        <span className="directory-card__coverage">
          <Icon name="mapPin" size={13} style={{ flexShrink: 0, color: 'var(--color-orange)' }} />
          <span>Covers {fallbackCount} location{fallbackCount === 1 ? '' : 's'}</span>
        </span>
      )
    }
    return (
      <span className="directory-card__coverage">
        <Icon name="mapPin" size={13} style={{ flexShrink: 0, color: 'var(--color-orange)' }} />
        <span>Location on enquiry</span>
      </span>
    )
  }

  const MAX_VISIBLE = 3
  const isOverflow = locations.length > MAX_VISIBLE
  const visible = expanded ? locations : locations.slice(0, MAX_VISIBLE)
  const text = visible.join(', ') + (!expanded && isOverflow ? '...' : '')

  return (
    <span className="directory-card__coverage" title={locations.join(', ')}>
      <Icon name="mapPin" size={13} style={{ flexShrink: 0, color: 'var(--color-orange)' }} />
      <span>
        Covers {text}
        {isOverflow && (
          <button
            type="button"
            className="directory-card__show-more"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? ' [show less]' : ' [show more]'}
          </button>
        )}
      </span>
    </span>
  )
}

function PublicProviderCard({
  provider,
  isInitiallyConnected,
  onConnected,
}: {
  provider: ApiPublicDirectoryProvider
  isInitiallyConnected?: boolean
  onConnected?: (id: string) => void
}) {
  const auth = useAuth()
  const user = auth.status === 'authenticated' ? auth.user : null
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(Boolean(isInitiallyConnected))

  useEffect(() => {
    if (isInitiallyConnected) setConnected(true)
  }, [isInitiallyConnected])

  const locationStr = [provider.locality, provider.city, provider.pin_code].filter(Boolean).join(', ')

  const coverageList: string[] = useMemo(() => {
    if (provider.coverage_locations && provider.coverage_locations.length > 0) {
      return provider.coverage_locations
    }
    if (provider.coverage_areas && provider.coverage_areas.length > 0) {
      const areas = provider.coverage_areas
        .map((a) => a.locality || a.city || a.pin_code)
        .filter(Boolean)
      if (areas.length > 0) return Array.from(new Set(areas))
    }
    const loc = provider.locality || provider.city || provider.pin_code
    return loc ? [loc] : []
  }, [provider])

  async function handleAddToNetwork(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      navigate(`${routes.auth.login}?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }

    if (user.id === provider.id) {
      showToast('This is your own profile.', 'info')
      return
    }

    setConnecting(true)
    try {
      await networkApi.connect(provider.id, provider.username || undefined, 'Connected from Provider Directory')
      setConnected(true)
      onConnected?.(provider.id)
      showToast(`Added ${provider.display_name} to your network!`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add to network.'
      showToast(msg, 'error')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <article className="directory-card">
      <div className="directory-card__media" style={{ background: provider.cover_image ? `url(${provider.cover_image}) center/cover` : undefined }}>
        {provider.logo ? (
          <img src={provider.logo} alt={provider.display_name} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
        ) : (
          <span className="directory-card__monogram">{providerInitials(provider.display_name)}</span>
        )}
        <span className="directory-card__chip">{kindBadges[provider.kind] || provider.kind}</span>
      </div>
      <div className="directory-card__body">
        <div className="directory-card__top">
          <div>
            <h2><Link to={providerDetailPath(provider.username || provider.id)}>{provider.display_name}</Link></h2>
            {locationStr && <p className="directory-card__location">{locationStr}</p>}
          </div>
          <Badge tone={provider.verification_status === 'VERIFIED' ? 'success' : 'neutral'}>
            {provider.verification_status === 'VERIFIED' ? 'Verified' : 'Active'}
          </Badge>
        </div>
        {provider.headline && <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-burgundy)', margin: '0' }}>{provider.headline}</p>}
        <p className="directory-card__description">{provider.description}</p>
        <div className="directory-card__tags">
          {provider.categories.map((code) => <Badge key={code}>{categoryName(code) || code}</Badge>)}
        </div>
        <div className="directory-card__footer">
          <div className="directory-card__footer-meta">
            {provider.starting_price_paise ? (
              <div className="directory-card__price">
                Starting from {formatPaise(provider.starting_price_paise)}
              </div>
            ) : null}
            <CoverageLocationsDisplay locations={coverageList} fallbackCount={provider.coverage_count} />
          </div>
          <div className="directory-card__actions">
            <button
              type="button"
              className={`button button--sm directory-card__network-btn ${connected ? 'button--secondary directory-card__network-btn--connected' : 'button--primary'}`}
              disabled={connected || connecting}
              onClick={handleAddToNetwork}
            >
              {connecting ? (
                <>Connecting…</>
              ) : connected ? (
                <><Icon name="circleCheck" size={13} /> In Network</>
              ) : (
                <>+ Add to my network</>
              )}
            </button>
            <ButtonLink to={providerDetailPath(provider.username || provider.id)} variant="secondary" size="sm">
              View Profile <Icon name="arrowRight" size={14} />
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  )
}

function DemoProviderCard({ provider }: { provider: (typeof demoProviders)[number] }) {
  const { showToast } = useToast()
  return (
    <article className="directory-card">
      <div className="directory-card__media" aria-hidden="true">
        <span className="directory-card__monogram">{providerInitials(provider.name)}</span>
        <span className="directory-card__chip">Sample listing</span>
      </div>
      <div className="directory-card__body">
        <div className="directory-card__top">
          <div>
            <h2><Link to={providerDetailPath(provider.id)}>{provider.name}</Link></h2>
            <p className="directory-card__location">{provider.locality}, {provider.city} · {provider.pinCode}</p>
          </div>
          <Badge tone={provider.verificationStatus === 'approved' ? 'success' : 'neutral'}>Verified sample</Badge>
        </div>
        <p className="directory-card__description">{provider.description}</p>
        <div className="directory-card__tags">
          {provider.categories.map((slug) => <Badge key={slug}>{categoryName(slug)}</Badge>)}
        </div>
        <div className="directory-card__footer">
          <CoverageLocationsDisplay locations={provider.coverage} />
          <div className="directory-card__actions">
            <button
              type="button"
              className="button button--sm button--primary directory-card__network-btn"
              onClick={() => showToast('Demo profile: register or sign in to connect with live event professionals.', 'info')}
            >
              + Add to my network
            </button>
            <ButtonLink to={providerDetailPath(provider.id)} variant="secondary" size="sm">
              View Profile <Icon name="arrowRight" size={14} />
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ProviderDirectoryPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>()
  const navigate = useNavigate()
  const auth = useAuth()
  const user = auth.status === 'authenticated' ? auth.user : null
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [pin, setPin] = useState('')
  const [kindFilter, setKindFilter] = useState<string>(() => searchParams.get('kind') ?? '')
  const category = categorySlug || (searchParams.get('category') ?? '')
  const locality = searchParams.get('location') ?? ''

  const liveData = useApiData(
    () => marketplaceApi.listPublicProviders({ category, kind: kindFilter, location: locality, q: query }),
    [category, kindFilter, locality, query]
  )
  const liveProviders = liveData.data ?? []

  const connectionsData = useApiData(
    () => (user ? networkApi.listConnections().catch(() => []) : Promise.resolve([])),
    [user]
  )
  const [locallyConnectedIds, setLocallyConnectedIds] = useState<Set<string>>(new Set())

  const connectedIds = useMemo(() => {
    const set = new Set<string>(locallyConnectedIds)
      ; (connectionsData.data || []).forEach((c) => {
        if (c.provider) set.add(c.provider)
        if (c.provider_username) set.add(c.provider_username)
      })
    return set
  }, [connectionsData.data, locallyConnectedIds])

  const demoItems = useMemo(() => demoProviders.filter((p) => {
    return (!category || p.categories.includes(category)) &&
      (!locality || `${p.locality} ${p.city} ${p.coverage.join(' ')}`.toLowerCase().includes(locality.toLowerCase())) &&
      (!pin || p.pinCode.startsWith(pin)) &&
      `${p.name} ${p.description} ${p.city}`.toLowerCase().includes(query.toLowerCase())
  }), [category, locality, pin, query])

  const setLocality = (value: string) => {
    if (categorySlug) {
      const sp = new URLSearchParams()
      if (kindFilter) sp.set('kind', kindFilter)
      if (value) sp.set('location', value)
      if (query) sp.set('q', query)
      const qStr = sp.toString() ? `?${sp.toString()}` : ''
      navigate(`${serviceCategoryPath(categorySlug)}${qStr}`)
    } else {
      setSearchParams({ ...(category ? { category } : {}), ...(kindFilter ? { kind: kindFilter } : {}), ...(value ? { location: value } : {}), ...(query ? { q: query } : {}) })
    }
  }

  const setCategory = (value: string) => {
    if (categorySlug) {
      const sp = new URLSearchParams()
      if (kindFilter) sp.set('kind', kindFilter)
      if (locality) sp.set('location', locality)
      if (query) sp.set('q', query)
      const qStr = sp.toString() ? `?${sp.toString()}` : ''
      if (value) {
        navigate(`${serviceCategoryPath(value)}${qStr}`)
      } else {
        navigate(`${routes.providers}${qStr}`)
      }
    } else {
      setSearchParams({ ...(value ? { category: value } : {}), ...(kindFilter ? { kind: kindFilter } : {}), ...(locality ? { location: locality } : {}), ...(query ? { q: query } : {}) })
    }
  }

  const setKind = (value: string) => {
    setKindFilter(value)
    if (categorySlug) {
      const sp = new URLSearchParams()
      if (value) sp.set('kind', value)
      if (locality) sp.set('location', locality)
      if (query) sp.set('q', query)
      const qStr = sp.toString() ? `?${sp.toString()}` : ''
      navigate(`${serviceCategoryPath(categorySlug)}${qStr}`)
    } else {
      setSearchParams({ ...(category ? { category } : {}), ...(value ? { kind: value } : {}), ...(locality ? { location: locality } : {}), ...(query ? { q: query } : {}) })
    }
  }

  const clearAllFilters = () => {
    setQuery('')
    setLocality('')
    setPin('')
    setKindFilter('')
    if (categorySlug) {
      navigate(routes.providers)
    } else {
      setSearchParams({})
    }
  }

  const activeCategoryName = category ? (categoryName(category) || category) : ''

  return <div className="listing-page">
    <header className="listing-hero">
      <div className="wrap">
        <Breadcrumb
          items={
            activeCategoryName
              ? [
                { label: 'Home', href: routes.home },
                { label: 'Services', href: routes.services },
                { label: activeCategoryName },
              ]
              : [
                { label: 'Home', href: routes.home },
                { label: 'Event professionals' },
              ]
          }
        />
        <span className="eyebrow">{activeCategoryName ? `${activeCategoryName} Specialists` : 'Explore Event Specialists'}</span>
        <h1>{activeCategoryName ? `${activeCategoryName} Services & Professionals` : 'Meet Event Professionals & Agencies'}</h1>
        <p>
          {activeCategoryName
            ? `Discover verified ${activeCategoryName.toLowerCase()} specialists, catering teams, and event service providers for your celebration.`
            : 'Discover top-rated event managers, decor stylists, photographers, caterers, performers, and production specialists for your celebration.'}
        </p>
      </div>
    </header>
    <div className="listing-search">
      <div className="wrap listing-search__inner listing-search__inner--providers">
        <Input label="Search providers" name="provider-search" placeholder="Name, service, or specialization" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Input label="Locality or city" name="provider-locality" placeholder="e.g. Bengaluru, Indiranagar" value={locality} onChange={(event) => setLocality(event.target.value)} />
        <Input label="PIN code" name="provider-pin" inputMode="numeric" maxLength={6} placeholder="e.g. 560038" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} />
      </div>
    </div>
    <div className="wrap listing-layout">
      <aside className="filter-panel" aria-label="Filter professionals">
        <div className="filter-panel__head"><h2>Filter results</h2><button type="button" className="filter-clear" onClick={clearAllFilters}>Clear all</button></div>
        <fieldset className="filter-group">
          <legend>Professional Type</legend>
          <label className="filter-radio"><input type="radio" name="filter-kind" checked={!kindFilter} onChange={() => setKind('')} /><span>All types</span></label>
          <label className="filter-radio"><input type="radio" name="filter-kind" checked={kindFilter === 'MANAGER'} onChange={() => setKind('MANAGER')} /><span>Event Manager / Agency</span></label>
          <label className="filter-radio"><input type="radio" name="filter-kind" checked={kindFilter === 'INDIVIDUAL_SERVICE_PROVIDER'} onChange={() => setKind('INDIVIDUAL_SERVICE_PROVIDER')} /><span>Individual Specialist</span></label>
          <label className="filter-radio"><input type="radio" name="filter-kind" checked={kindFilter === 'TALENT'} onChange={() => setKind('TALENT')} /><span>Talent & Performer</span></label>
          <label className="filter-radio"><input type="radio" name="filter-kind" checked={kindFilter === 'WORKER'} onChange={() => setKind('WORKER')} /><span>Event Operations Crew</span></label>
        </fieldset>
        <fieldset className="filter-group">
          <legend>Service category</legend>
          <label className="filter-radio"><input type="radio" name="filter-category" checked={!category} onChange={() => setCategory('')} /><span>All services</span></label>
          {serviceCategories.map((item) => <label className="filter-radio" key={item.slug}>
            <input type="radio" name="filter-category" checked={category === item.slug} onChange={() => setCategory(item.slug)} />
            <span>{item.name}</span>
          </label>)}
        </fieldset>
        <div className="filter-group filter-group--note">
          <span className="eyebrow">Verified Coverage</span>
          <p>HiddenStage guarantees explicit location coverage. Professionals appear only when they explicitly serve the location you select.</p>
        </div>
      </aside>
      <section className="results-panel">
        <div className="results-head">
          <p><strong>{liveProviders.length > 0 ? liveProviders.length : demoItems.length}</strong> event {((liveProviders.length > 0 ? liveProviders.length : demoItems.length) === 1 ? 'professional' : 'professionals')}{locality ? ` in ${locality}` : ''}</p>
        </div>
        {liveData.loading ? (
          <Spinner label="Loading professionals..." />
        ) : liveProviders.length > 0 ? (
          <div className="directory-list">
            {liveProviders.map((provider) => (
              <PublicProviderCard
                key={provider.id}
                provider={provider}
                isInitiallyConnected={connectedIds.has(provider.id) || (Boolean(provider.username) && connectedIds.has(provider.username!))}
                onConnected={(id) => setLocallyConnectedIds((prev) => new Set([...prev, id]))}
              />
            ))}
          </div>
        ) : demoItems.length > 0 ? (
          <div className="directory-list">
            {demoItems.map((provider) => <DemoProviderCard key={provider.id} provider={provider} />)}
          </div>
        ) : (
          <EmptyState title="No professionals found" description="Adjust your search, service category, or location filters." action={<Button type="button" variant="secondary" onClick={clearAllFilters}>Clear filters</Button>} />
        )}
      </section>
    </div>
  </div>
}

type LightboxImage = { url: string; title: string; caption?: string }

function LightboxModal({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: LightboxImage[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate((currentIndex - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') onNavigate((currentIndex + 1) % images.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length, onClose, onNavigate])

  const current = images[currentIndex]
  if (!current) return null

  return (
    <div className="wmg-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo gallery lightbox">
      <div className="wmg-lightbox__header" onClick={(e) => e.stopPropagation()}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{currentIndex + 1} / {images.length}</span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.75rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
          aria-label="Close photo preview"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="wmg-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            type="button"
            className="wmg-lightbox__nav wmg-lightbox__nav--prev"
            onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        <img src={current.url} alt={current.title} />

        {images.length > 1 && (
          <button
            type="button"
            className="wmg-lightbox__nav wmg-lightbox__nav--next"
            onClick={() => onNavigate((currentIndex + 1) % images.length)}
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>

      <div className="wmg-lightbox__caption" onClick={(e) => e.stopPropagation()}>
        <strong>{current.title}</strong>
        {current.caption && <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{current.caption}</p>}
      </div>
    </div>
  )
}

const defaultCategoryImages: Record<string, string> = {
  spaces: '/categories/spaces.jpg',
  'food-and-drink': '/categories/food-and-drink.jpg',
  'music-and-performance': '/categories/music-and-performance.jpg',
  photography: '/categories/photography.jpg',
  videography: '/categories/videography.jpg',
  'decor-and-styling': '/categories/decor-and-styling.jpg',
  'dj-and-sound': '/categories/dj-and-sound.jpg',
  'event-hosting': '/categories/event-hosting.jpg',
  planning: '/categories/planning.jpg',
}

function resolveServiceBackground(
  service: ApiProviderService,
  portfolioItems: ApiPortfolioItem[] = []
): { bgUrl: string | null; isCompanyPortfolio: boolean; count: number } {
  const catKey = (service.category || '').toLowerCase().trim()
  const nameKey = (service.category_name || '').toLowerCase().trim()
  const titleKey = (service.title || '').toLowerCase().trim()

  const matching = portfolioItems.filter((item) => {
    if (!item.media || item.media_kind !== 'IMAGE') return false
    const itemCat = (item.category || '').toLowerCase().trim()
    return (
      itemCat === catKey ||
      (nameKey && itemCat === nameKey) ||
      (titleKey && itemCat === titleKey) ||
      (catKey && itemCat.replace(/-/g, '') === catKey.replace(/-/g, ''))
    )
  })

  if (matching.length > 0 && matching[0].media) {
    return {
      bgUrl: matching[0].media,
      isCompanyPortfolio: true,
      count: matching.length,
    }
  }

  const fallback = defaultCategoryImages[catKey] || null
  return {
    bgUrl: fallback,
    isCompanyPortfolio: false,
    count: 0,
  }
}

export function ProviderProfilePage() {
  const { providerId } = useParams()
  const auth = useAuth()
  const user = auth.status === 'authenticated' ? auth.user : null
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'about' | 'services' | 'projects' | 'photos' | 'videos' | 'team' | 'coverage' | 'reviews'>('overview')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [connectingNetwork, setConnectingNetwork] = useState(false)
  const [inNetwork, setInNetwork] = useState(false)
  const [messagingLoading, setMessagingLoading] = useState(false)

  const liveData = useApiData(
    () => marketplaceApi.providerDetail(providerId ?? ''),
    [providerId]
  )
  const liveProvider = liveData.data

  const connectionsData = useApiData(
    () => (user ? networkApi.listConnections().catch(() => []) : Promise.resolve([])),
    [user]
  )

  useEffect(() => {
    if (!liveProvider || !connectionsData.data) return
    const isConn = connectionsData.data.some((c) => {
      const pId = liveProvider.id
      const pUser = (liveProvider as any).user_id
      const pUsername = (liveProvider.username || '').toLowerCase()
      return (
        c.provider === pId ||
        (pUser && c.provider === pUser) ||
        (c.provider_username && c.provider_username.toLowerCase() === pUsername)
      )
    })
    setInNetwork(isConn)
  }, [liveProvider, connectionsData.data])

  const demoProvider = useMemo(() => {
    return demoProviders.find((item) => item.id === providerId)
  }, [providerId])

  const startingPrice = useMemo(() => {
    if (!liveProvider) return null
    const prices = (liveProvider.services || [])
      .map((s) => s.base_price_paise)
      .filter((price): price is number => price !== null && price > 0)
    return prices.length > 0 ? Math.min(...prices) : null
  }, [liveProvider])

  const photos: LightboxImage[] = useMemo(() => {
    if (!liveProvider) return []
    return (liveProvider.portfolio_items || [])
      .filter((item) => item.media_kind === 'IMAGE' && item.media)
      .map((item) => ({
        url: item.media!,
        title: item.title,
        caption: item.description,
      }))
  }, [liveProvider])

  const videos = useMemo(() => {
    if (!liveProvider) return []
    return (liveProvider.portfolio_items || []).filter((item) => item.media_kind === 'VIDEO' || item.external_url)
  }, [liveProvider])

  const [projectCategoryFilter, setProjectCategoryFilter] = useState<string>('ALL')

  const availableProjectCategories = useMemo(() => {
    if (!liveProvider) return []
    const cats = new Set<string>()
      ; (liveProvider.portfolio_items || []).forEach((item) => {
        if (item.category) cats.add(item.category)
      })
    return Array.from(cats)
  }, [liveProvider])

  const filteredProjects = useMemo(() => {
    if (!liveProvider) return []
    const all = liveProvider.portfolio_items || []
    if (projectCategoryFilter === 'ALL') return all
    return all.filter((item) => (item.category || '').toLowerCase().trim() === projectCategoryFilter.toLowerCase().trim())
  }, [liveProvider, projectCategoryFilter])

  if (liveData.loading) {
    return (
      <div className="wmg-page" style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Loading profile and showcase..." />
      </div>
    )
  }

  // Fallback to demo profile if not found in live database
  if (!liveProvider && demoProvider) {
    return (
      <div className="listing-page">
        <header className="profile-hero">
          <div className="wrap">
            <Breadcrumb items={[{ label: 'Home', href: routes.home }, { label: 'Professionals', href: routes.providers }, { label: demoProvider.name }]} />
            <div className="profile-hero__layout">
              <div className="profile-hero__media" aria-hidden="true"><span>{providerInitials(demoProvider.name)}</span><small><Icon name={categoryIconName(categoryName(demoProvider.categories[0] ?? ''))} size={16} /></small></div>
              <div className="profile-hero__copy">
                <span className="eyebrow">Preview profile</span>
                <h1>{demoProvider.name}</h1>
                <p className="profile-hero__location">{demoProvider.locality}, {demoProvider.city} · {demoProvider.pinCode}</p>
                <div className="profile-hero__tags">{demoProvider.categories.map((slug) => <Badge key={slug}>{categoryName(slug)}</Badge>)}<Badge tone="warning">Demo profile</Badge></div>
              </div>
              <div className="profile-hero__actions">
                <ButtonLink to={routes.customer.newRequest}>Request a quote</ButtonLink>
              </div>
            </div>
          </div>
        </header>
        <div className="wrap profile-layout">
          <div className="profile-main">
            <section className="profile-section">
              <h2>About</h2>
              <p>{demoProvider.description}</p>
            </section>
            <section className="profile-section">
              <h2>Services</h2>
              <div className="profile-services">{demoProvider.categories.map((slug) => <div key={slug}><span>{categoryName(slug)}</span><small>Service category</small></div>)}</div>
            </section>
            <section className="profile-section">
              <h2>Coverage</h2>
              <ul className="profile-coverage">{demoProvider.coverage.map((location) => <li key={location}>{location}</li>)}</ul>
            </section>
            <section className="profile-section">
              <h2>Showcase</h2>
              <div className="portfolio-grid">{demoProvider.portfolio.map((item, index) => <div className={`portfolio-sample portfolio-sample--${index + 1}`} key={item}><span>SAMPLE WORK</span><strong>{item}</strong></div>)}</div>
            </section>
          </div>
          <aside className="profile-aside">
            <Card className="profile-request">
              <span className="eyebrow">Enquiry</span>
              <h2>Request a Quote</h2>
              <p>Planning an event? Describe your occasion to receive tailored proposals.</p>
              <ButtonLink to={routes.customer.newRequest}>Start an event request</ButtonLink>
            </Card>
          </aside>
        </div>
      </div>
    )
  }

  if (liveData.loading) {
    return (
      <div className="wmg-page" style={{ padding: '4rem 1rem' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div className="page-spinner" role="status" aria-label="Loading provider profile...">
            <span className="spinner-dots" />
          </div>
        </div>
      </div>
    )
  }

  if (!liveProvider) {
    return (
      <div className="wmg-page" style={{ padding: '4rem 1rem' }}>
        <div className="wrap">
          <EmptyState
            title="Profile not found"
            description="The requested event professional profile does not exist or has been made private."
            action={<ButtonLink to={routes.providers} variant="secondary">Browse all event professionals</ButtonLink>}
          />
        </div>
      </div>
    )
  }

  const p: ApiProviderDetail = liveProvider
  const primaryCity = p.coverage[0]?.city || ''
  const primaryState = p.coverage[0]?.state || ''
  const primaryLocality = p.coverage[0]?.locality || ''
  const locationDisplay = [primaryLocality, primaryCity, primaryState].filter(Boolean).join(', ')

  const quoteRequestUrl = `${routes.customer.newRequest}?provider=${encodeURIComponent(p.id)}&category=${encodeURIComponent(p.primary_category || p.categories[0] || '')}&providerName=${encodeURIComponent(p.display_name)}`

  async function handleAddToNetwork() {
    if (!user) {
      navigate(`${routes.auth.login}?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (user.id === p.id || user.id === (p as any).user_id || (user.username && user.username === p.username)) {
      showToast('This is your own profile.', 'info')
      return
    }
    if (inNetwork) {
      showToast(`${p.display_name} is already in your network.`, 'info')
      return
    }
    setConnectingNetwork(true)
    try {
      await networkApi.connect(p.id, p.username || undefined, 'Connected from Provider Profile')
      setInNetwork(true)
      showToast(`Added ${p.display_name} to your network!`, 'success')
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Could not add to network.'
      showToast(msg, 'error')
    } finally {
      setConnectingNetwork(false)
    }
  }

  async function handleMessagePrivately() {
    if (!user) {
      navigate(`${routes.auth.login}?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (user.id === p.id || user.id === (p as any).user_id || (user.username && user.username === p.username)) {
      showToast('This is your own profile.', 'info')
      return
    }
    setMessagingLoading(true)
    const isProviderOnly = auth.status === 'authenticated' && auth.roles.includes('PROVIDER') && !auth.roles.includes('CUSTOMER')
    const targetRoute = isProviderOnly ? routes.provider.customerNetwork : routes.customer.network
    try {
      const conv = await networkApi.startConversation(p.id)
      navigate(`${targetRoute}?convId=${conv.id}&userId=${p.id}`)
    } catch {
      // If start failed (e.g. offline/network), navigate anyway with query params so destination loads/initiates it
      navigate(`${targetRoute}?userId=${p.id}`)
    } finally {
      setMessagingLoading(false)
    }
  }

  async function handleShare() {
    const shareUrl = window.location.href
    const shareData = {
      title: `${p.display_name} | HiddenStage`,
      text: p.headline || `Check out ${p.display_name} on HiddenStage event marketplace`,
      url: shareUrl,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Profile link copied to clipboard!', 'success')
    } catch {
      showToast('Could not copy link to clipboard.', 'error')
    }
  }

  return (
    <div className="wmg-page">
      {/* Hero Cover Banner */}
      <div className="wmg-hero">
        <div className="wmg-hero__cover">
          {p.cover_image && <img src={p.cover_image} alt={`${p.display_name} cover`} />}
          <div className="wmg-hero__cover-overlay" />
        </div>

        <div className="wmg-hero__body">
          <div className="wmg-identity-row">
            <div className="wmg-avatar">
              {p.logo ? (
                <img src={p.logo} alt={p.display_name} />
              ) : (
                <span className="wmg-avatar__fallback">{providerInitials(p.display_name)}</span>
              )}
            </div>

            <div className="wmg-title-block">
              <div className="wmg-title-row">
                <h1>{p.display_name}</h1>
                <Badge tone={p.verification_status === 'VERIFIED' ? 'success' : 'neutral'}>
                  {p.verification_status === 'VERIFIED' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={14} color="var(--color-success)" /> Verified Professional
                    </span>
                  ) : (
                    'Registered Provider'
                  )}
                </Badge>
                <Badge>{kindBadges[p.kind] || p.kind}</Badge>
              </div>

              {p.headline && <p className="wmg-headline">{p.headline}</p>}

              <div className="wmg-location-meta">
                {locationDisplay && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={15} color="var(--color-orange)" /> {locationDisplay}
                  </span>
                )}
                {p.availability_note && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={15} color="var(--color-orange)" /> {p.availability_note}
                  </span>
                )}
                {p.contact && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Phone size={15} color="var(--color-orange)" /> {p.contact}
                  </span>
                )}
              </div>
            </div>

            <div className="wmg-hero-actions">
              <button
                type="button"
                className={`wmg-action-btn ${inNetwork ? 'wmg-action-btn--connected' : 'wmg-action-btn--primary'}`}
                onClick={handleAddToNetwork}
                disabled={connectingNetwork}
              >
                <Icon name={inNetwork ? 'circleCheck' : 'network'} size={15} />
                {inNetwork ? 'In Network' : connectingNetwork ? 'Adding...' : 'Add to Network'}
              </button>

              <button
                type="button"
                className="wmg-action-btn wmg-action-btn--secondary"
                onClick={handleMessagePrivately}
                disabled={messagingLoading}
              >
                <Icon name="message" size={15} />
                {messagingLoading ? 'Opening...' : 'Message Privately'}
              </button>

              <button
                type="button"
                className="wmg-action-btn wmg-action-btn--secondary"
                onClick={handleShare}
                title="Share profile link"
              >
                <Icon name="externalLink" size={15} />
                Share
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="wmg-stats-strip">
            <div className="wmg-stat-item">
              <strong>{startingPrice ? formatPaise(startingPrice) : 'On request'}</strong>
              <small>Starting Price</small>
            </div>
            {p.experience_summary && (
              <div className="wmg-stat-item">
                <strong>Experienced</strong>
                <small>Track Record</small>
              </div>
            )}
            <div className="wmg-stat-item">
              <strong>{(p.services || []).length}</strong>
              <small>Service Offerings</small>
            </div>
            <div className="wmg-stat-item">
              <strong>{p.coverage.length}</strong>
              <small>Areas Covered</small>
            </div>
            <div className="wmg-stat-item">
              <strong>{(p.portfolio_items || []).length}</strong>
              <small>Showcases & Photos</small>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation Bar */}
      <div className="wmg-nav-bar">
        <div className="wmg-nav-bar__inner">
          <button type="button" className={`wmg-nav-tab ${activeTab === 'overview' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button type="button" className={`wmg-nav-tab ${activeTab === 'about' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('about')}>About & Story</button>
          <button type="button" className={`wmg-nav-tab ${activeTab === 'services' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('services')}>Services & Pricing</button>
          <button type="button" className={`wmg-nav-tab ${activeTab === 'projects' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('projects')}>Projects & Work</button>
          <button type="button" className={`wmg-nav-tab ${activeTab === 'photos' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('photos')}>Photo Gallery ({photos.length})</button>
          <button type="button" className={`wmg-nav-tab ${activeTab === 'videos' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('videos')}>Videos ({videos.length})</button>
          {p.kind === 'MANAGER' && p.team_members && p.team_members.length > 0 && (
            <button type="button" className={`wmg-nav-tab ${activeTab === 'team' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('team')}>Team ({p.team_members.length})</button>
          )}
          <button type="button" className={`wmg-nav-tab ${activeTab === 'coverage' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('coverage')}>Service Coverage ({p.coverage.length})</button>
          <button type="button" className={`wmg-nav-tab ${activeTab === 'reviews' ? 'wmg-nav-tab--active' : ''}`} onClick={() => setActiveTab('reviews')}>Reviews</button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="wmg-main-layout">
        <div className="wmg-content-stream">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="wmg-card-section">
                <h2>About {p.display_name}</h2>
                <p style={{ lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{p.description}</p>
                {p.specializations && p.specializations.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Specializations</h3>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {p.specializations.map((spec) => <Badge key={spec}>{spec}</Badge>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Featured Services */}
              {(p.services || []).length > 0 && (
                <div className="wmg-card-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Services Offered</h2>
                    <Button type="button" size="sm" variant="quiet" onClick={() => setActiveTab('services')}>View all services <Icon name="arrowRight" size={14} /></Button>
                  </div>
                  <div className="wmg-services-grid">
                    {(p.services || []).slice(0, 3).map((service) => {
                      const bgInfo = resolveServiceBackground(service, p.portfolio_items || [])
                      return (
                        <div
                          key={service.id}
                          className={`wmg-service-card ${bgInfo.bgUrl ? 'wmg-service-card--has-bg' : ''}`}
                          style={bgInfo.bgUrl ? { backgroundImage: `url(${bgInfo.bgUrl})` } : undefined}
                        >
                          <div>
                            <div className="wmg-service-card__badge-row">
                              <Badge>{service.category_name}</Badge>
                              {bgInfo.isCompanyPortfolio && (
                                <span className="wmg-service-card__photo-count">
                                  <Icon name="camera" size={12} /> {bgInfo.count} photo{bgInfo.count === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            <h3 style={{ margin: '0.5rem 0 0.25rem' }}>{service.title || service.category_name}</h3>
                            {service.description && <p style={{ fontSize: '0.85rem', margin: 0 }}>{service.description}</p>}
                          </div>
                          {service.base_price_paise && (
                            <div className="wmg-service-card__price">
                              From {formatPaise(service.base_price_paise)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Photo Showcase Preview */}
              {photos.length > 0 && (
                <div className="wmg-card-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Photo Showcase</h2>
                    <Button type="button" size="sm" variant="quiet" onClick={() => setActiveTab('photos')}>View all {photos.length} photos <Icon name="arrowRight" size={14} /></Button>
                  </div>
                  <div className="wmg-gallery-grid">
                    {photos.slice(0, 6).map((photo, idx) => (
                      <div key={photo.url} className="wmg-gallery-item" onClick={() => setLightboxIndex(idx)}>
                        <img src={photo.url} alt={photo.title} />
                        <div className="wmg-gallery-item__overlay">Enlarge <Icon name="search" size={14} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* About & Story Tab */}
          {activeTab === 'about' && (
            <div className="wmg-card-section">
              <h2>About & Professional Story</h2>
              <p style={{ lineHeight: 1.8, fontSize: '1rem', color: 'var(--color-text)' }}>{p.description}</p>

              {p.experience_summary && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <h3>Experience & Background</h3>
                  <p style={{ lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{p.experience_summary}</p>
                </div>
              )}

              {p.specializations && p.specializations.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3>Specializations & Expertise</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {p.specializations.map((spec) => <Badge key={spec}>{spec}</Badge>)}
                  </div>
                </div>
              )}

              {p.kind === 'TALENT' && p.performance_styles && p.performance_styles.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3>Performance Styles</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {p.performance_styles.map((style) => <Badge key={style} tone="accent">{style}</Badge>)}
                  </div>
                </div>
              )}

              {p.languages && p.languages.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3>Languages Spoken</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {p.languages.map((lang) => <Badge key={lang}>{lang}</Badge>)}
                  </div>
                </div>
              )}

              {(p.website || p.instagram || p.youtube) && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <h3>Connect & Channels</h3>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-link"><Icon name="globe" size={14} /> Website <Icon name="arrowUpRight" size={14} /></a>}
                    {p.instagram && <a href={`https://instagram.com/${p.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-link"><Icon name="camera" size={14} /> Instagram <Icon name="arrowUpRight" size={14} /></a>}
                    {p.youtube && <a href={p.youtube} target="_blank" rel="noopener noreferrer" className="text-link"><Icon name="video" size={14} /> YouTube Channel <Icon name="arrowUpRight" size={14} /></a>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Services & Pricing Tab */}
          {activeTab === 'services' && (
            <div className="wmg-card-section">
              <h2>Services & Package Offerings</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Every booking is custom tailored. Prices indicate starting budgets and guidelines.</p>
              <div className="wmg-services-grid">
                {(p.services || []).map((service) => {
                  const bgInfo = resolveServiceBackground(service, p.portfolio_items || [])
                  return (
                    <div
                      key={service.id}
                      className={`wmg-service-card ${bgInfo.bgUrl ? 'wmg-service-card--has-bg' : ''}`}
                      style={bgInfo.bgUrl ? { backgroundImage: `url(${bgInfo.bgUrl})` } : undefined}
                    >
                      <div>
                        <div className="wmg-service-card__badge-row">
                          <Badge>{service.category_name}</Badge>
                          {bgInfo.isCompanyPortfolio && (
                            <span className="wmg-service-card__photo-count">
                              <Icon name="camera" size={12} /> {bgInfo.count} portfolio photo{bgInfo.count === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: '0.5rem 0' }}>{service.title || service.category_name}</h3>
                        {service.description && <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{service.description}</p>}
                      </div>
                      <div>
                        {service.base_price_paise && (
                          <div className="wmg-service-card__price">
                            From {formatPaise(service.base_price_paise)}
                          </div>
                        )}
                        <div style={{ marginTop: '0.75rem', width: '100%' }}>
                          <ButtonLink
                            to={`${routes.customer.newRequest}?provider=${encodeURIComponent(p.id)}&category=${encodeURIComponent(service.category)}&providerName=${encodeURIComponent(p.display_name)}`}
                            variant="secondary"
                            size="sm"
                          >
                            Request This Service
                          </ButtonLink>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Projects & Work Tab */}
          {activeTab === 'projects' && (
            <div className="wmg-card-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}>Projects & Previous Events</h2>
                  <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    Showcase of past events, assignments, and portfolio work categorized by service.
                  </p>
                </div>
                {availableProjectCategories.length > 0 && (
                  <div className="wmg-category-filter-pills">
                    <button
                      type="button"
                      className={`wmg-filter-pill ${projectCategoryFilter === 'ALL' ? 'wmg-filter-pill--active' : ''}`}
                      onClick={() => setProjectCategoryFilter('ALL')}
                    >
                      All Work ({(p.portfolio_items || []).length})
                    </button>
                    {availableProjectCategories.map((catCode) => {
                      const count = (p.portfolio_items || []).filter((it) => (it.category || '').toLowerCase().trim() === catCode.toLowerCase().trim()).length
                      return (
                        <button
                          key={catCode}
                          type="button"
                          className={`wmg-filter-pill ${projectCategoryFilter === catCode ? 'wmg-filter-pill--active' : ''}`}
                          onClick={() => setProjectCategoryFilter(catCode)}
                        >
                          {categoryName(catCode) || catCode} ({count})
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {filteredProjects.length === 0 ? (
                <EmptyState
                  title={projectCategoryFilter === 'ALL' ? 'No previous projects posted' : `No projects in ${categoryName(projectCategoryFilter) || projectCategoryFilter}`}
                  description="This professional has not listed projects in this category yet."
                />
              ) : (
                <div className="wmg-projects-grid">
                  {filteredProjects.map((item) => (
                    <div key={item.id} className="wmg-project-card">
                      {item.media && (
                        <div className="wmg-project-card__img" onClick={() => {
                          const idx = photos.findIndex((ph) => ph.url === item.media)
                          if (idx !== -1) setLightboxIndex(idx)
                        }}>
                          <img src={item.media} alt={item.title} />
                        </div>
                      )}
                      <div className="wmg-project-card__body">
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {item.category && <Badge>{categoryName(item.category) || item.category}</Badge>}
                          {item.event_date && <small style={{ color: 'var(--color-text-muted)' }}>{item.event_date}</small>}
                        </div>
                        <h3 style={{ margin: '0.5rem 0 0.25rem' }}>{item.title}</h3>
                        {item.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>{item.description}</p>}
                        {item.external_url && (
                          <a href={item.external_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.85rem' }} className="text-link">
                            External Showcase Link <Icon name="arrowUpRight" size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Photo Gallery Tab */}
          {activeTab === 'photos' && (
            <div className="wmg-card-section">
              <h2>Photo Gallery & Albums ({photos.length})</h2>
              {photos.length === 0 ? (
                <EmptyState title="No photos in gallery" description="No public gallery photos available yet." />
              ) : (
                <div className="wmg-gallery-grid">
                  {photos.map((photo, idx) => (
                    <div key={photo.url} className="wmg-gallery-item" onClick={() => setLightboxIndex(idx)}>
                      <img src={photo.url} alt={photo.title} />
                      <div className="wmg-gallery-item__overlay">Enlarge <Icon name="search" size={14} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video Gallery Tab */}
          {activeTab === 'videos' && (
            <div className="wmg-card-section">
              <h2>Video Gallery ({videos.length})</h2>
              {videos.length === 0 ? (
                <EmptyState title="No videos uploaded" description="This supplier has not shared any video showcases yet." />
              ) : (
                <div className="wmg-video-grid">
                  {videos.map((vid) => {
                    const embedUrl = vid.external_url ? toVideoEmbedUrl(vid.external_url) : null
                    return (
                      <div key={vid.id} className="wmg-video-card">
                        {embedUrl ? (
                          <div className="wmg-video-embed">
                            <iframe src={embedUrl} title={vid.title} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                          </div>
                        ) : vid.media ? (
                          <video src={vid.media} controls style={{ width: '100%', height: 'auto', background: '#000' }} />
                        ) : null}
                        <div className="wmg-video-card__body">
                          <h4>{vid.title}</h4>
                          {vid.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0.25rem 0' }}>{vid.description}</p>}
                          {vid.external_url && !embedUrl && (
                            <a href={vid.external_url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ fontSize: '0.85rem' }}>
                              Watch on external platform <Icon name="arrowUpRight" size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Team Tab (for Manager) */}
          {activeTab === 'team' && p.kind === 'MANAGER' && (
            <div className="wmg-card-section">
              <h2>Team & Event Management Staff</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Key event coordinators and production assistants on this manager's platform team.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {(p.team_members || []).map((member, index) => (
                  <div key={`${member}-${index}`} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="pro-card__monogram" style={{ width: '42px', height: '42px', fontSize: '1rem', background: 'var(--color-burgundy)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {providerInitials(member)}
                      </span>
                      <div>
                        <strong>{member}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Event Production Team</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Coverage Tab */}
          {activeTab === 'coverage' && (
            <div className="wmg-card-section">
              <h2>Service Coverage Areas</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                This professional explicitly serves the locations and postal codes listed below. Unlisted nearby areas are never assumed.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {p.coverage.map((loc) => (
                  <div key={loc.id} className="card" style={{ padding: '0.85rem 1rem' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>{loc.locality}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{loc.city}, {loc.state} · <strong>{loc.pin_code}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="wmg-card-section">
              <h2>Verified Client Reviews</h2>
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--color-surface-subtle, #f8f9fa)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '0.5rem' }}><Icon name="star" size={36} /></div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Verified Reviews & Ratings</h3>
                <p style={{ maxWidth: '480px', margin: '0 auto', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Reviews on HiddenStage are submitted exclusively by verified clients upon event completion to prevent manufactured testimonials.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Desktop Enquiry Card */}
        <aside className="wmg-sticky-aside">
          <div className="wmg-enquiry-box">
            <div className="wmg-price-callout">
              <span>Pricing Guide</span>
              <strong>{startingPrice ? formatPaise(startingPrice) : 'On Request'}</strong>
            </div>

            <div className="wmg-enquiry-actions">
              <Link to={quoteRequestUrl} className="wmg-btn-quote">
                Request a Quote
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (auth.status === 'authenticated') {
                    setShowContactModal(true)
                  } else {
                    window.location.href = `${routes.auth.login}?next=${encodeURIComponent(window.location.pathname)}`
                  }
                }}
              >
                {auth.status === 'authenticated' ? 'Contact Supplier' : 'Sign in to Contact'}
              </Button>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><Icon name="shieldCheck" size={16} /> Verified Platform Supplier</div>
              <div><Icon name="quote" size={16} /> Direct Quotation & Booking</div>
              <div><Icon name="mapPin" size={16} /> Explicit Location Coverage Guarantee</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Fixed Bottom Action Bar */}
      <div className="wmg-mobile-action-bar">
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Starting price</span>
          <strong style={{ fontSize: '1.1rem', color: 'var(--color-burgundy)' }}>{startingPrice ? formatPaise(startingPrice) : 'On Request'}</strong>
        </div>
        <Link to={quoteRequestUrl} className="wmg-btn-quote" style={{ padding: '0.65rem 1.25rem !important' }}>
          Request a Quote
        </Link>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <LightboxModal
          images={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(nextIdx) => setLightboxIndex(nextIdx)}
        />
      )}

      {/* Contact Supplier Modal */}
      {showContactModal && (
        <Modal open title={`Contact ${p.display_name}`} onClose={() => setShowContactModal(false)}>
          <div className="modal-stack">
            <p>You can reach {p.display_name} directly regarding availability or specific requirements:</p>
            <div style={{ background: 'var(--color-surface-subtle, #f8f9fa)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div><strong>Business Contact:</strong> {p.contact || 'Registered through platform'}</div>
              {p.availability_note && <div style={{ marginTop: '0.5rem' }}><strong>Availability:</strong> {p.availability_note}</div>}
              {p.website && <div style={{ marginTop: '0.5rem' }}><strong>Website:</strong> <a href={p.website} target="_blank" rel="noopener noreferrer">{p.website}</a></div>}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              For formal price quotes and booking protection, please use the official Request a Quote workflow.
            </p>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowContactModal(false)}>Close</Button>
              <ButtonLink to={quoteRequestUrl}>Request a Quote Now</ButtonLink>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
