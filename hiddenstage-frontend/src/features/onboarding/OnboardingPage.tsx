import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { routes } from '../../app/routes/routePaths'
import { useAuth, useAuthActions } from '../../app/auth/useAuth'
import type { CustomerProfile } from '../../shared/api/customerContracts'
import { Button, Input } from '../../shared/ui'
import { Brand } from '../../layouts/PublicLayout'
import '../customer/customer.css'

type OnboardingValues = Pick<CustomerProfile, 'fullName' | 'email' | 'phone' | 'city' | 'pinCode' | 'locality' | 'state'>
const emptyValues: OnboardingValues = { fullName: '', email: '', phone: '', city: '', pinCode: '', locality: '', state: '' }

export default function OnboardingPage() {
  const auth = useAuth()
  const identity = auth.status === 'authenticated' ? auth.customer : undefined
  const actions = useAuthActions()
  const navigate = useNavigate()
  const [values, setValues] = useState({ ...emptyValues, fullName: identity?.fullName ?? '', email: identity?.email ?? '' })
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  function update(field: keyof OnboardingValues, value: string) { setValues((current) => ({ ...current, [field]: value })) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    if (step === 0) { setStep(1); return }
    setSaving(true); setError('')
    try {
      await actions.completeCustomerProfile({ ...values, pinCode: values.pinCode, completedAt: new Date().toISOString() })
      setComplete(true)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save your demo profile.') }
    finally { setSaving(false) }
  }

  if (complete) return <section className="customer-page"><div className="customer-page__narrow"><span className="eyebrow eyebrow--accent">PROFILE COMPLETE</span><h1>Good to have you here, {values.fullName.split(' ')[0]}.</h1><p>Your customer profile is saved in this browser’s demo data. You can now start planning an event.</p><Button type="button" onClick={() => navigate(routes.customer.home)}>Go to your dashboard</Button></div></section>

  return <section className="customer-page customer-page--standalone"><header className="onboarding-topbar"><Link to={routes.home} aria-label="HiddenStage home"><Brand /></Link><span>Demo onboarding</span></header><div className="customer-page__narrow"><div className="customer-page__heading"><span className="eyebrow eyebrow--accent">CUSTOMER ONBOARDING · DEMO</span><h1>Let’s set up your profile.</h1><p>A few details help organize your event plans. Only the information needed for this preview is requested.</p></div><div className="step-progress" aria-label={`Step ${step + 1} of 2`}><span className={step === 0 ? 'step-progress__active' : 'step-progress__done'}>01 <small>Your details</small></span><i/><span className={step === 1 ? 'step-progress__active' : ''}>02 <small>Your location</small></span></div><form className="customer-form" onSubmit={submit} noValidate>
      {step === 0 ? <><Input label="Full name" name="fullName" autoComplete="name" required minLength={2} value={values.fullName} onChange={(event) => update('fullName', event.target.value)} /><Input label="Email address" name="email" type="email" autoComplete="email" required value={values.email} onChange={(event) => update('email', event.target.value)} /><Input label="Phone number" name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="(\\+91[- ]?)?[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number, optionally prefixed with +91." required value={values.phone} onChange={(event) => update('phone', event.target.value)} /></> : <><Input label="PIN code" name="pinCode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6} required value={values.pinCode} onChange={(event) => update('pinCode', event.target.value.replace(/\D/g, ''))} /><Input label="Locality" name="locality" autoComplete="address-level3" required minLength={2} value={values.locality} onChange={(event) => update('locality', event.target.value)} /><Input label="City" name="city" autoComplete="address-level2" required minLength={2} value={values.city} onChange={(event) => update('city', event.target.value)} /><Input label="State" name="state" autoComplete="address-level1" required minLength={2} value={values.state} onChange={(event) => update('state', event.target.value)} /></>}
      {error && <p className="customer-error" role="alert">{error}</p>}<div className="customer-form__actions">{step === 1 && <Button type="button" variant="secondary" onClick={() => setStep(0)}>Back</Button>}{step === 0 && <Link className="text-link" to={routes.home}>Cancel</Link>}<Button type="submit" disabled={saving}>{saving ? 'Saving…' : step === 0 ? 'Continue' : 'Complete profile'}</Button></div>
    </form><p className="demo-storage-note">Demo profile data is stored in this browser only.</p></div></section>
}
