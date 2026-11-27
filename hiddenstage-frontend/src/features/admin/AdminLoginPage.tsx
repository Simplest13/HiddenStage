import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions } from '../../app/auth/useAuth'
import { Button, Card, Input } from '../../shared/ui'
import { Brand } from '../../layouts/PublicLayout'
import { isApiError } from '../../shared/api/client'
import { Icon } from '../../shared/ui/Icon'
import './admin.css'

export default function AdminLoginPage() {
  const auth = useAuth()
  const actions = useAuthActions()
  const navigate = useNavigate()

  const [email, setEmail] = useState('admin@hiddenstage.in')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const trimmedEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    if (!trimmedEmail) {
      setError('Enter your administrator email address.')
      return
    }
    if (!cleanPassword) {
      setError('Enter your password.')
      return
    }

    setPending(true)
    try {
      const user = await actions.login({ email: trimmedEmail, password: cleanPassword })
      if (!user.isStaff) {
        setError('Authentication succeeded, but this account does not have staff administrator privileges.')
        return
      }
      navigate(routes.admin.home, { replace: true })
    } catch (caught) {
      if (isApiError(caught)) {
        setError(caught.message)
      } else if (caught instanceof Error) {
        setError(caught.message)
      } else {
        setError('Login failed. Please check your credentials.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="admin-login-screen">
      <div className="admin-login-screen__container">
        <div className="admin-login-screen__header">
          <Brand />
          <span className="badge badge--dark" style={{ marginLeft: '0.75rem', fontSize: '0.75rem' }}>
            ADMIN PORTAL
          </span>
        </div>

        <Card className="admin-login-card">
          <div className="admin-login-card__title-row">
            <h2>Administrator Sign In</h2>
            <p className="admin-login-card__subtitle">
              Sign in with staff credentials to manage users, verify providers, review events, and inspect audit logs.
            </p>
          </div>

          {auth.status === 'authenticated' && !auth.user?.isStaff && (
            <div className="admin-login-warning">
              <strong>Notice:</strong> Currently signed in as <code>{auth.user.email}</code> (Standard customer/provider account without staff rights).
              <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                Sign in with the admin account below to access the administration console:
              </div>
            </div>
          )}

          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}

          <form className="admin-login-form" onSubmit={handleLogin} noValidate>
            <Input
              label="Admin email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />

            <div className="password-field">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>

            <Button
              type="submit"
              disabled={pending}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {pending ? 'Verifying admin privileges…' : 'Sign In to Admin Workspace'}
            </Button>
          </form>

          <div className="admin-login-card__footer">
            <Link to={routes.home}><Icon name="arrowLeft" size={14} /> Return to HiddenStage public site</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

