import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { routes } from '../app/routes/routePaths'
import { Avatar } from '../shared/ui/primitives'
import { Breadcrumb } from '../shared/ui/navigation'
import { Button } from '../shared/ui/primitives'
import { NotificationDropdown } from '../shared/ui/NotificationDropdown'
import { ThemeToggle } from '../shared/ui/ThemeToggle'
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
  const current = config.items.find((item) => location.pathname === item.href || (item.href !== config.home && location.pathname.startsWith(`${item.href}/`)))
  const pageTitle = current?.label ?? config.title
  return <div className={`workspace workspace--${audience}`}>
    <a className="skip-link" href="#workspace-content">Skip to content</a>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`workspace-sidebar ${sidebarOpen ? 'workspace-sidebar--open' : ''}`}>
      <div className="workspace-sidebar__brand"><Brand to={routes.home} inverse /><Button className="sidebar-close" variant="quiet" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>×</Button></div>
      <div className="workspace-sidebar__label">{config.title}</div>
      <nav aria-label={`${config.title} navigation`} className="workspace-nav">
        {config.items.map((item) => <NavLink key={item.href} to={item.href} end={item.href === config.home} onClick={() => setSidebarOpen(false)}><span className="workspace-nav__icon" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}
      </nav>
      <div className="workspace-sidebar__bottom">
        {auth.status === 'authenticated' && auth.user?.isStaff && audience !== 'admin' && (
          <Link to={routes.admin.home} className="workspace-nav__admin-switch" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-primary-600, #4f46e5)' }}>
            ⚙ Go to Admin workspace
          </Link>
        )}
        {auth.status === 'authenticated' && auth.user?.isStaff && audience === 'admin' && (
          <Link to={routes.customer.home} className="workspace-nav__admin-switch" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted, #64748b)' }}>
            ← Customer workspace
          </Link>
        )}
        <span className="workspace-sidebar__note">HiddenStage</span>
        <Link to={routes.home}>← Return to HiddenStage</Link>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar">
        <Button variant="quiet" className="sidebar-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>☰</Button>
        <div className="workspace-topbar__context"><strong>{pageTitle}</strong></div>
        <div className="workspace-topbar__actions">
          <ThemeToggle />
          <NotificationDropdown />
          <button
            className="account-menu"
            type="button"
            aria-label={`Account menu: ${auth.status === 'authenticated' ? auth.user?.fullName ?? '' : ''}`}
            onClick={() => navigate(routes.app.settings)}
          >
            {auth.status === 'authenticated' && auth.user?.avatarUrl ? (
              <img
                src={auth.user.avatarUrl}
                alt={auth.user.fullName}
                style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <Avatar
                name={auth.status === 'authenticated' ? auth.user?.fullName ?? 'Account' : 'Account'}
                size="sm"
              />
            )}
            <span className="account-menu__label">
              {auth.status === 'authenticated'
                ? auth.user?.username
                  ? `@${auth.user.username}`
                  : auth.user?.fullName ?? 'Account'
                : 'Account'}
            </span>
          </button>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => void authActions.logout().then(() => navigate(routes.home))}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="workspace-content" id="workspace-content">
        <Breadcrumb items={[{ label: 'Workspace', href: config.home }, { label: pageTitle }]} />
        <Outlet />
      </main>
    </div>
  </div>
}
