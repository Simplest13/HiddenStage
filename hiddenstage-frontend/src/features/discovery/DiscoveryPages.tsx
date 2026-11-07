import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { providerDetailPath, routes, serviceCategoryPath } from '../../app/routes/routePaths'
import { Badge, Button, ButtonLink, Card, Input, Select } from '../../shared/ui/primitives'
import { EmptyState } from '../../shared/ui/feedback'
import { Breadcrumb } from '../../shared/ui/navigation'
import { categoryName, demoProviders, serviceCategories } from './data/catalog'
import { categoryGlyph, providerInitials } from '../../shared/ui/monogram'
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
        <Link className="section-link" to={routes.providers}>Browse professionals <span aria-hidden="true">→</span></Link>
      </div>
      {items.length ? <div className="service-grid">
        {items.map((category, index) => <article className="service-tile" key={category.slug}>
          <div className={`service-tile__media service-tile__media--${index % 5}`} aria-hidden="true"><span>{categoryGlyph(category.name)}</span></div>
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

function ProviderCard({ provider }: { provider: (typeof demoProviders)[number] }) {
  return <article className="directory-card">
    <div className="directory-card__media" aria-hidden="true">
      <span className="directory-card__monogram">{providerInitials(provider.name)}</span>
      <span className="directory-card__chip">Demo profile</span>
    </div>
    <div className="directory-card__body">
      <div className="directory-card__top">
        <div>
          <h2><Link to={providerDetailPath(provider.id)}>{provider.name}</Link></h2>
          <p className="directory-card__location">{provider.locality}, {provider.city} · {provider.pinCode}</p>
        </div>
        <Badge tone={provider.verificationStatus === 'approved' ? 'success' : 'neutral'}>Demo state</Badge>
      </div>
      <p className="directory-card__description">{provider.description}</p>
      <div className="directory-card__tags">{provider.categories.map((slug) => <Badge key={slug}>{categoryName(slug)}</Badge>)}</div>
      <div className="directory-card__footer">
        <span className="directory-card__coverage">Covers {provider.coverage.join(' · ')}</span>
        <ButtonLink to={providerDetailPath(provider.id)} variant="secondary" size="sm">View demo profile</ButtonLink>
      </div>
    </div>
  </article>
}

export function ProviderDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [pin, setPin] = useState('')
  const [sort, setSort] = useState<'name' | 'city'>('name')
  const category = searchParams.get('category') ?? ''
  const locality = searchParams.get('location') ?? ''
  const setLocality = (value: string) => setSearchParams({ ...(category ? { category } : {}), ...(value ? { location: value } : {}), ...(query ? { q: query } : {}) })
  const setCategory = (value: string) => setSearchParams({ ...(value ? { category: value } : {}), ...(locality ? { location: locality } : {}), ...(query ? { q: query } : {}) })
  const items = useMemo(() => demoProviders.filter((provider) => (!category || provider.categories.includes(category)) && (!locality || `${provider.locality} ${provider.city} ${provider.coverage.join(' ')}`.toLowerCase().includes(locality.toLowerCase())) && (!pin || provider.pinCode.startsWith(pin)) && `${provider.name} ${provider.description} ${provider.city}`.toLowerCase().includes(query.toLowerCase())).sort((left, right) => sort === 'city' ? left.city.localeCompare(right.city) || left.name.localeCompare(right.name) : left.name.localeCompare(right.name)), [category, locality, pin, query, sort])

  return <div className="listing-page">
    <header className="listing-hero">
      <div className="wrap">
        <Breadcrumb items={[{ label: 'Home', href: routes.home }, { label: 'Event professionals' }]} />
        <span className="eyebrow">People behind the moments</span>
        <h1>Meet event professionals</h1>
        <p>Explore fictional profile examples. Listings do not represent real businesses, availability, or booking status.</p>
      </div>
    </header>
    <div className="listing-search">
      <div className="wrap listing-search__inner listing-search__inner--providers">
        <Input label="Search providers" name="provider-search" placeholder="Name, service, or city" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Input label="Locality or city" name="provider-locality" placeholder="e.g. Bengaluru" value={locality} onChange={(event) => setLocality(event.target.value)} />
        <Input label="PIN code" name="provider-pin" inputMode="numeric" maxLength={6} placeholder="e.g. 560038" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} />
      </div>
    </div>
    <div className="wrap listing-layout">
      <aside className="filter-panel" aria-label="Filter professionals">
        <div className="filter-panel__head"><h2>Filter results</h2><button type="button" className="filter-clear" onClick={() => { setQuery(''); setLocality(''); setPin(''); setSearchParams({}) }}>Clear all</button></div>
        <fieldset className="filter-group">
          <legend>Service category</legend>
          <label className="filter-radio"><input type="radio" name="filter-category" checked={!category} onChange={() => setCategory('')} /><span>All services</span><small>{demoProviders.length}</small></label>
          {serviceCategories.map((item) => <label className="filter-radio" key={item.slug}>
            <input type="radio" name="filter-category" checked={category === item.slug} onChange={() => setCategory(item.slug)} />
            <span>{item.name}</span>
            <small>{demoProviders.filter((provider) => provider.categories.includes(item.slug)).length}</small>
          </label>)}
        </fieldset>
        <div className="filter-group filter-group--note">
          <span className="eyebrow">About these results</span>
          <p>Coverage is explicit. A professional appears only when they serve the location you search for.</p>
        </div>
      </aside>
      <section className="results-panel">
        <div className="results-head">
          <p><strong>{items.length}</strong> demo {items.length === 1 ? 'professional' : 'professionals'}{locality ? ` near ${locality}` : ''}</p>
          <label className="sort-control">Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value as 'name' | 'city')}>
              <option value="name">Name A–Z</option>
              <option value="city">City</option>
            </select>
          </label>
        </div>
        {items.length ? <div className="directory-list">{items.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div> : <EmptyState title="No demo providers found" description="Adjust your search or location filters to see the fictional examples." action={<Button type="button" variant="secondary" onClick={() => { setQuery(''); setLocality(''); setPin(''); setSearchParams({}) }}>Clear filters</Button>} />}
        <p className="demo-note">Verification labels, where shown on a profile, describe demo state only and are not real-world checks.</p>
      </section>
    </div>
  </div>
}

export function ProviderProfilePage() {
  const { providerId } = useParams()
  const provider = demoProviders.find((item) => item.id === providerId)
  if (!provider) return <div className="listing-page"><div className="wrap"><EmptyState title="Demo profile not found" description="This profile is not in the sample directory." action={<ButtonLink to={routes.providers} variant="secondary">Browse demo providers</ButtonLink>} /></div></div>
  return <div className="listing-page">
    <header className="profile-hero">
      <div className="wrap">
        <Breadcrumb items={[{ label: 'Home', href: routes.home }, { label: 'Professionals', href: routes.providers }, { label: provider.name }]} />
        <div className="profile-hero__layout">
          <div className="profile-hero__media" aria-hidden="true"><span>{providerInitials(provider.name)}</span><small>{categoryGlyph(categoryName(provider.categories[0] ?? ''))}</small></div>
          <div className="profile-hero__copy">
            <span className="eyebrow">Fictional preview profile</span>
            <h1>{provider.name}</h1>
            <p className="profile-hero__location">{provider.locality}, {provider.city} · {provider.pinCode}</p>
            <div className="profile-hero__tags">{provider.categories.map((slug) => <Badge key={slug}>{categoryName(slug)}</Badge>)}<Badge tone="warning">Demo profile</Badge></div>
          </div>
          <div className="profile-hero__actions">
            <ButtonLink to={routes.customer.newRequest}>Request a quote</ButtonLink>
            <span>Takes 2–3 minutes · demo</span>
          </div>
        </div>
      </div>
    </header>
    <div className="wrap profile-layout">
      <div className="profile-main">
        <section className="profile-section">
          <h2>About this demo profile</h2>
          <p>{provider.description}</p>
          <p>This is a fictional example used to demonstrate how a professional’s introduction, services, and coverage appear on HiddenStage.</p>
        </section>
        <section className="profile-section">
          <h2>Services we provide</h2>
          <div className="profile-services">{provider.categories.map((slug) => <div key={slug}><span>{categoryName(slug)}</span><small>Demo service category</small></div>)}</div>
        </section>
        <section className="profile-section">
          <h2>Service coverage</h2>
          <ul className="profile-coverage">{provider.coverage.map((location) => <li key={location}>{location}</li>)}</ul>
          <p className="demo-note">Coverage is limited to the locations shown. No nearby area is inferred.</p>
        </section>
        <section className="profile-section">
          <h2>Sample portfolio</h2>
          <div className="portfolio-grid">{provider.portfolio.map((item, index) => <div className={`portfolio-sample portfolio-sample--${index + 1}`} key={item}><span>DEMO SAMPLE</span><strong>{item}</strong></div>)}</div>
        </section>
      </div>
      <aside className="profile-aside">
        <Card className="profile-request">
          <span className="eyebrow">Verification</span>
          <Badge tone={provider.verificationStatus === 'approved' ? 'success' : 'neutral'}>Demo verification state: {provider.verificationStatus === 'approved' ? 'approved' : 'not submitted'}</Badge>
          <h2>Preview only</h2>
          <p>This fictional profile does not accept enquiries or bookings. No message will be sent from this page.</p>
          <ButtonLink to={routes.customer.newRequest}>Start an event request</ButtonLink>
          <ButtonLink to={routes.services} variant="secondary">Explore service categories</ButtonLink>
          <p className="profile-request__note">In a live marketplace you would request a quote, share event details, and receive a response directly from the professional.</p>
        </Card>
      </aside>
    </div>
  </div>
}
