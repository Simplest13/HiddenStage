export type AccountRole = 'USER' | 'CUSTOMER' | 'PROVIDER' | 'MANAGER' | 'WORKER' | 'ADMIN'
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; roles: readonly AccountRole[]; customer?: import('../../shared/api/customerContracts').CustomerIdentity }
