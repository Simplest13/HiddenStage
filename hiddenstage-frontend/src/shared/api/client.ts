const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
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

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, method, headers, credentials: 'include' })
  if (!response.ok) {
    const message = response.statusText || `Request failed with status ${response.status}`
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
