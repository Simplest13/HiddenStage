const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  /** Field-level messages keyed by the API field name (DRF validation output). */
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
    this.name = 'ApiError'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function fallbackMessage(status: number) {
  if (status === 0) return 'The service could not be reached. Check your connection and try again.'
  if (status === 400) return 'Some details need correction. Review the form and try again.'
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'That record could not be found.'
  if (status === 409) return 'This action conflicts with the current state. Refresh and try again.'
  if (status === 429) return 'Too many attempts. Wait a moment and try again.'
  if (status >= 500) return 'The service is temporarily unavailable. Try again shortly.'
  return `Request failed with status ${status}.`
}

function readMessage(value: unknown): string {
  if (Array.isArray(value)) return value.map(readMessage).filter(Boolean).join(' ')
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).map(readMessage).filter(Boolean).join(' ')
  }
  return ''
}

function parseErrorBody(payload: unknown) {
  if (!payload || typeof payload !== 'object') return { message: '', fields: {} as Record<string, string> }
  const body = payload as Record<string, unknown>
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    if (key === 'detail' || key === 'message') continue
    const text = readMessage(value)
    if (text) fields[key] = text
  }
  const top = typeof body.detail === 'string' ? body.detail : typeof body.message === 'string' ? body.message : ''
  return { message: top || Object.values(fields)[0] || '', fields }
}

function readCsrfCookie() {
  if (typeof document === 'undefined') return undefined
  const cookie = document.cookie.split('; ').find((item) => item.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.slice('csrftoken='.length)) : undefined
}

let csrfToken: string | undefined

/** Bootstrap the CSRF cookie Django exposes next to the HttpOnly session cookie. */
export async function ensureCsrfToken(force = false): Promise<string> {
  if (!force) {
    csrfToken = csrfToken || readCsrfCookie()
    if (csrfToken) return csrfToken
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new ApiError(0, fallbackMessage(0))
  }
  const body = await response.json().catch(() => null) as { csrfToken?: unknown } | null
  csrfToken = readCsrfCookie() || (typeof body?.csrfToken === 'string' ? body.csrfToken : undefined)
  if (!response.ok || !csrfToken) {
    throw new ApiError(response.status || 0, fallbackMessage(response.status))
  }
  return csrfToken
}

/** Drop the cached token after sign-out so the next session bootstraps a fresh one. */
export function resetCsrfToken() {
  csrfToken = undefined
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

export async function apiRequest<T>(path: string, init: RequestInit = {}, retryOnCsrfFailure = true): Promise<T> {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!SAFE_METHODS.has(method)) headers.set('X-CSRFToken', await ensureCsrfToken())

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, method, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, fallbackMessage(0))
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const { message, fields } = parseErrorBody(payload)
    // Django rejects a stale CSRF token with 403; refresh once and retry the request.
    if (response.status === 403 && retryOnCsrfFailure && /CSRF/i.test(message)) {
      await ensureCsrfToken(true)
      return apiRequest<T>(path, init, false)
    }
    throw new ApiError(response.status, message || fallbackMessage(response.status), fields)
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export function jsonBody(value: unknown): RequestInit {
  return { body: JSON.stringify(value) }
}

/** Absolute URL for an API-relative link returned by the server (e.g. attachment downloads). */
export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** Trigger an authenticated download without exposing the session cookie to a new tab. */
export async function downloadApiFile(path: string, filename: string) {
  const response = await fetch(apiUrl(path), { credentials: 'include', headers: { Accept: '*/*' } })
  if (!response.ok) throw new ApiError(response.status, fallbackMessage(response.status))
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
