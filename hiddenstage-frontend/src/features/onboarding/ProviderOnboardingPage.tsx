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
type RoleData = Record<string, unknown>

const blankLocation = (): CoverageDraft => ({ pinCode: '', locality: '', city: '', state: '' })

const roles: Array<{ kind: ProviderKind; name: string; detail: string }> = [
  { kind: 'MANAGER', name: 'Manager', detail: 'Coordinate events, build teams, and manage clients.' },
  { kind: 'INDIVIDUAL_SERVICE_PROVIDER', name: 'Individual Service Provider', detail: 'Deliver one primary service directly to customers.' },
  { kind: 'ASSOCIATED_SERVICE_PROVIDER', name: 'Associated Service Provider', detail: 'Work independently and optionally associate with Managers.' },
  { kind: 'TALENT', name: 'Talent / Performer', detail: 'Offer performances, hosting, music, dance, or entertainment.' },
  { kind: 'WORKER', name: 'Worker / Crew', detail: 'Take part in event setup, operations, coordination, and support.' },
]

const talentCategories = ['Singer / Vocalist', 'DJ', 'Anchor / Emcee / Host', 'Actor', 'Musician', 'Instrumentalist', 'Dancer', 'Band', 'Stand-up Comedian', 'Magician', 'Performer / Entertainer', 'Influencer', 'Celebrity Appearance', 'Other']
const workerRoles = ['Event Setup Crew', 'Event Coordinator', 'Ground Operations', 'Registration Staff', 'Guest Management', 'Ushers', 'Security Personnel', 'Logistics Staff', 'Stage Setup', 'Lighting Support', 'Sound Support', 'Equipment Handling', 'Hospitality Staff', 'Volunteer / Event Support', 'Other']
const currentYear = new Date().getFullYear()

export default function ProviderOnboardingPage() {
  const actions = useAuthActions()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<ProviderKind>('MANAGER')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [website, setWebsite] = useState('')
  const [languages, setLanguages] = useState('')
  const [experience, setExperience] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [coverage, setCoverage] = useState<CoverageDraft[]>([blankLocation()])
  const [roleData, setRoleData] = useState<RoleData>({})
  const [managerQuery, setManagerQuery] = useState('')
  const [managerResults, setManagerResults] = useState<ApiManagerSearchResult[]>([])
  const [selectedManager, setSelectedManager] = useState<ApiManagerSearchResult | null>(null)
  const [searchingManagers, setSearchingManagers] = useState(false)
  const [showManagerPopup, setShowManagerPopup] = useState(false)
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [customCategoryDesc, setCustomCategoryDesc] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [customCategoryError, setCustomCategoryError] = useState('')

  useEffect(() => {
    if (!managerQuery.trim() || selectedManager) {
      setShowManagerPopup(false)
      return
    }
    const timer = setTimeout(async () => {
      setSearchingManagers(true)
      try {
        const results = await profilesApi.searchManagers(managerQuery.trim())
        setManagerResults(results)
        setShowManagerPopup(true)
      } catch {
        // ignore
      } finally {
        setSearchingManagers(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [managerQuery, selectedManager])

  useEffect(() => {
    let active = true
    Promise.all([eventsApi.categories(), profilesApi.getProviderProfile()])
      .then(([items, saved]) => {
        if (!active) return
        setCategories(items)
        if (!saved) return
        setKind(saved.kind)
        setDisplayName(saved.display_name || '')
        setDescription(saved.description || '')
        setContact(saved.contact || '')
        setWebsite(saved.website || '')
        setLanguages(Array.isArray(saved.languages)
          ? saved.languages.join(', ')
          : (saved.languages || ''))
        setExperience(saved.experience_summary || '')
        setSelected(saved.categories || [])
        setCoverage(saved.coverage?.length ? saved.coverage.map((item) => ({ pinCode: item.pin_code, locality: item.locality, city: item.city, state: item.state })) : [blankLocation()])
        setRoleData(saved.role_data && typeof saved.role_data === 'object' ? saved.role_data : {})
        setStep(saved.onboarding_completed_at ? 4 : Math.min(saved.onboarding_step || 0, 4))
      })
      .catch(() => { if (active) setError('Could not resume your onboarding. You can start again below.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function setRoleValue(key: string, value: unknown) {
    setRoleData((current) => ({ ...current, [key]: value }))
  }

  function roleList(key: string): string[] {
    const value = roleData[key]
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }

  function toggleRoleList(key: string, value: string) {
    const current = roleList(key)
    setRoleValue(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  function changeKind(nextKind: ProviderKind) {
    if (kind !== nextKind && Object.keys(roleData).length > 0) {
      if (!window.confirm('Changing professional type keeps existing profile data. Hidden role fields may be preserved but will not be shown until you return. Continue?')) return
    }
    setKind(nextKind)
    if (nextKind === 'INDIVIDUAL_SERVICE_PROVIDER' && selected.length > 1) setSelected(selected.slice(0, 1))
  }

  function toggleCategory(code: string) {
    if (code === 'other') {
      setShowCustomCategory(true)
      return
    }
    if (kind === 'INDIVIDUAL_SERVICE_PROVIDER') setSelected([code])
    else setSelected((items) => items.includes(code) ? items.filter((item) => item !== code) : [...items, code])
  }

  async function handleCreateCustomCategory() {
    const trimmedName = customCategoryName.trim()
    if (!trimmedName) {
      setCustomCategoryError('Enter a category name.')
      return
    }
    setCreatingCategory(true)
    setCustomCategoryError('')
    try {
      const created = await eventsApi.createCategory({
        name: trimmedName,
        description: customCategoryDesc.trim() || undefined,
      })
      setCategories((prev) => {
        if (prev.some((c) => c.code === created.code)) return prev
        return [...prev, created]
      })
      if (kind === 'INDIVIDUAL_SERVICE_PROVIDER') {
        setSelected([created.code])
      } else {
        setSelected((items) => [...items.filter((c) => c !== 'other' && c !== created.code), created.code])
      }
      setShowCustomCategory(false)
      setCustomCategoryName('')
      setCustomCategoryDesc('')
    } catch (err: unknown) {
      setCustomCategoryError(err instanceof Error ? err.message : 'Could not create category.')
    } finally {
      setCreatingCategory(false)
    }
  }

  function updateCoverage(index: number, field: keyof CoverageDraft, value: string) {
    setCoverage((items) => items.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: field === 'pinCode' ? value.replace(/\D/g, '').slice(0, 6) : value }
      : item))
  }

  async function searchManagers(queryOverride?: string) {
    const q = (queryOverride ?? managerQuery).trim()
    if (!q) return
    setSearchingManagers(true)
    setShowManagerPopup(true)
    try { setManagerResults(await profilesApi.searchManagers(q)) }
    catch { setError('Manager search is temporarily unavailable.') }
    finally { setSearchingManagers(false) }
  }

  function payload() {
    return {
      display_name: displayName.trim(),
      kind,
      description: description.trim(),
      contact: contact.trim(),
      categories: selected,
      coverage: coverage.map((item) => ({ pin_code: item.pinCode, locality: item.locality.trim(), city: item.city.trim(), state: item.state.trim() })),
      website: website.trim() || undefined,
      languages: languages.trim() || undefined,
      experience_summary: experience.trim() || undefined,
      onboarding_step: step,
      role_data: roleData,
    }
  }

  async function saveProgress(nextStep = step) {
    setSaving(true); setError(''); setFieldErrors({})
    try {
      await profilesApi.patchProviderProfile({ ...payload(), onboarding_step: nextStep })
      setStep(nextStep)
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(caught instanceof Error ? caught.message : 'Could not save onboarding progress.')
      return false
    } finally { setSaving(false) }
    return true
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!displayName.trim() || !description.trim() || !contact.trim()) {
      setError('Complete your professional name, introduction, and contact details.')
      setStep(1)
      return
    }
    if (!selected.length) {
      setError('Choose at least one applicable service category.')
      setStep(2)
      return
    }
    if (kind === 'INDIVIDUAL_SERVICE_PROVIDER' && selected.length !== 1) {
      setError('Individual Service Providers must select exactly one primary service category.')
      setStep(2)
      return
    }
    if (coverage.some((item) => !/^[0-9]{6}$/.test(item.pinCode) || !item.locality.trim() || !item.city.trim() || !item.state.trim())) {
      setError('Complete every coverage location with a valid PIN code, locality, city, and state.')
      setStep(3)
      return
    }
    setSaving(true); setError(''); setFieldErrors({})
    try {
      await actions.saveProviderProfile({ ...payload(), onboarding_step: 4 })
      if (kind === 'ASSOCIATED_SERVICE_PROVIDER' && selectedManager) {
        try { await networkApi.requestAssociation(selectedManager.user_id, 'Request to associate via onboarding profile.') }
        catch { setError('Profile saved, but the association request could not be sent. You can retry it later.') }
      }
      navigate(routes.provider.home, { replace: true })
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(caught instanceof Error ? caught.message : 'Could not complete onboarding.')
    } finally { setSaving(false) }
  }

  const steps = [
    { name: 'Identity', description: 'Professional type' },
    { name: 'Profile', description: 'Common details' },
    kind === 'MANAGER' ? { name: 'Business', description: 'Services and experience' }
      : kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? { name: 'Specialty', description: 'Primary service' }
      : kind === 'ASSOCIATED_SERVICE_PROVIDER' ? { name: 'Network', description: 'Optional association' }
      : kind === 'TALENT' ? { name: 'Performance', description: 'Talent details' }
      : { name: 'Operations', description: 'Skills and availability' },
    { name: 'Coverage', description: 'Service locations' },
    { name: 'Review', description: 'Confirm and finish' },
  ]

  if (loading) {
    return <section className="customer-page customer-page--standalone"><p className="form-note">Loading your onboarding…</p></section>
  }

  return (
    <section className="customer-page customer-page--standalone">
      <header className="onboarding-topbar"><Brand /><span>Professional onboarding</span></header>
      <div className="customer-page__narrow provider-onboarding">
        <header className="customer-page__heading">
          <span className="eyebrow eyebrow--accent">PROFESSIONAL PROFILE</span>
          <h1>Build your HiddenStage profile.</h1>
          <p>Choose the journey that matches how you work. You can save and resume later.</p>
        </header>

        <nav className="onboarding-progress" aria-label="Onboarding progress">
          {steps.map((item, index) => (
            <button key={item.name} type="button" className={index === step ? 'is-active' : index < step ? 'is-complete' : ''} onClick={() => setStep(index)}>
              <span>{index + 1}</span><strong>{item.name}</strong><small>{item.description}</small>
            </button>
          ))}
        </nav>

        <form className="customer-form" onSubmit={submit} noValidate>
          {step === 0 && (
            <fieldset className="role-choice">
              <legend>How do you work?</legend>
              <div className="role-choice__grid">
                {roles.map((role) => (
                  <label key={role.kind} className={kind === role.kind ? 'is-selected' : ''}>
                    <input type="radio" name="professionalKind" checked={kind === role.kind} onChange={() => changeKind(role.kind)} />
                    <strong>{role.name}</strong>
                    <span>{role.detail}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <>
              <Input label="Professional or business name" name="displayName" required minLength={2} value={displayName} onChange={(event) => setDisplayName(event.target.value)} error={fieldErrors.display_name} />
              <Textarea label="Professional introduction" name="description" required minLength={20} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} error={fieldErrors.description} />
              <Input label="Contact phone or email" name="contact" required minLength={5} value={contact} onChange={(event) => setContact(event.target.value)} error={fieldErrors.contact} />
              <Input label="Website (optional)" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} />
              <Input label="Languages" name="languages" placeholder="English, Hindi" value={languages} onChange={(event) => setLanguages(event.target.value)} />
              <Textarea label="Experience summary" name="experience" value={experience} onChange={(event) => setExperience(event.target.value)} />
            </>
          )}

          {step === 2 && kind === 'MANAGER' && (
            <>
              <Input label="Business or company name" name="businessName" value={String(roleData.businessName || '')} onChange={(event) => setRoleValue('businessName', event.target.value)} />
              <Input label="Year established" name="yearEstablished" type="number" min="1900" max={currentYear} value={String(roleData.yearEstablished || '')} onChange={(event) => setRoleValue('yearEstablished', event.target.value)} />
              <Input label="Business type" name="businessType" value={String(roleData.businessType || '')} onChange={(event) => setRoleValue('businessType', event.target.value)} />
              <Input label="Business email" name="businessEmail" type="email" value={String(roleData.businessEmail || '')} onChange={(event) => setRoleValue('businessEmail', event.target.value)} />
              <Textarea label="Business background" name="businessBackground" value={String(roleData.businessBackground || '')} onChange={(event) => setRoleValue('businessBackground', event.target.value)} />
              <label className="provider-onboarding__check"><input type="checkbox" checked={Boolean(roleData.internalTeam)} onChange={(event) => setRoleValue('internalTeam', event.target.checked)} /> I manage an internal event team</label>
            </>
          )}

          {step === 2 && kind === 'INDIVIDUAL_SERVICE_PROVIDER' && (
            <>
              <Input label="Primary talent or service specialization" name="specializations" value={String(roleData.specializations || '')} onChange={(event) => setRoleValue('specializations', event.target.value)} />
              <Input label="Starting price (optional)" name="startingPrice" value={String(roleData.startingPrice || '')} onChange={(event) => setRoleValue('startingPrice', event.target.value)} />
            </>
          )}

          {step === 2 && kind === 'ASSOCIATED_SERVICE_PROVIDER' && (
            <>
              <Input label="Independent professional specialty" name="specialty" value={String(roleData.specialty || '')} onChange={(event) => setRoleValue('specialty', event.target.value)} />
              <div className="manager-association">
                <strong>Associate with an Event Manager (optional)</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  Search by manager name, company, or @username. Matching manager IDs will pop up for you to link your profile.
                </p>

                {selectedManager ? (
                  <div className="manager-selected-card">
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-orange, #ff7a00)', display: 'block', marginBottom: '0.2rem' }}>
                        ✓ Affiliated Event Manager Selected
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1rem' }}>{selectedManager.display_name}</strong>
                        <span className="manager-id-tag">Manager ID: {selectedManager.manager_id || `@${selectedManager.username}` || selectedManager.user_id.slice(0, 8)}</span>
                        {selectedManager.business_name && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>({selectedManager.business_name})</span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedManager(null)
                        setManagerQuery('')
                        setManagerResults([])
                        setShowManagerPopup(false)
                      }}
                    >
                      Change Manager ✕
                    </Button>
                  </div>
                ) : (
                  <div className="manager-search-wrapper">
                    <div className="event-form-grid">
                      <Input
                        label="Manager name or business"
                        name="managerQuery"
                        placeholder="Type manager name or @username..."
                        value={managerQuery}
                        onChange={(event) => {
                          setManagerQuery(event.target.value)
                          setSelectedManager(null)
                        }}
                        onFocus={() => {
                          if (managerResults.length > 0) setShowManagerPopup(true)
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void searchManagers()}
                        disabled={searchingManagers}
                      >
                        {searchingManagers ? 'Searching…' : 'Search'}
                      </Button>
                    </div>

                    {showManagerPopup && (
                      <div className="manager-search-popup" role="listbox">
                        {searchingManagers && <div className="manager-popup-loading">Searching managers…</div>}
                        {!searchingManagers && managerResults.length === 0 && managerQuery.trim().length >= 1 && (
                          <div className="manager-popup-empty">
                            No event managers found matching “{managerQuery}”. Check spelling or search by @username.
                          </div>
                        )}
                        {!searchingManagers &&
                          managerResults.map((manager) => (
                            <button
                              type="button"
                              key={manager.id}
                              className="manager-popup-item"
                              onClick={() => {
                                setSelectedManager(manager)
                                setManagerQuery(manager.display_name)
                                setShowManagerPopup(false)
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <strong>{manager.display_name}</strong>
                                  <span className="manager-id-tag">
                                    Manager ID: {manager.manager_id || `@${manager.username}` || manager.user_id.slice(0, 8)}
                                  </span>
                                </div>
                                {manager.business_name && (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', display: 'block', marginTop: '0.15rem' }}>
                                    Company: {manager.business_name}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-orange, #ff7a00)', fontWeight: 600 }}>
                                Select ➔
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && kind === 'TALENT' && (
            <>
              <Select label="Talent category" name="talentCategory" value={String(roleData.talentCategory || '')} onChange={(event) => setRoleValue('talentCategory', event.target.value)}>
                <option value="">Select category</option>
                {talentCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
              {roleData.talentCategory === 'Other' && (
                <Textarea label="Custom talent category and description" name="otherTalent" value={String(roleData.otherTalent || '')} onChange={(event) => setRoleValue('otherTalent', event.target.value)} />
              )}
              <Input label="Stage or professional name" name="stageName" value={String(roleData.stageName || '')} onChange={(event) => setRoleValue('stageName', event.target.value)} />
              <Textarea label="Performance styles" name="performanceStyles" value={String(roleData.performanceStyles || '')} onChange={(event) => setRoleValue('performanceStyles', event.target.value)} />
              <Input label="Instagram URL" name="instagram" value={String(roleData.instagram || '')} onChange={(event) => setRoleValue('instagram', event.target.value)} />
              <Input label="YouTube URL" name="youtube" value={String(roleData.youtube || '')} onChange={(event) => setRoleValue('youtube', event.target.value)} />
            </>
          )}

          {step === 2 && kind === 'WORKER' && (
            <>
              <fieldset className="role-choice role-choice--compact">
                <legend>What type of event work do you do?</legend>
                <div className="role-choice__grid role-choice__grid--compact">
                  {workerRoles.map((role) => (
                    <label key={role} className={roleList('workerRoles').includes(role) ? 'is-selected' : ''}>
                      <input type="checkbox" checked={roleList('workerRoles').includes(role)} onChange={() => toggleRoleList('workerRoles', role)} />
                      <strong>{role}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Input label="Qualifications or certifications" name="qualifications" value={String(roleData.qualifications || '')} onChange={(event) => setRoleValue('qualifications', event.target.value)} />
              <Textarea label="Relevant equipment or operational expertise" name="equipment" value={String(roleData.equipment || '')} onChange={(event) => setRoleValue('equipment', event.target.value)} />
              <Select label="Preferred availability" name="availability" value={String(roleData.availability || '')} onChange={(event) => setRoleValue('availability', event.target.value)}>
                <option value="">Select</option><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="WEEKENDS">Weekends</option><option value="FLEXIBLE">Flexible</option>
              </Select>
            </>
          )}

          {step >= 2 && (
            <fieldset className="provider-onboarding__categories">
              <legend>{kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'Primary service category' : 'Services you offer'}</legend>
              <div>
                {categories
                  .filter((cat) => cat.code !== 'other')
                  .map((category) => (
                    <label key={category.code}>
                      <input
                        type={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'radio' : 'checkbox'}
                        name={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'primaryCategory' : undefined}
                        checked={selected.includes(category.code)}
                        onChange={() => toggleCategory(category.code)}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                <label className={showCustomCategory ? 'is-selected' : ''}>
                  <input
                    type={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'radio' : 'checkbox'}
                    name={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'primaryCategory' : undefined}
                    checked={showCustomCategory}
                    onChange={() => setShowCustomCategory(true)}
                  />
                  <span>Other</span>
                </label>
              </div>

              {showCustomCategory && (
                <div className="provider-onboarding__custom-category" role="region" aria-label="Create Your Own Service Category">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-burgundy, #6b2136)' }}>
                        Create Your Own Service Category
                      </h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-muted, #737373)' }}>
                        Can&apos;t find your service? Create a category that best describes what you offer.
                      </p>
                    </div>
                  </div>

                  <Input
                    label="Category Name (required)"
                    name="customCategoryName"
                    required
                    placeholder="e.g. Beauty"
                    value={customCategoryName}
                    onChange={(e) => {
                      setCustomCategoryName(e.target.value)
                      if (customCategoryError) setCustomCategoryError('')
                    }}
                    error={customCategoryError}
                  />

                  <Textarea
                    label="Description (optional)"
                    name="customCategoryDesc"
                    placeholder="e.g. Professional beauty, makeup and grooming services for events."
                    value={customCategoryDesc}
                    onChange={(e) => setCustomCategoryDesc(e.target.value)}
                  />

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <Button
                      type="button"
                      disabled={creatingCategory}
                      onClick={() => void handleCreateCustomCategory()}
                    >
                      {creatingCategory ? 'Creating Category…' : 'Create Category'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={creatingCategory}
                      onClick={() => {
                        setShowCustomCategory(false)
                        setCustomCategoryError('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="provider-onboarding__coverage">
              <legend>Coverage locations</legend>
              {coverage.map((location, index) => (
                <div className="provider-onboarding__location" key={index}>
                  <strong>Location {index + 1}</strong>
                  <Input label="PIN code" name={`pin-${index}`} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={location.pinCode} onChange={(event) => updateCoverage(index, 'pinCode', event.target.value)} />
                  <Input label="Locality" name={`locality-${index}`} required value={location.locality} onChange={(event) => updateCoverage(index, 'locality', event.target.value)} />
                  <Input label="City" name={`city-${index}`} required value={location.city} onChange={(event) => updateCoverage(index, 'city', event.target.value)} />
                  <Input label="State" name={`state-${index}`} required value={location.state} onChange={(event) => updateCoverage(index, 'state', event.target.value)} />
                  {coverage.length > 1 && <Button type="button" variant="secondary" onClick={() => setCoverage((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove location</Button>}
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setCoverage((items) => [...items, blankLocation()])}>Add coverage location</Button>
            </fieldset>
          )}

          {step === 4 && (
            <div className="onboarding-review">
              <h2>Review and submit</h2>
              <dl>
                <div><dt>Professional type</dt><dd>{roles.find((role) => role.kind === kind)?.name}</dd></div>
                <div><dt>Name</dt><dd>{displayName || 'Not entered'}</dd></div>
                <div><dt>Contact</dt><dd>{contact || 'Not entered'}</dd></div>
                <div>
                  <dt>{kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'Specialty' : 'Services'}</dt>
                  <dd>
                    {selected.length
                      ? selected
                          .map((code) => categories.find((c) => c.code === code)?.name || code)
                          .join(', ')
                      : 'None selected'}
                  </dd>
                </div>
                <div><dt>Coverage</dt><dd>{coverage.map((item) => `${item.locality}, ${item.city} ${item.pinCode}`).filter((item) => item !== ',  ').join(' • ') || 'Not entered'}</dd></div>
              </dl>
            </div>
          )}

          {error && <p className="customer-error" role="alert">{error}</p>}
          {fieldErrors.categories && <span className="field__error">{fieldErrors.categories}</span>}
          <div className="customer-form__actions onboarding-actions">
            {step > 0 && <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)}>Back</Button>}
            {step < 4
              ? <><Button type="button" variant="quiet" disabled={saving} onClick={() => void saveProgress(step)}>Save and continue later</Button><Button type="button" disabled={saving} onClick={() => setStep((current) => current + 1)}>Continue</Button></>
              : <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Complete onboarding'}</Button>}
          </div>
        </form>
      </div>
    </section>
  )
}
