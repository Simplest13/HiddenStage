import { useMemo, useState } from 'react'
import { useMatches } from 'react-router-dom'
import {
  adminApi,
  type AdminAuditEntry,
  type AdminBusiness,
  type AdminCommitment,
  type AdminEvent,
  type AdminProvider,
  type AdminUser,
} from '../../shared/api/backend/admin'
import { formatPaise, formatShortDate } from '../../shared/api/backend/format'
import { useApiData } from '../../shared/api/backend/useApiData'
import { Badge, Button, Card, EmptyState, ErrorState, Input, Select, Spinner, useToast } from '../../shared/ui'
import './admin.css'

export default function AdminPages() {
  const matches = useMatches()
  const page = (matches.at(-1)?.handle as { page?: string } | undefined)?.page ?? 'adminOverview'

  if (page === 'adminBusinesses') return <AdminBusinessesPage />
  if (page === 'adminReviews') return <AdminModerationPage />
  if (page === 'adminAudit') return <AdminAuditPage />
  return <AdminOverviewPage />
}

// ============================================================================
// 1. ADMIN OVERVIEW & USER/CATEGORY MANAGEMENT
// ============================================================================
function AdminOverviewPage() {
  const { showToast } = useToast()
  const overviewData = useApiData(() => adminApi.overview(), [])
  const usersData = useApiData(() => adminApi.listUsers(), [])
  const categoriesData = useApiData(() => adminApi.listCategories(), [])

  const [activeTab, setActiveTab] = useState<'users' | 'categories'>('users')
  const [userQuery, setUserQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [userModal, setUserModal] = useState<AdminUser | null>(null)
  const [userActionNote, setUserActionNote] = useState('')
  const [userActionPending, setUserActionPending] = useState(false)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [newCatCode, setNewCatCode] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatOrder, setNewCatOrder] = useState(10)
  const [catActionPending, setCatActionPending] = useState(false)

  const metrics = overviewData.data?.metrics
  const users = useMemo(() => usersData.data ?? [], [usersData.data])
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (userQuery) {
        const q = userQuery.toLowerCase()
        return u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q)
      }
      return true
    })
  }, [users, roleFilter, userQuery])

  async function handleToggleUserActive(user: AdminUser) {
    try {
      setUserActionPending(true)
      await adminApi.updateUser(user.id, {
        is_active: !user.is_active,
        note: userActionNote || `Administrative toggle: active=${!user.is_active}`,
      })
      showToast(`User ${user.email} is now ${!user.is_active ? 'Active' : 'Suspended'}.`, 'success')
      setUserModal(null)
      setUserActionNote('')
      usersData.reload()
      overviewData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user', 'error')
    } finally {
      setUserActionPending(false)
    }
  }

  async function handleToggleUserStaff(user: AdminUser) {
    try {
      setUserActionPending(true)
      await adminApi.updateUser(user.id, {
        is_staff: !user.is_staff,
        note: userActionNote || `Administrative toggle: is_staff=${!user.is_staff}`,
      })
      showToast(`User ${user.email} staff role updated.`, 'success')
      setUserModal(null)
      setUserActionNote('')
      usersData.reload()
      overviewData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user', 'error')
    } finally {
      setUserActionPending(false)
    }
  }

  async function handleMarkUserVerified(user: AdminUser) {
    try {
      setUserActionPending(true)
      await adminApi.updateUser(user.id, {
        mark_email_verified: true,
        note: userActionNote || 'Administrative manual email verification approval',
      })
      showToast(`User ${user.email} marked email verified.`, 'success')
      setUserModal(null)
      setUserActionNote('')
      usersData.reload()
      overviewData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to verify email', 'error')
    } finally {
      setUserActionPending(false)
    }
  }

  async function handleCreateCategory() {
    if (!newCatCode.trim() || !newCatName.trim()) {
      showToast('Code and Name are required.', 'error')
      return
    }
    try {
      setCatActionPending(true)
      await adminApi.createCategory({
        code: newCatCode.trim().toLowerCase(),
        name: newCatName.trim(),
        sort_order: Number(newCatOrder) || 0,
        is_active: true,
      })
      showToast('Category created successfully.', 'success')
      setCategoryModalOpen(false)
      setNewCatCode('')
      setNewCatName('')
      categoriesData.reload()
      overviewData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create category', 'error')
    } finally {
      setCatActionPending(false)
    }
  }

  async function handleToggleCategoryActive(catId: string, current: boolean) {
    try {
      await adminApi.updateCategory(catId, { is_active: !current })
      showToast('Category visibility updated.', 'success')
      categoriesData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update category', 'error')
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page__heading">
        <div>
          <span className="eyebrow eyebrow--accent">ADMINISTRATION</span>
          <h1>Platform Operations</h1>
          <p>Supervise user accounts, professional profiles, service taxonomy, and marketplace activity.</p>
        </div>
      </div>

      {overviewData.loading && <Spinner label="Loading platform metrics" />}
      {overviewData.error && <ErrorState description={overviewData.error} onRetry={overviewData.reload} />}

      {metrics && (
        <div className="admin-grid">
          <Card className="admin-card">
            <span className="dashboard-stat__label">Total Users</span>
            <strong>{metrics.users.total}</strong>
            <p>{metrics.users.customers} customers · {metrics.users.providers} providers · {metrics.users.staff} staff</p>
          </Card>
          <Card className="admin-card">
            <span className="dashboard-stat__label">Provider Verification</span>
            <strong>{metrics.providers.verified}</strong>
            <p>{metrics.providers.pending} pending review · {metrics.providers.unverified} unverified</p>
          </Card>
          <Card className="admin-card">
            <span className="dashboard-stat__label">Active Commitments</span>
            <strong>{metrics.commitments.active}</strong>
            <p>{formatPaise(metrics.commitments.active_total_paise)} agreed total</p>
          </Card>
          <Card className="admin-card">
            <span className="dashboard-stat__label">Events & Requests</span>
            <strong>{metrics.events.total}</strong>
            <p>{metrics.events.submitted} submitted · {metrics.events.draft} drafts</p>
          </Card>
        </div>
      )}

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab ${activeTab === 'users' ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users Management ({users.length})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'categories' ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Service Taxonomy ({categoriesData.data?.length ?? 0})
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="dashboard-panel">
          <div className="admin-filters">
            <input
              type="search"
              placeholder="Search by name, email, or phone..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="PROVIDER">Provider</option>
            </select>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.full_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{u.email}</div>
                    </td>
                    <td>
                      <Badge tone={u.role === 'PROVIDER' ? 'accent' : 'neutral'}>
                        {u.role}
                        {u.provider_kind ? ` (${u.provider_kind})` : ''}
                      </Badge>
                      {u.is_staff && (
                        <span style={{ marginLeft: '0.35rem' }}>
                          <Badge tone="success">STAFF</Badge>
                        </span>
                      )}
                    </td>
                    <td>
                      {u.email_verified ? (
                        <Badge tone="success">Email Verified</Badge>
                      ) : (
                        <Badge tone="warning">Unverified</Badge>
                      )}
                      {u.verification_status && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          Profile: {u.verification_status}
                        </div>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="warning">Suspended</Badge>
                      )}
                    </td>
                    <td>{formatShortDate(u.date_joined)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => {
                          setUserModal(u)
                          setUserActionNote('')
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      No users match the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <h2>Service Taxonomy</h2>
              <p>Active categories used by customer event requests and provider services.</p>
            </div>
            <Button onClick={() => setCategoryModalOpen(true)}>+ Add Category</Button>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Name</th>
                  <th>Slug Code</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Toggle</th>
                </tr>
              </thead>
              <tbody>
                {(categoriesData.data ?? []).map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.sort_order}</td>
                    <td><strong>{cat.name}</strong></td>
                    <td><code>{cat.code}</code></td>
                    <td>
                      {cat.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Hidden</Badge>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => handleToggleCategoryActive(cat.id, cat.is_active)}
                      >
                        {cat.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {userModal && (
        <div className="admin-modal-backdrop" onClick={() => setUserModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Manage Account: {userModal.full_name}</h3>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              {userModal.email} · Role: {userModal.role}
            </p>

            <Input
              label="Administrative Audit Note (Optional)"
              placeholder="Reason for making this change..."
              value={userActionNote}
              onChange={(e) => setUserActionNote(e.target.value)}
            />

            <div style={{ display: 'grid', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Account Status: <strong>{userModal.is_active ? 'Active' : 'Suspended'}</strong></span>
                <button
                  type="button"
                  disabled={userActionPending}
                  className={`admin-action-btn ${userModal.is_active ? 'admin-action-btn--danger' : 'admin-action-btn--success'}`}
                  onClick={() => handleToggleUserActive(userModal)}
                >
                  {userModal.is_active ? 'Suspend Account' : 'Reactivate Account'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Staff Permission: <strong>{userModal.is_staff ? 'Administrator' : 'Standard User'}</strong></span>
                <button
                  type="button"
                  disabled={userActionPending}
                  className="admin-action-btn"
                  onClick={() => handleToggleUserStaff(userModal)}
                >
                  {userModal.is_staff ? 'Revoke Staff Access' : 'Grant Staff Access'}
                </button>
              </div>

              {!userModal.email_verified && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Email Verification: <strong>Unverified</strong></span>
                  <button
                    type="button"
                    disabled={userActionPending}
                    className="admin-action-btn admin-action-btn--success"
                    onClick={() => handleMarkUserVerified(userModal)}
                  >
                    Mark Email Verified
                  </button>
                </div>
              )}
            </div>

            <div className="admin-modal-actions">
              <Button variant="secondary" onClick={() => setUserModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      {categoryModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setCategoryModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Service Category</h3>
            <Input
              label="Category Name"
              placeholder="e.g. Drone Videography"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <Input
              label="Slug Code"
              placeholder="e.g. drone-videography"
              value={newCatCode}
              onChange={(e) => setNewCatCode(e.target.value)}
            />
            <Input
              label="Sort Order"
              type="number"
              value={String(newCatOrder)}
              onChange={(e) => setNewCatOrder(Number(e.target.value))}
            />
            <div className="admin-modal-actions">
              <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={catActionPending} onClick={handleCreateCategory}>
                Create Category
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================================================
// 2. BUSINESS REVIEW & VERIFICATION
// ============================================================================
function AdminBusinessesPage() {
  const { showToast } = useToast()
  const data = useApiData(() => adminApi.listBusinesses(), [])
  const [search, setSearch] = useState('')
  const [modalBiz, setModalBiz] = useState<AdminBusiness | null>(null)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)

  const businesses = useMemo(() => data.data ?? [], [data.data])
  const filtered = useMemo(() => {
    if (!search) return businesses
    const q = search.toLowerCase()
    return businesses.filter(
      (b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q)
    )
  }, [businesses, search])

  async function handleToggleBusinessActive(biz: AdminBusiness) {
    try {
      setPending(true)
      await adminApi.updateBusiness(biz.id, {
        is_active: !biz.is_active,
        note: note || `Administrative toggle: is_active=${!biz.is_active}`,
      })
      showToast(`Business ${biz.name} status updated.`, 'success')
      setModalBiz(null)
      setNote('')
      data.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update business', 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page__heading">
        <div>
          <span className="eyebrow eyebrow--accent">BUSINESS REVIEW</span>
          <h1>Registered Businesses</h1>
          <p>Review business legal entities and their designated representatives.</p>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="admin-filters">
          <input
            type="search"
            placeholder="Search business by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {data.loading && <Spinner label="Loading businesses" />}
        {data.error && <ErrorState description={data.error} onRetry={data.reload} />}

        {!data.loading && !data.error && filtered.length === 0 && (
          <EmptyState
            title="No businesses found"
            description="No business profiles match the current filter."
          />
        )}

        {filtered.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Location</th>
                  <th>Representatives</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((biz) => (
                  <tr key={biz.id}>
                    <td>
                      <strong>{biz.name}</strong>
                      {biz.description && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>
                          {biz.description}
                        </div>
                      )}
                    </td>
                    <td>{biz.city ? `${biz.city}, ${biz.state}` : 'Not set'}</td>
                    <td>
                      {biz.representatives.map((rep) => (
                        <div key={rep.id} style={{ fontSize: '0.78rem' }}>
                          {rep.user_full_name} ({rep.role})
                        </div>
                      ))}
                      {biz.representatives.length === 0 && <small>None assigned</small>}
                    </td>
                    <td>
                      {biz.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="warning">Suspended</Badge>}
                    </td>
                    <td>{formatShortDate(biz.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => {
                          setModalBiz(biz)
                          setNote('')
                        }}
                      >
                        Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalBiz && (
        <div className="admin-modal-backdrop" onClick={() => setModalBiz(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Manage Business: {modalBiz.name}</h3>
            <Input
              label="Administrative Audit Note"
              placeholder="Reason for changing status..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Current Status: <strong>{modalBiz.is_active ? 'Active' : 'Suspended'}</strong></span>
              <button
                type="button"
                disabled={pending}
                className={`admin-action-btn ${modalBiz.is_active ? 'admin-action-btn--danger' : 'admin-action-btn--success'}`}
                onClick={() => handleToggleBusinessActive(modalBiz)}
              >
                {modalBiz.is_active ? 'Suspend Business' : 'Activate Business'}
              </button>
            </div>
            <div className="admin-modal-actions">
              <Button variant="secondary" onClick={() => setModalBiz(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================================================
// 3. MODERATION QUEUE (PROVIDERS, EVENTS, COMMITMENTS)
// ============================================================================
function AdminModerationPage() {
  const { showToast } = useToast()
  const [tab, setTab] = useState<'providers' | 'events' | 'commitments'>('providers')

  const providersData = useApiData(() => adminApi.listProviders(), [])
  const eventsData = useApiData(() => adminApi.listEvents(), [])
  const commitmentsData = useApiData(() => adminApi.listCommitments(), [])

  // Provider verification action state
  const [verifyModalTarget, setVerifyModalTarget] = useState<AdminProvider | null>(null)
  const [targetStatus, setTargetStatus] = useState<'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('VERIFIED')
  const [verifyNote, setVerifyNote] = useState('')
  const [verifyPending, setVerifyPending] = useState(false)

  // Event withdraw modal state
  const [eventTarget, setEventTarget] = useState<AdminEvent | null>(null)
  const [eventReason, setEventReason] = useState('')
  const [eventPending, setEventPending] = useState(false)

  // Commitment release modal state
  const [commitTarget, setCommitTarget] = useState<AdminCommitment | null>(null)
  const [commitReason, setCommitReason] = useState('')
  const [commitPending, setCommitPending] = useState(false)

  async function handleVerifySubmit() {
    if (!verifyModalTarget) return
    try {
      setVerifyPending(true)
      await adminApi.verifyProvider(verifyModalTarget.id, {
        verification_status: targetStatus,
        note: verifyNote,
      })
      showToast(`Provider marked as ${targetStatus}.`, 'success')
      setVerifyModalTarget(null)
      providersData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error')
    } finally {
      setVerifyPending(false)
    }
  }

  async function handleEventWithdraw() {
    if (!eventTarget) return
    try {
      setEventPending(true)
      await adminApi.withdrawEvent(eventTarget.id, eventReason)
      showToast('Event withdrawn by administrator.', 'success')
      setEventTarget(null)
      eventsData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to withdraw event', 'error')
    } finally {
      setEventPending(false)
    }
  }

  async function handleCommitmentRelease() {
    if (!commitTarget) return
    try {
      setCommitPending(true)
      await adminApi.releaseCommitment(commitTarget.id, commitReason)
      showToast('Commitment released by administrator.', 'success')
      setCommitTarget(null)
      commitmentsData.reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to release commitment', 'error')
    } finally {
      setCommitPending(false)
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page__heading">
        <div>
          <span className="eyebrow eyebrow--accent">MODERATION</span>
          <h1>Trust & Safety Moderation</h1>
          <p>Review provider credentials, moderate public event requests, and handle commercial disputes.</p>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab ${tab === 'providers' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('providers')}
        >
          Provider Verification Queue ({providersData.data?.length ?? 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${tab === 'events' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('events')}
        >
          Event Requests ({eventsData.data?.length ?? 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${tab === 'commitments' ? 'admin-tab--active' : ''}`}
          onClick={() => setTab('commitments')}
        >
          Active Commitments ({commitmentsData.data?.length ?? 0})
        </button>
      </div>

      {tab === 'providers' && (
        <div className="dashboard-panel">
          {providersData.loading && <Spinner label="Loading providers" />}
          {providersData.error && <ErrorState description={providersData.error} onRetry={providersData.reload} />}

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Kind</th>
                  <th>Declared Services</th>
                  <th>Coverage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Review</th>
                </tr>
              </thead>
              <tbody>
                {(providersData.data ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.display_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                        {p.user_email} · {p.contact || 'No phone'}
                      </div>
                    </td>
                    <td>
                      <Badge tone={p.kind === 'MANAGER' ? 'accent' : 'neutral'}>{p.kind}</Badge>
                    </td>
                    <td>
                      {p.services.map((s) => s.category_name).join(', ') || <small>None added</small>}
                    </td>
                    <td>
                      {p.coverage.map((c) => `${c.city} (${c.pin_code})`).join(', ') || <small>None</small>}
                    </td>
                    <td>
                      <Badge
                        tone={
                          p.verification_status === 'VERIFIED'
                            ? 'success'
                            : p.verification_status === 'REJECTED'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {p.verification_status}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => {
                          setVerifyModalTarget(p)
                          setTargetStatus(p.verification_status === 'VERIFIED' ? 'REJECTED' : 'VERIFIED')
                          setVerifyNote('')
                        }}
                      >
                        Verify / Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="dashboard-panel">
          {eventsData.loading && <Spinner label="Loading events" />}
          {eventsData.error && <ErrorState description={eventsData.error} onRetry={eventsData.reload} />}

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date & City</th>
                  <th>Organizer</th>
                  <th>Requirements</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(eventsData.data ?? []).map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <strong>{ev.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{ev.event_type}</div>
                    </td>
                    <td>
                      {formatShortDate(ev.event_date)} · {ev.city}
                    </td>
                    <td>
                      {ev.customer_name}
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{ev.customer_email}</div>
                    </td>
                    <td>{ev.requirement_count} service line(s)</td>
                    <td>
                      <Badge tone={ev.status === 'SUBMITTED' ? 'success' : 'neutral'}>{ev.status}</Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {ev.status !== 'WITHDRAWN' && (
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--danger"
                          onClick={() => {
                            setEventTarget(ev)
                            setEventReason('')
                          }}
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'commitments' && (
        <div className="dashboard-panel">
          {commitmentsData.loading && <Spinner label="Loading commitments" />}
          {commitmentsData.error && <ErrorState description={commitmentsData.error} onRetry={commitmentsData.reload} />}

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event / Parties</th>
                  <th>Agreed Value</th>
                  <th>Accepted On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Intervene</th>
                </tr>
              </thead>
              <tbody>
                {(commitmentsData.data ?? []).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.event_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                        Client: {c.customer_name} ({c.customer_email})<br />
                        Provider: {c.provider_name} ({c.provider_email})
                      </div>
                    </td>
                    <td>
                      <strong>{formatPaise(c.total_paise)}</strong> ({c.line_count} lines)
                    </td>
                    <td>{formatShortDate(c.accepted_at)}</td>
                    <td>
                      <Badge tone={c.status === 'ACTIVE' ? 'success' : 'neutral'}>{c.status}</Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {c.status === 'ACTIVE' && (
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--danger"
                          onClick={() => {
                            setCommitTarget(c)
                            setCommitReason('')
                          }}
                        >
                          Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verifyModalTarget && (
        <div className="admin-modal-backdrop" onClick={() => setVerifyModalTarget(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Verify Professional: {verifyModalTarget.display_name}</h3>
            <Select
              label="Set Status"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED')}
            >
              <option value="VERIFIED">Verified (Approved)</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending Review</option>
              <option value="UNVERIFIED">Unverified</option>
            </Select>
            <Input
              label="Reviewer Note (Recorded in Audit Trail)"
              placeholder="e.g. Identity verified via registration phone & coverage check"
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
            />
            <div className="admin-modal-actions">
              <Button variant="secondary" onClick={() => setVerifyModalTarget(null)}>
                Cancel
              </Button>
              <Button disabled={verifyPending} onClick={handleVerifySubmit}>
                Submit Decision
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Withdraw Modal */}
      {eventTarget && (
        <div className="admin-modal-backdrop" onClick={() => setEventTarget(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Withdraw Event Listing: {eventTarget.name}</h3>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              Withdrawing removes this event from matching feeds. History is preserved.
            </p>
            <Input
              label="Reason for Administrative Withdrawal"
              placeholder="e.g. Duplicate listing requested by organizer"
              value={eventReason}
              onChange={(e) => setEventReason(e.target.value)}
            />
            <div className="admin-modal-actions">
              <Button variant="secondary" onClick={() => setEventTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={eventPending} onClick={handleEventWithdraw}>
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Commitment Release Modal */}
      {commitTarget && (
        <div className="admin-modal-backdrop" onClick={() => setCommitTarget(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Release Commitment: {commitTarget.event_name}</h3>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              Administrative release records an immutable audit log. Both parties retain agreement history.
            </p>
            <Input
              label="Reason for Release"
              placeholder="e.g. Mutual cancellation processed via customer support ticket"
              value={commitReason}
              onChange={(e) => setCommitReason(e.target.value)}
            />
            <div className="admin-modal-actions">
              <Button variant="secondary" onClick={() => setCommitTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={commitPending} onClick={handleCommitmentRelease}>
                Confirm Release
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================================================
// 4. UNIFIED AUDIT TRAIL
// ============================================================================
function AdminAuditPage() {
  const [source, setSource] = useState<'all' | 'admin' | 'commitments'>('all')
  const [query, setQuery] = useState('')
  const data = useApiData(() => adminApi.listAudit({ source, q: query }), [source, query])
  const [selectedEntry, setSelectedEntry] = useState<AdminAuditEntry | null>(null)

  const entries = useMemo(() => data.data ?? [], [data.data])

  return (
    <section className="admin-page">
      <div className="admin-page__heading">
        <div>
          <span className="eyebrow eyebrow--accent">AUDIT TRAIL</span>
          <h1>System Audit Log</h1>
          <p>Immutable record of all administrative overrides, verifications, and commercial commitment decisions.</p>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="admin-filters">
          <input
            type="search"
            placeholder="Search audit trail by actor, target, note, or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={source} onChange={(e) => setSource(e.target.value as 'all' | 'admin' | 'commitments')}>
            <option value="all">All Sources</option>
            <option value="admin">Admin Actions</option>
            <option value="commitments">Commitment Decisions</option>
          </select>
        </div>

        {data.loading && <Spinner label="Loading audit entries" />}
        {data.error && <ErrorState description={data.error} onRetry={data.reload} />}

        {!data.loading && !data.error && entries.length === 0 && (
          <EmptyState
            title="No audit entries"
            description="No logged administrative or commitment actions match this query."
          />
        )}

        {entries.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>Note</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(entry.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <Badge tone={entry.source === 'admin' ? 'accent' : 'neutral'}>
                        {entry.action}
                      </Badge>
                    </td>
                    <td>
                      <strong>{entry.actor_name}</strong>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>{entry.actor_email}</div>
                    </td>
                    <td>
                      <strong>{entry.target_label || entry.target_type}</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)' }}>ID: {entry.target_id.slice(0, 8)}...</div>
                    </td>
                    <td style={{ maxWidth: '18rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.note || <span style={{ color: 'var(--color-muted)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEntry && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedEntry(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Audit Entry: {selectedEntry.action}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              <strong>Timestamp:</strong> {new Date(selectedEntry.created_at).toISOString()}<br />
              <strong>Actor:</strong> {selectedEntry.actor_name} ({selectedEntry.actor_email})<br />
              <strong>Target:</strong> {selectedEntry.target_type} : {selectedEntry.target_id} ({selectedEntry.target_label})
            </p>
            {selectedEntry.note && (
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                <strong>Note:</strong> {selectedEntry.note}
              </p>
            )}
            <div style={{ background: '#f4f4f5', padding: '0.75rem', borderRadius: '4px', overflowX: 'auto' }}>
              <strong>Metadata:</strong>
              <pre style={{ margin: 0, fontSize: '0.78rem' }}>
                {JSON.stringify(selectedEntry.metadata, null, 2)}
              </pre>
            </div>
            <div className="admin-modal-actions">
              <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
