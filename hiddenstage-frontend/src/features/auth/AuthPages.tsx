import { Link, useMatches } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { Button, Input } from '../../shared/ui'

const authContent: Record<string, { eyebrow: string; title: string; description: string }> = {
  login: { eyebrow: 'WELCOME BACK', title: 'Sign in to HiddenStage', description: 'Account access will be connected to secure server-side sessions.' },
  register: { eyebrow: 'MAKE YOURSELF AT HOME', title: 'Create your account', description: 'Registration will be enabled when email verification and the account service are connected.' },
  verifyEmail: { eyebrow: 'ONE SMALL STEP', title: 'Verify your email', description: 'Email verification links and status will be handled by the HiddenStage account service.' },
  forgotPassword: { eyebrow: 'ACCOUNT SUPPORT', title: 'Reset your password', description: 'Password reset will use a secure, expiring link sent by the account service.' },
  resetPassword: { eyebrow: 'ACCOUNT SUPPORT', title: 'Choose a new password', description: 'Password changes will be handled securely by the HiddenStage account service.' },
}

export default function AuthPages() {
  const page = (useMatches().at(-1)?.handle as { page?: string } | undefined)?.page ?? 'login'
  const content = authContent[page] ?? authContent.login
  return <div className="auth-page"><span className="eyebrow eyebrow--accent">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.description}</p>
    {(page === 'login' || page === 'register' || page === 'forgotPassword') && <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
      {page === 'register' && <Input label="Your name" name="name" autoComplete="name" disabled />}
      <Input label="Email address" name="email" type="email" autoComplete="email" disabled />
      {page === 'login' && <Input label="Password" name="password" type="password" autoComplete="current-password" disabled />}
      <Button type="button" disabled>{page === 'login' ? 'Sign in' : page === 'register' ? 'Create account' : 'Send reset link'}</Button>
    </form>}
    {page === 'login' && <Link className="auth-page__support" to={routes.auth.forgotPassword}>Forgot your password?</Link>}
    {page === 'verifyEmail' && <div className="auth-page__notice">Email verification is not available in this preview.</div>}
  </div>
}
