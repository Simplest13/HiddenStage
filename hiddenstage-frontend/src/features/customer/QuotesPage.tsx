import { useMemo, useState } from 'react'
import { routes } from '../../app/routes/routePaths'
import { Button, ButtonLink, Card, EmptyState, ErrorState, Input, Select, Spinner, useToast } from '../../shared/ui'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { useApiData } from '../../shared/api/backend/useApiData'
import { formatPaise } from '../../shared/api/backend/format'
import type { ApiEvent, ApiQuotation } from '../../shared/api/backend/types'
import { QuoteComparison } from '../marketplace/MarketplaceUI'
import { actionableRevision } from '../../shared/api/backend/quoteSelection'
import './customer.css'

type Entry = { quotation: ApiQuotation; event: ApiEvent }

export default function QuotesPage() {
  const { showToast } = useToast()
  const data = useApiData(async () => {
    const list = await eventsApi.list()
    const live = list.filter((event) => event.status !== 'DRAFT')
    const details = await Promise.all(live.map((event) => eventsApi.get(event.id).catch(() => null)))
    const groups = await Promise.all((details.filter(Boolean) as ApiEvent[]).map(async (event) => {
      const quotations = await marketplaceApi.listEventQuotations(event.id).catch(() => [])
      return quotations.map((quotation) => ({ quotation, event }))
    }))
    return groups.flat().sort((a, b) => b.quotation.created_at.localeCompare(a.quotation.created_at))
  }, [])
  const [eventFilter, setEventFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [onlyActionable, setOnlyActionable] = useState(false)

  const entries = useMemo<Entry[]>(() => data.data ?? [], [data.data])
  const filtered = useMemo(() => entries
    .filter((entry) => eventFilter === 'ALL' || entry.event.id === eventFilter)
    .filter((entry) => !search.trim() || entry.quotation.provider_display_name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((entry) => !onlyActionable || Boolean(actionableRevision(entry.quotation))), [entries, eventFilter, search, onlyActionable])
  const events = useMemo(() => [...new Map(entries.map((entry) => [entry.event.id, entry.event])).values()], [entries])
  const commitmentTotal = filtered.reduce((total, entry) => total + (actionableRevision(entry.quotation)?.total_paise ?? 0), 0)

  return <section className="customer-page">
    <div className="customer-page__heading">
      <div>
        <span className="eyebrow eyebrow--accent">QUOTATIONS</span>
        <h1>Quotes you have received</h1>
        <p>Every submitted revision from professionals matched to your requests, with the scope, price and validity they proposed.</p>
      </div>
      <ButtonLink to={routes.customer.requests} variant="secondary">My requests</ButtonLink>
    </div>

    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading quotations" />}

    {!data.loading && !data.error && entries.length === 0 && <EmptyState
      title="No quotations yet"
      description="Quotes appear once an invited professional submits one. Publish a request and invite matching suppliers to get started."
      action={<ButtonLink to={routes.customer.newRequest}>Create a request</ButtonLink>}
    />}

    {entries.length > 0 && <>
      <div className="quote-filters">
        <Input label="Find a supplier" name="quoteSearch" type="search" placeholder="Supplier name" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select label="Request" name="quoteEvent" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
          <option value="ALL">All requests</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
        </Select>
        <label className="filter-check"><input type="checkbox" checked={onlyActionable} onChange={(event) => setOnlyActionable(event.target.checked)} /> Only quotes I can choose from now</label>
      </div>

      <Card className="quote-summary-bar">
        <div><span>Quotations shown</span><strong>{filtered.length}</strong></div>
        <div><span>Combined value</span><strong>{formatPaise(commitmentTotal)}</strong></div>
        <div><span>Across requests</span><strong>{new Set(filtered.map((entry) => entry.event.id)).size}</strong></div>
        <div className="quote-summary-bar__actions"><ButtonLink to={routes.customer.commitments} variant="quiet" size="sm">Commitments</ButtonLink></div>
      </Card>

      {filtered.length === 0 && <EmptyState title="No quotes match those filters" description="Clear the filters to see every quotation you have received." action={<Button type="button" variant="secondary" onClick={() => { setSearch(''); setEventFilter('ALL'); setOnlyActionable(false) }}>Clear filters</Button>} />}

      {filtered.length > 0 && <QuoteComparison
        quotations={filtered.map((entry) => entry.quotation)}
        showEvent
        onAccepted={() => {
          showToast('Supplier chosen. The commitment is recorded in your workspace.', 'success')
          data.reload()
        }}
      />}

      <p className="muted-note">Quotation totals are the supplier's own priced lines. If a brief is unclear, ask the supplier directly using the contact on their quote — in-platform chat is not part of this release.</p>
    </>}
  </section>
}

