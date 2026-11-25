import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useMatches, useNavigate } from 'react-router-dom'
import { providerDetailPath, routes, serviceCategoryPath } from '../../app/routes/routePaths'
import { Badge, Button, ButtonLink, Card, Input, Textarea } from '../../shared/ui/primitives'
import { EmptyState } from '../../shared/ui/feedback'
import { ProviderDirectoryPage, ProviderProfilePage, ServiceDiscoveryPage } from '../discovery/DiscoveryPages'
import { categoryName, demoProviders, serviceCategories } from '../discovery/data/catalog'
import { CategoryIcon } from '../../shared/ui/CategoryIcon'
import { Icon } from '../../shared/ui/Icon'
import { Award, Calendar, MapPin, Search, Users } from 'kubai-icons-react'
import { publicFeedApi } from '../../shared/api/backend/ecosystem'
import type { ApiPublicFeedEvent } from '../../shared/api/backend/types'
import { formatShortDate } from '../../shared/api/backend/format'
import spacesImg from '../../assets/hero/spaces.jpg'
import foodImg from '../../assets/hero/food.jpg'
import photoImg from '../../assets/hero/photography.jpg'
import musicImg from '../../assets/hero/music.jpg'
import './public.css'

type PageHandle = { page?: string }
function useCurrentPage() { return (useMatches().at(-1)?.handle as PageHandle | undefined)?.page ?? 'home' }

const categoryGroups = [
  { id: 'popular', label: 'Popular', slugs: serviceCategories.map((category) => category.slug) },
  { id: 'food', label: 'Food & drink', slugs: ['food-and-drink', 'spaces'] },
  { id: 'media', label: 'Photo & video', slugs: ['photography', 'videography'] },
  { id: 'entertainment', label: 'Music & entertainment', slugs: ['music-and-performance', 'dj-and-sound', 'event-hosting'] },
  { id: 'styling', label: 'Styling & planning', slugs: ['decor-and-styling', 'planning'] },
]

const organiserSteps = [
  { number: '01', title: 'Tell us about your event', body: 'Describe the occasion you have in mind and when it is taking place.' },
  { number: '02', title: 'Describe your requirements', body: 'Share the service categories and location details for your event.' },
  { number: '03', title: 'Receive tailored quotes', body: 'Get proposals from suppliers who are suitable for your request.' },
  { number: '04', title: 'Compare and communicate', body: 'Review quotes side by side and message the suppliers you are considering.' },
  { number: '05', title: 'Make your choice', body: 'Select the supplier that best fits your event and confirm the booking.' },
  { number: '06', title: 'Enjoy your event', body: 'Your chosen supplier delivers the experience, and you track the details in one place.' },
]

const supplierSteps = [
  { number: '01', title: 'Join the platform', body: 'Create a professional account and set up your business profile.' },
  { number: '02', title: 'List your services', body: 'Describe what you offer, your pricing, and the areas you cover.' },
  { number: '03', title: 'Discover opportunities', body: 'Browse event requests that match your services and location.' },
  { number: '04', title: 'Review and respond', body: 'Read each request and submit a quotation when it fits your business.' },
  { number: '05', title: 'Communicate with customers', body: 'Answer questions, refine your quote, and build trust with organisers.' },
  { number: '06', title: 'Win and deliver work', body: 'Get hired for matching events and deliver the experience your customers expect.' },
]

const homeSteps = [
  { number: '01', title: 'Share your event', body: 'Tell us what you’re planning, when it’s happening, and which services you need. It takes a few minutes.' },
  { number: '02', title: 'Compare quotes', body: 'Review proposals from relevant professionals, compare what’s included, and ask questions before you decide.' },
  { number: '03', title: 'Choose your suppliers', body: 'Confirm the people you want to work with and keep every decision together in your workspace.' },
]


const demoProviderImages: Record<string, string> = {
  'p-silver-screen': '/hero/photography.jpg',
  'p-twilight-strings': '/hero/music.jpg',
  'p-rustic-roots': '/hero/food.jpg',
}

const categoryImages: Record<string, string> = {
  'spaces': '/categories/spaces.jpg',
  'food-and-drink': '/categories/food-and-drink.jpg',
  'music-and-performance': '/categories/music-and-performance.jpg',
  'photography': '/categories/photography.jpg',
  'videography': '/categories/videography.jpg',
  'decor-and-styling': '/categories/decor-and-styling.jpg',
  'dj-and-sound': '/categories/dj-and-sound.jpg',
  'event-hosting': '/categories/event-hosting.jpg',
  'planning': '/categories/planning.jpg',
}

function CategoryTile({ slug, index }: { slug: string; index: number }) {
  const category = serviceCategories.find((item) => item.slug === slug)
  if (!category) return null
  const tone = ['clay', 'sage', 'gold', 'rose', 'blue', 'plum'][index % 6]
  const imageSrc = categoryImages[category.slug]

  return <Link to={serviceCategoryPath(category.slug)} className={`cat-tile cat-tile--${tone}`}>
    <div className="cat-tile__media" aria-hidden="true">
      {imageSrc && (
        <img
          src={imageSrc}
          alt={category.name}
          className="cat-tile__img"
          loading="lazy"
        />
      )}
      <div className="cat-tile__overlay" />
      <div className="cat-tile__icon-wrap">
        <CategoryIcon slug={category.slug} size={36} color="#ffffff" />
      </div>
    </div>
    <div className="cat-tile__body">
      <h3>{category.name}</h3>
      <p>{category.sampleOffering}</p>
      <Icon className="cat-tile__arrow" name="arrowRight" size={16} />
    </div>
  </Link>
}

function ProviderPreview({ provider, index = 0 }: { provider: (typeof demoProviders)[number]; index?: number }) {
  const fallbacks = ['/hero/photography.jpg', '/hero/music.jpg', '/hero/food.jpg', '/hero/spaces.jpg']
  const imgUrl = demoProviderImages[provider.id] || fallbacks[index % fallbacks.length]
  return <article className="pro-card">
    <Link to={providerDetailPath(provider.id)} className="pro-card__media" aria-hidden="true">
      <img src={imgUrl} alt={provider.name} className="pro-card__img" />
      <div className="pro-card__overlay" />
      <span className="pro-card__chip">Featured profile</span>
    </Link>
    <div className="pro-card__body">
      <div className="pro-card__meta"><span>{provider.city}</span><span className="pro-card__rating">Demo listing</span></div>
      <h3><Link to={providerDetailPath(provider.id)}>{provider.name}</Link></h3>
      <p>{provider.description}</p>
      <div className="pro-card__tags">{provider.categories.map((slug) => <Badge key={slug}>{categoryName(slug)}</Badge>)}</div>
      <Link className="text-link" to={providerDetailPath(provider.id)}>View sample profile <Icon name="arrowRight" size={14} /></Link>
    </div>
  </article>
}

function LiveEventFeed() {
  const [feed, setFeed] = useState<ApiPublicFeedEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    publicFeedApi.getFeed()
      .then((data) => setFeed(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !feed || feed.length === 0) return null

  return (
    <section className="section section--paper">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--color-orange, #e05822)', textTransform: 'uppercase' }}>
              Live Marketplace Opportunities
            </span>
            <h2>Open event requests needing specialists</h2>
            <p>Upcoming events from hosts seeking quotations. Verified specialists can review scopes and quote directly.</p>
          </div>
          <Link className="section-link" to={routes.forProfessionals}>
            How to quote <Icon name="arrowRight" size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {feed.slice(0, 6).map((item) => (
            <Card key={item.id} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <Badge tone="accent">{item.event_type || 'Event'}</Badge>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
                    <Icon name="mapPin" size={14} /> {item.city}{item.state ? `, ${item.state}` : ''}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                  {item.name}
                </h3>

                <div style={{ fontSize: '0.88rem', color: 'var(--color-fg-muted)', marginBottom: '0.75rem', display: 'flex', gap: '1rem' }}>
                  <span><Icon name="calendarDays" size={14} /> {item.event_date ? formatShortDate(item.event_date) : 'Flexible Date'}</span>
                  {item.guest_count ? <span><Icon name="users" size={14} /> {item.guest_count} guests</span> : null}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {item.requirements?.map((req) => (
                    <Badge key={req.id} tone="neutral">{req.category_name || req.title}</Badge>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
                  <Icon name="user" size={14} /> {item.anonymized_host || `Host in ${item.city || 'India'}`}
                </span>
                <ButtonLink to={routes.forProfessionals} size="sm" variant="secondary">
                  Quote for Event <Icon name="arrowRight" size={14} />
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const [group, setGroup] = useState('popular')
  const [service, setService] = useState('')
  const [place, setPlace] = useState('')
  const activeSlugs = useMemo(() => categoryGroups.find((item) => item.id === group)?.slugs ?? categoryGroups[0].slugs, [group])

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (service.trim()) params.set('q', service.trim())
    if (place.trim()) params.set('location', place.trim())
    navigate(`${routes.providers}${params.size ? `?${params.toString()}` : ''}`)
  }

  return <>
    <section className="hero-banner">
      <div className="wrap hero-banner__inner">
        <div className="hero-copy">
          <h1>Direct booking for<br />event <em>specialists.</em></h1>
          <p>Hire vetted caterers, photographers, venues, and DJs for your gathering. Review transparent quotations and book directly with zero agency markup.</p>
          <form className="hero-search" onSubmit={search}>
            <div className="hero-search__field">
              <label htmlFor="hero-service">Service needed</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Search size={18} color="var(--color-orange)" />
                <input id="hero-service" name="service" placeholder="Photography, catering, DJ, venue…" value={service} onChange={(event) => setService(event.target.value)} />
              </div>
            </div>
            <div className="hero-search__field">
              <label htmlFor="hero-location">Location</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <MapPin size={18} color="var(--color-orange)" />
                <input id="hero-location" name="location" placeholder="City or PIN code" value={place} onChange={(event) => setPlace(event.target.value)} />
              </div>
            </div>
            <Button type="submit">Search services</Button>
          </form>
          <ul className="hero-trust">
            <li><Icon className="hero-trust__icon" name="circleCheck" size={18} /> Zero booking commission</li>
            <li><Icon className="hero-trust__icon" name="circleCheck" size={18} /> Direct supplier quotations</li>
            <li><Icon className="hero-trust__icon" name="circleCheck" size={18} /> Verified event specialists</li>
          </ul>
        </div>
        <div className="hero-collage" aria-hidden="true">
          <div className="hero-collage__tile hero-collage__tile--tall">
            <img src={spacesImg} alt="Spaces and Venues" loading="eager" />
            <div className="hero-collage__overlay" />
            <span>Spaces</span>
          </div>
          <div className="hero-collage__tile hero-collage__tile--food">
            <img src={foodImg} alt="Food and Catering" loading="eager" />
            <div className="hero-collage__overlay" />
            <span>Catering</span>
          </div>
          <div className="hero-collage__tile hero-collage__tile--photo">
            <img src={photoImg} alt="Photography and Video" loading="eager" />
            <div className="hero-collage__overlay" />
            <span>Photography</span>
          </div>
          <div className="hero-collage__tile hero-collage__tile--music">
            <img src={musicImg} alt="Live Music and DJ" loading="eager" />
            <div className="hero-collage__overlay" />
            <span>Sound &amp; DJ</span>
          </div>
        </div>
      </div>
    </section>

    <section className="section section--paper">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>Explore event services</h2>
            <p>Hire verified specialists across catering, sound, photography, decoration, and venue spaces.</p>
          </div>
          <Link className="section-link" to={routes.services}>View all categories <Icon name="arrowRight" size={14} /></Link>
        </div>
        <div className="cat-tabs" role="tablist" aria-label="Service groups">
          {categoryGroups.map((item) => <button key={item.id} type="button" role="tab" aria-selected={group === item.id} className={group === item.id ? 'cat-tabs__active' : ''} onClick={() => setGroup(item.id)}>{item.label}</button>)}
        </div>
        <div className="category-grid">{activeSlugs.map((slug, index) => <CategoryTile key={slug} slug={slug} index={index} />)}</div>
      </div>
    </section>

    <section className="section">
      <div className="wrap">
        <div className="section-head section-head--center">
          <div>
            <h2>How HiddenStage works</h2>
            <p>Submit your event requirements once, compare direct quotations from verified professionals, and confirm bookings.</p>
          </div>
        </div>
        <ol className="steps-grid">
          {homeSteps.map((step) => <li key={step.number}>
            <span className="steps-grid__number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>)}
        </ol>
        <div className="section-foot"><ButtonLink to={routes.customer.newRequest}>Request quotations <Icon name="arrowRight" size={14} /></ButtonLink></div>
      </div>
    </section>

    <section className="section section--tint">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>Featured event professionals</h2>
            <p>Review verified portfolios, authentic client feedback, and direct service pricing from active suppliers.</p>
          </div>
          <Link className="section-link" to={routes.providers}>Browse all professionals <Icon name="arrowRight" size={14} /></Link>
        </div>
        <div className="pro-grid">{demoProviders.slice(0, 3).map((provider, index) => <ProviderPreview key={provider.id} provider={provider} index={index} />)}</div>
      </div>
    </section>

    <section className="section section--paper">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>Built for transparent event planning</h2>
          </div>
        </div>
        <div className="benefits-grid">
          <article>
            <span className="benefit-icon" aria-hidden="true"><Award size={26} color="var(--color-orange)" /></span>
            <h3>Zero commission</h3>
            <p>No booking fee or commission charges on quotations. Pay the exact rates set directly by your chosen professionals.</p>
          </article>
          <article>
            <span className="benefit-icon" aria-hidden="true"><Users size={26} color="var(--color-orange)" /></span>
            <h3>Accurate coverage</h3>
            <p>Requests match the exact PIN codes and cities a professional actively covers, avoiding out-of-area mismatches.</p>
          </article>
          <article>
            <span className="benefit-icon" aria-hidden="true"><Calendar size={26} color="var(--color-orange)" /></span>
            <h3>Itemised quotations</h3>
            <p>Compare deliverables, inclusions, and payment milestones line by line before confirming your supplier.</p>
          </article>
        </div>
      </div>
    </section>

    <LiveEventFeed />

    <section className="section">
      <div className="wrap">
        <div className="pro-cta">
          <div className="pro-cta__copy">
            <h2>List your business on HiddenStage</h2>
            <p>Showcase your portfolio, receive qualified event requests in your service areas, and manage quotations in one workspace.</p>
            <ul className="check-list">
              <li><Icon className="check-list__icon" name="circleCheck" size={16} /> Receive requests matched to your specific services</li>
              <li><Icon className="check-list__icon" name="circleCheck" size={16} /> Manage your profile, portfolio albums, and quotations in one place</li>
              <li><Icon className="check-list__icon" name="circleCheck" size={16} /> Maintain full control over your pricing and terms</li>
            </ul>
            <ButtonLink to={routes.forProfessionals} variant="secondary">Join as a professional</ButtonLink>
          </div>
          <div className="pro-cta__panel" aria-hidden="true">
            <span className="pro-cta__quote">“The right work, with the right people.”</span>
            <div className="pro-cta__lines"><i /><i /><i /></div>
          </div>
        </div>
      </div>
    </section>

    <section className="section section--paper section--tight">
      <div className="wrap">
        <div className="final-cta">
          <div>
            <h2>Ready to plan your event?</h2>
            <p>Share your dates and requirements to receive transparent quotes from verified event specialists.</p>
          </div>
          <div className="final-cta__actions">
            <ButtonLink to={routes.customer.newRequest} size="lg">Request quotations</ButtonLink>
            <ButtonLink to={routes.services} variant="secondary" size="lg">Browse services</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  </>
}

function PageHero({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children?: ReactNode }) {
  return <section className="page-hero">
    <div className="wrap page-hero__inner">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{intro}</p>
      {children}
    </div>
  </section>
}

function HowItWorksPage() {
  return <>
    <PageHero eyebrow="How HiddenStage works" title="From first thought to a day that feels like yours." intro="A clear, considered route from the occasion you have in mind to the professionals who can bring it together." />
    <section className="section section--paper">
      <div className="wrap">
        <div className="how-steps">
          <div className="how-steps__section how-steps__section--organiser">
            <div className="how-steps__heading"><span className="eyebrow">I&#39;m organising an event</span><h2>Organiser journey</h2></div>
            <ol className="how-steps__list">
              {organiserSteps.map((step) => <li key={step.number} className="how-steps__row">
                <span className="how-steps__number">{step.number}</span>
                <span className="how-steps__text">
                  <span className="how-steps__title">{step.title}</span>
                  <span className="how-steps__body">{step.body}</span>
                </span>
              </li>)}
            </ol>
          </div>
          <div className="how-steps__divider" aria-hidden="true" />
          <div className="how-steps__section how-steps__section--supplier">
            <div className="how-steps__heading"><span className="eyebrow">I&#39;m an event supplier</span><h2>Supplier journey</h2></div>
            <ol className="how-steps__list">
              {supplierSteps.map((step) => <li key={step.number} className="how-steps__row">
                <span className="how-steps__number">{step.number}</span>
                <span className="how-steps__text">
                  <span className="how-steps__title">{step.title}</span>
                  <span className="how-steps__body">{step.body}</span>
                </span>
              </li>)}
            </ol>
          </div>
        </div>
        <div className="how-note"><Badge tone="warning">Preview release</Badge><p>Requests, invitations, quotations and commitments are stored in your workspace. HiddenStage does not take payments or create bookings in this release.</p></div>
      </div>
    </section>
    <section className="section">
      <div className="wrap faq-layout">
        <div><span className="eyebrow">Questions, answered</span><h2 className="faq-layout__title">A little more clarity before you begin</h2><p>Everything below reflects how HiddenStage works today.</p></div>
        <div className="faq-list">
          {[
            ['Is HiddenStage free for organisers?', 'Yes. Requesting quotes and comparing proposals is free. HiddenStage does not process payments in this release.'],
            ['How are professionals matched to my event?', 'Matching uses the service categories in your request and the coverage locations a professional explicitly sets. Nearby areas are not assumed.'],
            ['Can I change my request after sending it?', 'An event can be edited while it is a draft. Once invitations are outstanding, the details lock so professionals are quoting the same brief.'],
            ['What happens after I accept a quote?', 'Acceptance records a commitment with the agreed services and price. It is not a booking or a payment.'],
          ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </div>
    </section>
    <section className="section section--tight">
      <div className="wrap final-cta">
        <div><h2>Start with the details you already know.</h2><p>You can shape the rest as your plans come together.</p></div>
        <div className="final-cta__actions"><ButtonLink to={routes.customer.newRequest} size="lg">Create an event request</ButtonLink><ButtonLink to={routes.services} variant="secondary" size="lg">Explore services</ButtonLink></div>
      </div>
    </section>
  </>
}

function ProfessionalsPage() {
  return <>
    <PageHero eyebrow="Supply a service" title="Make space for the work you do best." intro="HiddenStage is designed to help event professionals present their services and connect with people planning gatherings.">
      <div className="page-hero__actions"><ButtonLink to={routes.auth.register}>List your business</ButtonLink><ButtonLink to={routes.howItWorks} variant="secondary">How it works</ButtonLink></div>
    </PageHero>
    <section className="section section--paper">
      <div className="wrap">
        <div className="benefits-grid">
          <article><span className="benefit-icon" aria-hidden="true"><Icon name="briefcase" size={22} /></span><h3>Show what you offer</h3><p>Describe each service, set indicative prices, and keep your profile accurate.</p></article>
          <article><span className="benefit-icon" aria-hidden="true"><Icon name="mapPin" size={22} /></span><h3>Choose your coverage</h3><p>Only the locations you explicitly serve are used when matching requests to your business.</p></article>
          <article><span className="benefit-icon" aria-hidden="true"><Icon name="quote" size={22} /></span><h3>Quote with clarity</h3><p>Prepare itemised quotations, revise them when needed, and keep a visible revision history.</p></article>
        </div>
        <div className="pro-note"><h2>Professional tools are in preparation</h2><p>Profiles in this preview are fictional examples. Verification, ratings, and reviews shown anywhere in the product are demo states, not real-world claims.</p><ButtonLink to={routes.providers} variant="secondary">See demo profile examples</ButtonLink></div>
      </div>
    </section>
  </>
}

function AboutPage() {
  return <>
    <PageHero eyebrow="About HiddenStage" title="For the people and details behind a gathering." intro="HiddenStage is a marketplace for discovering event services and professionals. This frontend is a preview of that experience." />
    <section className="section section--paper">
      <div className="wrap about-layout">
        <div>
          <h2>Built for considered discovery</h2>
          <p>We want people to explore service styles, locations, and professional profiles with clarity — and to compare proposals on the details that actually matter.</p>
          <p>No live marketplace, provider availability, or payment is represented in this preview. Sample listings are fictional and clearly labelled.</p>
        </div>
        <Card className="about-card"><span className="eyebrow">What we value</span><ul className="check-list"><li><Icon className="check-list__icon" name="circleCheck" size={16} /> Clarity over noise</li><li><Icon className="check-list__icon" name="circleCheck" size={16} /> Explicit coverage, not vague proximity</li><li><Icon className="check-list__icon" name="circleCheck" size={16} /> Decisions made with real information</li></ul></Card>
      </div>
    </section>
  </>
}

function ContactPage() {
  const [sent, setSent] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (event.currentTarget.reportValidity()) setSent(true) }
  return <>
    <PageHero eyebrow="Contact" title="A note for the HiddenStage team." intro="This preview does not send messages. You can check how the contact form behaves; your details remain in this browser and are not transmitted." />
    <section className="section section--paper">
      <div className="wrap contact-layout">
        <form className="contact-form" onSubmit={submit} onChange={() => setSent(false)}>
          <div className="contact-form__grid">
            <Input label="Your name" name="name" required minLength={2} autoComplete="name" />
            <Input label="Email address" name="email" type="email" required autoComplete="email" />
          </div>
          <Textarea label="How can we help?" name="message" required minLength={10} rows={6} />
          <Button type="submit">Validate message</Button>
          {sent && <p className="form-feedback" role="status">Form validated for preview. Your message has not been sent.</p>}
        </form>
        <aside className="contact-aside">
          <h2>Before you write</h2>
          <p>For questions about a specific event, use the workspace once you have an account. For anything else, the form demonstrates validation only.</p>
          <dl>
            <div><dt>Support hours</dt><dd>Monday–Friday, 9am–6pm IST (demo)</dd></div>
            <div><dt>Email</dt><dd>hello@hiddenstage.test</dd></div>
            <div><dt>Response time</dt><dd>Usually within one working day</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  </>
}

const helpEntries = [
  { q: 'Can I book a provider from this preview?', a: 'No. The sample listings are fictional and cannot receive enquiries or bookings.' },
  { q: 'Are the provider verification labels real?', a: 'No. They show an explicit demo state in sample data and do not represent a real-world check.' },
  { q: 'Can I create an event request?', a: 'Yes — inside the demo workspace you can create an event, add service requirements, and compare local sample quotations.' },
  { q: 'Where can I learn about data handling?', a: 'The Privacy page contains draft content for legal review, not an approved policy.' },
]
function HelpPage() {
  const [query, setQuery] = useState('')
  const entries = helpEntries.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <PageHero eyebrow="Help & support" title="A little clarity for this preview." intro="Find answers about what works in the current HiddenStage experience." />
    <section className="section section--paper">
      <div className="wrap help-layout">
        <div className="help-main">
          <Input label="Search help topics" name="help-search" placeholder="Search questions" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="help-list">
            {entries.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          </div>
          {!entries.length && <EmptyState title="No help topics match" description="Try another search term." action={<Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>} />}
        </div>
        <aside className="help-aside">
          <h2>Popular topics</h2>
          <ul>{helpEntries.map((item) => <li key={item.q}><button type="button" className="text-link" onClick={() => setQuery(item.q)}>{item.q}</button></li>)}</ul>
          <div className="help-aside__note"><strong>Still stuck?</strong><p>Use the contact form to see how a message would be validated. Nothing is sent in this preview.</p><Link className="text-link" to={routes.contact}>Go to contact <Icon name="arrowRight" size={14} /></Link></div>
        </aside>
      </div>
    </section>
  </>
}

function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  const privacy = page === 'privacy'
  return <>
    <PageHero eyebrow="Draft — for legal review" title={privacy ? 'Privacy information (draft)' : 'Terms of use (draft)'} intro="This is placeholder draft content for product review. It is not approved legal advice or an operative policy." />
    <section className="section section--paper">
      <div className="wrap legal-layout">
        <div className="legal-body">
          <Badge tone="warning">DRAFT — NOT APPROVED</Badge>
          <h2>{privacy ? 'Information and this preview' : 'Using this preview'}</h2>
          <p>{privacy ? 'This frontend uses fictional sample listings and does not submit contact forms or booking requests. Production data practices, retention, processors, and user rights must be documented and reviewed before launch.' : 'This preview is provided to demonstrate public pages and fictional sample listings. No booking, provider enquiry, or account action is available here. Final terms, consumer disclosures, and provider terms require qualified legal review before launch.'}</p>
          <h2>{privacy ? 'Questions and rights' : 'Availability and responsibilities'}</h2>
          <p>{privacy ? 'Contact channels and operational privacy processes have not been established in this preview. Do not enter sensitive personal information.' : 'Service availability, payments, cancellations, disputes, and provider responsibilities are not represented or agreed by this draft.'}</p>
          <p className="demo-note">Draft content only. Replace with reviewed, jurisdiction-appropriate documents before public launch.</p>
        </div>
        <aside className="legal-aside">
          <h2>On this page</h2>
          <a href="#top">Overview</a>
          <a href="#top">Your information</a>
          <a href="#top">Contact</a>
        </aside>
      </div>
    </section>
  </>
}

export default function PublicPages() {
  const page = useCurrentPage()
  switch (page) {
    case 'home': return <HomePage />
    case 'services': return <ServiceDiscoveryPage />
    case 'serviceCategory':
    case 'providers': return <ProviderDirectoryPage />
    case 'providerDetail': return <ProviderProfilePage />
    case 'howItWorks': return <HowItWorksPage />
    case 'forProfessionals': return <ProfessionalsPage />
    case 'about': return <AboutPage />
    case 'contact': return <ContactPage />
    case 'help': return <HelpPage />
    case 'privacy':
    case 'terms': return <LegalPage page={page} />
    default: return <HomePage />
  }
}
