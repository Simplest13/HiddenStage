import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { routes } from '../app/routes/routePaths'
import { Breadcrumb } from '../shared/ui/navigation'
import { Button } from '../shared/ui/primitives'
import { AccountControls } from '../shared/ui/AccountControls'
import { Icon } from '../shared/ui/Icon'
import { profilesApi } from '../shared/api/backend/profiles'
import { useApiData } from '../shared/api/backend/useApiData'
import { getWorkspaceConfig, type WorkspaceAudience } from './workspaceConfig'
import { Brand } from './PublicLayout'
import { useAuth, useAuthActions } from '../app/auth/useAuth'
import './layouts.css'

export function WorkspaceLayout({ audience }: { audience: WorkspaceAudience }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const authActions = useAuthActions()
  const providerProfile = useApiData(
    () => audience === 'provider' ? profilesApi.getProviderProfile() : Promise.resolve(null),
    [audience],
  )
  const config = getWorkspaceConfig(audience, providerProfile.data?.kind)
  const current = config.items.find((item) => location.pathname === item.href || (item.href !== config.home && location.pathname.startsWith(`${item.href}/`)))
  const pageTitle = current?.label ?? config.title
  return <div className={`workspace workspace--${audience}`}>
    <a className="skip-link" href="#workspace-content">Skip to content</a>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`workspace-sidebar ${sidebarOpen ? 'workspace-sidebar--open' : ''}`}>
      <div className="workspace-sidebar__brand"><Brand to={routes.home} inverse /><Button className="sidebar-close" variant="quiet" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><Icon name="close" /></Button></div>
      <div className="workspace-sidebar__label">{config.title}</div>
      <nav aria-label={`${config.title} navigation`} className="workspace-nav">
        {config.items.map((item) => <NavLink key={item.href} to={item.href} end={item.href === config.home} onClick={() => setSidebarOpen(false)}><span className="workspace-nav__icon"><Icon name={item.icon} size={16} /></span>{item.label}</NavLink>)}
      </nav>
      {audience === 'provider' && providerProfile.error && (
        <div role="alert">
          <p>Could not load professional-specific navigation: {providerProfile.error}</p>
          <Button variant="quiet" size="sm" onClick={providerProfile.reload}>Retry</Button>
        </div>
      )}
      <div className="workspace-sidebar__bottom">
        {auth.status === 'authenticated' && auth.user?.isStaff && audience !== 'admin' && (
          <Link to={routes.admin.home} className="workspace-nav__admin-switch" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-orange)' }}>
            <Icon name="settings" size={16} /> Go to Admin workspace
          </Link>
        )}
        {auth.status === 'authenticated' && auth.user?.isStaff && audience === 'admin' && (
          <Link to={routes.customer.home} className="workspace-nav__admin-switch" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-muted)' }}>
            <Icon name="arrowLeft" size={16} /> Customer workspace
          </Link>
        )}
        <span className="workspace-sidebar__note">HiddenStage</span>
        <button
          type="button"
          className="workspace-sidebar__signout"
          onClick={() => void authActions.logout().then(() => navigate(routes.home))}
        >
          <Icon name="logOut" size={16} /> Sign out
        </button>
        <Link to={routes.home} className="workspace-sidebar__return">
          <Icon name="arrowLeft" size={16} /> Return to HiddenStage
        </Link>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar">
        <Button variant="quiet" className="sidebar-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></Button>
        <div className="workspace-topbar__context"><strong>{pageTitle}</strong></div>
        <div className="workspace-topbar__actions">
          <AccountControls variant="workspace" audience={audience} />
        </div>
      </header>
      <main className="workspace-content" id="workspace-content">
        <Breadcrumb items={[{ label: 'Workspace', href: config.home }, { label: pageTitle }]} />
        <Outlet context={providerProfile.data} />
      </main>
    </div>
  </div>
}
