export interface UiDevelopmentAdapter {
  request<T>(key: string): Promise<T>
}

/** Explicit dev-only injection point; it contains no fixtures or production fallback. */
export function createDevOnlyAdapter(request: UiDevelopmentAdapter['request']): UiDevelopmentAdapter {
  if (!import.meta.env.DEV) throw new Error('The UI development adapter is available only in development builds.')
  return { request }
}
