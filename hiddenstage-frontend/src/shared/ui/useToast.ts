import { useContext } from 'react'
import { ToastContext } from './toastContext'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      showToast: () => {},
    }
  }
  return context
}
