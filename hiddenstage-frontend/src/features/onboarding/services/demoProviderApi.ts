import type { ProviderApi, ProviderProfile } from '../../../shared/api/customerContracts'

const key = 'hiddenstage.demo.provider-profile.v1'
function currentKey() {
  try { const user = JSON.parse(sessionStorage.getItem('hiddenstage.demo.session.v1') ?? 'null') as { id?: string } | null; return `${key}.${user?.id ?? 'anonymous'}` } catch { return `${key}.anonymous` }
}
export const demoProviderApi: ProviderApi = {
  async getProviderProfile() { try { const value = localStorage.getItem(currentKey()); return value ? JSON.parse(value) as ProviderProfile : null } catch { return null } },
  async completeProviderOnboarding(profile) { localStorage.setItem(currentKey(), JSON.stringify(profile)); return profile },
}
