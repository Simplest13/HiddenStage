import { useCallback, useEffect, useRef, useState } from 'react'

type ApiDataState<T> = { data: T | null; loading: boolean; error: string }

/**
 * Small read helper for the organiser screens: one loader, an explicit dependency
 * key and a reload function. Writes are performed by the calling page.
 */
export function useApiData<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<ApiDataState<T>>({ data: null, loading: true, error: '' })
  const [nonce, setNonce] = useState(0)
  const loaderRef = useRef(loader)
  const depsKey = JSON.stringify(deps)

  useEffect(() => { loaderRef.current = loader })

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, loading: true }))
    loaderRef.current()
      .then((data) => { if (active) setState({ data, loading: false, error: '' }) })
      .catch((caught: unknown) => {
        if (active) setState({ data: null, loading: false, error: caught instanceof Error ? caught.message : 'Could not load this page.' })
      })
    return () => { active = false }
  }, [depsKey, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])
  const setData = useCallback((updater: T | ((current: T | null) => T | null)) => {
    setState((current) => ({ ...current, data: typeof updater === 'function' ? (updater as (value: T | null) => T | null)(current.data) : updater }))
  }, [])

  return { ...state, reload, setData }
}
