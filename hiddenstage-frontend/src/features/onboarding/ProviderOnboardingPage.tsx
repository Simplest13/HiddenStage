import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthActions } from '../../app/auth/useAuth'
import { routes } from '../../app/routes/routePaths'
import { eventsApi } from '../../shared/api/backend/events'
import { networkApi } from '../../shared/api/backend/network'
import { profilesApi } from '../../shared/api/backend/profiles'
import type { ApiCategory, ApiManagerSearchResult, ProviderKind } from '../../shared/api/backend/types'
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
  const [talentCategory, setTalentCategory] = useState('')
  const [performanceStyles, setPerformanceStyles] = useState('')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [website, setWebsite] = useState('')

  // Associated Service Provider - Manager Search
  const [managerQuery, setManagerQuery] = useState('')
  const [managerResults, setManagerResults] = useState<ApiManagerSearchResult[]>([])
  const [selectedManager, setSelectedManager] = useState<ApiManagerSearchResult | null>(null)
  const [searchingManagers, setSearchingManagers] = useState(false)

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

  function handleKindChange(nextKind: ProviderKind) {
    setKind(nextKind)
    if (nextKind === 'INDIVIDUAL_SERVICE_PROVIDER' && selected.length > 1) {
      setSelected(selected.slice(0, 1))
    }
  }

  function toggleCategory(code: string) {
    if (kind === 'INDIVIDUAL_SERVICE_PROVIDER') {
      setSelected([code])
      return
    }
    setSelected((items) => items.includes(code) ? items.filter((item) => item !== code) : [...items, code])
  }

  function updateCoverage(index: number, field: keyof CoverageDraft, value: string) {
    setCoverage((items) => items.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: field === 'pinCode' ? value.replace(/\D/g, '').slice(0, 6) : value }
      : item))
  }

  async function searchManagers() {
    if (!managerQuery.trim()) return
    setSearchingManagers(true)
    try {
      const results = await profilesApi.searchManagers(managerQuery.trim())
      setManagerResults(results)
    } catch {
      // ignore
    } finally {
      setSearchingManagers(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (!selected.length) { setError('Choose at least one service category.'); return }
    if (kind === 'INDIVIDUAL_SERVICE_PROVIDER' && selected.length > 1) {
      setError('Individual Service Providers can select only one primary service category.')
      return
    }
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
        talent_category: kind === 'TALENT' ? talentCategory.trim() : undefined,
        performance_styles: kind === 'TALENT' && performanceStyles.trim() ? performanceStyles.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
        website: website.trim() || undefined,
        coverage: coverage.map((item) => ({
          pin_code: item.pinCode,
          locality: item.locality.trim(),
          city: item.city.trim(),
          state: item.state.trim(),
        })),
      })

      if (kind === 'ASSOCIATED_SERVICE_PROVIDER' && selectedManager) {
        try {
          await networkApi.requestAssociation(selectedManager.user_id, 'Request to associate via onboarding profile.')
        } catch {
          // Association request error should not block onboarding completion
        }
      }

      navigate(routes.provider.home, { replace: true })
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.')
    } finally { setSaving(false) }
  }

  return <section className="customer-page customer-page--standalone">
    <header className="onboarding-topbar">
      <Brand />
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
        <Select
          label="How you work"
          name="kind"
          value={kind}
          onChange={(event) => handleKindChange(event.target.value as ProviderKind)}
          required
          hint="Select your professional identity on HiddenStage."
        >
          <option value="MANAGER">Manager — coordinate events, build a team, and manage clients</option>
          <option value="INDIVIDUAL_SERVICE_PROVIDER">Individual Service Provider — deliver a single specialized service directly</option>
          <option value="ASSOCIATED_SERVICE_PROVIDER">Associated Service Provider — independent provider affiliated with an event company</option>
          <option value="TALENT">Talent / Performer — artist, DJ, musician, anchor, dancer, entertainer</option>
          <option value="WORKER">Worker / Crew — event setup, coordination, and on-ground operations</option>
        </Select>

        {kind === 'ASSOCIATED_SERVICE_PROVIDER' && (
          <div style={{ background: 'var(--color-surface-subtle, #f8f9fa)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Affiliate with an Event Manager (Optional)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: '0 0 1rem 0' }}>Search for a manager you work with to send an association request.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                label="Manager search"
                name="managerSearch"
                placeholder="Search by manager name or username..."
                value={managerQuery}
                onChange={(event) => setManagerQuery(event.target.value)}
              />
              <Button type="button" variant="secondary" onClick={() => void searchManagers()} disabled={searchingManagers}>
                {searchingManagers ? 'Searching…' : 'Search'}
              </Button>
            </div>
            {managerResults.length > 0 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {managerResults.map((m) => (
                  <div
                    key={m.id}
                    className="card"
                    style={{
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderColor: selectedManager?.id === m.id ? 'var(--color-primary)' : undefined,
                    }}
                  >
                    <div>
                      <strong>{m.display_name}</strong> {m.business_name && <span>({m.business_name})</span>}
                      {m.headline && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>{m.headline}</p>}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedManager?.id === m.id ? 'primary' : 'quiet'}
                      onClick={() => setSelectedManager(selectedManager?.id === m.id ? null : m)}
                    >
                      {selectedManager?.id === m.id ? 'Selected ✓' : 'Select'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {kind === 'TALENT' && (
          <div style={{ background: 'var(--color-surface-subtle, #f8f9fa)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Talent & Performance Details</h3>
            <div className="event-form-grid">
              <Input
                label="Talent category"
                name="talentCategory"
                placeholder="e.g. DJ, Vocalist, Emcee, Stand-up Comic"
                value={talentCategory}
                onChange={(event) => setTalentCategory(event.target.value)}
              />
              <Input
                label="Performance styles"
                name="performanceStyles"
                placeholder="e.g. Bollywood, Commercial, Retro, House"
                value={performanceStyles}
                onChange={(event) => setPerformanceStyles(event.target.value)}
                hint="Comma-separated styles"
              />
            </div>
            <div className="event-form-grid">
              <Input
                label="Instagram handle or URL"
                name="instagram"
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
              />
              <Input
                label="YouTube channel or link"
                name="youtube"
                value={youtube}
                onChange={(event) => setYoutube(event.target.value)}
              />
            </div>
            <Input
              label="Website or Portfolio URL"
              name="website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
        )}

        <Textarea label="Short description" name="description" required minLength={20} maxLength={500} hint="Describe your work in a few sentences (20–500 characters)." value={description} onChange={(event) => setDescription(event.target.value)} error={fieldErrors.description} />
        <Input label="Contact phone or email" name="contact" required minLength={5} hint="Shared with an organiser once they choose you." value={contact} onChange={(event) => setContact(event.target.value)} error={fieldErrors.contact} />

        <fieldset className="provider-onboarding__categories">
          <legend>Services you offer</legend>
          {kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? (
            <p><strong>Individual Service Providers specialize in exactly one primary category.</strong> Select the service you deliver.</p>
          ) : (
            <p>Select every category you want to be invited for.</p>
          )}
          <div>
            {(categories.length ? categories : []).map((category) => (
              <label key={category.code}>
                <input
                  type={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'radio' : 'checkbox'}
                  name={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'primaryCategory' : undefined}
                  checked={selected.includes(category.code)}
                  onChange={() => toggleCategory(category.code)}
                />
                {category.name}
              </label>
            ))}
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
