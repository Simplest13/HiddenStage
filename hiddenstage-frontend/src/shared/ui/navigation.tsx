import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './ui.css'

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav aria-label="Breadcrumb" className="breadcrumbs"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>
    {item.href && index < items.length - 1 ? <Link to={item.href}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}
    {index < items.length - 1 && <span className="breadcrumbs__separator" aria-hidden="true">/</span>}
  </li>)}</ol></nav>
}

export function Tabs({ tabs, value, onChange }: { tabs: Array<{ id: string; label: string; content: ReactNode }>; value: string; onChange: (value: string) => void }) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
    onChange(tabs[next].id)
    document.getElementById(`tab-${tabs[next].id}`)?.focus()
  }
  const active = tabs.find((tab) => tab.id === value) ?? tabs[0]
  return <div className="tabs">
    <div className="tabs__list" role="tablist" aria-label="Content sections">{tabs.map((tab, index) => <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={active.id === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={active.id === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={(event) => onKeyDown(event, index)}>{tab.label}</button>)}</div>
    <section id={`panel-${active.id}`} role="tabpanel" aria-labelledby={`tab-${active.id}`} className="tabs__panel">{active.content}</section>
  </div>
}

export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className="dropdown">
    <button type="button" className="button button--quiet" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{label}<span aria-hidden="true">⌄</span></button>
    {open && <div role="menu" className="dropdown__menu" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>{children}</div>}
  </div>
}

export function DropdownItem({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) {
  return <button className="dropdown__item" role="menuitem" type="button" onClick={onSelect}>{children}</button>
}
