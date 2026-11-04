import { useId, type ReactNode } from 'react'
import './ui.css'

export function Skeleton({ className = '', label = 'Loading' }: { className?: string; label?: string }) {
  return <span className={`skeleton ${className}`} role="status" aria-label={label} />
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="spinner-wrap" role="status"><span className="spinner" aria-hidden="true" /><span>{label}</span></div>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  const titleId = useId()
  return <section className="state-card" aria-labelledby={titleId}><span className="state-card__ornament" aria-hidden="true">✳</span><h2 id={titleId}>{title}</h2><p>{description}</p>{action && <div className="state-card__action">{action}</div>}</section>
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return <section className="state-card state-card--error" role="alert"><span className="state-card__ornament" aria-hidden="true">!</span><h2>{title}</h2><p>{description}</p>{onRetry && <button className="button button--secondary" type="button" onClick={onRetry}>Try again</button>}</section>
}
