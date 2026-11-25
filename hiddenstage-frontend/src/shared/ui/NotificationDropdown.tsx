import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionApi } from '../api/backend/session'
import { subscribeToRealtime } from '../api/realtime'
import type { ApiNotification } from '../api/backend/types'
import { useAuth } from '../../app/auth/useAuth'
import { Icon, type IconName } from './Icon'

function resolveNotificationUrl(item: ApiNotification, roles: readonly string[]): string {
  const url = item.action_url
  if (!url) return ''
  const isProvider = roles.includes('PROVIDER')
  const isCustomer = roles.includes('CUSTOMER')

  if (isProvider) {
    if (
      item.notification_type === 'CONNECTION' ||
      item.notification_type === 'MESSAGE' ||
      item.title.toLowerCase().includes('customer') ||
      url.includes('customer-network') ||
      url === '/app/network' ||
      url === '/network'
    ) {
      return '/app/provider/customer-network'
    }
    if (url === '/app/payments' || url === '/payments') return '/app/provider/commitments'
    if (url === '/app/bookings' || url === '/bookings') return '/app/provider/commitments'
    if (url === '/app/events' || url === '/events') return '/app/provider/opportunities'
    if (url.startsWith('/provider/commitments')) return '/app/provider/commitments'
    if (url.startsWith('/provider/')) return `/app${url}`
    if (url.startsWith('/app/customer/')) return '/app/provider/customer-network'
    return url
  }

  if (isCustomer) {
    if (url.startsWith('/app/provider/network') || url.startsWith('/app/provider/customer-network')) return '/app/network'
    if (url.startsWith('/app/provider/commitments')) return '/app/customer/commitments'
    if (url.startsWith('/provider/commitments')) return '/app/customer/commitments'
    if (url.startsWith('/app/provider/')) return '/app'
    if (url.startsWith('/provider/')) return '/app'
    return url
  }

  return url
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const auth = useAuth()

  async function loadNotifications() {
    try {
      setLoading(true)
      const data = await sessionApi.getNotifications()
      setNotifications(data.results || [])
      setUnreadCount(data.unread_count || 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()

    // Realtime push notification listener
    const unsubscribe = subscribeToRealtime((evt) => {
      if (evt.type === 'notification') {
        void loadNotifications()
      }
    })

    const timer = setInterval(() => {
      void loadNotifications()
    }, 60000)

    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleMarkAllRead() {
    try {
      await sessionApi.markNotificationsRead([], true)
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // ignore
    }
  }

  async function handleItemClick(item: ApiNotification) {
    if (!item.is_read) {
      try {
        await sessionApi.markNotificationsRead([item.id])
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch {
        // ignore
      }
    }
    setOpen(false)
    if (item.action_url) {
      const roles = auth.status === 'authenticated' ? auth.roles : []
      const destination = resolveNotificationUrl(item, roles)
      if (destination) {
        navigate(destination)
      }
    }
  }

  const filtered = tab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  function formatTime(iso: string) {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  function getIcon(type: string): IconName {
    switch (type.toUpperCase()) {
      case 'PAYMENT':
        return 'creditCard'
      case 'MESSAGE':
        return 'message'
      case 'BOOKING':
        return 'calendarDays'
      case 'QUOTATION':
        return 'receipt'
      default:
        return 'bell'
    }
  }

  return (
    <div className="notification-dropdown-wrap" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="notification-bell-btn"
        aria-label={`Notifications, ${unreadCount} unread`}
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) void loadNotifications()
        }}
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
        }}
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && (
          <span
            className="notification-badge"
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
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.6rem)',
            width: 'min(24rem, 90vw)',
            maxHeight: '32rem',
            background: 'var(--color-paper-bright)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lift)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--color-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>Notifications</strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'var(--color-orange-soft)',
                    color: 'var(--color-orange)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '999px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-orange)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.45rem 1rem',
              background: 'var(--color-tint)',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            <button
              type="button"
              onClick={() => setTab('all')}
              style={{
                background: tab === 'all' ? 'var(--color-paper-bright)' : 'transparent',
                border: tab === 'all' ? '1px solid var(--color-line)' : '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: tab === 'all' ? 700 : 500,
                color: 'var(--color-ink)',
                cursor: 'pointer',
              }}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('unread')}
              style={{
                background: tab === 'unread' ? 'var(--color-paper-bright)' : 'transparent',
                border: tab === 'unread' ? '1px solid var(--color-line)' : '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: tab === 'unread' ? 700 : 500,
                color: 'var(--color-ink)',
                cursor: 'pointer',
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '22rem' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                Loading notifications…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                <span style={{ display: 'block', marginBottom: '0.4rem' }}><Icon name="sparkles" size={26} /></span>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No {tab === 'unread' ? 'unread' : ''} notifications right now</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {filtered.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleItemClick(item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        borderBottom: '1px solid var(--color-line)',
                        background: item.is_read ? 'transparent' : 'var(--color-tint)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                          background: 'var(--color-paper-bright)',
                          border: '1px solid var(--color-line)',
                          flexShrink: 0,
                        }}
                      >
                        <Icon name={getIcon(item.notification_type)} size={18} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.83rem',
                              fontWeight: item.is_read ? 600 : 700,
                              color: 'var(--color-ink)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.title}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-muted)', flexShrink: 0 }}>
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: '0.2rem 0 0',
                            fontSize: '0.78rem',
                            color: 'var(--color-muted)',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.message}
                        </p>
                      </div>
                      {!item.is_read && (
                        <span
                          style={{
                            width: '0.45rem',
                            height: '0.45rem',
                            borderRadius: '50%',
                            background: 'var(--color-orange)',
                            marginTop: '0.4rem',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
