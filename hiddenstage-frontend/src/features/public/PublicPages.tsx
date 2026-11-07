import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useMatches, useNavigate } from 'react-router-dom'
import { providerDetailPath, routes, serviceCategoryPath } from '../../app/routes/routePaths'
import { Badge, Button, ButtonLink, Card, Input, Textarea } from '../../shared/ui/primitives'
import { EmptyState } from '../../shared/ui/feedback'
import { ProviderDirectoryPage, ProviderProfilePage, ServiceDiscoveryPage } from '../discovery/DiscoveryPages'
import { categoryName, demoProviders, serviceCategories } from '../discovery/data/catalog'
import { categoryGlyph, providerInitials } from '../../shared/ui/monogram'
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

const steps = [
  { number: '01', title: 'Share your event', body: 'Tell us what you’re planning, when it’s happening, and which services you need. It takes a few minutes.' },
  { number: '02', title: 'Compare quotes', body: 'Review proposals from relevant professionals, compare what’s included, and ask questions before you decide.' },
  { number: '03', title: 'Choose your suppliers', body: 'Confirm the people you want to work with and keep every decision together in your workspace.' },
]

function CategoryTile({ slug, index }: { slug: string; index: number }) {
  const category = serviceCategories.find((item) => item.slug === slug)
  if (!category) return null
  const tone = ['clay', 'sage', 'gold', 'rose', 'blue', 'plum'][index % 6]
  return <Link to={serviceCategoryPath(category.slug)} className={`cat-tile cat-tile--${tone}`}>
    <div className="cat-tile__media" aria-hidden="true">
      <span className="cat-tile__monogram">{categoryGlyph(category.name)}</span>
      <span className="cat-tile__label">Explore category</span>
    </div>
    <div className="cat-tile__body">
      <h3>{category.name}</h3>
      <p>{category.sampleOffering}</p>
      <span className="cat-tile__arrow" aria-hidden="true">→</span>
    </div>
  </Link>
}

function ProviderPreview({ provider }: { provider: (typeof demoProviders)[number] }) {
  return <article className="pro-card">
    <Link to={providerDetailPath(provider.id)} className="pro-card__media" aria-hidden="true">
      <span className="pro-card__monogram">{providerInitials(provider.name)}</span>
      <span className="pro-card__chip">Demo profile</span>
    </Link>
    <div className="pro-card__body">
      <div className="pro-card__meta"><span>{provider.city}</span><span className="pro-card__rating">Demo listing</span></div>
      <h3><Link to={providerDetailPath(provider.id)}>{provider.name}</Link></h3>
      <p>{provider.description}</p>
      <div className="pro-card__tags">{provider.categories.map((slug) => <Badge key={slug}>{categoryName(slug)}</Badge>)}</div>
      <Link className="text-link" to={providerDetailPath(provider.id)}>View sample profile <span aria-hidden="true">→</span></Link>
    </div>
  </article>
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
          <span className="eyebrow eyebrow--light">The thoughtful way to book event services</span>
          <h1>Make room for<br />something <em>special.</em></h1>
          <p>Find trusted event professionals for weddings, parties, and celebrations — compare personalised quotes and choose the people who fit your day.</p>
          <form className="hero-search" onSubmit={search}>
            <div className="hero-search__field">
              <label htmlFor="hero-service">What do you need?</label>
              <input id="hero-service" name="service" placeholder="Photography, catering, a venue…" value={service} onChange={(event) => setService(event.target.value)} />
            </div>
            <div className="hero-search__field">
              <label htmlFor="hero-location">Where?</label>
              <input id="hero-location" name="location" placeholder="City or PIN code" value={place} onChange={(event) => setPlace(event.target.value)} />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <ul className="hero-trust">
            <li>100% free to use</li>
            <li>No commission</li>
            <li>Personalised quotes</li>
          </ul>
          <p className="hero-demo-note">Product preview with fictional sample listings. No booking or request is submitted.</p>
        </div>
        <div className="hero-collage" aria-hidden="true">
          <div className="hero-collage__tile hero-collage__tile--tall"><span>Spaces</span><i /></div>
          <div className="hero-collage__tile hero-collage__tile--food"><span>Food &amp; drink</span><i /></div>
          <div className="hero-collage__tile hero-collage__tile--photo"><span>Photography</span><i /></div>
          <div className="hero-collage__tile hero-collage__tile--music"><span>Music</span><i /></div>
        </div>
      </div>
    </section>

    <section className="section section--paper">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Everything you need for your event</span>
            <h2>One place for every service</h2>
            <p>From the food on the table to the photographs you keep, explore the professionals who make a gathering feel complete.</p>
          </div>
          <Link className="section-link" to={routes.services}>View all services <span aria-hidden="true">→</span></Link>
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
            <span className="eyebrow">How it works</span>
            <h2>A simpler way to plan your event</h2>
            <p>Submit a request once, then compare the professionals who are right for your services and location.</p>
          </div>
        </div>
        <ol className="steps-grid">
          {steps.map((step) => <li key={step.number}>
            <span className="steps-grid__number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>)}
        </ol>
        <div className="section-foot"><ButtonLink to={routes.customer.newRequest}>Get quotes — it’s free <span aria-hidden="true">→</span></ButtonLink></div>
      </div>
    </section>

    <section className="section section--tint">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Powered by passionate professionals</span>
            <h2>Meet the people behind the moments</h2>
            <p>Sample profiles show how a professional’s services, coverage, and introduction come together. They are fictional demo listings.</p>
          </div>
          <Link className="section-link" to={routes.providers}>Browse all professionals <span aria-hidden="true">→</span></Link>
        </div>
        <div className="pro-grid">{demoProviders.slice(0, 3).map((provider) => <ProviderPreview key={provider.id} provider={provider} />)}</div>
      </div>
    </section>

    <section className="section section--paper">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Why HiddenStage</span>
            <h2>Built around how events come together</h2>
          </div>
        </div>
        <div className="benefits-grid">
          <article>
            <span className="benefit-icon" aria-hidden="true">₹</span>
            <h3>Free to use</h3>
            <p>No commission when you request quotes or book a supplier. You only pay the professionals you choose.</p>
          </article>
          <article>
            <span className="benefit-icon" aria-hidden="true">◎</span>
            <h3>Considered matches</h3>
            <p>Requests are shaped by the service you need and the places a professional explicitly covers — never a vague nearby guess.</p>
          </article>
          <article>
            <span className="benefit-icon" aria-hidden="true">◷</span>
            <h3>Clear comparisons</h3>
            <p>Review each proposal line by line, keep quotation revisions, and see exactly what is included before you decide.</p>
          </article>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="wrap">
        <div className="pro-cta">
          <div className="pro-cta__copy">
            <span className="eyebrow">For event professionals</span>
            <h2>Grow your business with HiddenStage</h2>
            <p>Present your services to people already planning an event, with clear coverage and considered quotations.</p>
            <ul className="check-list">
              <li>Receive requests that match the services you offer</li>
              <li>Manage your profile, coverage, and quotations in one workspace</li>
              <li>Keep control of your pricing and availability</li>
            </ul>
            <ButtonLink to={routes.forProfessionals} variant="secondary">Become a supplier</ButtonLink>
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
            <h2>Ready to find your perfect suppliers?</h2>
            <p>Submit your event details and receive personalised quotes from professionals who fit your plans.</p>
          </div>
          <div className="final-cta__actions">
            <ButtonLink to={routes.customer.newRequest} size="lg">Get quotes — it’s free</ButtonLink>
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
        <div className="how-columns">
          {steps.map((step) => <article key={step.number}>
            <span className="steps-grid__number">{step.number}</span>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>)}
        </div>
        <div className="how-note"><Badge tone="warning">Demo preview</Badge><p>The current preview supports browsing demo content and local event requests. It does not submit enquiries to real providers or take payments.</p></div>
      </div>
    </section>
    <section className="section">
      <div className="wrap faq-layout">
        <div><span className="eyebrow">Questions, answered</span><h2 className="faq-layout__title">A little more clarity before you begin</h2><p>Everything below reflects what this preview actually does.</p></div>
        <div className="faq-list">
          {[
            ['Is HiddenStage free for organisers?', 'Yes. Requesting quotes and comparing proposals is free. In this preview nothing is charged and no payment flow is active.'],
            ['How are professionals matched to my event?', 'Matching uses the service categories in your request and the coverage locations a professional explicitly sets. Nearby areas are not assumed.'],
            ['Can I change my request after sending it?', 'An event can be edited while it is a draft. Once invitations are outstanding, the details lock so professionals are quoting the same brief.'],
            ['What happens after I accept a quote?', 'Acceptance records a commitment with the agreed lines. In this preview no payment or real booking is created.'],
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
          <article><span className="benefit-icon" aria-hidden="true">◫</span><h3>Show what you offer</h3><p>Describe each service, set indicative prices, and keep your profile accurate.</p></article>
          <article><span className="benefit-icon" aria-hidden="true">◎</span><h3>Choose your coverage</h3><p>Only the locations you explicitly serve are used when matching requests to your business.</p></article>
          <article><span className="benefit-icon" aria-hidden="true">▤</span><h3>Quote with clarity</h3><p>Prepare itemised quotations, revise them when needed, and keep a visible revision history.</p></article>
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
        <Card className="about-card"><span className="eyebrow">What we value</span><ul className="check-list"><li>Clarity over noise</li><li>Explicit coverage, not vague proximity</li><li>Decisions made with real information</li></ul></Card>
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
          <div className="help-aside__note"><strong>Still stuck?</strong><p>Use the contact form to see how a message would be validated. Nothing is sent in this preview.</p><Link className="text-link" to={routes.contact}>Go to contact <span aria-hidden="true">→</span></Link></div>
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
    case 'services':
    case 'serviceCategory': return <ServiceDiscoveryPage />
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
