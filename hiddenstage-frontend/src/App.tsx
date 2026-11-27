import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { AppProviders } from './app/providers/AppProviders'
import { router } from './app/router/router'

export default function App() {
  useEffect(() => {
    let removeListener: (() => void) | undefined

    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        router.navigate(-1)
      } else {
        CapApp.exitApp()
      }
    })
      .then((handle) => {
        removeListener = () => {
          handle.remove()
        }
      })
      .catch(() => {
        // App listener unavailable outside native Capacitor shell
      })

    return () => {
      removeListener?.()
    }
  }, [])

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
