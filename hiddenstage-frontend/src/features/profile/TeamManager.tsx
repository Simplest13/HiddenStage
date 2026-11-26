import { useState, type FormEvent } from 'react'
import { profilesApi } from '../../shared/api/backend/profiles'
import { useApiData } from '../../shared/api/backend/useApiData'
import type { ProfileTeamPermission } from '../../shared/api/backend/types'
import { Badge, Button, Card, Input, Spinner, useToast } from '../../shared/ui'
import '../customer/customer.css'

const permissionOptions: Array<{ value: ProfileTeamPermission; label: string }> = [
  { value: 'MANAGE_BUSINESS_PROFILE', label: 'Manage business profile' },
  { value: 'MANAGE_PORTFOLIO', label: 'Manage portfolio' },
  { value: 'MANAGE_SERVICES', label: 'Manage services' },
  { value: 'MANAGE_TEAM', label: 'Manage team' },
  { value: 'VIEW_EVENTS', label: 'View events' },
  { value: 'MANAGE_EVENTS', label: 'Manage events' },
]

/**
 * Manager assistants: a scoped relationship between two separate accounts.
 * The assistant keeps their own password and identity; the Manager can revoke a
 * permission at any time and remains the owner of the business profile.
 */
export function TeamManager() {
  const { showToast } = useToast()
  const data = useApiData(() => profilesApi.listTeamMembers(), [])
  const members = data.data ?? []
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<ProfileTeamPermission[]>(['MANAGE_BUSINESS_PROFILE', 'MANAGE_PORTFOLIO'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (!permissions.length) { setError('Choose at least one permission.'); return }
    setSaving(true); setError('')
    try {
      await profilesApi.createTeamMember({ email: email.trim(), permissions })
      setEmail('')
      showToast('Team member added with the selected permissions.', 'success')
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add that team member.')
    } finally { setSaving(false) }
  }

  async function updatePermissions(memberId: string, next: ProfileTeamPermission[]) {
    setError('')
    try {
      await profilesApi.updateTeamMember(memberId, { permissions: next })
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update permissions.')
    }
  }

  async function revoke(memberId: string) {
    setError('')
    try {
      await profilesApi.deleteTeamMember(memberId)
      showToast('Access revoked. The account and its own profile are untouched.', 'success')
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not revoke access.')
    }
  }

  return <section className="team-manager">
    <div className="section-toolbar">
      <div>
        <h2>Team and assistants</h2>
        <p>Give a colleague scoped access to manage parts of your business profile. They use their own HiddenStage account and cannot change your password, ownership or unrelated accounts.</p>
      </div>
      <Badge>{members.filter((member) => member.is_active).length} active</Badge>
    </div>

    {data.loading && <Spinner label="Loading team" />}
    {data.error && <p className="customer-error" role="alert">{data.error}</p>}
    {error && <p className="customer-error" role="alert">{error}</p>}

    {members.length > 0 && <div className="team-list">
      {members.map((member) => <Card className="team-row" key={member.id}>
        <div>
          <strong>{member.member_name}</strong>
          <small>{member.member_email} · {member.is_active ? 'Active' : 'Revoked'}</small>
          <div className="team-permissions">
            {permissionOptions.map((option) => <label key={option.value}>
              <input
                type="checkbox"
                checked={member.permissions.includes(option.value)}
                disabled={!member.is_active}
                onChange={() => {
                  const next = member.permissions.includes(option.value)
                    ? member.permissions.filter((value) => value !== option.value)
                    : [...member.permissions, option.value]
                  void updatePermissions(member.id, next)
                }}
              />
              {option.label}
            </label>)}
          </div>
        </div>
        {member.is_active && <Button type="button" size="sm" variant="quiet" onClick={() => void revoke(member.id)}>Revoke access</Button>}
      </Card>)}
    </div>}

    <Card className="customer-form">
      <h3>Add an assistant</h3>
      <form className="customer-form" onSubmit={add} noValidate>
        <Input label="Account email" name="teamEmail" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} hint="They must already have a HiddenStage account." />
        <fieldset className="provider-onboarding__categories">
          <legend>Permissions</legend>
          <div>
            {permissionOptions.map((option) => <label key={option.value}>
              <input
                type="checkbox"
                checked={permissions.includes(option.value)}
                onChange={() => setPermissions((current) => current.includes(option.value) ? current.filter((value) => value !== option.value) : [...current, option.value])}
              />
              {option.label}
            </label>)}
          </div>
        </fieldset>
        <div className="customer-form__actions">
          <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add team member'}</Button>
        </div>
      </form>
    </Card>
  </section>
}
