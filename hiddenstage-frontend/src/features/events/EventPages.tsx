import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useMatches, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { customerEventEditPath, customerEventPath, eventProvidersPath, eventQuotesPath, routes } from '../../app/routes/routePaths'
import type { AttachmentRecord, CreateEventInput, CustomerEvent, RequirementInput } from '../../shared/api/customerContracts'
import { Badge, Button, ButtonLink, Card, Checkbox, Input, Select, Textarea } from '../../shared/ui'
import { EmptyState, ErrorState, Spinner } from '../../shared/ui/feedback'
import { serviceCategories } from '../discovery/data/catalog'
import { customerEventApi } from './services/customerEventApi'
import '../customer/customer.css'
import './events.css'

type EventValues = CreateEventInput
type PickedFile = { record: AttachmentRecord; file?: File }
type RequirementDraft = { category: string; title: string; description: string; budget: string; instructions: string }
const blankEvent: EventValues = { name: '', type: '', description: '', date: '', startTime: '', endTime: '', guestCount: 1, pinCode: '', locality: '', city: '', state: '', venueName: '', address: '', requirements: [], attachments: [] }
const stepLabels = ['Basic details', 'Location', 'Requirements', 'Attachments', 'Review']
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const maxFileSize = 5 * 1024 * 1024
const minEventDate = new Date().toISOString().slice(0, 10)
const emptyRequirement: RequirementDraft = { category: '', title: '', description: '', budget: '', instructions: '' }
function makeId() { return globalThis.crypto?.randomUUID?.() ?? `requirement-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function EventPages() {
  const page = (useMatches().at(-1)?.handle as { page?: string } | undefined)?.page
  return page === 'eventDetail' ? <EventDetailsPage /> : <CreateEventPage />
}

function FormHeading({ number, title, intro }: { number: string; title: string; intro?: string }) {
  return <header className="form-heading"><span className="form-heading__number">{number}</span><div><h2>{title}</h2>{intro && <p>{intro}</p>}</div></header>
}

function EventFormStepper({ step }: { step: number }) {
  return <ol className="wizard-steps" aria-label={`Step ${step + 1} of 5`}>
    {stepLabels.map((label, index) => <li key={label} className={index === step ? 'wizard-steps__active' : index < step ? 'wizard-steps__done' : ''} aria-current={index === step ? 'step' : undefined}>
      <b>{index + 1}</b><small>{label}</small>
    </li>)}
  </ol>
}

function BasicDetailsForm({ values, editMode, onChange }: { values: EventValues; editMode: boolean; onChange: <K extends keyof EventValues>(key: K, value: EventValues[K]) => void }) {
  const dateMin = editMode && values.date < minEventDate ? values.date : minEventDate
  return <>
    <FormHeading number="01" title="Basic event information" intro="Start with the essentials — what you’re planning, when, and how many people you expect." />
    <Input label="Event name" name="eventName" required minLength={2} value={values.name} onChange={(event) => onChange('name', event.target.value)} />
    <Select label="Event type" name="eventType" required value={values.type} onChange={(event) => onChange('type', event.target.value)}>
      <option value="">Choose an event type</option>
      {['Birthday', 'Wedding', 'Family gathering', 'Corporate event', 'Community event', 'Other celebration'].map((type) => <option key={type}>{type}</option>)}
    </Select>
    <div className="event-form-grid">
      <Input label="Event date" name="eventDate" type="date" min={dateMin} required value={values.date} onChange={(event) => onChange('date', event.target.value)} />
      <Input label="Expected guests" name="guestCount" type="number" min={1} max={10000} required value={values.guestCount} onChange={(event) => onChange('guestCount', Number(event.target.value))} />
    </div>
    <div className="event-form-grid">
      <Input label="Start time" name="startTime" type="time" required value={values.startTime} onChange={(event) => onChange('startTime', event.target.value)} />
      <Input label="End time" name="endTime" type="time" required value={values.endTime} onChange={(event) => onChange('endTime', event.target.value)} />
    </div>
    <Textarea label="Event description" name="eventDescription" required minLength={10} maxLength={2000} rows={4} hint="Share any context that will help describe the gathering." value={values.description} onChange={(event) => onChange('description', event.target.value)} />
    {editMode && <p className="wizard-step-intro">Update eligible submitted demo events. Saved values are prefilled.</p>}
  </>
}

function LocationForm({ values, onChange }: { values: EventValues; onChange: <K extends keyof EventValues>(key: K, value: EventValues[K]) => void }) {
  return <>
    <FormHeading number="02" title="Event location" intro="Give the venue and its specific normalized location. Choosing a city does not imply coverage at every PIN code." />
    <Input label="PIN code" name="eventPin" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={values.pinCode} onChange={(event) => onChange('pinCode', event.target.value.replace(/\D/g, ''))} />
    <div className="event-form-grid">
      <Input label="Locality" name="eventLocality" required minLength={2} value={values.locality} onChange={(event) => onChange('locality', event.target.value)} />
      <Input label="City" name="eventCity" required minLength={2} value={values.city} onChange={(event) => onChange('city', event.target.value)} />
    </div>
    <Input label="State" name="eventState" required minLength={2} value={values.state} onChange={(event) => onChange('state', event.target.value)} />
    <Input label="Venue name" name="venueName" required minLength={2} value={values.venueName} onChange={(event) => onChange('venueName', event.target.value)} />
    <Textarea label="Full venue address" name="venueAddress" required minLength={5} rows={3} value={values.address} onChange={(event) => onChange('address', event.target.value)} />
  </>
}

function RequirementEditor({ draft, editing, error, onChange, onSave }: { draft: RequirementDraft; editing: boolean; error: string; onChange: (key: keyof RequirementDraft, value: string) => void; onSave: () => void }) {
  return <div id="requirement-editor" className="requirement-editor">
    <h3>{editing ? 'Edit requirement' : 'Add a service requirement'}</h3>
    <p className="wizard-step-intro">Add each service separately, with its own title, details, budget, and instructions.</p>
    <div className="event-form-grid">
      <Select label="Service category" name="requirementCategory" value={draft.category} onChange={(event) => onChange('category', event.target.value)}>
        <option value="">Choose a category</option>
        {serviceCategories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
      </Select>
      <Input label="Individual budget (INR, optional)" name="requirementBudget" type="number" min={0} step={1} value={draft.budget} onChange={(event) => onChange('budget', event.target.value)} />
    </div>
    <Input label="Requirement title" name="requirementTitle" minLength={3} maxLength={100} value={draft.title} onChange={(event) => onChange('title', event.target.value)} />
    <Textarea label="Detailed description" name="requirementDescription" minLength={10} maxLength={1500} rows={4} value={draft.description} onChange={(event) => onChange('description', event.target.value)} />
    <Textarea label="Special instructions (optional)" name="requirementInstructions" maxLength={1000} rows={2} value={draft.instructions} onChange={(event) => onChange('instructions', event.target.value)} />
    {error && <p className="customer-error" role="alert">{error}</p>}
    <Button type="button" onClick={onSave}>{editing ? 'Save requirement' : 'Add requirement'}</Button>
  </div>
}

function RequirementSection({ requirements, draft, editingId, error, onEdit, onRemove, onDraftChange, onSave }: { requirements: RequirementInput[]; draft: RequirementDraft; editingId: string; error: string; onEdit: (item: RequirementInput) => void; onRemove: (id: string) => void; onDraftChange: (key: keyof RequirementDraft, value: string) => void; onSave: () => void }) {
  return <>
    <FormHeading number="03" title="Service requirements" intro="Add each service you’re considering. You can price and compare each one separately later." />
    {requirements.length > 0 && <div className="requirement-list">
      {requirements.map((item) => <Card as="article" key={item.id} className="requirement-card">
        <div>
          <Badge>{serviceCategories.find((category) => category.slug === item.category)?.name ?? item.category}</Badge>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          {item.budget !== null && <small>Budget: ₹{item.budget.toLocaleString('en-IN')}</small>}
          {item.instructions && <small>Special instructions: {item.instructions}</small>}
        </div>
        <div className="requirement-card__actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(item)}>Edit</Button>
          <Button type="button" variant="quiet" size="sm" onClick={() => onRemove(item.id)}>Remove</Button>
        </div>
      </Card>)}
    </div>}
    <RequirementEditor draft={draft} editing={Boolean(editingId)} error={error} onChange={onDraftChange} onSave={onSave} />
  </>
}

function AttachmentPreview({ picked, onRemove }: { picked: PickedFile; onRemove: () => void }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!picked.file?.type.startsWith('image/')) return
    const url = URL.createObjectURL(picked.file)
    // oxlint-disable-next-line react/set-state-in-effect -- Object URLs are browser resources created after mount.
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [picked.file])
  return <div className="attachment-preview">
    {preview ? <img src={preview} alt={`Preview of ${picked.record.name}`} /> : <span className="attachment-preview__type">{picked.record.type === 'application/pdf' ? 'PDF' : 'FILE'}</span>}
    <div><strong>{picked.record.name}</strong><small>{picked.record.type || 'Unknown type'} · {(picked.record.size / 1024).toFixed(0)} KB · demo only</small></div>
    <Button type="button" variant="quiet" aria-label={`Remove ${picked.record.name}`} onClick={onRemove}>Remove</Button>
  </div>
}

function AttachmentUploader({ files, error, onPick, onRemove }: { files: PickedFile[]; error: string; onPick: (files: FileList | null) => void; onRemove: (id: string) => void }) {
  return <>
    <FormHeading number="04" title="Attachments" intro="Add up to 5 JPG, PNG, WebP, or PDF files, maximum 5 MB each. This preview reads metadata and image previews locally; file contents are not uploaded." />
    <Input label="Add reference files" name="attachments" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => { onPick(event.target.files); event.target.value = '' }} />
    <p className="field__hint">Optional. You can continue without attachments.</p>
    {error && <p className="customer-error" role="alert">{error}</p>}
    <div className="attachment-list">{files.map((item) => <AttachmentPreview key={item.record.id} picked={item} onRemove={() => onRemove(item.record.id)} />)}</div>
  </>
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return <section className="review-section"><div className="review-section__heading"><h3>{title}</h3><Button type="button" size="sm" variant="quiet" onClick={onEdit}>Edit</Button></div><div className="review-section__body">{children}</div></section>
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  return <p className="review-row"><strong>{label}</strong><span>{value}</span></p>
}

function EventReview({ values, files, editing, error, saving, onEdit, onBack, onSubmit }: { values: EventValues; files: PickedFile[]; editing: boolean; error: string; saving: boolean; onEdit: (step: number) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="customer-form review-form" onSubmit={onSubmit} noValidate>
    <div className="review-heading"><div><span className="eyebrow">Step 5 · Final review</span><h2>Does everything look right?</h2></div><p>Use Edit to return to a section before saving.</p></div>
    <ReviewSection title="Basic details" onEdit={() => onEdit(0)}>
      <ReviewRow label="Event" value={`${values.name} · ${values.type}`} />
      <ReviewRow label="Description" value={values.description} />
      <ReviewRow label="Date and time" value={`${values.date} · ${values.startTime}–${values.endTime}`} />
      <ReviewRow label="Expected guests" value={String(values.guestCount)} />
    </ReviewSection>
    <ReviewSection title="Location" onEdit={() => onEdit(1)}>
      <ReviewRow label="Venue" value={values.venueName} />
      <ReviewRow label="Address" value={`${values.address}, ${values.locality}, ${values.city}, ${values.state} ${values.pinCode}`} />
    </ReviewSection>
    <ReviewSection title="Service requirements" onEdit={() => onEdit(2)}>
      {values.requirements.map((item, index) => <div className="review-requirement" key={item.id}>
        <strong>{index + 1}. {serviceCategories.find((category) => category.slug === item.category)?.name ?? item.category} · {item.title}</strong>
        <p>{item.description}</p>
        {item.budget !== null && <small>Budget: ₹{item.budget.toLocaleString('en-IN')}</small>}
        {item.instructions && <p>Special instructions: {item.instructions}</p>}
      </div>)}
    </ReviewSection>
    <ReviewSection title="Attachments" onEdit={() => onEdit(3)}>
      {files.length ? files.map((item) => <ReviewRow key={item.record.id} label={item.record.type || 'File'} value={`${item.record.name} (${(item.record.size / 1024).toFixed(0)} KB)`} />) : <p>No attachments selected.</p>}
    </ReviewSection>
    <div className="review-confirm"><Checkbox name="confirmDemo" required label="I understand this is a demo request. No provider will be invited, and no booking or payment will be made." /></div>
    {error && <p className="customer-error" role="alert">{error}</p>}
    <div className="customer-form__actions">
      <Button type="button" variant="secondary" onClick={onBack}>Back</Button>
      <Button type="submit" disabled={saving}>{saving ? 'Saving demo event…' : editing ? 'Save event changes' : 'Confirm and save demo event'}</Button>
    </div>
  </form>
}

function CreateEventPage() {
  const navigate = useNavigate(); const { eventId } = useParams(); const [searchParams] = useSearchParams()
  const editId = eventId ?? searchParams.get('edit') ?? ''
  const editMode = Boolean(editId)
  const [values, setValues] = useState<EventValues>(blankEvent); const [picked, setPicked] = useState<PickedFile[]>([])
  const [step, setStep] = useState(0); const [loading, setLoading] = useState(editMode); const [saving, setSaving] = useState(false)
  const [error, setError] = useState(''); const [fileError, setFileError] = useState(''); const [savedEvent, setSavedEvent] = useState<CustomerEvent | null>(null)
  const [editingRequirement, setEditingRequirement] = useState(''); const [requirementForm, setRequirementForm] = useState<RequirementDraft>(emptyRequirement)

  useEffect(() => {
    if (!editMode) return
    let active = true
    customerEventApi.getEvent(editId).then((event) => {
      if (!active) return
      if (!event) { setError('This event was not found in this customer demo account.'); return }
      if (event.status !== 'Submitted') { setError('This event is not in an editable state.'); return }
      setValues({ ...event, requirements: event.requirements, attachments: event.attachments })
      setPicked(event.attachments.map((record) => ({ record })))
    }).catch(() => { if (active) setError('Could not load this demo event for editing.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editId, editMode])

  function setField<K extends keyof EventValues>(key: K, value: EventValues[K]) { setValues((current) => ({ ...current, [key]: value })) }
  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return
    if (step === 0 && values.endTime <= values.startTime) { setError('End time must be later than start time.'); return }
    if (step === 2 && values.requirements.length === 0) { setError('Add at least one service requirement to continue.'); return }
    setError(''); setStep((current) => Math.min(current + 1, 4))
  }
  function saveRequirement() {
    if (!requirementForm.category || requirementForm.title.trim().length < 3 || requirementForm.description.trim().length < 10) { setError('Choose a category, add a short title, and write at least 10 characters of detail.'); return }
    if (requirementForm.budget && (!Number.isFinite(Number(requirementForm.budget)) || Number(requirementForm.budget) < 0)) { setError('Enter a valid non-negative individual budget.'); return }
    const requirement: RequirementInput = { id: editingRequirement || makeId(), category: requirementForm.category, title: requirementForm.title.trim(), description: requirementForm.description.trim(), budget: requirementForm.budget ? Number(requirementForm.budget) : null, instructions: requirementForm.instructions.trim() }
    setValues((current) => ({ ...current, requirements: editingRequirement ? current.requirements.map((item) => item.id === editingRequirement ? requirement : item) : [...current.requirements, requirement] }))
    setRequirementForm(emptyRequirement); setEditingRequirement(''); setError('')
  }
  function editRequirement(item: RequirementInput) { setEditingRequirement(item.id); setRequirementForm({ category: item.category, title: item.title, description: item.description, budget: item.budget === null ? '' : String(item.budget), instructions: item.instructions }); document.getElementById('requirement-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  function pickFiles(files: FileList | null) {
    setFileError(''); if (!files?.length) return
    const incoming: PickedFile[] = []
    for (const file of Array.from(files)) {
      if (picked.length + incoming.length >= 5) { setFileError('You can add up to 5 files.'); break }
      if (!allowedTypes.includes(file.type)) { setFileError(`${file.name} is not an accepted file type. Choose JPG, PNG, WebP, or PDF.`); continue }
      if (file.size > maxFileSize) { setFileError(`${file.name} is larger than the 5 MB limit.`); continue }
      incoming.push({ record: { id: makeId(), name: file.name, type: file.type, size: file.size }, file })
    }
    if (incoming.length) setPicked((current) => [...current, ...incoming])
  }
  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return
    if (!values.requirements.length) { setError('Add at least one service requirement before saving.'); return }
    setSaving(true); setError('')
    try {
      const metadata = await Promise.all(picked.filter((item) => item.file).map((item) => customerEventApi.uploadAttachment(item.file!)))
      const attachments = [...picked.filter((item) => !item.file).map((item) => item.record), ...metadata]
      const input = { ...values, attachments }
      const result = editMode ? await customerEventApi.updateEvent(editId, input) : await customerEventApi.createEvent(input)
      setSavedEvent(result)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The demo event could not be saved.') } finally { setSaving(false) }
  }

  if (loading) return <div className="customer-page"><Spinner label="Loading event details" /></div>
  if (error && editMode && !values.name) return <div className="customer-page"><ErrorState description={error} onRetry={() => navigate(routes.customer.requests)} /></div>
  if (savedEvent) return <section className="customer-page"><div className="event-success">
    <span className="eyebrow">Demo event {editMode ? 'updated' : 'saved'} · {savedEvent.id}</span>
    <h1>{editMode ? 'Your event details are updated.' : 'Your event plan is off to a thoughtful start.'}</h1>
    <p>“{savedEvent.name}” is saved in browser demo data. No provider invitation, booking, or payment has occurred.</p>
    <div className="event-success__actions"><ButtonLink to={customerEventPath(savedEvent.id)}>View event details</ButtonLink><ButtonLink to={routes.customer.requests} variant="secondary">Back to my events</ButtonLink></div>
  </div></section>

  return <section className="customer-page event-wizard">
    <div className="customer-page__heading">
      <div><span className="eyebrow">{editMode ? 'Edit demo event' : 'New event · demo'}</span><h1>{editMode ? 'Edit your event' : 'Let’s shape your event plan.'}</h1><p>Complete each step. Your entries remain in this form until you review and save.</p></div>
      <Link className="text-link" to={routes.customer.requests}>Cancel</Link>
    </div>
    <EventFormStepper step={step} />
    {step < 4 ? <form className="customer-form" onSubmit={next} noValidate>
      {step === 0 && <BasicDetailsForm values={values} editMode={editMode} onChange={setField} />}
      {step === 1 && <LocationForm values={values} onChange={setField} />}
      {step === 2 && <RequirementSection requirements={values.requirements} draft={requirementForm} editingId={editingRequirement} error={error} onEdit={editRequirement} onRemove={(id) => setValues((current) => ({ ...current, requirements: current.requirements.filter((item) => item.id !== id) }))} onDraftChange={(key, value) => setRequirementForm((current) => ({ ...current, [key]: value }))} onSave={saveRequirement} />}
      {step === 3 && <AttachmentUploader files={picked} error={fileError} onPick={pickFiles} onRemove={(id) => setPicked((current) => current.filter((item) => item.record.id !== id))} />}
      {error && step !== 2 && <p className="customer-error" role="alert">{error}</p>}
      <div className="customer-form__actions">
        {step > 0 && <Button type="button" variant="secondary" onClick={() => { setError(''); setStep((current) => current - 1) }}>Back</Button>}
        <Button type="submit">Continue to {step === 3 ? 'review' : stepLabels[step + 1].toLowerCase()}</Button>
      </div>
    </form> : <EventReview values={values} files={picked} editing={editMode} error={error} saving={saving} onEdit={(nextStep) => { setError(''); setStep(nextStep) }} onBack={() => setStep(3)} onSubmit={submitEvent} />}
  </section>
}

function EventDetailsPage() {
  const { eventId = '', requestId = '' } = useParams(); const id = eventId || requestId; const navigate = useNavigate()
  const [event, setEvent] = useState<CustomerEvent | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { let active = true; customerEventApi.getEvent(id).then((result) => { if (active) setEvent(result) }).catch(() => { if (active) setError('Could not load this demo event.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [id])
  if (loading) return <div className="customer-page"><Spinner label="Loading event details" /></div>
  if (error) return <div className="customer-page"><ErrorState description={error} onRetry={() => window.location.reload()} /></div>
  if (!event) return <div className="customer-page"><EmptyState title="Event not found" description="This event was not found in the current customer account. The backend must enforce event ownership when connected." action={<ButtonLink to={routes.customer.requests} variant="secondary">Back to my events</ButtonLink>} /></div>

  return <section className="customer-page event-details">
    <div className="event-detail-head">
      <div>
        <Link className="text-link" to={routes.customer.requests}>← My events</Link>
        <div className="event-detail-head__tags"><Badge tone="accent">{event.status}</Badge><span>Saved in this browser</span><span>·</span><span>{event.id}</span></div>
        <h1>{event.name}</h1>
        <p>{event.type} · {formatDate(event.date)} · {event.locality}, {event.city}</p>
      </div>
      {event.status === 'Submitted' && <div className="event-detail-head__actions"><ButtonLink to={customerEventEditPath(event.id)} variant="secondary">Edit event</ButtonLink><ButtonLink to={eventProvidersPath(event.id)}>Find professionals</ButtonLink></div>}
    </div>

    <div className="event-detail-layout">
      <div className="event-detail-main">
        <Card className="detail-card">
          <h2>Event overview</h2>
          <dl className="detail-list">
            <div><dt>Date and time</dt><dd>{formatDate(event.date)} · {event.startTime}–{event.endTime}</dd></div>
            <div><dt>Expected guests</dt><dd>{event.guestCount} guests</dd></div>
            <div><dt>Venue</dt><dd><strong>{event.venueName}</strong><br />{event.address}<br />{event.locality}, {event.city}, {event.state} {event.pinCode}</dd></div>
            <div><dt>Event description</dt><dd>{event.description || 'No description provided.'}</dd></div>
            <div><dt>Created:</dt><dd>{new Date(event.createdAt).toLocaleString()}</dd></div>
            <div><dt>Updated:</dt><dd>{new Date(event.updatedAt).toLocaleString()}</dd></div>
          </dl>
        </Card>

        <Card className="detail-card">
          <h2>Service requirements</h2>
          {event.requirements.length ? event.requirements.map((item) => <div className="event-detail-requirement" key={item.id}>
            <Badge>{serviceCategories.find((category) => category.slug === item.category)?.name ?? item.category}</Badge>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            {item.budget !== null && <small>Individual budget: ₹{item.budget.toLocaleString('en-IN')}</small>}
            {item.instructions && <small>Special instructions: {item.instructions}</small>}
          </div>) : <p>No service requirements are attached.</p>}
        </Card>

        <Card className="detail-card">
          <h2>Attachments</h2>
          <p className="detail-card__hint">Demo metadata only — file contents were not uploaded.</p>
          {event.attachments.length ? event.attachments.map((file) => <p className="attachment-row" key={file.id}>{file.name} · {file.type} · {(file.size / 1024).toFixed(0)} KB</p>) : <p>No reference files attached.</p>}
        </Card>
      </div>

      <aside className="event-detail-side">
        <Card className="event-next-step">
          <span className="eyebrow">What happens next</span>
          <p>Matching and invitation actions update local demo records only. No booking, commitment, or payment is created.</p>
          <ButtonLink to={eventProvidersPath(event.id)}>Find professionals</ButtonLink>
          <ButtonLink variant="secondary" to={eventQuotesPath(event.id)}>Compare quotations</ButtonLink>
          <Button type="button" variant="quiet" onClick={() => navigate(routes.customer.requests)}>Return to my events</Button>
        </Card>
        <Card className="event-side-note">
          <span className="eyebrow">Request status</span>
          <p>This event is saved locally. Providers in the demo can be invited from the matching screen.</p>
        </Card>
      </aside>
    </div>
  </section>
}
