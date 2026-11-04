export type AccountRole = 'USER' | 'MANAGER' | 'WORKER' | 'ADMIN'
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; roles: readonly AccountRole[] }
