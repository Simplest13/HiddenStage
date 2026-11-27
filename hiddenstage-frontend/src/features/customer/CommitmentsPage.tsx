import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerEventPath, routes } from '../../app/routes/routePaths'
import { Badge, ButtonLink, Card, CardButton, EmptyState, ErrorState, Spinner, useToast } from '../../shared/ui'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { useApiData } from '../../shared/api/backend/useApiData'
import { formatPaise, formatShortDate } from '../../shared/api/backend/format'
import { CommitmentStatusBadge, ReleaseCommitmentDialog } from '../marketplace/MarketplaceUI'
import './customer.css'

export default function CommitmentsPage() {
  const { showToast } = useToast()
  const data = useApiData(() => marketplaceApi.listCommitments(), [])
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RELEASED'>('ALL')
  const [releaseTarget, setReleaseTarget] = useState<string | null>(null)

  const commitments = useMemo(() => data.data ?? [], [data.data])
  const filtered = useMemo(() => commitments.filter((item) => filter === 'ALL' || item.status === filter), [commitments, filter])
  const active = commitments.filter((item) => item.status === 'ACTIVE')
  const activeTotal = active.reduce((total, item) => total + item.total_paise, 0)

  return <section className="customer-page">
    <div className="customer-page__heading">
      <div>
        <span className="eyebrow eyebrow--accent">COMMITMENTS</span>
        <h1>Suppliers you have chosen</h1>
        <p>A commitment records the services and price you agreed with a supplier. It is not a booking, payment or completion guarantee.</p>
      </div>
      <ButtonLink to={routes.customer.quotes} variant="secondary">Review quotes</ButtonLink>
    </div>

    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading commitments" />}

    {!data.loading && !data.error && commitments.length === 0 && <EmptyState
      title="No commitments yet"
      description="When you choose services from a quotation, the agreed scope and price are recorded here for you and the supplier."
      action={<ButtonLink to={routes.customer.quotes}>Review your quotations</ButtonLink>}
    />}

    {commitments.length > 0 && <>
      <div className="commitment-summary">
        <CardButton className="commitment-summary__card" aria-pressed={filter === 'ACTIVE'} onClick={() => setFilter('ACTIVE')}><span>Active commitments</span><strong>{active.length}</strong></CardButton>
        <CardButton className="commitment-summary__card" aria-pressed={filter === 'ACTIVE'} onClick={() => setFilter('ACTIVE')}><span>Agreed value</span><strong>{formatPaise(activeTotal)}</strong></CardButton>
        <CardButton className="commitment-summary__card" aria-pressed={filter === 'RELEASED'} onClick={() => setFilter('RELEASED')}><span>Released</span><strong>{commitments.length - active.length}</strong></CardButton>
        <div className="segment-control" role="group" aria-label="Filter commitments">
          {(['ALL', 'ACTIVE', 'RELEASED'] as const).map((option) => <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            className={filter === option ? 'segment-control__active' : ''}
            onClick={() => setFilter(option)}
          >{option === 'ALL' ? 'All' : option === 'ACTIVE' ? 'Active' : 'Released'}</button>)}
        </div>
      </div>

      {filtered.length === 0 && <EmptyState title="Nothing in this filter" description="Choose another filter to see your commitments." />}

      <div className="commitment-list">{filtered.map((commitment) => <Card className="commitment-card" key={commitment.id}>
        <div className="commitment-card__head">
          <div>
            <span className="eyebrow">SUPPLIER</span>
            <h2>{commitment.provider_display_name}</h2>
            <p><Link to={customerEventPath(commitment.event)}>{commitment.event_name}</Link> · {formatShortDate(commitment.event_date)} · revision {commitment.quotation_revision}</p>
          </div>
          <div className="commitment-card__amount"><strong>{formatPaise(commitment.total_paise)}</strong><CommitmentStatusBadge status={commitment.status} /></div>
        </div>
        <ul className="commitment-lines">{commitment.lines.map((line) => <li key={line.id}>
          <span>{line.title}<small>{line.package_key ? `Package · ${line.package_key}` : line.requirement_title}</small></span>
          <strong>{formatPaise(line.amount_paise)}</strong>
        </li>)}</ul>
        <div className="commitment-card__footer">
          <small>Accepted {formatShortDate(commitment.accepted_at)}{commitment.released_at ? ` · released ${formatShortDate(commitment.released_at)}` : ''}</small>
          {commitment.status === 'ACTIVE' && <button type="button" className="text-link" onClick={() => setReleaseTarget(commitment.id)}>Release commitment</button>}
        </div>
        {commitment.status === 'RELEASED' && commitment.release_reason && <p className="muted-note">Reason: {commitment.release_reason}</p>}
        {commitment.status === 'RELEASED' && <Badge tone="neutral">History retained for both sides</Badge>}
      </Card>)}</div>

      <p className="muted-note">Release is recorded with an audit entry, so neither side loses the history of what was agreed.</p>
    </>}

    {releaseTarget && <ReleaseCommitmentDialog
      onClose={() => setReleaseTarget(null)}
      onRelease={async (reason) => {
        await marketplaceApi.releaseCommitment(releaseTarget, reason)
        showToast('Commitment released. The agreed terms remain in your history.', 'success')
        setReleaseTarget(null)
        data.reload()
      }}
    />}
  </section>
}
