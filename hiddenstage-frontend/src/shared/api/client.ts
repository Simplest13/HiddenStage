const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

function fallbackMessage(status: number) {
  if (status === 0) return 'The service could not be reached. Check your connection and try again.'
  if (status === 400) return 'Some event details need correction. Review the form and try again.'
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 403) return 'You do not have permission to access this event.'
  if (status === 404) return 'This event could not be found.'
  if (status >= 500) return 'The service is temporarily unavailable. Try again shortly.'
  return `Request failed with status ${status}.`
}

async function responseMessage(response: Response) {
  try {
    const body = await response.clone().json() as { detail?: unknown; message?: unknown; errors?: unknown }
    for (const value of [body.detail, body.message]) if (typeof value === 'string' && value.trim()) return value
    if (body.errors) return JSON.stringify(body.errors)
  } catch { /* The server may send an empty or non-JSON error body. */ }
  return fallbackMessage(response.status)
}

function readCsrfCookie() {
  if (typeof document === 'undefined') return undefined
  const cookie = document.cookie.split('; ').find((item) => item.startsWith('csrftoken='))
  return cookie?.slice('csrftoken='.length)
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET'
  const csrfToken = ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method) ? undefined : readCsrfCookie()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (csrfToken) headers.set('X-CSRFToken', decodeURIComponent(csrfToken))

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, method, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, fallbackMessage(0))
  }
  if (!response.ok) {
    throw new ApiError(response.status, await responseMessage(response))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
