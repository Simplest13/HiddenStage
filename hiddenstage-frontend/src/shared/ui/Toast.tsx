import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from './primitives'
import { ToastContext, type ToastTone } from './toastContext'
import './ui.css'

type ToastMessage = { id: number; message: string; tone: ToastTone }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)
  const showToast = useCallback((message: string, tone: ToastMessage['tone'] = 'info') => {
    const id = ++nextId.current
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000)
  }, [])
  const value = useMemo(() => ({ showToast }), [showToast])
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite" aria-relevant="additions text">{toasts.map((toast) => <div key={toast.id} className={`toast toast--${toast.tone}`}>
    <span>{toast.message}</span><Button variant="quiet" size="sm" aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>Close</Button>
  </div>)}</div></ToastContext.Provider>
}
