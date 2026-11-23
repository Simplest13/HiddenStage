import { useCallback, useEffect, useRef, useState } from 'react'

type ApiDataState<T> = { data: T | null; loading: boolean; error: string }

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL_MS = 60_000

export function clearApiDataCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear()
    return
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(keyPrefix)) {
      memoryCache.delete(key)
    }
  }
}

/**
 * High-performance read helper with Stale-While-Revalidate in-memory caching:
 * If data exists in cache, renders INSTANTLY (0ms waittime) and revalidates in the background.
 */
export function useApiData<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  options?: { key?: string; ttlMs?: number; enabled?: boolean }
) {
  const cacheKey = options?.key ?? `${loader.toString().slice(0, 120)}:${JSON.stringify(deps)}`
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS
  const enabled = options?.enabled ?? true

  const cached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined
  const hasValidCache = cached !== undefined && (Date.now() - cached.timestamp < ttl)

  const [state, setState] = useState<ApiDataState<T>>(() => ({
    data: hasValidCache ? cached.data : null,
    loading: hasValidCache ? false : enabled,
    error: '',
  }))

  const [nonce, setNonce] = useState(0)
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  })

  useEffect(() => {
    if (!enabled) return

    let active = true
    const currentCached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined

    if (!currentCached) {
      setState((current) => ({ ...current, loading: true }))
    }

    loaderRef.current()
      .then((data) => {
        if (!active) return
        memoryCache.set(cacheKey, { data, timestamp: Date.now() })
        setState({ data, loading: false, error: '' })
      })
      .catch((caught: unknown) => {
        if (!active) return
        setState((current) => ({
          data: current.data,
          loading: false,
          error: caught instanceof Error ? caught.message : 'Could not load this page.',
        }))
      })

    return () => {
      active = false
    }
  }, [cacheKey, nonce, enabled, ttl])

  const reload = useCallback(() => {
    memoryCache.delete(cacheKey)
    setNonce((value) => value + 1)
  }, [cacheKey])

  const setData = useCallback(
    (updater: T | ((current: T | null) => T | null)) => {
      setState((current) => {
        const nextData =
          typeof updater === 'function'
            ? (updater as (value: T | null) => T | null)(current.data)
            : updater
        if (nextData !== null) {
          memoryCache.set(cacheKey, { data: nextData, timestamp: Date.now() })
        } else {
          memoryCache.delete(cacheKey)
        }
        return { ...current, data: nextData }
      })
    },
    [cacheKey]
  )

  return { ...state, reload, setData }
}
