export type RealtimeEvent = {
  type: string
  data: any
}

type RealtimeListener = (event: RealtimeEvent) => void

class RealtimeClient {
  private eventSource: EventSource | null = null
  private listeners = new Set<RealtimeListener>()
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private isConnecting = false

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener)
    if (!this.eventSource && !this.isConnecting) {
      this.connect()
    }
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        this.disconnect()
      }
    }
  }

  private connect() {
    if (typeof window === 'undefined') return
    this.isConnecting = true

    try {
      const es = new EventSource('/api/v1/network/stream/', { withCredentials: true })
      this.eventSource = es

      es.addEventListener('message', (e) => {
        try {
          const payload = JSON.parse(e.data) as RealtimeEvent
          this.notify(payload)
        } catch {
          // ignore non-JSON or malformed message
        }
      })

      es.addEventListener('connected', () => {
        this.isConnecting = false
      })

      es.onerror = () => {
        this.disconnect()
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null
            if (this.listeners.size > 0) {
              this.connect()
            }
          }, 5000)
        }
      }
    } catch {
      this.isConnecting = false
    }
  }

  private disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.isConnecting = false
  }

  private notify(event: RealtimeEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('Realtime listener error:', err)
      }
    }
  }
}

export const realtimeClient = new RealtimeClient()

export function subscribeToRealtime(listener: RealtimeListener): () => void {
  return realtimeClient.subscribe(listener)
}
