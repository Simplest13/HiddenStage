import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { providerDetailPath, routes, serviceCategoryPath } from '../../app/routes/routePaths'
import { Badge, Button, ButtonLink, Card, Input, Select } from '../../shared/ui/primitives'
import { EmptyState } from '../../shared/ui/feedback'
import { categoryName, demoProviders, serviceCategories } from './data/catalog'
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
  return <section className="discovery-page"><div className="wrap"><header className="discovery-heading"><span className="eyebrow eyebrow--accent">A DEMO CATALOGUE</span><h1>{selectedCategory ? categoryName(selectedCategory) : 'Explore event services'}</h1><p>Browse fictional service categories and preview how discovery can work. No service providers are currently bookable here.</p></header>
    <div className="filter-panel"><Input label="Search services" name="service-search" placeholder="Try photography or catering" value={search} onChange={(event) => setSearch(event.target.value)} /><Select label="Category" name="service-category" value={selectedCategory} onChange={(event) => navigate(event.target.value ? serviceCategoryPath(event.target.value) : routes.services)}><option value="">All categories</option>{serviceCategories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</Select><Input label="Location" name="service-location" placeholder="City or PIN code" value={location} onChange={(event) => setLocation(event.target.value)} /></div>
    {location && <p className="field__hint">Showing categories with demo coverage matching “{location}”. <Link to={`${routes.providers}?location=${encodeURIComponent(location)}`}>View matching demo providers</Link>.</p>}
    {items.length ? <div className="discovery-grid">{items.map((category, index) => <Card as="article" className="service-card" key={category.slug}><span className="service-card__index">0{index + 1}</span><h2>{category.name}</h2><p>{category.description}</p><span className="service-card__sample">Example: {category.sampleOffering}</span><ButtonLink to={`${routes.providers}?category=${category.slug}${location ? `&location=${encodeURIComponent(location)}` : ''}`} variant="secondary">Explore demo providers</ButtonLink></Card>)}</div> : <EmptyState title="No categories match" description="Try a different search or clear the category filter." action={<Button type="button" variant="secondary" onClick={() => { setSearch(''); setLocation(''); if (selectedCategory) navigate(routes.services) }}>Clear filters</Button>} />}
    <p className="demo-note">All listings and examples on this page are fictional demo content.</p></div></section>
}

function ProviderCard({ provider }: { provider: (typeof demoProviders)[number] }) {
  return <Card as="article" className="provider-card"><div className="provider-card__cover" aria-hidden="true"><span>HS</span></div><div className="provider-card__body"><div className="provider-card__name"><h2>{provider.name}</h2><Badge tone="accent">Demo profile</Badge></div><p>{provider.description}</p><div className="provider-card__tags">{provider.categories.map((slug) => <Badge key={slug}>{categoryName(slug)}</Badge>)}</div><p className="provider-card__location">{provider.locality}, {provider.city} · {provider.pinCode}</p><Link className="text-link" to={providerDetailPath(provider.id)}>View demo profile <span aria-hidden="true">→</span></Link></div></Card>
}

export function ProviderDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [pin, setPin] = useState('')
  const category = searchParams.get('category') ?? ''
  const locality = searchParams.get('location') ?? ''
  const setLocality = (value: string) => setSearchParams({ ...(category ? { category } : {}), ...(value ? { location: value } : {}) })
  const effectiveLocality = locality
  const items = useMemo(() => demoProviders.filter((provider) => (!category || provider.categories.includes(category)) && (!effectiveLocality || `${provider.locality} ${provider.city} ${provider.coverage.join(' ')}`.toLowerCase().includes(effectiveLocality.toLowerCase())) && (!pin || provider.pinCode.startsWith(pin)) && `${provider.name} ${provider.description} ${provider.city}`.toLowerCase().includes(query.toLowerCase())), [category, effectiveLocality, pin, query])
  return <section className="discovery-page"><div className="wrap"><header className="discovery-heading"><span className="eyebrow eyebrow--accent">PEOPLE BEHIND THE MOMENTS · DEMO</span><h1>Meet event professionals</h1><p>Explore fictional profile examples. Listings do not represent real businesses, availability, or booking status.</p></header><div className="filter-panel filter-panel--providers"><Input label="Search providers" name="provider-search" placeholder="Name, service, or city" value={query} onChange={(event) => setQuery(event.target.value)} /><Select label="Service category" name="provider-category" value={category} onChange={(event) => setSearchParams({ ...(event.target.value ? { category: event.target.value } : {}), ...(locality ? { location: locality } : {}) })}><option value="">All services</option>{serviceCategories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</Select><Input label="Locality or city" name="provider-locality" placeholder="e.g. Bengaluru" value={locality} onChange={(event) => setLocality(event.target.value)} /><Input label="PIN code" name="provider-pin" inputMode="numeric" maxLength={6} placeholder="e.g. 560038" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} /></div>{items.length ? <div className="provider-grid">{items.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div> : <EmptyState title="No demo providers found" description="Adjust your search or location filters to see the fictional examples." action={<Button type="button" variant="secondary" onClick={() => { setQuery(''); setLocality(''); setPin(''); setSearchParams({}) }}>Clear filters</Button>} />}<p className="demo-note">Verification labels, where shown on a profile, describe demo state only and are not real-world checks.</p></div></section>
}

export function ProviderProfilePage() {
  const { providerId } = useParams()
  const provider = demoProviders.find((item) => item.id === providerId)
  if (!provider) return <section className="discovery-page"><div className="wrap"><EmptyState title="Demo profile not found" description="This profile is not in the sample directory." action={<ButtonLink to={routes.providers} variant="secondary">Browse demo providers</ButtonLink>} /></div></section>
  return <section className="discovery-page"><div className="wrap"><Link className="text-link" to={routes.providers}>← All demo providers</Link><header className="profile-heading"><div className="profile-heading__art" aria-hidden="true">HS</div><div><span className="eyebrow eyebrow--accent">FICTIONAL PREVIEW PROFILE</span><h1>{provider.name}</h1><p>{provider.locality}, {provider.city} · {provider.pinCode}</p><Badge tone={provider.verificationStatus === 'approved' ? 'success' : 'neutral'}>Demo verification state: {provider.verificationStatus === 'approved' ? 'approved' : 'not submitted'}</Badge></div></header><div className="profile-content"><div><h2>About this demo profile</h2><p>{provider.description}</p><h2>Service coverage</h2><p>{provider.coverage.join(' · ')}</p><h2>Sample portfolio</h2><div className="portfolio-grid">{provider.portfolio.map((item, index) => <div className={`portfolio-sample portfolio-sample--${index + 1}`} key={item}><span>DEMO SAMPLE</span><strong>{item}</strong></div>)}</div></div><Card className="profile-aside"><Badge tone="accent">Not bookable</Badge><h2>Preview only</h2><p>This fictional profile does not accept enquiries or bookings. No message will be sent from this page.</p><ButtonLink to={routes.services} variant="secondary">Explore service categories</ButtonLink></Card></div></div></section>
}
