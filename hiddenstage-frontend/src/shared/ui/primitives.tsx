import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import './ui.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) {
  return <button ref={ref} className={`button button--${variant} button--${size} ${className}`} {...props}>{children}</button>
})

export function ButtonLink({ to, variant = 'primary', size = 'md', className = '', children }: { to: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; className?: string; children: ReactNode }) {
  return <Link to={to} className={`button button--${variant} button--${size} ${className}`}>{children}</Link>
}

type FieldProps = { label: string; hint?: string; error?: string; id?: string }
type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, id, className = '', ...props }, ref) {
  const generatedId = useId()
  const fieldId = id ?? props.name ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  return <div className="field">
    <label className="field__label" htmlFor={fieldId}>{label}</label>
    <input ref={ref} className={`control ${error ? 'control--error' : ''} ${className}`} id={fieldId} aria-invalid={Boolean(error)} aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined} {...props} />
    {hint && <span id={hintId} className="field__hint">{hint}</span>}
    {error && <span id={errorId} className="field__error">{error}</span>}
  </div>
})

export function Textarea({ label, hint, error, id, className = '', ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId()
  const fieldId = id ?? props.name ?? generatedId
  const descriptionIds = [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ')
  return <div className="field">
    <label className="field__label" htmlFor={fieldId}>{label}</label>
    <textarea id={fieldId} className={`control control--textarea ${error ? 'control--error' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={descriptionIds || undefined} {...props} />
    {hint && <span id={`${fieldId}-hint`} className="field__hint">{hint}</span>}
    {error && <span id={`${fieldId}-error`} className="field__error">{error}</span>}
  </div>
}

export function Select({ label, hint, error, id, children, className = '', ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const generatedId = useId()
  const fieldId = id ?? props.name ?? generatedId
  const descriptionIds = [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ')
  return <div className="field">
    <label className="field__label" htmlFor={fieldId}>{label}</label>
    <select id={fieldId} className={`control control--select ${error ? 'control--error' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={descriptionIds || undefined} {...props}>{children}</select>
    {hint && <span className="field__hint">{hint}</span>}
    {error && <span className="field__error">{error}</span>}
  </div>
}

export function Checkbox({ label, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  return <label className="choice"><input type="checkbox" {...props} /><span className="choice__mark" aria-hidden="true" /><span>{label}</span></label>
}

export function Radio({ label, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  return <label className="choice"><input type="radio" {...props} /><span className="choice__mark choice__mark--radio" aria-hidden="true" /><span>{label}</span></label>
}

export function Card({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'article' | 'section' }) {
  return <Tag className={`card ${className}`}>{children}</Tag>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'H'
  return <span className={`avatar avatar--${size}`} aria-label={name} role="img">{initials}</span>
}
