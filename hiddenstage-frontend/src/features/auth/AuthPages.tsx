import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useMatches, useNavigate, useSearchParams } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions } from '../../app/auth/useAuth'
import type { SessionUser } from '../../app/auth/authTypes'
import { Button, Input, Select } from '../../shared/ui'
import { isApiError } from '../../shared/api/client'
import { sessionApi } from '../../shared/api/backend/session'

type AuthPage = 'login' | 'register' | 'verifyEmail' | 'forgotPassword' | 'resetPassword'

function destinationFor(user: SessionUser) {
  if (user.isStaff) return routes.admin.home
  if (user.emailVerificationRequired && !user.emailVerified) return routes.auth.verifyEmail
  if (user.accountType === 'PROVIDER') return user.profileCompleted ? routes.provider.home : routes.onboarding.provider
  return user.profileCompleted ? routes.customer.home : routes.onboarding.customer
}

function errorText(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Something went wrong. Try again.'
}

export default function AuthPages() {
  const page = (useMatches().at(-1)?.handle as { page?: AuthPage } | undefined)?.page ?? 'login'
  const auth = useAuth()
  const actions = useAuthActions()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [verificationState, setVerificationState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')
  const verificationStarted = useRef(false)
  const [regUsername, setRegUsername] = useState('')
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<{ available?: boolean; message?: string } | null>(null)

  useEffect(() => {
    if (page !== 'register') return
    const clean = regUsername.trim().toLowerCase().replace(/^@/, '')
    if (!clean) {
      setUsernameStatus(null)
      return
    }
    if (!/^[a-z0-9_.]{3,50}$/.test(clean)) {
      setUsernameStatus({
        available: false,
        message: '3-50 chars: letters, numbers, underscores, and periods only.',
      })
      return
    }
    setUsernameChecking(true)
    const timer = setTimeout(async () => {
      try {
        const res = await sessionApi.checkUsername(clean)
        setUsernameStatus({ available: res.available, message: res.message })
      } catch {
        // ignore
      } finally {
        setUsernameChecking(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [regUsername, page])

  useEffect(() => {
    if (auth.status === 'authenticated' && page !== 'verifyEmail') {
      const requested = (location.state as { from?: string } | null)?.from
      navigate(requested && requested !== routes.auth.login ? requested : destinationFor(auth.user), { replace: true })
    }
  }, [auth, page, navigate, location.state])

  useEffect(() => {
    if (page !== 'verifyEmail' || !token || verificationStarted.current) return
    verificationStarted.current = true
    setVerificationState('working')
    actions.verifyEmail(token)
      .then(() => { setVerificationState('done'); setNotice('Your email address is verified. You can continue to your workspace.') })
      .catch((caught: unknown) => { setVerificationState('failed'); setError(errorText(caught)) })
  }, [actions, page, token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const fields = new FormData(form)
    const email = String(fields.get('email') ?? '').trim().toLowerCase()
    const password = String(fields.get('password') ?? '')
    setError(''); setNotice(''); setFieldErrors({}); setPending(true)
    try {
      if (page === 'register') {
        if (password !== fields.get('confirmPassword')) throw new Error('Passwords do not match.')
        if (!fields.get('terms')) throw new Error('Accept the terms to continue.')
        const cleanUser = regUsername.trim().toLowerCase().replace(/^@/, '')
        if (!cleanUser) throw new Error('Choose a username to create your account.')
        if (!usernameStatus?.available) {
          throw new Error(usernameStatus?.message || 'Please choose an available username.')
        }
        const role = String(fields.get('accountType') ?? 'CUSTOMER') === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER'
        const result = await actions.register({
          full_name: String(fields.get('fullName') ?? '').trim(),
          username: cleanUser,
          email,
          password,
          phone: String(fields.get('phone') ?? '').trim(),
          role,
          accept_terms: true,
        })
        navigate(destinationFor(result.user), {
          state: { verificationEmailSent: result.verificationEmailSent },
        })
      } else if (page === 'login') {
        const user = await actions.login({ email, password })
        const requested = (location.state as { from?: string } | null)?.from
        navigate(requested && requested !== routes.auth.login ? requested : destinationFor(user))
      } else if (page === 'forgotPassword') {
        await actions.requestPasswordReset(email)
        setNotice('If an account exists for that email, a reset link has been sent.')
      } else if (page === 'resetPassword') {
        if (!token) throw new Error('This reset link is incomplete. Request a new one.')
        if (password !== fields.get('confirmPassword')) throw new Error('Passwords do not match.')
        await actions.resetPassword(token, password)
        setNotice('Your password has been updated. You can sign in now.')
      }
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(errorText(caught))
    } finally { setPending(false) }
  }

  async function resend() {
    setError(''); setNotice(''); setPending(true)
    try {
      const sent = await actions.resendVerification()
      if (!sent) {
        setError('We could not send the verification email. Check the server email settings and try again.')
        return
      }
      setNotice('If verification is still required, a new email has been sent.')
    } catch (caught) { setError(errorText(caught)) } finally { setPending(false) }
  }

  if (page === 'verifyEmail') {
    const user = auth.status === 'authenticated' ? auth.user : undefined
    const verified = Boolean(user?.emailVerified) || verificationState === 'done'
    // A deployment that does not require verification must not strand an account
    // on a screen waiting for a link that is never sent.
    const required = user?.emailVerificationRequired ?? true
    const satisfied = verified || !required
    const destination = user ? destinationFor(user) : routes.auth.login
    const emailSent = (location.state as { verificationEmailSent?: boolean } | null)?.verificationEmailSent
    return <div className="auth-page">
      <span className="eyebrow eyebrow--accent">ONE SMALL STEP</span>
      <h1>{verified ? 'Your email is verified' : !required ? 'Email verification is optional' : 'Verify your email address'}</h1>
      <p className="auth-page__intro">{!required && !verified
        ? 'Verification is switched off for this launch, so you can start using HiddenStage straight away.'
        : user
        ? emailSent === false
          ? `We could not send a verification link to ${user.email}.`
          : `We sent a verification link to ${user.email}.`
        : 'Verify your address to start requesting quotes.'}</p>
      {required && !verified && <div className="auth-page__notice" role={emailSent === false ? 'alert' : 'status'}>
        {verificationState === 'working'
          ? 'Checking your verification link…'
          : emailSent === false
            ? 'The verification email was not sent. Check the email settings, then use the resend button below.'
            : 'Open the link in that email to finish verifying. The link expires after 24 hours.'}
      </div>}
      {verified && <div className="auth-page__notice" role="status">You can continue to your workspace.</div>}
      {notice && <p className="auth-feedback" role="status">{notice}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="auth-page__actions">
        {satisfied
          ? <Button type="button" onClick={() => navigate(destination)}>Continue</Button>
          : user && <Button type="button" variant="secondary" onClick={resend} disabled={pending}>{pending ? 'Sending…' : 'Resend verification email'}</Button>}
      </div>
      {required && !verified && <p className="auth-help">No email yet? Check your spam folder before resending.</p>}
      {!user && <Link className="auth-page__support" to={routes.auth.login}>Back to sign in</Link>}
    </div>
  }

  const title: Record<Exclude<AuthPage, 'verifyEmail'>, string> = {
    login: 'Sign in to HiddenStage', register: 'Create your HiddenStage account',
    forgotPassword: 'Reset your password', resetPassword: 'Choose a new password',
  }
  const intro: Record<Exclude<AuthPage, 'verifyEmail'>, string> = {
    login: 'Sign in to manage your event requests, quotations and commitments.',
    register: 'Create an account to request quotes from event professionals.',
    forgotPassword: 'Enter the email address you registered with and we will send a reset link.',
    resetPassword: 'Choose a new password for your account.',
  }
  const showForm = page !== 'forgotPassword' || !notice
  const resetWithoutToken = page === 'resetPassword' && !token

  return <div className="auth-page">
    <span className="eyebrow eyebrow--accent">{page === 'register' ? 'A THOUGHTFUL START' : page === 'login' ? 'WELCOME BACK' : 'ACCOUNT SUPPORT'}</span>
    <h1>{title[page]}</h1>
    <p className="auth-page__intro">{intro[page]}</p>
    {resetWithoutToken && <div className="auth-page__notice" role="alert">This reset link is incomplete or has expired. <Link to={routes.auth.forgotPassword}>Request a new link</Link>.</div>}
    {!resetWithoutToken && showForm && <form className="auth-form" onSubmit={submit} noValidate>
      {page === 'register' && <Input label="Full name" name="fullName" autoComplete="name" required minLength={2} error={fieldErrors.full_name} />}
      {page === 'register' && (
        <div style={{ marginBottom: '0.5rem' }}>
          <Input
            label="Choose @username"
            name="username"
            value={regUsername}
            onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
            placeholder="e.g. ananya_events"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            error={fieldErrors.username || (usernameStatus && !usernameStatus.available ? usernameStatus.message : undefined)}
          />
          <div style={{ fontSize: '0.8rem', marginTop: '-0.25rem' }}>
            {usernameChecking ? (
              <span style={{ color: 'var(--color-fg-muted)' }}>Checking availability…</span>
            ) : usernameStatus?.available ? (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ @{regUsername.trim().replace(/^@/, '')} is available!</span>
            ) : null}
          </div>
        </div>
      )}
      {page === 'register' && <Select label="I am joining as" name="accountType" defaultValue="CUSTOMER" required>
        <option value="CUSTOMER">Customer — planning an event</option>
        <option value="PROVIDER">Event professional — quoting for work</option>
      </Select>}
      <Input label="Email address" name="email" type="email" autoComplete="email" required error={fieldErrors.email} />
      {page === 'register' && <Input label="Mobile number (optional)" name="phone" type="tel" inputMode="tel" autoComplete="tel" hint="Used only so a chosen supplier can reach you." error={fieldErrors.phone} />}
      {page !== 'forgotPassword' && <div className="password-field">
        <Input label={page === 'login' ? 'Password' : 'New password'} name="password" type={showPassword ? 'text' : 'password'} autoComplete={page === 'login' ? 'current-password' : 'new-password'} required minLength={8} hint={page === 'login' ? undefined : 'At least 8 characters.'} error={fieldErrors.password} />
        <button type="button" className="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide password' : 'Show password'}</button>
      </div>}
      {(page === 'register' || page === 'resetPassword') && <div className="password-field">
        <Input label="Confirm password" name="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required minLength={8} />
        <button type="button" className="password-toggle" aria-pressed={showConfirm} onClick={() => setShowConfirm((value) => !value)}>{showConfirm ? 'Hide confirmation' : 'Show confirmation'}</button>
      </div>}
      {page === 'register' && <label className="auth-terms"><input name="terms" type="checkbox" required /> I agree to the <Link to={routes.terms}>terms</Link> and <Link to={routes.privacy}>privacy notice</Link>.</label>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p className="auth-feedback" role="status">{notice}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Please wait…' : page === 'register' ? 'Create account' : page === 'login' ? 'Sign in' : page === 'forgotPassword' ? 'Send reset link' : 'Update password'}</Button>
    </form>}
    {page === 'forgotPassword' && notice && <p className="auth-feedback" role="status">{notice}</p>}
    {page === 'login' && <Link className="auth-page__support" to={routes.auth.forgotPassword}>Forgot your password?</Link>}
    {page === 'resetPassword' && notice && <Link className="auth-page__support" to={routes.auth.login}>Go to sign in</Link>}
  </div>
}
