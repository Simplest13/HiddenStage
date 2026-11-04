import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { routes } from '../app/routes/routePaths'
import { ButtonLink } from '../shared/ui/primitives'
import './layouts.css'

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
    <header className="site-header">
      <div className="site-header__inner wrap">
        <Brand />
        <button className="mobile-menu-button" type="button" aria-expanded={menuOpen} aria-controls="public-nav" onClick={() => setMenuOpen((open) => !open)}><span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button>
        <nav id="public-nav" className={`site-nav ${menuOpen ? 'site-nav--open' : ''}`} aria-label="Main navigation">
          <NavLink to={routes.services} onClick={() => setMenuOpen(false)}>Explore services</NavLink>
          <NavLink to={routes.providers} onClick={() => setMenuOpen(false)}>Providers</NavLink>
          <NavLink to={routes.howItWorks} onClick={() => setMenuOpen(false)}>How it works</NavLink>
          <NavLink to={routes.forProfessionals} onClick={() => setMenuOpen(false)}>For professionals</NavLink>
          <div className="site-nav__actions"><Link className="text-link" to={routes.auth.login}>Log in</Link><ButtonLink to={routes.auth.register} variant="secondary" size="sm">Get started</ButtonLink></div>
        </nav>
      </div>
    </header>
    <main id="main-content"><Outlet /></main>
    <footer className="site-footer">
      <div className="wrap site-footer__main"><div><Brand inverse /><p>Make room for the moments worth gathering for.</p></div>
        <div className="site-footer__links"><div><span className="eyebrow">Discover</span><Link to={routes.services}>Services</Link><Link to={routes.providers}>Demo providers</Link><Link to={routes.howItWorks}>How it works</Link></div><div><span className="eyebrow">Join in</span><Link to={routes.forProfessionals}>For professionals</Link><Link to={routes.auth.register}>Create an account</Link></div><div><span className="eyebrow">HiddenStage</span><Link to={routes.about}>About</Link><Link to={routes.contact}>Contact</Link><Link to={routes.help}>Help</Link></div><div><span className="eyebrow">Policies · draft</span><Link to={routes.privacy}>Privacy</Link><Link to={routes.terms}>Terms</Link></div></div>
      </div>
      <div className="wrap site-footer__bottom"><span>© HiddenStage</span><span>Made for gatherings across India</span></div>
    </footer>
  </div>
}
