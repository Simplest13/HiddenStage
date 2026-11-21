import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { customerEventPath, routes } from '../../app/routes/routePaths'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { useApiData } from '../../shared/api/backend/useApiData'
import { addDays, formatDate, formatPaise, formatTime, formatTimeRange } from '../../shared/api/backend/format'
import type { ApiAttachment, ApiCategory, EventStatus } from '../../shared/api/backend/types'
import { downloadApiFile, isApiError } from '../../shared/api/client'
import { Badge, Button, ButtonLink, Card, ErrorState, Input, Modal, Select, Spinner, Textarea, useToast } from '../../shared/ui'
import './events.css'

type Step = 0 | 1 | 2 | 3 | 4

type EventValues = {
  name: string
  type: string
  description: string
  date: string
  endDate?: string
  startTime: string
  endTime: string
  guests: string
  pinCode: string
  locality: string
  city: string
  state: string
  venueName: string
  address: string
}

type RequirementDraft = {
  key: string
  category: string
  title: string
  description: string
  budget: string
  instructions: string
  custom_service_name?: string
  custom_service_description?: string
}

type PickedFile = { id: string; file: File }

const eventTypes = ['Wedding', 'Birthday', 'Anniversary', 'Corporate event', 'Engagement', 'Housewarming', 'Festival', 'Other']
const stepLabels = ['Basic details', 'Location', 'Services', 'Attachments', 'Review']
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const maxFileSize = 5 * 1024 * 1024
const today = () => new Date().toISOString().slice(0, 10)
const blankValues = (): EventValues => ({
  name: '', type: '', description: '', date: '', endDate: '', startTime: '', endTime: '',
  guests: '50', pinCode: '', locality: '', city: '', state: '', venueName: '', address: '',
})
const blankRequirement = (): RequirementDraft => ({
  key: cryptoKey(),
  category: '',
  title: '',
  description: '',
  budget: '',
  instructions: '',
  custom_service_name: '',
  custom_service_description: '',
})
function cryptoKey() { return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
function budgetToPaise(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, ''))
  return value.trim() && Number.isFinite(amount) ? Math.round(amount * 100) : null
}

export default function EventPages() {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const targetProviderId = searchParams.get('provider')
  const targetProviderName = searchParams.get('providerName')
  const targetCategory = searchParams.get('category')

  const editing = Boolean(eventId)
  const [step, setStep] = useState<Step>(0)
  const [values, setValues] = useState<EventValues>(blankValues)
  const [requirements, setRequirements] = useState<RequirementDraft[]>([])
  const [draftId, setDraftId] = useState<string | null>(eventId ?? null)
  const [status, setStatus] = useState<EventStatus>('DRAFT')
  const [existingAttachments, setExistingAttachments] = useState<ApiAttachment[]>([])
  const [removedAttachments, setRemovedAttachments] = useState<string[]>([])
  const [files, setFiles] = useState<PickedFile[]>([])
  const [fileError, setFileError] = useState('')
  const [draft, setDraft] = useState<RequirementDraft>(blankRequirement)
  const [editingRequirement, setEditingRequirement] = useState('')
  const [requirementError, setRequirementError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(editing)
  const [lockedReason, setLockedReason] = useState('')
  const [saving, setSaving] = useState<'draft' | 'publish' | ''>('')
  const [confirmPublish, setConfirmPublish] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const categoriesState = useApiData(() => eventsApi.categories(), [])
  const categories: ApiCategory[] = useMemo(() => categoriesState.data ?? [], [categoriesState.data])

  useEffect(() => {
    if (!eventId && targetCategory && requirements.length === 0) {
      setRequirements([{
        key: cryptoKey(),
        category: targetCategory,
        title: targetProviderName ? `Quote request for ${targetProviderName}` : `${targetCategory.toUpperCase()} Service`,
        description: `Direct request initiated from ${targetProviderName || 'provider profile'}.`,
        budget: '',
        instructions: '',
      }])
    }
  }, [eventId, targetCategory, targetProviderName])

  useEffect(() => {
    if (!eventId) return
    let active = true
    Promise.all([eventsApi.get(eventId), marketplaceApi.listEventInvitations(eventId)])
      .then(([event, invitations]) => {
        if (!active) return
        setStatus(event.status)
        setValues({
          name: event.name, type: event.event_type, description: event.description,
          date: event.event_date, endDate: event.end_date ?? '',
          startTime: event.start_time.slice(0, 5), endTime: event.end_time.slice(0, 5),
          guests: String(event.guest_count), pinCode: event.pin_code, locality: event.locality,
          city: event.city, state: event.state, venueName: event.venue_name, address: event.venue_address,
        })
        setRequirements(event.requirements.map((item) => ({
          key: item.id, category: item.category, title: item.title, description: item.description,
          budget: item.budget_paise === null ? '' : String(item.budget_paise / 100), instructions: item.instructions,
          custom_service_name: item.custom_service_name ?? '',
          custom_service_description: item.custom_service_description ?? '',
        })))
        setExistingAttachments(event.attachments)
        if (event.status === 'WITHDRAWN' || event.status === 'CLOSED') setLockedReason(`This request is ${event.status.toLowerCase()} and can no longer be edited.`)
        else if (event.status === 'SUBMITTED' && invitations.some((item) => item.status === 'PENDING')) setLockedReason('This request is locked because an invitation is awaiting a supplier reply. Withdraw it and publish a new request to change the brief.')
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load this request.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eventId])

  function update<K extends keyof EventValues>(field: K, value: EventValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function updateRequirement(field: keyof RequirementDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function saveRequirement() {
    if (draft.category === '') { setRequirementError('Choose the service category.'); return }
    if (draft.category === 'other' && (!draft.custom_service_name || draft.custom_service_name.trim().length < 2)) {
      setRequirementError('Enter the custom service name.')
      return
    }
    if (draft.title.trim().length < 3) { setRequirementError('Give this service a short title.'); return }
    if (draft.budget.trim() && budgetToPaise(draft.budget) === null) { setRequirementError('Enter the budget in rupees, for example 25000.'); return }
    const entry = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      instructions: draft.instructions.trim(),
      custom_service_name: draft.custom_service_name?.trim() || '',
      custom_service_description: draft.custom_service_description?.trim() || '',
    }
    setRequirements((current) => editingRequirement ? current.map((item) => item.key === editingRequirement ? entry : item) : [...current, entry])
    setDraft(blankRequirement()); setEditingRequirement(''); setRequirementError('')
  }

  function editRequirement(item: RequirementDraft) { setDraft(item); setEditingRequirement(item.key); setRequirementError('') }
  function removeRequirement(key: string) {
    setRequirements((current) => current.filter((item) => item.key !== key))
    if (editingRequirement === key) { setEditingRequirement(''); setDraft(blankRequirement()) }
  }

  function pickFiles(picked: FileList | null) {
    if (!picked) return
    const next: PickedFile[] = []
    for (const file of Array.from(picked)) {
      if (!allowedTypes.includes(file.type)) { setFileError(`${file.name} is not a JPG, PNG, WebP or PDF file.`); continue }
      if (file.size > maxFileSize) { setFileError(`${file.name} is larger than 5 MB.`); continue }
      next.push({ id: cryptoKey(), file })
    }
    setFiles((current) => [...current, ...next])
    if (next.length) setFileError('')
  }

  function validateThrough(lastStep: Step) {
    const next: Record<string, string> = {}
    if (lastStep >= 0) {
      if (values.name.trim().length < 3) next.name = 'Give your request a name of at least 3 characters.'
      if (!values.type) next.type = 'Choose the type of event.'
      if (!values.date) next.date = 'Choose the event date.'
      else if (values.date < today()) next.date = 'The event date cannot be in the past.'
      if (values.endDate && values.endDate < values.date) {
        next.endDate = 'The end date cannot be before the start date.'
      }
      if (!values.startTime) next.startTime = 'Add a start time.'
      if (!values.endTime) next.endTime = 'Add an end time.'
      const isMultiDay = Boolean(values.endDate && values.endDate > values.date)
      if (values.startTime && values.endTime && !isMultiDay && values.startTime === values.endTime) {
        next.endTime = 'The end time cannot be the same as the start time.'
      }
      if (!Number.isFinite(Number(values.guests)) || Number(values.guests) < 1) next.guests = 'Enter at least one guest.'
    }
    if (lastStep >= 1) {
      if (!/^[0-9]{6}$/.test(values.pinCode)) next.pinCode = 'Enter a valid 6-digit PIN code.'
      if (values.locality.trim().length < 2) next.locality = 'Add the locality or area.'
      if (values.city.trim().length < 2) next.city = 'Add the city.'
      if (values.state.trim().length < 2) next.state = 'Add the state.'
    }
    if (lastStep >= 2) {
      if (!requirements.length) next.requirements = 'Add at least one service you need quotes for.'
      if (requirements.some((item) => item.title.trim().length < 3)) next.requirements = 'Every service needs a short title.'
    }
    setErrors(next)
    if (Object.keys(next).length) {
      setError('Check the highlighted details before continuing.')
      if (next.name || next.type || next.date || next.endDate || next.startTime || next.endTime || next.guests) setStep(0)
      else if (next.pinCode || next.locality || next.city || next.state) setStep(1)
      else setStep(2)
      return false
    }
    setError('')
    return true
  }

  function goNext() {
    if (step === 2 && (draft.title || draft.category) && !editingRequirement) {
      setRequirementError('Add the service you were editing, or clear it before continuing.')
      return
    }
    if (!validateThrough(step as 0 | 1 | 2)) return
    setStep((current) => Math.min(current + 1, 4) as Step)
  }

  function goTo(target: Step) {
    if (target <= step) { setStep(target); return }
    if (validateThrough((target - 1) as 0 | 1 | 2)) setStep(target)
  }

  function payload() {
    const isOvernight = Boolean(
      values.date && values.startTime && values.endTime && values.endTime <= values.startTime
    )
    const effectiveEndDate = values.endDate || (isOvernight ? addDays(values.date, 1) : values.date)

    return {
      name: values.name.trim(),
      event_type: values.type,
      description: values.description.trim(),
      event_date: values.date,
      end_date: effectiveEndDate,
      start_time: values.startTime,
      end_time: values.endTime,
      guest_count: Number(values.guests),
      pin_code: values.pinCode,
      locality: values.locality.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      venue_name: values.venueName.trim(),
      venue_address: values.address.trim(),
      requirements: requirements.map((item) => ({
        category: item.category,
        title: item.title.trim(),
        description: item.description.trim(),
        instructions: item.instructions.trim(),
        budget_paise: budgetToPaise(item.budget),
        custom_service_name: item.category === 'other' ? (item.custom_service_name?.trim() || item.title.trim()) : undefined,
        custom_service_description: item.category === 'other' ? (item.custom_service_description?.trim() || item.description.trim()) : undefined,
      })),
    }
  }

  async function persist(mode: 'draft' | 'publish') {
    if (mode === 'publish' && !validateThrough(2)) return
    if (mode === 'draft' && !validateThrough(1)) return
    if (mode === 'publish' && !requirements.length) { setStep(2); setErrors({ requirements: 'Add at least one service you need quotes for.' }); return }
    setSaving(mode); setError('')
    try {
      let savedId = draftId
      if (savedId) await eventsApi.update(savedId, payload())
      else { const created = await eventsApi.create(payload()); savedId = created.id; setDraftId(savedId) }
      const savedEventId = savedId
      await Promise.all(removedAttachments.map((attachmentId) => eventsApi.deleteAttachment(savedEventId, attachmentId)))
      for (const picked of files) await eventsApi.uploadAttachment(savedEventId, picked.file)
      if (mode === 'publish' && status === 'DRAFT') {
        await eventsApi.submit(savedEventId)
        if (targetProviderId) {
          try {
            await marketplaceApi.inviteProvider(savedEventId, { provider_id: targetProviderId })
          } catch {
            // direct invite is best-effort, does not block submission
          }
        }
      }
      showToast(mode === 'publish' ? (targetProviderName ? `Request published and sent to ${targetProviderName}.` : 'Request published.') : 'Draft saved.', 'success')
      navigate(customerEventPath(savedEventId))
    } catch (caught) {
      if (isApiError(caught)) {
        const mapped: Record<string, string> = {}
        for (const [field, detail] of Object.entries(caught.fields)) mapped[field] = detail
        setErrors(mapped)
        if (mapped.end_time) setStep(0)
        if (mapped.pin_code) setStep(1)
        if (mapped.requirements || mapped.requirement_count) setStep(2)
      }
      setError(caught instanceof Error ? caught.message : 'Your request could not be saved.')
    } finally { setSaving('') }
  }

  if (loading) return <section className="customer-page"><Spinner label="Loading your request" /></section>
  if (error && editing && !values.name) return <section className="customer-page"><ErrorState description={error} onRetry={() => navigate(routes.customer.requests)} /></section>
  if (lockedReason) return <section className="customer-page">
    <div className="customer-page__heading"><div><span className="eyebrow eyebrow--accent">REQUEST LOCKED</span><h1>This request cannot be edited</h1><p>{lockedReason}</p></div></div>
    <ButtonLink to={customerEventPath(eventId ?? '')} variant="secondary">Back to the request</ButtonLink>
  </section>

  return <section className="customer-page">
    <div className="customer-page__heading">
      <div>
        <span className="eyebrow eyebrow--accent">{editing ? 'EDIT REQUEST' : 'NEW REQUEST'}</span>
        <h1>{editing ? 'Refine your event request.' : 'Let’s shape your event plan.'}</h1>
        <p>Tell us what you are planning and which services you need. You can save a draft at any point and come back to it.</p>
      </div>
      <Link className="text-link" to={editing && draftId ? customerEventPath(draftId) : routes.customer.requests}>Cancel</Link>
    </div>

    {targetProviderName && (
      <div className="callout callout--accent" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong>Direct Enquiry for {targetProviderName}</strong>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Publishing this event will automatically send an invitation and request a quotation directly from {targetProviderName}.
          </p>
        </div>
      </div>
    )}

    <div className="event-wizard">
      <ol className="wizard-steps" aria-label={`Step ${step + 1} of ${stepLabels.length}`}>
        {stepLabels.map((label, index) => <li key={label} className={index < step ? 'wizard-steps__done' : index === step ? 'wizard-steps__active' : ''}>
          <button type="button" className="wizard-step-button" onClick={() => goTo(index as Step)} aria-current={index === step ? 'step' : undefined}>
            <b>{index < step ? '✓' : index + 1}</b><small>{label}</small>
          </button>
        </li>)}
      </ol>

      {error && <p className="customer-error" role="alert">{error}</p>}

      <Card className="customer-form">
        {step === 0 && <BasicDetails values={values} errors={errors} onChange={update} />}
        {step === 1 && <Location values={values} errors={errors} onChange={update} />}
        {step === 2 && <Services
          requirements={requirements}
          categories={categories}
          draft={draft}
          editing={Boolean(editingRequirement)}
          error={requirementError || errors.requirements || ''}
          onDraftChange={updateRequirement}
          onSave={saveRequirement}
          onEdit={editRequirement}
          onRemove={removeRequirement}
          onCancel={() => { setDraft(blankRequirement()); setEditingRequirement(''); setRequirementError('') }}
        />}
        {step === 3 && <Attachments
          existing={existingAttachments}
          files={files}
          error={fileError || errors.attachments || ''}
          onPick={pickFiles}
          onRemoveFile={(id) => setFiles((current) => current.filter((item) => item.id !== id))}
          onRemoveExisting={(attachment) => {
            setRemovedAttachments((current) => [...current, attachment.id])
            setExistingAttachments((current) => current.filter((item) => item.id !== attachment.id))
          }}
        />}
        {step === 4 && <Review values={values} requirements={requirements} categories={categories} files={files} existing={existingAttachments} onEdit={goTo} status={status} />}

        <div className="wizard-actions">
          <div className="wizard-actions__secondary">
            {step > 0 && <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(current - 1, 0) as Step)}>Back</Button>}
            {!editing && <Button type="button" variant="quiet" disabled={saving !== ''} onClick={() => void persist('draft')}>{saving === 'draft' ? 'Saving…' : 'Save as draft'}</Button>}
          </div>
          {step < 4
            ? <Button type="button" onClick={goNext}>Continue</Button>
            : <Button type="button" disabled={saving !== ''} onClick={() => setConfirmPublish(true)}>{saving === 'publish' ? 'Publishing…' : status === 'DRAFT' ? 'Publish request' : 'Save changes'}</Button>}
        </div>
      </Card>
      <p className="form-note">Your request stays private until you publish it. Publishing opens it to matching professionals, and you can still edit it until an invited supplier replies.</p>
    </div>

    {confirmPublish && <Modal open title={status === 'DRAFT' ? 'Publish this request?' : 'Save your changes?'} onClose={() => setConfirmPublish(false)}>
      <div className="modal-stack">
        <p>{status === 'DRAFT'
          ? `Publishing "${values.name || 'this request'}" makes it available to matching professionals and opens it for quotes. You can compare quotes and choose suppliers from the request workspace.`
          : 'Your changes will replace the current brief. Suppliers who already replied will see the updated request.'}</p>
        <ul className="confirm-summary">
          <li><span>Event</span><strong>{values.name || '—'}</strong></li>
          <li><span>Date</span><strong>{values.date ? (values.startTime && values.endTime && values.endTime <= values.startTime ? `${formatDate(values.date)} → ${formatDate(addDays(values.date, 1))} (Overnight)` : formatDate(values.date)) : '—'}</strong></li>
          <li><span>Area</span><strong>{[values.locality, values.city, values.pinCode].filter(Boolean).join(', ') || '—'}</strong></li>
          <li><span>Services</span><strong>{requirements.length}</strong></li>
          <li><span>Attachments</span><strong>{existingAttachments.length + files.length}</strong></li>
        </ul>
        {error && <p className="customer-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={() => setConfirmPublish(false)} disabled={saving !== ''}>Keep editing</Button>
          <Button type="button" disabled={saving !== ''} onClick={() => { setConfirmPublish(false); void persist('publish') }}>{status === 'DRAFT' ? 'Publish request' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>}
  </section>
}

function FormHeading({ number, title, intro }: { number: string; title: string; intro: ReactNode }) {
  return <div className="form-heading"><span className="form-heading__number">{number}</span><div><h2>{title}</h2><p>{intro}</p></div></div>
}

function BasicDetails({ values, errors, onChange }: { values: EventValues; errors: Record<string, string>; onChange: <K extends keyof EventValues>(field: K, value: EventValues[K]) => void }) {
  const isOvernight = Boolean(
    values.date && values.startTime && values.endTime && values.endTime <= values.startTime
  )
  const computedEndDate = isOvernight ? addDays(values.date, 1) : values.date
  const effectiveEndDate = values.endDate || computedEndDate
  const isMultiDay = Boolean(values.date && effectiveEndDate && effectiveEndDate > values.date)

  return <>
    <FormHeading number="01" title="The essentials" intro="What is the occasion, when is it, and how many people are you expecting?" />
    <Input label="Request name" name="name" required minLength={3} maxLength={120} value={values.name} onChange={(event) => onChange('name', event.target.value)} hint="A name only you see, for example “Aisha & Tom’s wedding”." error={errors.name} />
    <div className="event-form-grid">
      <Select label="Type of event" name="type" required value={values.type} onChange={(event) => onChange('type', event.target.value)} error={errors.type}>
        <option value="">Choose an event type</option>
        {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </Select>
      <Input label="Guest count" name="guests" type="number" min={1} max={10000} required value={values.guests} onChange={(event) => onChange('guests', event.target.value)} error={errors.guests} />
      <Input label="Event start date" name="date" type="date" min={today()} required value={values.date} onChange={(event) => onChange('date', event.target.value)} error={errors.date} />
      <Input
        label="Event end date"
        name="endDate"
        type="date"
        min={values.date || today()}
        value={values.endDate || (isOvernight ? computedEndDate : values.date)}
        onChange={(event) => onChange('endDate', event.target.value)}
        error={errors.endDate}
        hint="For multi-day events or overnight celebrations."
      />
      {values.date && (
        <div className="event-duration-selector" style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Quick duration:</span>
          <Button type="button" size="sm" variant={(!values.endDate || values.endDate === values.date) && !isOvernight ? 'primary' : 'quiet'} onClick={() => onChange('endDate', values.date)}>1 Day</Button>
          <Button type="button" size="sm" variant={values.endDate === addDays(values.date, 1) ? 'primary' : 'quiet'} onClick={() => onChange('endDate', addDays(values.date, 1))}>2 Days</Button>
          <Button type="button" size="sm" variant={values.endDate === addDays(values.date, 2) ? 'primary' : 'quiet'} onClick={() => onChange('endDate', addDays(values.date, 2))}>3 Days</Button>
          <Button type="button" size="sm" variant={values.endDate === addDays(values.date, 6) ? 'primary' : 'quiet'} onClick={() => onChange('endDate', addDays(values.date, 6))}>7 Days</Button>
        </div>
      )}
      <div className="event-form-grid event-form-grid--tight">
        <Input label="Start time" name="startTime" type="time" required value={values.startTime} onChange={(event) => onChange('startTime', event.target.value)} error={errors.startTime} />
        <Input label="End time" name="endTime" type="time" required value={values.endTime} onChange={(event) => onChange('endTime', event.target.value)} error={errors.endTime} />
      </div>
      {isOvernight && (!values.endDate || values.endDate === computedEndDate) && (
        <div className="event-overnight-note" role="status" style={{ gridColumn: '1 / -1' }}>
          <span>🌙 Overnight event — ends on <strong>{formatDate(computedEndDate)}</strong> at <strong>{formatTime(values.endTime)}</strong></span>
        </div>
      )}
      {isMultiDay && !isOvernight && (
        <div className="event-overnight-note" role="status" style={{ gridColumn: '1 / -1' }}>
          <span>🗓️ Multi-day event — from <strong>{formatDate(values.date)}</strong> to <strong>{formatDate(effectiveEndDate)}</strong></span>
        </div>
      )}
    </div>
    <Textarea label="About the event (optional)" name="description" rows={4} maxLength={2000} value={values.description} onChange={(event) => onChange('description', event.target.value)} hint="The mood, the plan, anything a supplier should understand." />
  </>
}

function Location({ values, errors, onChange }: { values: EventValues; errors: Record<string, string>; onChange: <K extends keyof EventValues>(field: K, value: EventValues[K]) => void }) {
  return <>
    <FormHeading number="02" title="Where is it happening?" intro="Professionals are matched on the PIN code and city you enter. Nearby areas are never assumed." />
    <Input label="PIN code" name="pinCode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6} required value={values.pinCode} onChange={(event) => onChange('pinCode', event.target.value.replace(/\D/g, ''))} error={errors.pinCode} />
    <Input label="Locality or area" name="locality" autoComplete="address-level3" required minLength={2} value={values.locality} onChange={(event) => onChange('locality', event.target.value)} error={errors.locality} />
    <div className="event-form-grid">
      <Input label="City" name="city" autoComplete="address-level2" required minLength={2} value={values.city} onChange={(event) => onChange('city', event.target.value)} error={errors.city} />
      <Input label="State" name="state" autoComplete="address-level1" required minLength={2} value={values.state} onChange={(event) => onChange('state', event.target.value)} error={errors.state} />
    </div>
    <Input label="Venue name (optional)" name="venueName" value={values.venueName} onChange={(event) => onChange('venueName', event.target.value)} hint="For example the hotel, hall or garden." />
    <Input label="Street address (optional)" name="address" autoComplete="street-address" value={values.address} onChange={(event) => onChange('address', event.target.value)} hint="Only shared with the supplier you choose." />
  </>
}

function Services({ requirements, categories, draft, editing, error, onDraftChange, onSave, onEdit, onRemove, onCancel }: {
  requirements: RequirementDraft[]
  categories: ApiCategory[]
  draft: RequirementDraft
  editing: boolean
  error: string
  onDraftChange: (field: keyof RequirementDraft, value: string) => void
  onSave: () => void
  onEdit: (item: RequirementDraft) => void
  onRemove: (key: string) => void
  onCancel: () => void
}) {
  return <>
    <FormHeading number="03" title="What do you need?" intro="Add one service per line — catering, photography, music — each with its own brief and budget." />
    {requirements.length > 0 && <div className="requirement-list">
      {requirements.map((item) => {
        const catBadge = item.category === 'other'
          ? (item.custom_service_name ? `Other: ${item.custom_service_name}` : 'Other')
          : (categories.find((category) => category.code === item.category)?.name ?? item.category)
        return <Card className="requirement-card" key={item.key}>
          <div>
            <Badge>{catBadge}</Badge>
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            <small>Budget: {item.budget ? formatPaise(budgetToPaise(item.budget) ?? 0) : 'Not specified'}{item.instructions ? ` · ${item.instructions}` : ''}</small>
          </div>
          <div className="requirement-card__actions">
            <Button type="button" size="sm" variant="quiet" onClick={() => onEdit(item)}>Edit</Button>
            <Button type="button" size="sm" variant="quiet" onClick={() => onRemove(item.key)}>Remove</Button>
          </div>
        </Card>
      })}
    </div>}
    <div className="requirement-editor">
      <h3>{editing ? 'Edit this service' : 'Add a service'}</h3>
      <div className="event-form-grid">
        <Select label="Service category" name="requirementCategory" required value={draft.category} onChange={(event) => onDraftChange('category', event.target.value)}>
          <option value="">Choose a category</option>
          {categories.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
        </Select>
        <Input label="Short title" name="requirementTitle" required minLength={3} maxLength={120} value={draft.title} onChange={(event) => onDraftChange('title', event.target.value)} hint="For example “Vegetarian dinner for 80”." />
      </div>
      {draft.category === 'other' && (
        <div className="custom-service-fields" style={{ background: 'var(--color-surface-subtle, #f8f9fa)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
          <Input
            label="Custom service name"
            name="customServiceName"
            required
            minLength={2}
            maxLength={100}
            value={draft.custom_service_name ?? ''}
            onChange={(event) => onDraftChange('custom_service_name', event.target.value)}
            hint="Specify the exact service, e.g. Drone Videography, Mehendi Artist, Pyrotechnics."
          />
          <Textarea
            label="Custom service details"
            name="customServiceDescription"
            rows={2}
            maxLength={500}
            value={draft.custom_service_description ?? ''}
            onChange={(event) => onDraftChange('custom_service_description', event.target.value)}
            hint="Special requirements or expectations for this custom service."
          />
        </div>
      )}
      <Textarea label="What do you need?" name="requirementDescription" rows={3} maxLength={1000} value={draft.description} onChange={(event) => onDraftChange('description', event.target.value)} hint="Style, timings, must-haves — this is what suppliers quote against." />
      <div className="event-form-grid">
        <Input label="Budget in ₹ (optional)" name="requirementBudget" inputMode="decimal" value={draft.budget} onChange={(event) => onDraftChange('budget', event.target.value.replace(/[^0-9.]/g, ''))} hint="Leave blank to let suppliers propose a price." />
        <Input label="Extra instructions (optional)" name="requirementInstructions" maxLength={500} value={draft.instructions} onChange={(event) => onDraftChange('instructions', event.target.value)} hint="Access, setup time, dietary notes." />
      </div>
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="requirement-editor__actions">
        {editing && <Button type="button" variant="secondary" onClick={onCancel}>Cancel edit</Button>}
        <Button type="button" onClick={onSave}>{editing ? 'Save service' : 'Add service'}</Button>
      </div>
    </div>
    <p className="form-note">{requirements.length ? `${requirements.length} service${requirements.length === 1 ? '' : 's'} added.` : 'Add at least one service before publishing.'}</p>
  </>
}

function Attachments({ existing, files, error, onPick, onRemoveFile, onRemoveExisting }: {
  existing: ApiAttachment[]
  files: PickedFile[]
  error: string
  onPick: (files: FileList | null) => void
  onRemoveFile: (id: string) => void
  onRemoveExisting: (attachment: ApiAttachment) => void
}) {
  const { showToast } = useToast()

  function handleDownload(file: ApiAttachment) {
    downloadApiFile(file.download_url, file.original_name).catch((caught: unknown) => {
      showToast(caught instanceof Error ? caught.message : 'That file could not be downloaded.', 'error')
    })
  }

  function handlePreview(file: ApiAttachment) {
    window.open(file.download_url, '_blank')
  }

  function handleLocalPreview(file: File) {
    const url = URL.createObjectURL(file)
    window.open(url, '_blank')
  }

  return <>
    <FormHeading number="04" title="Reference files (optional)" intro="Share a mood board, floor plan or brief. JPG, PNG, WebP or PDF, up to 5 MB each." />
    <div className="attachment-upload">
      <label className="attachment-drop">
        <input type="file" multiple accept={allowedTypes.join(',')} onChange={(event) => { onPick(event.target.files); event.target.value = '' }} />
        <strong>Choose files</strong>
        <span>or drag them into this area</span>
      </label>
      {error && <p className="customer-error" role="alert">{error}</p>}
    </div>
    {(existing.length > 0 || files.length > 0) && <div className="attachment-list">
      {existing.map((file) => {
        const ext = file.original_name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE'
        return <div className="attachment-preview" key={file.id}>
          <span className="attachment-preview__type">{ext}</span>
          <div>
            <strong>{file.original_name}</strong>
            <small>{file.content_type || ext} · {(file.size_bytes / 1024).toFixed(0)} KB · already attached</small>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <Button type="button" size="sm" variant="quiet" onClick={() => handlePreview(file)}>Preview</Button>
            <Button type="button" size="sm" variant="quiet" onClick={() => handleDownload(file)}>Download</Button>
            <Button type="button" size="sm" variant="quiet" aria-label={`Remove ${file.original_name}`} onClick={() => onRemoveExisting(file)}>Remove</Button>
          </div>
        </div>
      })}
      {files.map((picked) => {
        const ext = picked.file.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE'
        return <div className="attachment-preview" key={picked.id}>
          <span className="attachment-preview__type">{ext}</span>
          <div>
            <strong>{picked.file.name}</strong>
            <small>{picked.file.type || ext} · {(picked.file.size / 1024).toFixed(0)} KB · uploads when you save</small>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <Button type="button" size="sm" variant="quiet" onClick={() => handleLocalPreview(picked.file)}>Preview</Button>
            <Button type="button" size="sm" variant="quiet" aria-label={`Remove ${picked.file.name}`} onClick={() => onRemoveFile(picked.id)}>Remove</Button>
          </div>
        </div>
      })}
    </div>}
  </>
}

function Review({ values, requirements, categories, files, existing, onEdit, status }: {
  values: EventValues
  requirements: RequirementDraft[]
  categories: ApiCategory[]
  files: PickedFile[]
  existing: ApiAttachment[]
  onEdit: (step: Step) => void
  status: EventStatus
}) {
  const isOvernight = Boolean(
    values.date && values.startTime && values.endTime && values.endTime <= values.startTime
  )
  const effectiveEndDate = values.endDate || (isOvernight ? addDays(values.date, 1) : values.date)
  const isMultiDay = Boolean(values.date && effectiveEndDate && effectiveEndDate > values.date)

  let dateSummary = '—'
  if (values.date) {
    if (isOvernight && (!values.endDate || values.endDate === effectiveEndDate)) {
      dateSummary = `${formatDate(values.date)} at ${formatTime(values.startTime)} – ${formatDate(effectiveEndDate)} at ${formatTime(values.endTime)} (Overnight)`
    } else if (isMultiDay) {
      dateSummary = `${formatDate(values.date)} – ${formatDate(effectiveEndDate)} · ${formatTimeRange(values.startTime, values.endTime)}`
    } else {
      dateSummary = `${formatDate(values.date)} · ${formatTimeRange(values.startTime, values.endTime)}`
    }
  }

  return <>
    <div className="review-heading">
      <div><span className="eyebrow eyebrow--accent">STEP 05</span><h2>Review before you publish</h2><p>Check the brief a supplier will read. You can jump back to any step.</p></div>
      <Badge tone={status === 'DRAFT' ? 'warning' : 'success'}>{status === 'DRAFT' ? 'Draft' : 'Published'}</Badge>
    </div>
    <ReviewSection title="Event" onEdit={() => onEdit(0)}>
      <ReviewRow label="Request name" value={values.name} />
      <ReviewRow label="Type" value={values.type} />
      <ReviewRow label="Date and time" value={dateSummary} />
      <ReviewRow label="Guests" value={`${values.guests} guests`} />
      {values.description && <ReviewRow label="About" value={values.description} />}
    </ReviewSection>
    <ReviewSection title="Location" onEdit={() => onEdit(1)}>
      <ReviewRow label="Area" value={`${values.locality}, ${values.city}, ${values.state} ${values.pinCode}`} />
      <ReviewRow label="Venue" value={[values.venueName, values.address].filter(Boolean).join(', ') || 'Not specified'} />
    </ReviewSection>
    <ReviewSection title={`Services (${requirements.length})`} onEdit={() => onEdit(2)}>
      {requirements.map((item) => {
        const catBadge = item.category === 'other'
          ? (item.custom_service_name ? `Other: ${item.custom_service_name}` : 'Other')
          : (categories.find((category) => category.code === item.category)?.name ?? item.category)
        return <div className="review-requirement" key={item.key}>
          <Badge>{catBadge}</Badge>
          <strong>{item.title}</strong>
          {item.description && <p>{item.description}</p>}
          <small>Budget: {item.budget ? formatPaise(budgetToPaise(item.budget) ?? 0) : 'Not specified'}{item.instructions ? ` · ${item.instructions}` : ''}</small>
        </div>
      })}
    </ReviewSection>
    <ReviewSection title={`Attachments (${existing.length + files.length})`} onEdit={() => onEdit(3)}>
      {existing.length + files.length
        ? <>{existing.map((file) => <ReviewRow key={file.id} label={file.original_name} value={`${(file.size_bytes / 1024).toFixed(0)} KB`} />)}{files.map((picked) => <ReviewRow key={picked.id} label={picked.file.name} value={`${(picked.file.size / 1024).toFixed(0)} KB`} />)}</>
        : <p className="form-note">No files attached.</p>}
    </ReviewSection>
    <div className="review-confirm">
      <strong>{status === 'DRAFT' ? 'Ready to publish?' : 'Ready to save these changes?'}</strong>
      <p>Publishing opens the request to matching professionals so they can send quotations. You choose suppliers only after comparing quotes, and no payment is taken here.</p>
    </div>
  </>
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return <div className="review-section">
    <div className="review-section__heading"><h3>{title}</h3><Button type="button" size="sm" variant="quiet" onClick={onEdit}>Edit</Button></div>
    <div className="review-section__body">{children}</div>
  </div>
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <p className="review-row"><strong>{label}</strong><span>{value || '—'}</span></p>
}
