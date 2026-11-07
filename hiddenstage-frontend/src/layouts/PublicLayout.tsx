import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { routes } from '../app/routes/routePaths'
import { ButtonLink } from '../shared/ui/primitives'
import './layouts.css'

const COPYRIGHT_YEAR = new Date().getFullYear()

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link to={routes.home} className={`brand ${inverse ? 'brand--inverse' : ''}`} aria-label="HiddenStage home">
    <span className="brand__mark" aria-hidden="true"><span /><span /><span /></span>
    <span className="brand__word">hidden<span>stage</span></span>
  </Link>
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="public-site">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="topbar">
      <div className="wrap topbar__inner">
        <span className="topbar__note">India’s marketplace for event services — free to use, no commission</span>
        <div className="topbar__links">
          <Link to={routes.help}>Help</Link>
          <Link to={routes.contact}>Contact</Link>
          <a className="topbar__phone" href="tel:+918047182200">+91 80 4718 2200</a>
        </div>
      </div>
    </div>
    <header className="site-header">
      <div className="site-header__inner wrap">
        <Brand />
        <button className="mobile-menu-button" type="button" aria-expanded={menuOpen} aria-controls="public-nav" onClick={() => setMenuOpen((open) => !open)}>
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
        <nav id="public-nav" className={`site-nav ${menuOpen ? 'site-nav--open' : ''}`} aria-label="Main navigation">
          <NavLink to={routes.services} onClick={() => setMenuOpen(false)}>Explore services</NavLink>
          <NavLink to={routes.providers} onClick={() => setMenuOpen(false)}>Providers</NavLink>
          <NavLink to={routes.howItWorks} onClick={() => setMenuOpen(false)}>How it works</NavLink>
          <NavLink to={routes.forProfessionals} onClick={() => setMenuOpen(false)}>For professionals</NavLink>
          <div className="site-nav__actions">
            <Link className="site-nav__login" to={routes.auth.login}>Log in</Link>
            <ButtonLink to={routes.auth.register} variant="secondary" size="sm">List your business</ButtonLink>
            <ButtonLink to={routes.customer.newRequest} size="sm">Get quotes</ButtonLink>
          </div>
        </nav>
      </div>
    </header>
    <main id="main-content"><Outlet /></main>
    <footer className="site-footer">
      <div className="wrap site-footer__main">
        <div className="site-footer__brand">
          <Brand inverse />
          <p>Thoughtful event services and trusted professionals for the gatherings that matter — from intimate dinners to celebrations of every size.</p>
          <span className="badge">Demo marketplace preview</span>
        </div>
        <div className="site-footer__links">
          <div>
            <span className="eyebrow">Discover</span>
            <Link to={routes.services}>All services</Link>
            <Link to={routes.providers}>Event professionals</Link>
            <Link to={routes.howItWorks}>How it works</Link>
          </div>
          <div>
            <span className="eyebrow">Organisers</span>
            <Link to={routes.customer.newRequest}>Request quotes</Link>
            <Link to={routes.auth.login}>Log in</Link>
            <Link to={routes.help}>Help &amp; support</Link>
          </div>
          <div>
            <span className="eyebrow">Professionals</span>
            <Link to={routes.forProfessionals}>Supply a service</Link>
            <Link to={routes.auth.register}>Create an account</Link>
            <Link to={routes.contact}>Contact us</Link>
          </div>
          <div>
            <span className="eyebrow">HiddenStage</span>
            <Link to={routes.about}>About</Link>
            <Link to={routes.privacy}>Privacy (draft)</Link>
            <Link to={routes.terms}>Terms (draft)</Link>
          </div>
        </div>
      </div>
      <div className="wrap site-footer__bottom">
        <span>© {COPYRIGHT_YEAR} HiddenStage. Made for gatherings across India.</span>
        <span>Demo content only — listings, quotes, and verification shown in this preview are not live.</span>
      </div>
    </footer>
  </div>
}
