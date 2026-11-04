import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { Button } from './primitives'
import './ui.css'

type OverlayProps = { open: boolean; title: string; onClose: () => void; children: ReactNode }

function useOverlay(open: boolean, onClose: () => void, initialFocus: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    initialFocus.current?.focus()
    const dialog = initialFocus.current?.closest<HTMLElement>('[role="dialog"]')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('hidden'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previous?.focus() }
  }, [open, onClose, initialFocus])
}

export function Modal({ open, title, onClose, children }: OverlayProps) {
  const titleId = `modal-title-${useId().replace(/:/g, '')}`
  const closeRef = useRef<HTMLButtonElement>(null)
  useOverlay(open, onClose, closeRef)
  if (!open) return null
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="modal__header"><h2 id={titleId}>{title}</h2><Button ref={closeRef} variant="quiet" aria-label="Close dialog" onClick={onClose}>×</Button></header>
      <div className="modal__body">{children}</div>
    </section>
  </div>
}

export function Drawer({ open, title, onClose, children }: OverlayProps) {
  const titleId = `drawer-title-${useId().replace(/:/g, '')}`
  const closeRef = useRef<HTMLButtonElement>(null)
  useOverlay(open, onClose, closeRef)
  if (!open) return null
  return <div className="overlay overlay--drawer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="modal__header"><h2 id={titleId}>{title}</h2><Button ref={closeRef} variant="quiet" aria-label="Close panel" onClick={onClose}>×</Button></header>
      <div className="modal__body">{children}</div>
    </aside>
  </div>
}
