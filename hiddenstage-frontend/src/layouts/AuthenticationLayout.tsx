import { Link, Outlet, useMatches } from 'react-router-dom'
import { Brand } from './PublicLayout'
import { routes } from '../app/routes/routePaths'
import './layouts.css'

export function AuthenticationLayout() {
  const matches = useMatches()
  const page = matches.at(-1)?.handle as { page?: string } | undefined
  const isLogin = page?.page === 'login'
  return <main className="auth-layout">
    <aside className="auth-layout__aside">
      <Brand inverse />
      <div>
        <span className="eyebrow">For the days that bring us together</span>
        <h2>Find the right people for the moment you’re planning.</h2>
        <p>Tell us what your event needs, compare considered proposals, and choose the professionals you want to work with.</p>
        <ul className="auth-layout__list">
          <li>Free to use — no commission on your booking</li>
          <li>Personalised quotes for every service</li>
          <li>Compare experience, coverage, and price in one place</li>
        </ul>
      </div>
      <p className="auth-layout__quote">“A good event starts with the right people in the room — and the right people behind it.”</p>
    </aside>
    <section className="auth-layout__panel">
      <div className="auth-layout__top">
        <Brand />
        <Link to={routes.home}>← Back to HiddenStage</Link>
      </div>
      <section className="auth-card">
        <Outlet />
        <p className="auth-card__switch">{isLogin ? 'New to HiddenStage?' : 'Already have an account?'} <Link to={isLogin ? routes.auth.register : routes.auth.login}>{isLogin ? 'Create an account' : 'Log in'}</Link></p>
      </section>
      <p className="auth-layout__note">Demo preview — no email is sent and no payment is taken.</p>
    </section>
  </main>
}
