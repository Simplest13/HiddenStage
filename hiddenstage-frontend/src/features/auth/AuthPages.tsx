import { useState, type FormEvent } from 'react'
import { Link, useMatches, useNavigate, useSearchParams } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions } from '../../app/auth/useAuth'
import { Button, Input, Select } from '../../shared/ui'

type AuthPage = 'login' | 'register' | 'verifyEmail' | 'forgotPassword' | 'resetPassword'

export default function AuthPages() {
  const page = (useMatches().at(-1)?.handle as { page?: AuthPage } | undefined)?.page ?? 'login'
  const auth = useAuth()
  const actions = useAuthActions()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const fields = new FormData(form)
    const email = String(fields.get('email') ?? '').trim().toLowerCase()
    const password = String(fields.get('password') ?? '')
    setError(''); setNotice(''); setPending(true)
    try {
      if (page === 'register') {
        if (password !== fields.get('confirmPassword')) throw new Error('Passwords do not match.')
        if (!fields.get('terms')) throw new Error('Accept the terms to continue.')
        const accountType = String(fields.get('accountType') ?? 'CUSTOMER') as 'CUSTOMER' | 'PROVIDER'
        await actions.register({ fullName: String(fields.get('fullName') ?? ''), email, password, accountType })
        navigate(routes.auth.verifyEmail)
      } else if (page === 'login') {
        const customer = await actions.login({ email, password })
        navigate(!customer.emailVerified ? routes.auth.verifyEmail : customer.accountType === 'PROVIDER' ? customer.profileCompleted ? routes.provider.home : routes.onboarding.provider : customer.profileCompleted ? routes.customer.home : routes.onboarding.customer)
      } else if (page === 'forgotPassword') {
        await actions.requestPasswordReset(email)
        setRecoveryEmail(email)
        setNotice('Preview only: no recovery email was sent. You can open the reset form for a locally registered demo account.')
      } else if (page === 'resetPassword') {
        if (password !== fields.get('confirmPassword')) throw new Error('Passwords do not match.')
        await actions.resetPassword(email, password)
        setNotice('Demo password updated in this browser session. No email was sent.')
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'This demo action could not be completed.') }
    finally { setPending(false) }
  }

  if (page === 'verifyEmail') {
    const email = auth.status === 'authenticated' ? auth.customer?.email : undefined
    const verified = auth.status === 'authenticated' && Boolean(auth.customer?.emailVerified)
    const destination = auth.status === 'authenticated' && auth.customer?.accountType === 'PROVIDER' ? routes.onboarding.provider : routes.onboarding.customer
    return <div className="auth-page"><span className="eyebrow eyebrow--accent">ONE SMALL STEP · DEMO</span><h1>Verify your email</h1><p>{email ? `Preview account: ${email}` : 'Register first to continue the demo verification flow.'}</p><div className="auth-page__notice" role="status">{verified ? 'Demo verification is complete.' : 'This preview does not send email. Use the button below to mark this demo address verified.'}</div>{email && !verified && <><Button type="button" onClick={() => { setPending(true); actions.verifyEmail(email).then(() => setNotice('Demo address marked verified. No email was sent.')).catch((caught: Error) => setError(caught.message)).finally(() => setPending(false)) }} disabled={pending}>{pending ? 'Updating…' : 'Continue with demo verification'}</Button><Button type="button" variant="secondary" onClick={() => { setPending(true); actions.resendVerification(email).then(() => setNotice('Demo only: no verification email was sent.')).catch((caught: Error) => setError(caught.message)).finally(() => setPending(false)) }} disabled={pending}>Resend verification</Button></>}{(notice || verified) && <p className="auth-feedback" role="status">{notice || 'Ready to continue.'} <Link to={destination}>Continue to onboarding</Link></p>}{error && <p className="auth-error" role="alert">{error}</p>}<p className="auth-demo-hint">This is a mock verification state. No message is delivered.</p></div>
  }

  const title: Record<Exclude<AuthPage, 'verifyEmail'>, string> = {
    login: 'Sign in to HiddenStage', register: 'Create your HiddenStage account', forgotPassword: 'Reset your password', resetPassword: 'Choose a new password',
  }
  const emailDefault = page === 'resetPassword' ? (searchParams.get('email') ?? '') : ''
  const passwordLabel = page === 'login' ? 'Password' : 'New password'
  return <div className="auth-page"><span className="eyebrow eyebrow--accent">{page === 'register' ? 'A THOUGHTFUL START' : page === 'login' ? 'WELCOME BACK' : 'ACCOUNT SUPPORT · DEMO'}</span><h1>{title[page]}</h1><p className="auth-page__intro">{page === 'register' ? 'Create a demo customer account to explore onboarding and event requests.' : page === 'login' ? 'Sign in to your local demo account. Authentication is not connected to a server.' : page === 'forgotPassword' ? 'Enter an address to preview the recovery flow. No email will be sent.' : 'Set a new password for an account registered in this current preview session.'}</p>
    {page === 'forgotPassword' && notice ? <div className="auth-page__notice" role="status">{notice}</div> : null}
    {(page === 'login' || page === 'register' || page === 'forgotPassword' || page === 'resetPassword') && !(page === 'forgotPassword' && notice) && <form className="auth-form" onSubmit={submit} noValidate>
      {page === 'register' && <Input label="Full name" name="fullName" autoComplete="name" required minLength={2} />}
      {page === 'register' && <Select label="I am joining as" name="accountType" defaultValue="CUSTOMER" required><option value="CUSTOMER">Customer</option><option value="PROVIDER">Independent event professional</option></Select>}
      <Input label="Email address" name="email" type="email" autoComplete="email" required defaultValue={emailDefault} />
      {page !== 'forgotPassword' && <div className="password-field"><Input label={passwordLabel} name="password" type={showPassword ? 'text' : 'password'} autoComplete={page === 'login' ? 'current-password' : 'new-password'} required minLength={8} hint="At least 8 characters." /><button type="button" className="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide password' : 'Show password'}</button></div>}
      {(page === 'register' || page === 'resetPassword') && <div className="password-field"><Input label="Confirm password" name="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required minLength={8} /><button type="button" className="password-toggle" aria-pressed={showConfirm} onClick={() => setShowConfirm((value) => !value)}>{showConfirm ? 'Hide confirmation' : 'Show confirmation'}</button></div>}
      {page === 'register' && <label className="auth-terms"><input name="terms" type="checkbox" required /> I agree to the <Link to={routes.terms}>draft terms</Link> and <Link to={routes.privacy}>draft privacy notice</Link>.</label>}
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-feedback" role="status">{notice}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Please wait…' : page === 'register' ? 'Create account' : page === 'login' ? 'Sign in' : page === 'forgotPassword' ? 'Continue' : 'Update demo password'}</Button>
    </form>}
    {page === 'login' && <p className="auth-demo-hint">Demo customer: <strong>demo@hiddenstage.test</strong> · Password: <strong>Preview123!</strong></p>}
    {page === 'login' && <Link className="auth-page__support" to={routes.auth.forgotPassword}>Forgot your password?</Link>}
    {page === 'forgotPassword' && notice && <Link className="auth-page__support" to={`${routes.auth.resetPassword}?email=${encodeURIComponent(recoveryEmail)}`}>Open demo reset form</Link>}
  </div>
}
