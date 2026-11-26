import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/auth/useAuth'
import { routes } from '../../app/routes/routePaths'
import { networkApi } from '../api/backend/ecosystem'
import { subscribeToRealtime } from '../api/realtime'
import { Avatar } from './primitives'
import { Icon } from './Icon'
import { ThemeToggle } from './ThemeToggle'
import { NotificationDropdown } from './NotificationDropdown'

export interface AccountControlsProps {
  variant?: 'public' | 'workspace'
  audience?: 'customer' | 'provider' | 'admin' | 'business'
}

export function AccountControls({ variant = 'workspace', audience = 'customer' }: AccountControlsProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [unreadMessages, setUnreadMessages] = useState(0)

  const isAuthenticated = auth.status === 'authenticated'
  const isProvider = isAuthenticated && (auth.user?.accountType === 'PROVIDER' || auth.roles.includes('PROVIDER'))

  const messagesPath = isProvider
    ? routes.provider.customerNetwork
    : routes.customer.network

  const workspacePath = isAuthenticated
    ? auth.user.isStaff
      ? routes.admin.home
      : auth.user.accountType === 'PROVIDER'
      ? routes.provider.home
      : routes.customer.home
    : routes.customer.home

  const settingsPath = audience === 'provider' || (isProvider && variant === 'workspace')
    ? routes.provider.settings
    : routes.app.settings

  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true

    async function loadUnreadCount() {
      try {
        const convs = await networkApi.listConversations()
        if (isMounted && Array.isArray(convs)) {
          const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0)
          setUnreadMessages(total)
        }
      } catch {
        // ignore if network/session fails
      }
    }

    void loadUnreadCount()

    const unsubscribe = subscribeToRealtime((evt) => {
      if (evt.type === 'message' || evt.type === 'chat' || evt.type === 'conversation') {
        void loadUnreadCount()
      }
    })

    const timer = setInterval(() => {
      void loadUnreadCount()
    }, 60000)

    return () => {
      isMounted = false
      unsubscribe()
      clearInterval(timer)
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return null
  }

  const user = auth.user
  const avatarElement = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.fullName}
      style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <Avatar name={user.fullName || 'User'} size="sm" />
  )

  return (
    <div className="account-controls" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
      {/* 1. Theme toggle */}
      <ThemeToggle />

      {/* 2. Messages button */}
      <button
        type="button"
        className="account-control-btn messages-btn"
        aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}
        title={unreadMessages > 0 ? `Messages (${unreadMessages} unread)` : 'Messages'}
        onClick={() => navigate(messagesPath)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.4rem',
          height: '2.4rem',
          borderRadius: '50%',
          border: '1px solid var(--color-line)',
          background: 'var(--color-paper-bright)',
          color: 'var(--color-ink)',
          cursor: 'pointer',
          fontSize: '1.05rem',
          transition: 'all 0.15s ease',
          padding: 0,
        }}
      >
        <Icon name="message" size={18} />
        {unreadMessages > 0 && (
          <span
            className="messages-badge"
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '1.15rem',
              height: '1.15rem',
              padding: '0 0.25rem',
              borderRadius: '999px',
              background: 'var(--color-orange)',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 5px rgba(255, 122, 0, 0.4)',
              lineHeight: 1,
            }}
          >
            {unreadMessages > 9 ? '9+' : unreadMessages}
          </span>
        )}
      </button>

      {/* 3. Notifications dropdown */}
      <NotificationDropdown />

      {/* 4. Profile picture / avatar */}
      {variant === 'public' ? (
        <Link
          to={workspacePath}
          className="account-pfp-link site-nav__pfp"
          aria-label={`Go to workspace (${user.fullName})`}
          title={`Signed in as ${user.fullName} — Go to workspace`}
        >
          {avatarElement}
        </Link>
      ) : (
        <button
          className="account-menu"
          type="button"
          aria-label={`Account menu: ${user.fullName}`}
          title={`Signed in as ${user.fullName} — Account settings`}
          onClick={() => navigate(settingsPath)}
        >
          {avatarElement}
          <span className="account-menu__label">
            {user.username ? `@${user.username}` : user.fullName || 'Account'}
          </span>
        </button>
      )}
    </div>
  )
}
