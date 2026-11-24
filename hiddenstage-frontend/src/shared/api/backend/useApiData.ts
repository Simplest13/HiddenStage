import { useCallback, useEffect, useRef, useState } from 'react'

type ApiDataState<T> = { data: T | null; loading: boolean; error: string }

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL_MS = 60_000

function getSessionCache<T>(key: string, ttl: number): CacheEntry<T> | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    const raw = window.sessionStorage.getItem(`hs_cache:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    // Allow cached data up to 10x TTL for instantaneous stale render
    if (Date.now() - parsed.timestamp < ttl * 10) {
      return parsed
    }
  } catch {
    // ignore parse or storage errors
  }
  return null
}

function setSessionCache<T>(key: string, data: T) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    window.sessionStorage.setItem(`hs_cache:${key}`, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // quota exceeded or private mode
  }
}

export function clearApiDataCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear()
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keysToRemove: string[] = []
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i)
          if (k && k.startsWith('hs_cache:')) keysToRemove.push(k)
        }
        for (const k of keysToRemove) window.sessionStorage.removeItem(k)
      }
    } catch {
      // ignore
    }
    return
  }

  for (const key of memoryCache.keys()) {
    if (key.includes(keyPrefix)) {
      memoryCache.delete(key)
    }
  }

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = []
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i)
        if (k && k.startsWith('hs_cache:') && k.includes(keyPrefix)) {
          keysToRemove.push(k)
        }
      }
      for (const k of keysToRemove) window.sessionStorage.removeItem(k)
    }
  } catch {
    // ignore
  }
}

/**
 * High-performance read helper with Persistent Stale-While-Revalidate caching:
 * If data exists in memory or sessionStorage, renders INSTANTLY (0ms waittime)
 * and revalidates in the background.
 */
export function useApiData<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  options?: { key?: string; ttlMs?: number; enabled?: boolean }
) {
  const cacheKey = options?.key ?? `${loader.toString().slice(0, 120)}:${JSON.stringify(deps)}`
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS
  const enabled = options?.enabled ?? true

  const memCached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined
  const sessionCached = !memCached ? getSessionCache<T>(cacheKey, ttl) : null
  const effectiveCache = memCached ?? (sessionCached ? { data: sessionCached.data, timestamp: sessionCached.timestamp } : undefined)
  const hasUsableCache = effectiveCache !== undefined

  const [state, setState] = useState<ApiDataState<T>>(() => ({
    data: effectiveCache ? effectiveCache.data : null,
    loading: hasUsableCache ? false : enabled,
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
    const currentSession = !currentCached ? getSessionCache<T>(cacheKey, ttl) : null
    const hasAnyCache = currentCached !== undefined || currentSession !== null

    if (!hasAnyCache) {
      setState((current) => ({ ...current, loading: true }))
    }

    loaderRef.current()
      .then((data) => {
        if (!active) return
        memoryCache.set(cacheKey, { data, timestamp: Date.now() })
        setSessionCache(cacheKey, data)
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
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(`hs_cache:${cacheKey}`)
      }
    } catch {
      // ignore
    }
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
          setSessionCache(cacheKey, nextData)
        } else {
          memoryCache.delete(cacheKey)
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              window.sessionStorage.removeItem(`hs_cache:${cacheKey}`)
            }
          } catch {
            // ignore
          }
        }
        return { ...current, data: nextData }
      })
    },
    [cacheKey]
  )

  return { ...state, reload, setData }
}
