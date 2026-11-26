// @ts-nocheck
import { useState, type FormEvent } from 'react'
import { profilesApi } from '../../shared/api/backend/profiles'
import { useApiData } from '../../shared/api/backend/useApiData'
import { apiUrl } from '../../shared/api/client'
import type { ApiPortfolioItem } from '../../shared/api/backend/types'
import { Badge, Button, Card, Input, Modal, Select, Spinner, Textarea, useToast } from '../../shared/ui'
import { formatShortDate } from '../../shared/api/backend/format'
import { Icon } from '../../shared/ui/Icon'
import '../customer/customer.css'

type Props = {
  profileId?: string
  /** Professional portfolios default to public; customer galleries stay private. */
  audience: 'professional' | 'customer'
  title?: string
  intro?: string
}

const emptyDraft = { title: '', description: '', category: '', eventDate: '', externalUrl: '', kind: 'IMAGE' as 'IMAGE' | 'VIDEO' | 'LINK' | 'DOCUMENT' }

/**
 * One functional portfolio/gallery manager for both audiences. Files are uploaded
 * as multipart form data, previews go through the authorised API route, and item
 * changes are persisted immediately — nothing here is local-only.
 */
export function PortfolioManager({ profileId, audience, title, intro }: Props) {
  const { showToast } = useToast()
  const data = useApiData(() => profilesApi.listPortfolio(profileId), [profileId, audience])
  const items = data.data ?? []
  const [draft, setDraft] = useState(emptyDraft)
  const [file, setFile] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>(audience === 'professional' ? 'PUBLIC' : 'PRIVATE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ApiPortfolioItem | null>(null)
  const [preview, setPreview] = useState<ApiPortfolioItem | null>(null)
  const [busy, setBusy] = useState('')

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    setSaving(true); setError('')
    try {
      await profilesApi.createPortfolioItem({
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category.trim(),
        event_date: draft.eventDate || null,
        external_url: draft.externalUrl.trim(),
        media_kind: file ? (file.type === 'application/pdf' ? 'DOCUMENT' : draft.kind === 'VIDEO' ? 'VIDEO' : 'IMAGE') : 'LINK',
        visibility,
        media: file,
      }, profileId)
      setDraft(emptyDraft); setFile(null)
      showToast(audience === 'professional' ? 'Portfolio item added.' : 'Gallery item added.', 'success')
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add that item.')
    } finally { setSaving(false) }
  }

  async function move(item: ApiPortfolioItem, direction: -1 | 1) {
    const index = items.findIndex((entry) => entry.id === item.id)
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const order = items.map((entry) => entry.id)
    const [moved] = order.splice(index, 1)
    order.splice(target, 0, moved)
    setBusy(item.id)
    try {
      await profilesApi.reorderPortfolio(order, profileId)
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reorder the gallery.')
    } finally { setBusy('') }
  }

  async function toggleVisibility(item: ApiPortfolioItem) {
    setBusy(item.id)
    try {
      await profilesApi.updatePortfolioItem(item.id, { visibility: item.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' }, profileId)
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not change visibility.')
    } finally { setBusy('') }
  }

  async function remove(item: ApiPortfolioItem) {
    setBusy(item.id)
    try {
      await profilesApi.deletePortfolioItem(item.id, profileId)
      showToast('Item deleted.', 'success')
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete that item.')
    } finally { setBusy('') }
  }

  return <section className="portfolio">
    <div className="section-toolbar">
      <div>
        <h2>{title ?? (audience === 'professional' ? 'Portfolio and previous work' : 'Your event gallery')}</h2>
        <p>{intro ?? (audience === 'professional'
          ? 'Upload photographs, event projects or video links. Public items appear on your profile.'
          : 'Private by default. Only you can see these until you choose to make an item public.')}</p>
      </div>
      <Badge>{items.length} item{items.length === 1 ? '' : 's'}</Badge>
    </div>

    {data.loading && <Spinner label="Loading gallery" />}
    {data.error && <p className="customer-error" role="alert">{data.error}</p>}
    {error && <p className="customer-error" role="alert">{error}</p>}
    {!data.loading && items.length === 0 && <p className="muted-note">Nothing here yet. Add your first item below.</p>}

    {items.length > 0 && <div className="portfolio-grid">
      {items.map((item) => <Card className="portfolio-card" key={item.id}>
        <div className="portfolio-card__media">
          {item.media_kind === 'IMAGE' && item.media_url
            ? <button type="button" className="portfolio-thumb" onClick={() => setPreview(item)}><img src={apiUrl(item.media_url)} alt={item.title} loading="lazy" /></button>
            : <span className="portfolio-card__placeholder" aria-hidden="true"><Icon name={item.media_kind === 'VIDEO' ? 'play' : item.media_kind === 'DOCUMENT' ? 'fileText' : 'externalLink'} size={24} /></span>}
        </div>
        <div className="portfolio-card__body">
          <div className="portfolio-card__head">
            <h3>{item.title}</h3>
            <Badge tone={item.visibility === 'PUBLIC' ? 'success' : 'neutral'}>{item.visibility === 'PUBLIC' ? 'Public' : 'Private'}</Badge>
          </div>
          {item.description && <p>{item.description}</p>}
          <small>
            {item.category || 'Uncategorised'}
            {item.event_date ? ` · ${formatShortDate(item.event_date)}` : ''}
            {' · '}added {formatShortDate(item.created_at)}
          </small>
          {item.external_url && <a className="text-link" href={item.external_url} target="_blank" rel="noreferrer noopener">Open link</a>}
        </div>
        <div className="portfolio-card__actions">
          <Button type="button" size="sm" variant="quiet" disabled={busy === item.id} onClick={() => void move(item, -1)} aria-label={`Move ${item.title} up`}>↑</Button>
          <Button type="button" size="sm" variant="quiet" disabled={busy === item.id} onClick={() => void move(item, 1)} aria-label={`Move ${item.title} down`}>↓</Button>
          <Button type="button" size="sm" variant="quiet" onClick={() => setEditing(item)}>Edit</Button>
          <Button type="button" size="sm" variant="quiet" onClick={() => void toggleVisibility(item)}>{item.visibility === 'PUBLIC' ? 'Make private' : 'Make public'}</Button>
          <Button type="button" size="sm" variant="quiet" onClick={() => void remove(item)} disabled={busy === item.id}>Delete</Button>
        </div>
      </Card>)}
    </div>}

    <Card className="customer-form portfolio-form">
      <h3>Add a new item</h3>
      <form className="customer-form" onSubmit={add} noValidate>
        <div className="event-form-grid">
          <Input label="Title" name="portfolioTitle" required minLength={2} maxLength={150} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          <Input label="Category (optional)" name="portfolioCategory" maxLength={80} value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} hint="For example Wedding, Corporate, Stage." />
        </div>
        <Textarea label="Description" name="portfolioDescription" rows={3} maxLength={1000} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
        <div className="event-form-grid">
          <Input label="Event date (optional)" name="portfolioDate" type="date" value={draft.eventDate} onChange={(event) => setDraft((current) => ({ ...current, eventDate: event.target.value }))} />
          <Input label="Video or project link (optional)" name="portfolioLink" type="url" placeholder="https://" value={draft.externalUrl} onChange={(event) => setDraft((current) => ({ ...current, externalUrl: event.target.value }))} />
        </div>
        <div className="event-form-grid">
          <label className="field">
            <span className="field__label">Media file (optional)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <small className="field__hint">JPEG, PNG, WebP or PDF up to 8 MB.</small>
          </label>
          <Select label="Visibility" name="portfolioVisibility" value={visibility} onChange={(event) => setVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')} hint={audience === 'customer' ? 'Private items are never publicly accessible.' : 'Public items appear on your profile.'}>
            <option value="PRIVATE">Private — only you</option>
            <option value="PUBLIC">Public — visible on your profile</option>
          </Select>
        </div>
        <div className="customer-form__actions">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add item'}</Button>
        </div>
      </form>
    </Card>

    {preview && <Modal open title={preview.title} onClose={() => setPreview(null)}>
      <div className="attachment-preview-modal">
        {preview.media_url && <img src={apiUrl(preview.media_url)} alt={preview.title} />}
        {preview.description && <p>{preview.description}</p>}
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setPreview(null)}>Close</Button></div>
      </div>
    </Modal>}

    {editing && <EditPortfolioItem item={editing} profileId={profileId} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); data.reload() }} />}
  </section>
}

function EditPortfolioItem({ item, profileId, onClose, onSaved }: { item: ApiPortfolioItem; profileId?: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)
  const [category, setCategory] = useState(item.category)
  const [externalUrl, setExternalUrl] = useState(item.external_url)
  const [visibility, setVisibility] = useState(item.visibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return <Modal open title={`Edit ${item.title}`} onClose={onClose}>
    <div className="modal-stack">
      <Input label="Title" name="editPortfolioTitle" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <Textarea label="Description" name="editPortfolioDescription" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="event-form-grid">
        <Input label="Category" name="editPortfolioCategory" value={category} onChange={(event) => setCategory(event.target.value)} />
        <Input label="Link" name="editPortfolioLink" type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} />
      </div>
      <Select label="Visibility" name="editPortfolioVisibility" value={visibility} onChange={(event) => setVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')}>
        <option value="PRIVATE">Private — only you</option>
        <option value="PUBLIC">Public</option>
      </Select>
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={async () => {
          setSaving(true); setError('')
          try {
            await profilesApi.updatePortfolioItem(item.id, {
              title: title.trim(), description: description.trim(), category: category.trim(),
              external_url: externalUrl.trim(), visibility,
            }, profileId)
            onSaved()
          } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this item.') } finally { setSaving(false) }
        }}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </div>
  </Modal>
}
