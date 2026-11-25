import { useAuthActions, useTheme } from '../../app/auth/useAuth'
import { Icon } from './Icon'

export function ThemeToggle() {
  const authActions = useAuthActions()
  const theme = useTheme()

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={authActions.toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
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
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  )
}
