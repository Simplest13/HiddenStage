import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './client'

describe('API error boundary', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('preserves backend validation and authorization messages with status codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Event date is invalid.' }), { status: 400 })))
    await expect(apiRequest('/events')).rejects.toMatchObject({ name: 'ApiError', status: 400, message: 'Event date is invalid.' })
  })

  it('turns network failures into a consistent retryable API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(apiRequest('/events')).rejects.toMatchObject({ name: 'ApiError', status: 0, message: expect.stringContaining('could not be reached') })
  })

  it('provides explicit messages for session, ownership, and server failures', () => {
    expect(new ApiError(401, 'expired').status).toBe(401)
    expect(new ApiError(403, 'forbidden').status).toBe(403)
    expect(new ApiError(404, 'missing').status).toBe(404)
    expect(new ApiError(500, 'server').status).toBe(500)
  })
})
