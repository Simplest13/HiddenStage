export type AccountRole = 'CUSTOMER' | 'PROVIDER'

/** Session identity mapped from `GET /api/v1/auth/me/`. */
export type SessionUser = {
  id: string
  fullName: string
  username?: string | null
  email: string
  phone: string
  avatarUrl?: string | null
  themePreference?: 'light' | 'dark'
  emailVerified: boolean
  /** Deployment policy: false when this launch does not require verification. */
  emailVerificationRequired: boolean
  profileCompleted: boolean
  accountType: AccountRole
  isStaff?: boolean
  isSuperuser?: boolean
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; roles: readonly AccountRole[]; user: SessionUser }

export type RegisterResult = {
  user: SessionUser
  verificationEmailSent: boolean
}
