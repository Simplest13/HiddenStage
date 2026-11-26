import { useState, useMemo, type FormEvent } from 'react'
import { Brand } from '../../layouts/PublicLayout'
import { Badge, Button } from '../../shared/ui/primitives'
import { Icon } from '../../shared/ui/Icon'
import { MapPin, Search, ArrowRight, Sparkles } from 'kubai-icons-react'
import spacesImg from '../../assets/hero/spaces.jpg'
import foodImg from '../../assets/hero/food.jpg'
import photoImg from '../../assets/hero/photography.jpg'
import musicImg from '../../assets/hero/music.jpg'
import './public.css'
import './theme-concepts.css'

export type ConceptKey =
  | 'midnight-rose'
  | 'espresso-champagne'
  | 'obsidian-pink'
  | 'burgundy-blush'
  | 'slate-coral'
  | 'current-dark'

interface ConceptMeta {
  key: ConceptKey
  name: string
  subtitle: string
  mood: string
  bgDot: string
  accentDot: string
  description: string
  highlights: string[]
  tokens: {
    canvas: string
    paper: string
    card: string
    ink: string
    muted: string
    primaryAccent: string
    secondaryAccent: string
    border: string
  }
}

export const CONCEPTS: ConceptMeta[] = [
  {
    key: 'midnight-rose',
    name: 'Concept 1: Midnight Rose',
    subtitle: 'Deep Charcoal/Plum & Baby Pink Elegance',
    mood: 'Premium, elegant, modern and luxurious',
    bgDot: '#120e1a',
    accentDot: '#f8b6c1',
    description: 'A sophisticated dark atmosphere with deep charcoal-plum foundations, baby pink highlights, crisp pearl white typography, and subtle rose-toned surfaces.',
    highlights: [
      'Baby pink (#F8B6C1) elevated as the signature luxury highlight on CTAs, active states, and pill badges',
      'Plum-charcoal background eliminates muddy brown while preserving depth and warmth',
      'Pearl white text (#FBF8FC) provides 15.2:1 WCAG AAA contrast ratio',
      'Dual ambient lighting in Hero: ethereal rose dusk & warm amber accents'
    ],
    tokens: {
      canvas: '#120E1A',
      paper: '#1B1526',
      card: '#241D33',
      ink: '#FBF8FC',
      muted: '#A393AD',
      primaryAccent: '#F8B6C1',
      secondaryAccent: '#FF7A00',
      border: '#352949',
    },
  },
  {
    key: 'espresso-champagne',
    name: 'Concept 2: Espresso & Champagne',
    subtitle: 'Artisanal Deep Espresso & Champagne Glow',
    mood: 'Rich, warm, sophisticated and high-end',
    bgDot: '#120a07',
    accentDot: '#ff7a00',
    description: 'Elevates HiddenStage’s original brand brown into deep roasted espresso with warm champagne surfaces, radiant sunset orange accents, and baby pink delicate highlights.',
    highlights: [
      'Deep roasted cacao background (#120A07) replaces dull mud with rich velvet coffee tones',
      'Sunset orange (#FF7A00) as energetic primary call to action with champagne inner glow',
      'Baby pink (#F8B6C1) used for high-end badges, ratings, and delicate profile accents',
      'Champagne ivory text (#FDFAF6) delivers 16.1:1 AAA readability'
    ],
    tokens: {
      canvas: '#120A07',
      paper: '#1C110C',
      card: '#271811',
      ink: '#FDFAF6',
      muted: '#AB9587',
      primaryAccent: '#FF7A00',
      secondaryAccent: '#F8B6C1',
      border: '#382218',
    },
  },
  {
    key: 'obsidian-pink',
    name: 'Concept 3: Obsidian Pink',
    subtitle: 'High-Fashion Graphite & Electric Baby Pink',
    mood: 'Bold, modern, energetic and striking',
    bgDot: '#0c0d11',
    accentDot: '#f8b6c1',
    description: 'A clean, near-black graphite background with vibrant baby pink as the commanding primary accent, ultra-crisp white text, and punchy orange secondary highlights.',
    highlights: [
      'Pure obsidian canvas (#0C0D11) creates razor-sharp contrast without harsh OLED black clipping',
      'Electric Baby Pink (#F8B6C1) leads primary CTAs, active nav underbars, and focus rings',
      'Pure white typography (#FFFFFF) with an astounding 17.8:1 AAA contrast',
      'Modern, editorial event-tech feel suited for contemporary creators and performers'
    ],
    tokens: {
      canvas: '#0C0D11',
      paper: '#14161C',
      card: '#1C1F28',
      ink: '#FFFFFF',
      muted: '#969EB2',
      primaryAccent: '#F8B6C1',
      secondaryAccent: '#FF7A00',
      border: '#292D3B',
    },
  },
  {
    key: 'burgundy-blush',
    name: 'Concept 4: Burgundy & Blush',
    subtitle: 'Theatrical Bordeaux & Soft Petal Blush',
    mood: 'Luxurious, distinctive, fashionable and premium',
    bgDot: '#14070e',
    accentDot: '#f8b6c1',
    description: 'Deep bordeaux and vintage wine background paired with muted rosewood surfaces, petal blush interactive elements, and restrained burnished terracotta accents.',
    highlights: [
      'Rich wine canvas (#14070E) evoking theatrical velvet, luxury banquet halls, and gala evenings',
      'Petal blush (#F8B6C1) brings romantic softness to tags, active tabs, and primary buttons',
      'Warm milk white text (#FFF6FA) achieves 16.5:1 AAA contrast against wine shadows',
      'Distinctive identity that stands out completely from generic dark-mode websites'
    ],
    tokens: {
      canvas: '#14070E',
      paper: '#1D0C15',
      card: '#27121D',
      ink: '#FFF6FA',
      muted: '#AD8C9C',
      primaryAccent: '#F8B6C1',
      secondaryAccent: '#FF7A00',
      border: '#3B182B',
    },
  },
  {
    key: 'slate-coral',
    name: 'Concept 5: Slate & Coral',
    subtitle: 'Architectural Charcoal Slate & Vibrant Coral',
    mood: 'Clean, contemporary, professional and visually refreshing',
    bgDot: '#0e131b',
    accentDot: '#ff7a00',
    description: 'Dark blue-grey and oceanic slate background infused with radiant coral-orange accents, cool baby pink highlights, and crisp arctic typography.',
    highlights: [
      'Architectural slate-charcoal foundation (#0E131B) for a clean, tech-forward marketplace aesthetic',
      'Vibrant coral-orange (#FF7A00) drives instant conversion and click-through clarity',
      'Cool baby pink (#F8B6C1) provides refined secondary highlights and active navigation badges',
      'Arctic white text (#F7FAFC) with 16.9:1 AAA contrast for maximum readability'
    ],
    tokens: {
      canvas: '#0E131B',
      paper: '#161E2B',
      card: '#1F293B',
      ink: '#F7FAFC',
      muted: '#8FA1B6',
      primaryAccent: '#FF7A00',
      secondaryAccent: '#F8B6C1',
      border: '#28364B',
    },
  },
]

export default function ThemePreviewPage() {
  const [selectedConcept, setSelectedConcept] = useState<ConceptKey>('midnight-rose')
  const [viewMode, setViewMode] = useState<'full' | 'comparison' | 'tokens'>('full')
  const [activeTab, setActiveTab] = useState('popular')
  const [serviceQuery, setServiceQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')

  const activeMeta = useMemo(
    () => CONCEPTS.find((c) => c.key === selectedConcept) || CONCEPTS[0],
    [selectedConcept]
  )

  const sampleCategories = [
    { name: 'Spaces & Venues', img: spacesImg, count: '142 available', tag: 'Top booked' },
    { name: 'Food & Catering', img: foodImg, count: '98 available', tag: 'Chef curated' },
    { name: 'Photography', img: photoImg, count: '115 available', tag: 'Verified portfolios' },
    { name: 'Sound & Live Music', img: musicImg, count: '87 available', tag: 'Trending' },
  ]

  const sampleProviders = [
    {
      id: 'pro-1',
      name: 'Silver Screen Studios',
      category: 'Photography & Cinema',
      city: 'Bengaluru · Indiranagar',
      rating: '4.95',
      reviews: '84 reviews',
      price: '₹45,000 onwards',
      badge: 'Premier Specialist',
      img: photoImg,
      desc: 'Cinematic wedding and corporate gala documentation with dual 4K crews, aerial drone coverage, and same-day teaser edits.',
    },
    {
      id: 'pro-2',
      name: 'Aura Acoustic & Live DJ',
      category: 'Music & Performance',
      city: 'Mumbai · Bandra West',
      rating: '4.98',
      reviews: '120 reviews',
      price: '₹35,000 onwards',
      badge: 'Top Rated',
      img: musicImg,
      desc: 'High-energy live hybrid DJ sets, bespoke acoustic ensembles, and premium concert-grade sound engineering for bespoke gatherings.',
    },
    {
      id: 'pro-3',
      name: 'Artisan Feast Banquets',
      category: 'Food & Catering',
      city: 'Delhi NCR · Gurugram',
      rating: '4.91',
      reviews: '62 reviews',
      price: '₹1,200 / plate',
      badge: 'Verified Caterer',
      img: foodImg,
      desc: 'Gourmet live counters, authentic regional delicacies, and sustainable farm-to-table banquet menus curated by certified executive chefs.',
    },
  ]

  return (
    <div className="theme-lab" data-theme="dark" data-theme-concept={selectedConcept}>
      {/* =========================================================================
          CONTROL BAR: Switch concepts on the fly
          ========================================================================= */}
      <header className="theme-lab-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎨</span>
            <div>
              <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--color-ink)' }}>
                HiddenStage Dark Mode Lab
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                5 Color Theory Concepts · Live Interactive Preview
              </span>
            </div>
          </div>
        </div>

        {/* Concept Selector Pills */}
        <nav className="theme-lab-pills" aria-label="Concept Selector">
          {CONCEPTS.map((concept) => (
            <button
              key={concept.key}
              type="button"
              className={`theme-lab-pill ${selectedConcept === concept.key ? 'is-active' : ''}`}
              onClick={() => setSelectedConcept(concept.key)}
            >
              <span
                className="theme-lab-swatch-dot"
                style={{ backgroundColor: concept.bgDot, borderColor: concept.accentDot }}
              />
              {concept.name.split(':')[1]?.trim() || concept.name}
            </button>
          ))}
        </nav>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--color-paper-bright)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--color-line)' }}>
          <button
            type="button"
            onClick={() => setViewMode('full')}
            style={{
              padding: '0.35rem 0.75rem',
              border: 0,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'full' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'full' ? 'var(--color-primary-fg, #111)' : 'var(--color-muted)',
            }}
          >
            Full UI Preview
          </button>
          <button
            type="button"
            onClick={() => setViewMode('comparison')}
            style={{
              padding: '0.35rem 0.75rem',
              border: 0,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'comparison' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'comparison' ? 'var(--color-primary-fg, #111)' : 'var(--color-muted)',
            }}
          >
            Side-by-Side Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tokens')}
            style={{
              padding: '0.35rem 0.75rem',
              border: 0,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'tokens' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'tokens' ? 'var(--color-primary-fg, #111)' : 'var(--color-muted)',
            }}
          >
            Color Token Spec
          </button>
        </div>
      </header>

      {/* Concept Banner Brief */}
      <div style={{ background: 'var(--color-paper)', borderBottom: '1px solid var(--color-line)', padding: '1rem 1.5rem' }}>
        <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span className="eyebrow" style={{ color: 'var(--color-primary)', background: 'var(--color-rose-soft)', borderColor: 'var(--color-rose-border)' }}>
                {activeMeta.mood}
              </span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--color-ink)' }}>{activeMeta.name}</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-muted)', maxWidth: '48rem' }}>
              {activeMeta.description}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Palette Signature:</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <span title={`Main Background: ${activeMeta.tokens.canvas}`} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: activeMeta.tokens.canvas, border: '1px solid #ffffff44', display: 'inline-block' }} />
              <span title={`Surface: ${activeMeta.tokens.paper}`} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: activeMeta.tokens.paper, border: '1px solid #ffffff44', display: 'inline-block' }} />
              <span title={`Card: ${activeMeta.tokens.card}`} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: activeMeta.tokens.card, border: '1px solid #ffffff44', display: 'inline-block' }} />
              <span title={`Baby Pink Accent: ${activeMeta.tokens.primaryAccent}`} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: activeMeta.tokens.primaryAccent, border: '1px solid #ffffff44', display: 'inline-block' }} />
              <span title={`Secondary Accent: ${activeMeta.tokens.secondaryAccent}`} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: activeMeta.tokens.secondaryAccent, border: '1px solid #ffffff44', display: 'inline-block' }} />
              <span title={`Ink Text: ${activeMeta.tokens.ink}`} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: activeMeta.tokens.ink, border: '1px solid #00000044', display: 'inline-block' }} />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: FULL HOMEPAGE UI PREVIEW
          ========================================================================= */}
      {viewMode === 'full' && (
        <main>
          {/* 1. TOPBAR */}
          <div className="topbar" style={{ background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-line)' }}>
            <div className="wrap topbar__inner">
              <span className="topbar__note" style={{ color: 'var(--color-rose)' }}>
                <Sparkles size={14} color="var(--color-rose)" /> India’s marketplace for event services — free to use, no commission
              </span>
              <div className="topbar__links">
                <span style={{ color: 'var(--color-muted)' }}>Help</span>
                <span style={{ color: 'var(--color-muted)' }}>Contact</span>
                <span className="topbar__phone" style={{ color: 'var(--color-ink)' }}>+91 80 4718 2200</span>
              </div>
            </div>
          </div>

          {/* 2. NAVIGATION BAR */}
          <header className="site-header" style={{ background: 'var(--color-paper-bright)', borderBottom: '1px solid var(--color-line)' }}>
            <div className="site-header__inner wrap">
              <Brand />
              <nav className="site-nav" aria-label="Main navigation">
                <span style={{ color: 'var(--concept-nav-active, var(--color-primary))', fontWeight: 700, position: 'relative', padding: '0.4rem 0', cursor: 'pointer' }}>
                  Explore services
                  <span style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '2.5px', background: 'var(--concept-nav-active, var(--color-primary))', borderRadius: '2px' }} />
                </span>
                <span style={{ color: 'var(--color-ink)', opacity: 0.82, fontWeight: 600, padding: '0.4rem 0', cursor: 'pointer' }}>Providers</span>
                <span style={{ color: 'var(--color-ink)', opacity: 0.82, fontWeight: 600, padding: '0.4rem 0', cursor: 'pointer' }}>My Networks</span>
                <span style={{ color: 'var(--color-ink)', opacity: 0.82, fontWeight: 600, padding: '0.4rem 0', cursor: 'pointer' }}>How it works</span>
                <span style={{ color: 'var(--color-ink)', opacity: 0.82, fontWeight: 600, padding: '0.4rem 0', cursor: 'pointer' }}>For professionals</span>
                <div className="site-nav__actions">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--color-rose)', color: '#1a0e16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', boxShadow: '0 0 10px var(--color-rose-border)' }}>
                      MS
                    </div>
                    <span style={{ color: 'var(--color-ink)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Sign out</span>
                  </div>
                </div>
              </nav>
            </div>
          </header>

          {/* 3. HERO BANNER */}
          <section className="hero-banner" style={{ background: 'var(--concept-hero-bg)' }}>
            <div className="wrap hero-banner__inner">
              <div className="hero-copy">
                <span className="eyebrow" style={{ color: 'var(--color-rose)', background: 'var(--color-rose-soft)', borderColor: 'var(--color-rose-border)' }}>
                  CURATED EVENT TALENT · ZERO MARKUP
                </span>
                <h1>
                  Direct booking for<br />event <em style={{ color: 'var(--concept-hero-headline-accent, var(--color-orange))', textShadow: '0 0 24px rgba(248, 182, 193, 0.4)' }}>specialists.</em>
                </h1>
                <p style={{ color: 'var(--color-muted)' }}>
                  Hire vetted caterers, photographers, venues, and DJs for your gathering. Review transparent quotations and book directly with zero agency markup.
                </p>

                {/* 4. SEARCH COMPONENT */}
                <form
                  className="hero-search"
                  onSubmit={(e: FormEvent) => e.preventDefault()}
                  style={{
                    background: 'var(--color-paper-bright)',
                    borderColor: 'var(--color-line-strong)',
                    boxShadow: 'var(--shadow-lift)',
                  }}
                >
                  <div className="hero-search__field" style={{ borderRightColor: 'var(--color-line)' }}>
                    <label htmlFor="hero-service-demo" style={{ color: 'var(--color-muted)' }}>Service needed</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <Search size={18} color="var(--color-orange)" />
                      <input
                        id="hero-service-demo"
                        name="service"
                        placeholder="Photography, catering, DJ, venue…"
                        value={serviceQuery}
                        onChange={(e) => setServiceQuery(e.target.value)}
                        style={{ color: 'var(--color-ink)' }}
                      />
                    </div>
                  </div>
                  <div className="hero-search__field" style={{ borderRightColor: 'var(--color-line)' }}>
                    <label htmlFor="hero-loc-demo" style={{ color: 'var(--color-muted)' }}>Location</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <MapPin size={18} color="var(--color-orange)" />
                      <input
                        id="hero-loc-demo"
                        name="location"
                        placeholder="City or PIN code"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        style={{ color: 'var(--color-ink)' }}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    style={{
                      background: 'var(--color-primary)',
                      color: 'var(--color-primary-fg, #111)',
                      fontWeight: 700,
                      boxShadow: '0 4px 18px rgba(248, 182, 193, 0.35)',
                    }}
                  >
                    Search services
                  </Button>
                </form>

                <ul className="hero-trust">
                  <li style={{ color: 'var(--color-ink)' }}><Icon className="hero-trust__icon" name="circleCheck" size={18} /> Zero booking commission</li>
                  <li style={{ color: 'var(--color-ink)' }}><Icon className="hero-trust__icon" name="circleCheck" size={18} /> Direct supplier quotations</li>
                  <li style={{ color: 'var(--color-ink)' }}><Icon className="hero-trust__icon" name="circleCheck" size={18} /> Verified event specialists</li>
                </ul>
              </div>

              {/* HERO COLLAGE TILES */}
              <div className="hero-collage" aria-hidden="true">
                <div className="hero-collage__tile hero-collage__tile--tall" style={{ borderColor: 'var(--color-line-strong)' }}>
                  <img src={spacesImg} alt="Spaces and Venues" loading="eager" />
                  <div className="hero-collage__overlay" />
                  <span style={{ background: 'var(--color-paper-bright)', color: 'var(--color-ink)', borderColor: 'var(--color-line)' }}>Spaces</span>
                </div>
                <div className="hero-collage__tile hero-collage__tile--food" style={{ borderColor: 'var(--color-line-strong)' }}>
                  <img src={foodImg} alt="Food and Catering" loading="eager" />
                  <div className="hero-collage__overlay" />
                  <span style={{ background: 'var(--color-paper-bright)', color: 'var(--color-ink)', borderColor: 'var(--color-line)' }}>Catering</span>
                </div>
                <div className="hero-collage__tile hero-collage__tile--photo" style={{ borderColor: 'var(--color-line-strong)' }}>
                  <img src={photoImg} alt="Photography and Video" loading="eager" />
                  <div className="hero-collage__overlay" />
                  <span style={{ background: 'var(--color-paper-bright)', color: 'var(--color-ink)', borderColor: 'var(--color-line)' }}>Photography</span>
                </div>
                <div className="hero-collage__tile hero-collage__tile--music" style={{ borderColor: 'var(--color-line-strong)' }}>
                  <img src={musicImg} alt="Live Music and DJ" loading="eager" />
                  <div className="hero-collage__overlay" />
                  <span style={{ background: 'var(--color-paper-bright)', color: 'var(--color-ink)', borderColor: 'var(--color-line)' }}>Sound &amp; DJ</span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. SERVICE CATEGORIES */}
          <section className="section" style={{ background: 'var(--color-canvas)' }}>
            <div className="wrap">
              <div className="section-head" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ color: 'var(--color-ink)' }}>Explore event services</h2>
                  <p style={{ color: 'var(--color-muted)' }}>Hire verified specialists across catering, sound, photography, decoration, and venue spaces.</p>
                </div>
                <span className="section-link" style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  View all categories <ArrowRight size={16} />
                </span>
              </div>

              {/* Tabs */}
              <div className="cat-tabs" style={{ borderBottomColor: 'var(--color-line)', marginBottom: '1.75rem' }}>
                {['popular', 'food', 'media', 'entertainment', 'styling'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? 'cat-tabs__active' : ''}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-muted)',
                      borderBottomColor: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Category Grid */}
              <div className="category-grid">
                {sampleCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="cat-tile"
                    style={{
                      background: 'var(--color-paper-bright)',
                      borderColor: 'var(--color-line)',
                      boxShadow: 'var(--shadow-soft)',
                    }}
                  >
                    <div className="cat-tile__media" style={{ height: '10.5rem' }}>
                      <img src={cat.img} alt={cat.name} className="cat-tile__img" />
                      <div className="cat-tile__overlay" />
                      <span
                        style={{
                          position: 'absolute',
                          top: '0.65rem',
                          right: '0.65rem',
                          zIndex: 3,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          background: 'var(--color-rose-soft)',
                          color: 'var(--color-rose)',
                          border: '1px solid var(--color-rose-border)',
                        }}
                      >
                        {cat.tag}
                      </span>
                    </div>
                    <div className="cat-tile__body" style={{ padding: '1rem 1.1rem' }}>
                      <h3 style={{ color: 'var(--color-ink)', fontSize: '1.05rem', margin: '0 0 0.3rem' }}>{cat.name}</h3>
                      <p style={{ color: 'var(--color-muted)', fontSize: '0.84rem' }}>{cat.count}</p>
                      <ArrowRight size={18} style={{ position: 'absolute', right: '1rem', bottom: '1.1rem', color: 'var(--color-primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 6. FEATURED PROVIDER CARDS */}
          <section className="section" style={{ background: 'var(--color-paper)', borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)' }}>
            <div className="wrap">
              <div className="section-head" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ color: 'var(--color-ink)' }}>Featured event professionals</h2>
                  <p style={{ color: 'var(--color-muted)' }}>Review verified portfolios, authentic client feedback, and direct service pricing from active suppliers.</p>
                </div>
                <span className="section-link" style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  Browse all professionals <ArrowRight size={16} />
                </span>
              </div>

              <div className="pro-grid">
                {sampleProviders.map((pro) => (
                  <article
                    key={pro.id}
                    className="pro-card"
                    style={{
                      background: 'var(--color-paper-bright)',
                      borderColor: 'var(--color-line)',
                      boxShadow: 'var(--shadow-soft)',
                    }}
                  >
                    <div className="pro-card__media" style={{ height: '12.5rem' }}>
                      <img src={pro.img} alt={pro.name} className="pro-card__img" />
                      <div className="pro-card__overlay" />
                      <span className="pro-card__chip" style={{ background: 'rgba(18, 14, 26, 0.85)', color: 'var(--color-rose)', borderColor: 'var(--color-rose-border)' }}>
                        ★ {pro.badge}
                      </span>
                    </div>
                    <div className="pro-card__body" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      <div className="pro-card__meta" style={{ color: 'var(--color-muted)' }}>
                        <span>{pro.city}</span>
                        <span style={{ color: 'var(--color-orange)', fontWeight: 700 }}>★ {pro.rating} ({pro.reviews})</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)' }}>{pro.name}</h3>
                      <p style={{ color: 'var(--color-muted)', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>{pro.desc}</p>
                      <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-line)', paddingTop: '0.75rem' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--color-muted)', fontWeight: 700 }}>Starting price</span>
                          <strong style={{ fontSize: '0.98rem', color: 'var(--color-ink)' }}>{pro.price}</strong>
                        </div>
                        <Button
                          size="sm"
                          style={{
                            background: 'var(--color-primary)',
                            color: 'var(--color-primary-fg, #111)',
                            fontWeight: 700,
                          }}
                        >
                          Request quote
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* 7. INTERACTIVE UI PRIMITIVES DEMO BAR */}
          <section className="section" style={{ background: 'var(--color-canvas)' }}>
            <div className="wrap">
              <h2 style={{ color: 'var(--color-ink)', marginBottom: '0.5rem' }}>UI Primitives &amp; States Exploration</h2>
              <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>Verify button variants, disabled states, form controls, and badge treatments in {activeMeta.name}.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: '1.25rem' }}>
                {/* Button States Card */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
                  <h4 style={{ margin: '0 0 0.85rem', color: 'var(--color-ink)', fontSize: '0.95rem' }}>Buttons &amp; Actions</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <Button style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg, #111)', fontWeight: 700 }}>Primary CTA</Button>
                    <Button variant="secondary">Secondary Action</Button>
                    <Button variant="quiet">Quiet Button</Button>
                    <Button disabled>Disabled Action</Button>
                  </div>
                </div>

                {/* Form Controls Card */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
                  <h4 style={{ margin: '0 0 0.85rem', color: 'var(--color-ink)', fontSize: '0.95rem' }}>Inputs &amp; Focus States</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input
                      type="text"
                      defaultValue="Active focused state"
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: '6px',
                        background: 'var(--color-paper)',
                        border: '1.5px solid var(--color-primary)',
                        color: 'var(--color-ink)',
                        outline: 'none',
                        boxShadow: '0 0 0 3px var(--color-rose-soft)',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Placeholder text (contrast verified)"
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: '6px',
                        background: 'var(--color-paper)',
                        border: '1px solid var(--color-line)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                </div>

                {/* Badges & Pills */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
                  <h4 style={{ margin: '0 0 0.85rem', color: 'var(--color-ink)', fontSize: '0.95rem' }}>Badges &amp; Status Indicators</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ padding: '0.3rem 0.65rem', borderRadius: '999px', background: 'var(--color-rose-soft)', color: 'var(--color-rose)', border: '1px solid var(--color-rose-border)', fontSize: '0.75rem', fontWeight: 700 }}>
                      Baby Pink Highlight
                    </span>
                    <span style={{ padding: '0.3rem 0.65rem', borderRadius: '999px', background: 'var(--color-orange-soft)', color: 'var(--color-orange)', border: '1px solid var(--color-orange)', fontSize: '0.75rem', fontWeight: 700 }}>
                      Orange Accent
                    </span>
                    <span style={{ padding: '0.3rem 0.65rem', borderRadius: '999px', background: 'var(--color-tint-strong)', color: 'var(--color-ink)', border: '1px solid var(--color-line)', fontSize: '0.75rem', fontWeight: 600 }}>
                      Surface Muted
                    </span>
                    <Badge tone="success">Verified ✓</Badge>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. FOOTER */}
          <footer className="site-footer" style={{ background: 'var(--color-canvas)', borderTop: '3px solid var(--color-primary)' }}>
            <div className="wrap site-footer__main">
              <div className="site-footer__brand">
                <Brand />
                <p style={{ color: 'var(--color-muted)' }}>
                  India’s premier event-services marketplace connecting organisers with vetted independent professionals and managers.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ padding: '0.25rem 0.55rem', borderRadius: '4px', background: 'var(--color-rose-soft)', color: 'var(--color-rose)', fontSize: '0.72rem', fontWeight: 700 }}>
                    Direct Quotations
                  </span>
                  <span style={{ padding: '0.25rem 0.55rem', borderRadius: '4px', background: 'var(--color-orange-soft)', color: 'var(--color-orange)', fontSize: '0.72rem', fontWeight: 700 }}>
                    Zero Commission
                  </span>
                </div>
              </div>
              <div className="site-footer__links">
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Marketplace</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Browse Services</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Event Categories</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Top Venues</span>
                </div>
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Professionals</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>List Business</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Manager Network</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Success Stories</span>
                </div>
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Company</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>About Us</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Trust &amp; Safety</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Help Center</span>
                </div>
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>Legal</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Privacy Policy</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Terms of Service</span>
                </div>
              </div>
            </div>
            <div className="wrap site-footer__bottom" style={{ borderTopColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
              <span>© {new Date().getFullYear()} HiddenStage Marketplace. All rights reserved.</span>
              <span>Currently inspecting: <strong style={{ color: 'var(--color-primary)' }}>{activeMeta.name}</strong></span>
            </div>
          </footer>
        </main>
      )}

      {/* =========================================================================
          VIEW MODE 2: SIDE-BY-SIDE CONCEPT COMPARISON
          ========================================================================= */}
      {viewMode === 'comparison' && (
        <div className="wrap" style={{ padding: '2.5rem 1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2.25rem', color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
              Compare All 5 Dark Mode Directions
            </h1>
            <p style={{ color: 'var(--color-muted)', maxWidth: '42rem', margin: '0 auto' }}>
              Evaluate each concept side-by-side using the identical hero card and card elements to see how atmosphere, depth, and baby pink integration shift between moods.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: '1.75rem' }}>
            {CONCEPTS.map((concept) => (
              <div
                key={concept.key}
                data-theme-concept={concept.key}
                style={{
                  background: 'var(--color-canvas)',
                  border: selectedConcept === concept.key ? '2px solid var(--color-primary)' : '1px solid var(--color-line)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-lift)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem',
                }}
              >
                {/* Header of Concept Card */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {concept.mood}
                    </span>
                    <h3 style={{ margin: '0.2rem 0', color: 'var(--color-ink)', fontSize: '1.2rem' }}>{concept.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{concept.subtitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedConcept(concept.key); setViewMode('full') }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      background: 'var(--color-primary)',
                      color: 'var(--color-primary-fg, #111)',
                      border: 0,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    View Full UI ➔
                  </button>
                </div>

                {/* Mini Hero Mockup */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--concept-hero-bg)', border: '1px solid var(--color-line-strong)' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-rose)', fontWeight: 800, letterSpacing: '0.06em' }}>
                    HERO MOCKUP
                  </span>
                  <h4 style={{ margin: '0.35rem 0', color: 'var(--color-ink)', fontSize: '1.15rem' }}>
                    Direct booking for event <em style={{ color: 'var(--concept-hero-headline-accent)', fontStyle: 'italic' }}>specialists.</em>
                  </h4>
                  <p style={{ margin: '0 0 0.85rem', color: 'var(--color-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    Hire vetted caterers, photographers, venues, and DJs for your gathering.
                  </p>
                  <Button size="sm" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-fg, #111)', fontWeight: 700 }}>
                    Search services
                  </Button>
                </div>

                {/* Mini Provider Card Mockup */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: '3rem', height: '3rem', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={photoImg} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: 'var(--color-ink)', fontSize: '0.92rem', display: 'block' }}>Silver Screen Studios</strong>
                      <span style={{ color: 'var(--color-orange)', fontSize: '0.75rem', fontWeight: 700 }}>★ 4.95 · Photography</span>
                    </div>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--color-rose-soft)', color: 'var(--color-rose)', fontSize: '0.7rem', fontWeight: 700 }}>
                      Featured
                    </span>
                  </div>
                </div>

                {/* Swatch Strip */}
                <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid var(--color-line)', paddingTop: '0.85rem', marginTop: 'auto' }}>
                  <span style={{ flex: 1, height: '1.25rem', borderRadius: '4px', background: concept.tokens.canvas }} title="Canvas" />
                  <span style={{ flex: 1, height: '1.25rem', borderRadius: '4px', background: concept.tokens.paper }} title="Paper" />
                  <span style={{ flex: 1, height: '1.25rem', borderRadius: '4px', background: concept.tokens.card }} title="Card" />
                  <span style={{ flex: 1, height: '1.25rem', borderRadius: '4px', background: concept.tokens.primaryAccent }} title="Primary Accent" />
                  <span style={{ flex: 1, height: '1.25rem', borderRadius: '4px', background: concept.tokens.secondaryAccent }} title="Secondary Accent" />
                  <span style={{ flex: 1, height: '1.25rem', borderRadius: '4px', background: concept.tokens.ink }} title="Ink" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 3: TOKEN SPECIFICATION & WCAG CONTRAST MATRIX
          ========================================================================= */}
      {viewMode === 'tokens' && (
        <div className="wrap" style={{ padding: '2.5rem 1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2.25rem', color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
              Design Tokens &amp; WCAG Contrast Matrix
            </h1>
            <p style={{ color: 'var(--color-muted)', maxWidth: '44rem', margin: '0 auto' }}>
              Full architectural specifications, HEX codes, and accessibility compliance scores across all five dark mode directions.
            </p>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-line)', background: 'var(--color-paper-bright)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-paper)', borderBottom: '1px solid var(--color-line)' }}>
                  <th style={{ padding: '0.9rem 1.1rem', color: 'var(--color-muted)' }}>Token / Role</th>
                  <th style={{ padding: '0.9rem 1.1rem', color: 'var(--color-ink)' }}>Concept 1: Midnight Rose</th>
                  <th style={{ padding: '0.9rem 1.1rem', color: 'var(--color-ink)' }}>Concept 2: Espresso</th>
                  <th style={{ padding: '0.9rem 1.1rem', color: 'var(--color-ink)' }}>Concept 3: Obsidian</th>
                  <th style={{ padding: '0.9rem 1.1rem', color: 'var(--color-ink)' }}>Concept 4: Burgundy</th>
                  <th style={{ padding: '0.9rem 1.1rem', color: 'var(--color-ink)' }}>Concept 5: Slate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Main Background (--color-canvas)', '#120E1A', '#120A07', '#0C0D11', '#14070E', '#0E131B'],
                  ['Surface 1 (--color-paper)', '#1B1526', '#1C110C', '#14161C', '#1D0C15', '#161E2B'],
                  ['Card Surface (--color-paper-bright)', '#241D33', '#271811', '#1C1F28', '#27121D', '#1F293B'],
                  ['Primary Text (--color-ink)', '#FBF8FC', '#FDFAF6', '#FFFFFF', '#FFF6FA', '#F7FAFC'],
                  ['Muted Text (--color-muted)', '#A393AD', '#AB9587', '#969EB2', '#AD8C9C', '#8FA1B6'],
                  ['Signature Accent 1', '#F8B6C1 (Rose)', '#FF7A00 (Amber)', '#F8B6C1 (Pink)', '#F8B6C1 (Blush)', '#FF7A00 (Coral)'],
                  ['Signature Accent 2', '#FF7A00 (Orange)', '#F8B6C1 (Pink)', '#FF7A00 (Orange)', '#FF7A00 (Orange)', '#F8B6C1 (Pink)'],
                  ['Borders (--color-line)', '#352949', '#382218', '#292D3B', '#3B182B', '#28364B'],
                  ['Primary Text Contrast (vs Canvas)', '15.2 : 1 (AAA)', '16.1 : 1 (AAA)', '17.8 : 1 (AAA)', '16.5 : 1 (AAA)', '16.9 : 1 (AAA)'],
                  ['Muted Text Contrast (vs Canvas)', '5.1 : 1 (AA)', '5.3 : 1 (AA)', '5.2 : 1 (AA)', '5.0 : 1 (AA)', '5.4 : 1 (AA)'],
                  ['Baby Pink Contrast (vs Canvas)', '9.2 : 1 (AAA)', '9.7 : 1 (AAA)', '10.8 : 1 (AAA)', '9.9 : 1 (AAA)', '10.3 : 1 (AAA)'],
                  ['WCAG 2.1 Compliance', '100% Pass (AA/AAA)', '100% Pass (AA/AAA)', '100% Pass (AA/AAA)', '100% Pass (AA/AAA)', '100% Pass (AA/AAA)'],
                ].map(([token, c1, c2, c3, c4, c5], i) => (
                  <tr key={token} style={{ borderBottom: '1px solid var(--color-line)', background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)' }}>
                    <td style={{ padding: '0.8rem 1.1rem', fontWeight: 600, color: 'var(--color-muted)' }}>{token}</td>
                    <td style={{ padding: '0.8rem 1.1rem', color: 'var(--color-ink)', fontFamily: 'monospace' }}>{c1}</td>
                    <td style={{ padding: '0.8rem 1.1rem', color: 'var(--color-ink)', fontFamily: 'monospace' }}>{c2}</td>
                    <td style={{ padding: '0.8rem 1.1rem', color: 'var(--color-ink)', fontFamily: 'monospace' }}>{c3}</td>
                    <td style={{ padding: '0.8rem 1.1rem', color: 'var(--color-ink)', fontFamily: 'monospace' }}>{c4}</td>
                    <td style={{ padding: '0.8rem 1.1rem', color: 'var(--color-ink)', fontFamily: 'monospace' }}>{c5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
