import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthActions } from '../../app/auth/useAuth'
import { routes } from '../../app/routes/routePaths'
import { eventsApi } from '../../shared/api/backend/events'
import type { ApiCategory, ProviderKind } from '../../shared/api/backend/types'
import { isApiError } from '../../shared/api/client'
import { Button, Input, Select, Textarea } from '../../shared/ui'
import { Brand } from '../../layouts/PublicLayout'
import '../customer/customer.css'

type CoverageDraft = { pinCode: string; locality: string; city: string; state: string }
const blankLocation = (): CoverageDraft => ({ pinCode: '', locality: '', city: '', state: '' })

export default function ProviderOnboardingPage() {
  const actions = useAuthActions()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [displayName, setDisplayName] = useState('')
  const [kind, setKind] = useState<ProviderKind>('MANAGER')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [coverage, setCoverage] = useState<CoverageDraft[]>([blankLocation()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    eventsApi.categories()
      .then((items) => { if (active) setCategories(items) })
      .catch(() => { if (active) setError('Could not load the service catalogue. Refresh the page to try again.') })
    return () => { active = false }
  }, [])

  function toggleCategory(code: string) {
    setSelected((items) => items.includes(code) ? items.filter((item) => item !== code) : [...items, code])
  }
  function updateCoverage(index: number, field: keyof CoverageDraft, value: string) {
    setCoverage((items) => items.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: field === 'pinCode' ? value.replace(/\D/g, '').slice(0, 6) : value }
      : item))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (!selected.length) { setError('Choose at least one service category.'); return }
    if (coverage.some((item) => !/^[0-9]{6}$/.test(item.pinCode) || !item.locality.trim() || !item.city.trim() || !item.state.trim())) {
      setError('Complete every coverage location with a valid 6-digit PIN code, locality, city and state.')
      return
    }
    setSaving(true); setError(''); setFieldErrors({})
    try {
      await actions.saveProviderProfile({
        display_name: displayName.trim(),
        kind,
        description: description.trim(),
        contact: contact.trim(),
        categories: selected,
        coverage: coverage.map((item) => ({
          pin_code: item.pinCode,
          locality: item.locality.trim(),
          city: item.city.trim(),
          state: item.state.trim(),
        })),
      })
      navigate(routes.provider.home, { replace: true })
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.')
    } finally { setSaving(false) }
  }

  return <section className="customer-page customer-page--standalone">
    <header className="onboarding-topbar">
      <Link to={routes.home} aria-label="HiddenStage home"><Brand /></Link>
      <span>Professional onboarding</span>
    </header>
    <div className="customer-page__narrow provider-onboarding">
      <header className="customer-page__heading">
        <span className="eyebrow eyebrow--accent">PROFESSIONAL PROFILE</span>
        <h1>Introduce your work.</h1>
        <p>Tell organisers what you offer and the specific areas you cover. Choosing a city never implies coverage of every PIN code.</p>
      </header>
      <form className="customer-form" onSubmit={submit} noValidate>
        <Input label="Professional or business name" name="displayName" required minLength={2} value={displayName} onChange={(event) => setDisplayName(event.target.value)} error={fieldErrors.display_name} />
        <Select label="How you work" name="kind" value={kind} onChange={(event) => setKind(event.target.value as ProviderKind)} required hint="Both roles are independent marketplace accounts. Managers can also recruit and assign workers; independent workers quote customers directly and may still work with managers.">
          <option value="MANAGER">Manager — coordinate events and build a team</option>
          <option value="WORKER">Independent worker — deliver services and quote directly</option>
        </Select>
        <Textarea label="Short description" name="description" required minLength={20} maxLength={500} hint="Describe your work in a few sentences (20–500 characters)." value={description} onChange={(event) => setDescription(event.target.value)} error={fieldErrors.description} />
        <Input label="Contact phone or email" name="contact" required minLength={5} hint="Shared with an organiser once they choose you." value={contact} onChange={(event) => setContact(event.target.value)} error={fieldErrors.contact} />
        <fieldset className="provider-onboarding__categories">
          <legend>Services you offer</legend>
          <p>Select every category you want to be invited for.</p>
          <div>
            {(categories.length ? categories : []).map((category) => <label key={category.code}>
              <input type="checkbox" checked={selected.includes(category.code)} onChange={() => toggleCategory(category.code)} />
              {category.name}
            </label>)}
          </div>
          {fieldErrors.categories && <span className="field__error">{fieldErrors.categories}</span>}
        </fieldset>
        <fieldset className="provider-onboarding__coverage">
          <legend>Coverage locations</legend>
          <p>Each location needs a PIN code, locality, city and state.</p>
          {coverage.map((location, index) => <div className="provider-onboarding__location" key={index}>
            <strong>Location {index + 1}</strong>
            <Input label="PIN code" name={`pin-${index}`} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={location.pinCode} onChange={(event) => updateCoverage(index, 'pinCode', event.target.value)} />
            <Input label="Locality" name={`locality-${index}`} required minLength={2} value={location.locality} onChange={(event) => updateCoverage(index, 'locality', event.target.value)} />
            <Input label="City" name={`city-${index}`} required minLength={2} value={location.city} onChange={(event) => updateCoverage(index, 'city', event.target.value)} />
            <Input label="State" name={`state-${index}`} required minLength={2} value={location.state} onChange={(event) => updateCoverage(index, 'state', event.target.value)} />
            {coverage.length > 1 && <Button type="button" variant="secondary" onClick={() => setCoverage((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove location {index + 1}</Button>}
          </div>)}
          <Button type="button" variant="secondary" onClick={() => setCoverage((items) => [...items, blankLocation()])}>Add coverage location</Button>
          {fieldErrors.coverage && <span className="field__error">{fieldErrors.coverage}</span>}
        </fieldset>
        {error && <p className="customer-error" role="alert">{error}</p>}
        <div className="customer-form__actions">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save and continue'}</Button>
        </div>
      </form>
      <p className="form-note">Verification is reviewed separately by HiddenStage. Your profile is not marked verified automatically.</p>
    </div>
  </section>
}
