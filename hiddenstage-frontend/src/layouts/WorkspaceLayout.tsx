import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { routes } from '../app/routes/routePaths'
import { Avatar } from '../shared/ui/primitives'
import { Breadcrumb } from '../shared/ui/navigation'
import { Button } from '../shared/ui/primitives'
import { workspaceConfig, type WorkspaceAudience } from './workspaceConfig'
import { Brand } from './PublicLayout'
import { useAuth, useAuthActions } from '../app/auth/useAuth'
import './layouts.css'

export function WorkspaceLayout({ audience }: { audience: WorkspaceAudience }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const authActions = useAuthActions()
  const config = workspaceConfig[audience]
  const current = config.items.find((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`))
  const pageTitle = current?.label ?? config.title
  return <div className={`workspace workspace--${audience}`}>
    <a className="skip-link" href="#workspace-content">Skip to content</a>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`workspace-sidebar ${sidebarOpen ? 'workspace-sidebar--open' : ''}`}>
      <div className="workspace-sidebar__brand"><Brand /><Button className="sidebar-close" variant="quiet" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>×</Button></div>
      <div className="workspace-sidebar__label">{config.title}</div>
      <nav aria-label={`${config.title} navigation`} className="workspace-nav">
        {config.items.map((item) => <NavLink key={item.href} to={item.href} end={item.href === config.home} onClick={() => setSidebarOpen(false)}><span className="workspace-nav__icon" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}
      </nav>
      <div className="workspace-sidebar__bottom"><span className="workspace-sidebar__note">Workspace preview</span><Link to={routes.home}>← Return to HiddenStage</Link></div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar">
        <Button variant="quiet" className="sidebar-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>☰</Button>
        <div className="workspace-topbar__context"><span className="eyebrow">{config.eyebrow}</span><strong>{pageTitle}</strong></div>
        <div className="workspace-topbar__actions"><Button variant="quiet" className="notification-button" aria-label="Notifications preview, unavailable" disabled>Notifications</Button>{audience === 'customer' ? <button className="account-menu" type="button" aria-label="Log out" onClick={() => authActions.logout().then(() => navigate(routes.home))}><Avatar name={auth.status === 'authenticated' ? auth.customer?.fullName ?? 'Customer' : 'Customer'} size="sm" /><span className="account-menu__label">{auth.status === 'authenticated' ? auth.customer?.fullName ?? 'Customer' : 'Customer'}</span></button> : <button className="account-menu" type="button" aria-label="Account menu placeholder, unavailable" disabled><Avatar name="Account" size="sm" /><span className="account-menu__label">Account</span><span aria-hidden="true">⌄</span></button>}</div>
      </header>
      <main className="workspace-content" id="workspace-content">
        <Breadcrumb items={[{ label: 'Workspace', href: config.home }, { label: pageTitle }]} />
        <Outlet />
      </main>
    </div>
  </div>
}
