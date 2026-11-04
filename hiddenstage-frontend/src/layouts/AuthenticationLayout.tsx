import { Link, Outlet, useMatches } from 'react-router-dom'
import { Brand } from './PublicLayout'
import { routes } from '../app/routes/routePaths'
import './layouts.css'

export function AuthenticationLayout() {
  const matches = useMatches()
  const page = matches.at(-1)?.handle as { page?: string } | undefined
  const isLogin = page?.page === 'login'
  return <main className="auth-layout">
    <div className="auth-layout__brand"><Brand /></div>
    <section className="auth-card"><Outlet /><p className="auth-card__switch">{isLogin ? 'New to HiddenStage?' : 'Already have an account?'} <Link to={isLogin ? routes.auth.register : routes.auth.login}>{isLogin ? 'Create an account' : 'Log in'}</Link></p></section>
    <p className="auth-layout__note">A thoughtful start to your next gathering.</p>
  </main>
}
