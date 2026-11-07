import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthActions } from '../../app/auth/useAuth'
import { routes } from '../../app/routes/routePaths'
import { serviceCategories } from '../discovery/data/catalog'
import type { ProviderCoverageLocation, ProviderProfile } from '../../shared/api/customerContracts'
import { Button, Input, Textarea } from '../../shared/ui'
import { Brand } from '../../layouts/PublicLayout'
import '../customer/customer.css'

const blankLocation = (): ProviderCoverageLocation => ({ pinCode: '', locality: '', city: '', state: '' })
export default function ProviderOnboardingPage() {
  const actions = useAuthActions(); const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(''); const [description, setDescription] = useState(''); const [contact, setContact] = useState('')
  const [categories, setCategories] = useState<string[]>([]); const [coverage, setCoverage] = useState<ProviderCoverageLocation[]>([blankLocation()])
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [complete, setComplete] = useState(false)
  function toggleCategory(category: string) { setCategories((items) => items.includes(category) ? items.filter((item) => item !== category) : [...items, category]) }
  function updateCoverage(index: number, field: keyof ProviderCoverageLocation, value: string) { setCoverage((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === 'pinCode' ? value.replace(/\D/g, '').slice(0, 6) : value } : item)) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return
    if (!categories.length) { setError('Choose at least one service category.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()) && !/^(?:\+91[- ]?)?[6-9][0-9]{9}$/.test(contact.trim())) { setError('Enter a valid email address or Indian mobile number for contact.'); return }
    if (coverage.some((item) => !/^[0-9]{6}$/.test(item.pinCode) || !item.locality.trim() || !item.city.trim() || !item.state.trim())) { setError('Complete every coverage location with a valid 6-digit PIN code and locality, city, and state.'); return }
    setSaving(true); setError('')
    const profile: ProviderProfile = { displayName: displayName.trim(), description: description.trim(), categories, coverage: coverage.map((item) => ({ ...item, locality: item.locality.trim(), city: item.city.trim(), state: item.state.trim() })), contact: contact.trim(), completedAt: new Date().toISOString() }
    try { await actions.completeProviderProfile(profile); setComplete(true) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save your demo profile.') } finally { setSaving(false) }
  }
  if (complete) return <section className="customer-page"><div className="customer-page__narrow"><span className="eyebrow eyebrow--accent">PROFILE SAVED · DEMO</span><h1>Your professional profile is ready for the next step.</h1><p>Your profile and coverage are saved in this browser. This does not submit verification or publish a listing.</p><Button onClick={() => navigate(routes.provider.home)}>Continue to professional workspace</Button></div></section>
  return <section className="customer-page customer-page--standalone"><header className="onboarding-topbar"><Link to={routes.home} aria-label="HiddenStage home"><Brand /></Link><span>Demo onboarding</span></header><div className="customer-page__narrow provider-onboarding"><header className="customer-page__heading"><span className="eyebrow eyebrow--accent">PROFESSIONAL ONBOARDING · DEMO</span><h1>Introduce your work.</h1><p>Tell customers what you offer and the specific areas you cover. A city selection does not imply coverage of every PIN code.</p></header><form className="customer-form" onSubmit={submit} noValidate>
    <Input label="Professional or display name" name="displayName" required minLength={2} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
    <Textarea label="Short description" name="description" required minLength={20} maxLength={500} hint="Describe your work in a few sentences (20–500 characters)." value={description} onChange={(event) => setDescription(event.target.value)} />
    <Input label="Contact phone or email" name="contact" required minLength={5} hint="Use an email address or a valid 10-digit Indian mobile number." value={contact} onChange={(event) => setContact(event.target.value)} />
    <fieldset className="provider-onboarding__categories"><legend>Service categories</legend><p>Select all that apply.</p><div>{serviceCategories.map((category) => <label key={category.slug}><input type="checkbox" checked={categories.includes(category.slug)} onChange={() => toggleCategory(category.slug)} />{category.name}</label>)}</div></fieldset>
    <fieldset className="provider-onboarding__coverage"><legend>Coverage locations</legend><p>Each location needs a PIN code, locality, city, and state.</p>{coverage.map((location, index) => <div className="provider-onboarding__location" key={index}><strong>Location {index + 1}</strong><Input label="PIN code" name={`pin-${index}`} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={location.pinCode} onChange={(event) => updateCoverage(index, 'pinCode', event.target.value)} /><Input label="Locality" name={`locality-${index}`} required minLength={2} value={location.locality} onChange={(event) => updateCoverage(index, 'locality', event.target.value)} /><Input label="City" name={`city-${index}`} required minLength={2} value={location.city} onChange={(event) => updateCoverage(index, 'city', event.target.value)} /><Input label="State" name={`state-${index}`} required minLength={2} value={location.state} onChange={(event) => updateCoverage(index, 'state', event.target.value)} />{coverage.length > 1 && <Button type="button" variant="secondary" onClick={() => setCoverage((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove location {index + 1}</Button>}</div>)}<Button type="button" variant="secondary" onClick={() => setCoverage((items) => [...items, blankLocation()])}>Add coverage location</Button></fieldset>
    {error && <p className="customer-error" role="alert">{error}</p>}<div className="customer-form__actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save and continue'}</Button></div>
  </form><p className="demo-storage-note">Demo only. No profile is published and no verification, rating, or availability status is implied.</p></div></section>
}
