import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions } from '../../app/auth/useAuth'
import { profilesApi } from '../../shared/api/backend/profiles'
import { isApiError } from '../../shared/api/client'
import { Button, Input } from '../../shared/ui'
import { Brand } from '../../layouts/PublicLayout'
import '../customer/customer.css'

const emptyLocation = { pinCode: '', locality: '', city: '', state: '' }

export default function OnboardingPage() {
  const auth = useAuth()
  const actions = useAuthActions()
  const navigate = useNavigate()
  const identity = auth.status === 'authenticated' ? auth.user : undefined
  const [values, setValues] = useState(emptyLocation)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    profilesApi.getCustomerProfile()
      .then((profile) => {
        if (!active || !profile) return
        setValues({ pinCode: profile.pin_code, locality: profile.locality, city: profile.city, state: profile.state })
      })
      .catch(() => { if (active) setError('Could not load your saved profile. You can still complete the form below.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function update(field: keyof typeof values, value: string) { setValues((current) => ({ ...current, [field]: value })) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    setSaving(true); setError(''); setFieldErrors({})
    try {
      await actions.saveCustomerProfile({ pin_code: values.pinCode, locality: values.locality, city: values.city, state: values.state })
      navigate(routes.customer.home, { replace: true })
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.')
    } finally { setSaving(false) }
  }

  return <section className="customer-page customer-page--standalone">
    <header className="onboarding-topbar">
      <Brand />
      <span>Customer onboarding</span>
    </header>
    <div className="customer-page__narrow">
      <div className="customer-page__heading">
        <span className="eyebrow eyebrow--accent">SET UP YOUR PROFILE</span>
        <h1>Where do you usually plan events?</h1>
        <p>Your default location pre-fills new requests and makes supplier suggestions relevant. You can change it on every request.</p>
      </div>
      <div className="account-summary">
        <div><span>Account</span><strong>{identity?.fullName ?? '—'}</strong></div>
        <div><span>Email</span><strong>{identity?.email ?? '—'}</strong></div>
        <div><span>Mobile</span><strong>{identity?.phone || 'Not added'}</strong></div>
      </div>
      <form className="customer-form" onSubmit={submit} noValidate>
        <Input label="PIN code" name="pinCode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6} required value={values.pinCode} onChange={(event) => update('pinCode', event.target.value.replace(/\D/g, ''))} error={fieldErrors.pin_code} disabled={loading} />
        <Input label="Locality" name="locality" autoComplete="address-level3" required minLength={2} value={values.locality} onChange={(event) => update('locality', event.target.value)} error={fieldErrors.locality} disabled={loading} />
        <div className="event-form-grid">
          <Input label="City" name="city" autoComplete="address-level2" required minLength={2} value={values.city} onChange={(event) => update('city', event.target.value)} error={fieldErrors.city} disabled={loading} />
          <Input label="State" name="state" autoComplete="address-level1" required minLength={2} value={values.state} onChange={(event) => update('state', event.target.value)} error={fieldErrors.state} disabled={loading} />
        </div>
        {error && <p className="customer-error" role="alert">{error}</p>}
        <div className="customer-form__actions">
          <Button type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Complete profile'}</Button>
        </div>
      </form>
      <p className="form-note">Your name, email and mobile come from your account. Contact details are only shared with a supplier once you choose them.</p>
    </div>
  </section>
}
