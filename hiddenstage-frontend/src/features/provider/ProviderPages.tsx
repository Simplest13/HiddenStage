import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useMatches, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { Award, CircleCheck, FileText, Mail, ShieldCheck, Sparkles } from 'kubai-icons-react'
import { customerEventPath, providerQuotePath, routes } from '../../app/routes/routePaths'
import { useAuth } from '../../app/auth/useAuth'
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorState, Input, Modal, Select, Spinner, Textarea, useToast } from '../../shared/ui'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { networkApi } from '../../shared/api/backend/network'
import { profilesApi } from '../../shared/api/backend/profiles'
import { useApiData } from '../../shared/api/backend/useApiData'
import {
  formatDate,
  formatPaise,
  formatShortDate,
  formatTimeRange,
  parseRupeesToPaise,
  verificationStatusLabels,
} from '../../shared/api/backend/format'
import type {
  ApiCommitment,
  ApiInvitation,
  ApiManagerSearchResult,
  ApiProviderOpportunity,
  ApiProviderProfile,
  ApiProviderService,
  ApiQuotation,
  ApiQuoteRevision,
  PortfolioMediaKind,
  PortfolioVisibility,
  ProfileTeamPermission,
  ProviderKind,
} from '../../shared/api/backend/types'
import { isApiError } from '../../shared/api/client'
import { CommitmentStatusBadge, InvitationStatusBadge, QuoteBreakdown, RevisionStatusBadge } from '../marketplace/MarketplaceUI'
import { getProviderDashboardPresentation } from './providerDashboardConfig'
import { latestRevision } from '../../shared/api/backend/quoteSelection'
import '../customer/customer.css'
import '../marketplace/marketplace.css'
import './provider.css'

type Page = 'providerHome' | 'providerProfile' | 'providerServices' | 'providerCoverage' | 'providerOpportunities' | 'providerRequests' | 'providerQuotes' | 'providerQuoteEditor' | 'providerCommitments'

const providerKindLabels = {
  MANAGER: 'Manager',
  INDIVIDUAL_SERVICE_PROVIDER: 'Individual Service Provider',
  ASSOCIATED_SERVICE_PROVIDER: 'Associated Service Provider',
  TALENT: 'Talent / Performer',
  WORKER: 'Worker / Crew',
} as const

export default function ProviderPages() {
  const workspaceProfile = useOutletContext<ApiProviderProfile | null | undefined>()
  const page = (useMatches().at(-1)?.handle as { page?: Page } | undefined)?.page ?? 'providerHome'
  if (page === 'providerProfile') return <ProfilePage />
  if (page === 'providerServices') return <ServicesPage />
  if (page === 'providerCoverage') return <CoveragePage />
  if (page === 'providerOpportunities') return <OpportunitiesPage />
  if (page === 'providerRequests') return <InboxPage />
  if (page === 'providerQuotes') return <QuotationsPage />
  if (page === 'providerQuoteEditor') return <QuoteEditorPage />
  if (page === 'providerCommitments') return <CommitmentsPage />
  return <DashboardPage workspaceProfile={workspaceProfile} />
}

function useCategories() {
  return useApiData(() => eventsApi.categories(), [])
}

function PageHeading({ eyebrow: _eyebrow, title, intro, action }: { eyebrow?: string; title: string; intro?: string; action?: ReactNode }) {
  return <div className="customer-page__heading">
    <div><h1>{title}</h1>{intro && <p>{intro}</p>}</div>
    {action}
  </div>
}

function DashboardPage({ workspaceProfile }: { workspaceProfile?: ApiProviderProfile | null }) {
  const auth = useAuth()
  const data = useApiData(async () => {
    const [opportunities, invitations, quotations, commitments, profile, network, networkInvitations, assignments] = await Promise.all([
      marketplaceApi.listProviderOpportunities(),
      marketplaceApi.listProviderInvitations(),
      marketplaceApi.listProviderQuotations(),
      marketplaceApi.listProviderCommitments(),
      profilesApi.getProviderProfile(),
      networkApi.listAssociations().catch(() => []),
      networkApi.listInvitations().catch(() => []),
      networkApi.listAssignments().catch(() => []),
    ])
    return { opportunities, invitations, quotations, commitments, profile, network, networkInvitations, assignments }
  }, [], { key: 'provider-overview' })
  const pending = (data.data?.invitations ?? []).filter((item) => item.status === 'PENDING')
  const openQuotes = (data.data?.quotations ?? []).filter((item) => item.status === 'OPEN')
  const activeCommitments = (data.data?.commitments ?? []).filter((item) => item.status === 'ACTIVE')
  const profile = data.data?.profile ?? workspaceProfile ?? undefined
  const activeNetwork = (data.data?.network ?? []).filter((item) => item.status === 'ACTIVE')
  const pendingNetwork = (data.data?.networkInvitations ?? []).filter((item) => item.status === 'PENDING')
  const assignmentInvitations = (data.data?.assignments ?? []).filter((item) => item.status === 'SENT')
  const upcomingAssignments = (data.data?.assignments ?? []).filter((item) => ['ACCEPTED', 'IN_PROGRESS'].includes(item.status))
  const user = auth.status === 'authenticated' ? auth.user : undefined
  const presentation = getProviderDashboardPresentation(profile?.kind)
  const isManager = profile?.kind === 'MANAGER'
  const isWorker = profile?.kind === 'WORKER'

  const providerName = (user?.fullName ? user.fullName : profile?.display_name) || 'there'
  const profileMetric = {
    label: 'Profile',
    value: profile ? verificationStatusLabels[profile.verification_status] : '—',
    description: profile?.completed_at ? 'Published to matching organisers.' : 'Complete profile to be matched.',
    icon: <ShieldCheck size={20} color="#ff7a00" />,
  }
  const dashboardMetrics = isManager
    ? [
      {
        label: 'Active commitments',
        value: activeCommitments.length,
        description: 'Accepted engagements recorded for your business.',
        icon: <Award size={20} color="#6b3e26" />,
      },
      {
        label: 'Active Workers',
        value: activeNetwork.length,
        description: 'Workers in your active network.',
        icon: <Sparkles size={20} color="#ff7a00" />,
      },
      {
        label: 'Assignment invitations',
        value: assignmentInvitations.length,
        description: 'Assignments awaiting a Worker response.',
        icon: <Mail size={20} color="#f8b6c1" />,
      },
      {
        label: 'Upcoming assignments',
        value: upcomingAssignments.length,
        description: 'Accepted or in-progress Worker assignments.',
        icon: <FileText size={20} color="#ff7a00" />,
      },
      profileMetric,
    ]
    : isWorker
      ? [
        {
          label: 'Assignment invitations',
          value: assignmentInvitations.length,
          description: 'Assignments waiting for your response.',
          icon: <Mail size={20} color="#f8b6c1" />,
        },
        {
          label: 'Upcoming assignments',
          value: upcomingAssignments.length,
          description: 'Accepted or in-progress work.',
          icon: <FileText size={20} color="#ff7a00" />,
        },
        {
          label: 'Active Managers',
          value: activeNetwork.length,
          description: 'Managers in your active network.',
          icon: <Sparkles size={20} color="#ff7a00" />,
        },
        {
          label: 'Network invitations',
          value: pendingNetwork.length,
          description: 'Manager invitations awaiting your response.',
          icon: <Award size={20} color="#6b3e26" />,
        },
        profileMetric,
      ]
      : [
        {
          label: profile?.kind === 'TALENT' ? 'Performance opportunities' : 'Opportunities',
          value: data.data?.opportunities.length ?? 0,
          description: 'Open requests matched to your profile.',
          icon: <Sparkles size={20} color="#ff7a00" />,
        },
        {
          label: profile?.kind === 'TALENT' ? 'Performance invitations' : 'Invitations',
          value: pending.length,
          description: 'Organisers waiting for your answer.',
          icon: <Mail size={20} color="#f8b6c1" />,
        },
        {
          label: profile?.kind === 'TALENT' ? 'Open quotations' : 'Open quotes',
          value: openQuotes.length,
          description: 'Quotes you can revise or track.',
          icon: <FileText size={20} color="#ff7a00" />,
        },
        {
          label: profile?.kind === 'ASSOCIATED_SERVICE_PROVIDER' ? 'Active engagements' : profile?.kind === 'TALENT' ? 'Booked performances' : 'Commitments',
          value: activeCommitments.length,
          description: 'Services an organiser has chosen.',
          icon: <Award size={20} color="#6b3e26" />,
        },
        profileMetric,
      ]

  return <section className="customer-page">
    <div className="dashboard-welcome-hero">
      <div className="dashboard-welcome-hero__body">
        <span className="dashboard-welcome-hero__tag">
          <Sparkles size={14} color="#f8b6c1" />
          <span>{presentation.eyebrow}</span>
        </span>
        <h1>
          Welcome back{providerName ? `, ${providerName}` : ''}. {profile ? <em>{presentation.title}</em> : null}
        </h1>
        <p>{presentation.intro}</p>
        <div className="dashboard-welcome-hero__chips">
          <span><CircleCheck size={13} color="#f8b6c1" /> Verified business</span>
          <span><CircleCheck size={13} color="#f8b6c1" /> 0% agency markup</span>
          <span><CircleCheck size={13} color="#f8b6c1" /> Direct client communication</span>
        </div>
      </div>
      <div className="dashboard-welcome-hero__actions">
        <ButtonLink to={presentation.primaryAction.to} size="lg" className="button--saffron-hero">{presentation.primaryAction.label} →</ButtonLink>
      </div>
    </div>
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading your workspace" />}
    {!data.loading && <>
      <div className="stat-grid stat-grid--five">
        {dashboardMetrics.map((metric) => (
          <Card className="dashboard-stat" key={metric.label}>
            <div className="dashboard-stat__top">
              <span className="stat-icon-wrap">{metric.icon}</span>
              <span className="dashboard-stat__label">{metric.label}</span>
            </div>
            <strong className={typeof metric.value === 'string' ? 'dashboard-stat__text' : undefined}>{metric.value}</strong>
            <p>{metric.description}</p>
          </Card>
        ))}
      </div>

      {profile && profile.verification_status !== 'VERIFIED' && <div className="callout callout--muted">
        <strong>Verification is separate from your profile.</strong> You can receive invitations and quote with {verificationStatusLabels[profile.verification_status].toLowerCase()} status, but a verified badge is only shown when HiddenStage has reviewed your business.
      </div>}

      <div className="dashboard-columns">
        <Card className="dashboard-panel">
          <div className="dashboard-panel__head"><div><h2>Latest invitations</h2><p>Events matched to your services and coverage.</p></div><ButtonLink to={routes.provider.requests} variant="quiet" size="sm">View all</ButtonLink></div>
          {(data.data?.invitations.length ?? 0) === 0
            ? <p className="dashboard-subtle">No invitations yet. Keep your services, coverage and response time current — organisers invite professionals whose declared coverage matches their event.</p>
            : <ul className="dashboard-quotes">{(data.data?.invitations ?? []).slice(0, 4).map((invitation) => <li key={invitation.id}>
              <div><strong>{invitation.event_name}</strong><small>{invitation.requirement_title ?? 'All services'} · {formatShortDate(invitation.created_at)}</small></div>
              <InvitationStatusBadge status={invitation.status} />
              <Link className="text-link" to={invitation.status === 'ACCEPTED' ? providerQuotePath(invitation.event) : routes.provider.requests}>{invitation.status === 'ACCEPTED' ? 'Quote' : 'Review'}</Link>
            </li>)}</ul>}
        </Card>
        <div className="dashboard-side">
          <Card className="profile-card">
            <h2>{profile?.display_name ?? 'Your profile'}</h2>
            <p>{profile?.description || 'Add a short description so organisers understand your work.'}</p>
            <div className="profile-card__actions"><ButtonLink to={routes.provider.profile} variant="secondary" size="sm">Edit profile</ButtonLink></div>
          </Card>
          <Card className="quick-card">
            {presentation.quickLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          </Card>
        </div>
      </div>

      {(isManager || isWorker) && <Card className="dashboard-panel network-dashboard">
        <div className="dashboard-panel__head"><div><h2>{profile?.kind === 'WORKER' ? 'Managers and assignments' : 'Your network and team'}</h2><p>{profile?.kind === 'WORKER' ? 'Independent relationships across every Manager you work with.' : 'Workers you can assign to accepted customer events.'}</p></div><ButtonLink to={routes.provider.network} variant="quiet" size="sm">Open network</ButtonLink></div>
        <div className="network-dashboard__metrics">
          <div><span>{profile?.kind === 'WORKER' ? 'Active Managers' : 'Active Workers'}</span><strong>{activeNetwork.length}</strong></div>
          <div><span>{profile?.kind === 'WORKER' ? 'Network invitations' : 'Invitations pending'}</span><strong>{pendingNetwork.length}</strong></div>
          <div><span>Assignment invitations</span><strong>{assignmentInvitations.length}</strong></div>
          <div><span>Upcoming assignments</span><strong>{upcomingAssignments.length}</strong></div>
        </div>
        <div className="network-dashboard__links"><Link to={routes.provider.network}>{isWorker ? 'My Manager network' : 'My network'}</Link><Link to={routes.provider.assignments}>Assignments</Link>{isManager && <Link to={routes.provider.networkDiscover}>Discover Workers</Link>}</div>
      </Card>}

      {profile?.kind === 'ASSOCIATED_SERVICE_PROVIDER' && (
        <Card className="dashboard-panel network-dashboard">
          <div className="dashboard-panel__head">
            <div>
              <h2>Associated Managers &amp; Collaborations</h2>
              <p>Manage your affiliations with event businesses and agencies while retaining independent quoting.</p>
            </div>
            <ButtonLink to={`${routes.provider.profile}?tab=association`} variant="quiet" size="sm">
              Manage Associations
            </ButtonLink>
          </div>
          <div className="network-dashboard__metrics">
            <div><span>Active Associations</span><strong>{activeNetwork.length}</strong></div>
            <div><span>Pending Requests</span><strong>{pendingNetwork.length}</strong></div>
            <div><span>Direct Enquiries</span><strong>{pending.length}</strong></div>
            <div><span>Engagements</span><strong>{activeCommitments.length}</strong></div>
          </div>
          <div className="network-dashboard__links">
            <Link to={`${routes.provider.profile}?tab=association`}>Connect to Manager</Link>
            <Link to={routes.provider.opportunities}>Browse Direct Opportunities</Link>
            <Link to={routes.provider.services}>Manage Services</Link>
          </div>
        </Card>
      )}

      {profile?.kind === 'TALENT' && (
        <Card className="dashboard-panel network-dashboard">
          <div className="dashboard-panel__head">
            <div>
              <h2>Talent Media Portfolio &amp; Performance Gigs</h2>
              <p>High-visibility showcase for singers, DJs, anchors, musicians, and artists.</p>
            </div>
            <ButtonLink to={`${routes.provider.profile}?tab=portfolio`} variant="quiet" size="sm">
              Manage Portfolio
            </ButtonLink>
          </div>
          <div className="network-dashboard__metrics">
            <div><span>Booked Gigs</span><strong>{activeCommitments.length}</strong></div>
            <div><span>Direct Enquiries</span><strong>{pending.length}</strong></div>
            <div><span>Active Quotes</span><strong>{openQuotes.length}</strong></div>
            <div><span>Open Opportunities</span><strong>{data.data?.opportunities.length ?? 0}</strong></div>
          </div>
          <div className="network-dashboard__links">
            <Link to={`${routes.provider.profile}?tab=portfolio`}>Upload Performance Media</Link>
            <Link to={routes.provider.opportunities}>Explore Matched Gigs</Link>
            <Link to={routes.provider.quotes}>View Quotations</Link>
          </div>
        </Card>
      )}

      {profile?.kind === 'INDIVIDUAL_SERVICE_PROVIDER' && (
        <Card className="dashboard-panel network-dashboard">
          <div className="dashboard-panel__head">
            <div>
              <h2>Direct Service Bookings &amp; Local Coverage</h2>
              <p>Independent specialist workflow: one primary craft, explicit city/locality coverage, direct organiser inquiries.</p>
            </div>
            <ButtonLink to={routes.provider.services} variant="quiet" size="sm">
              Manage Pricing
            </ButtonLink>
          </div>
          <div className="network-dashboard__metrics">
            <div><span>Direct Bookings</span><strong>{activeCommitments.length}</strong></div>
            <div><span>New Invitations</span><strong>{pending.length}</strong></div>
            <div><span>Active Proposals</span><strong>{openQuotes.length}</strong></div>
            <div><span>Matched Requests</span><strong>{data.data?.opportunities.length ?? 0}</strong></div>
          </div>
          <div className="network-dashboard__links">
            <Link to={routes.provider.services}>Update Service Price</Link>
            <Link to={routes.provider.coverage}>Update Service Area</Link>
            <Link to={routes.provider.opportunities}>Review Opportunities</Link>
          </div>
        </Card>
      )}
    </>}
  </section>
}

function calculateProfileScore(profile?: ApiProviderProfile | null, portfolioCount = 0): { score: number; missing: string[] } {
  if (!profile) return { score: 0, missing: [] }
  let score = 0
  const missing: string[] = []

  if (profile.display_name?.trim()) score += 10
  else missing.push('Business Name')

  if (profile.headline?.trim()) score += 10
  else missing.push('Professional Headline')

  if (profile.description?.trim().length >= 20) score += 10
  else missing.push('Detailed Description')

  if (profile.experience_summary?.trim()) score += 10
  else missing.push('Experience & Background')

  if (profile.categories && profile.categories.length > 0) score += 10
  else missing.push('Service Categories')

  if (profile.coverage && profile.coverage.length > 0) score += 10
  else missing.push('Coverage Locations')

  if (profile.contact?.trim()) score += 10
  else missing.push('Contact Information')

  if (profile.instagram?.trim() || profile.website?.trim() || profile.youtube?.trim()) score += 5
  else missing.push('Social / Web Links')

  if (profile.cover_image?.trim() || profile.logo?.trim()) score += 10
  else missing.push('Cover / Logo Media')

  if (portfolioCount > 0) score += 15
  else missing.push('Showcase & Portfolio Items')

  return { score: Math.min(score, 100), missing }
}

function ProfilePage() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoriesState = useCategories()
  const data = useApiData(() => profilesApi.getProviderProfile(), [])
  const portfolioData = useApiData(() => profilesApi.listPortfolioItems(), [])

  const initialTab = searchParams.get('tab') as 'details' | 'services' | 'coverage' | 'portfolio' | 'team' | 'association' | null
  const [activeTab, setActiveTab] = useState<'details' | 'services' | 'coverage' | 'portfolio' | 'team' | 'association'>(initialTab || 'details')

  const [values, setValues] = useState({
    displayName: '',
    username: '',
    headline: '',
    description: '',
    experienceSummary: '',
    languages: '',
    specializations: '',
    contact: '',
    website: '',
    instagram: '',
    youtube: '',
    availabilityNote: '',
    talentCategory: '',
    performanceStyles: '',
    logo: '',
    coverImage: '',
    isPublic: true,
  })
  const [kind, setKind] = useState<ProviderKind>('MANAGER')
  const [selected, setSelected] = useState<string[]>([])
  const [coverage, setCoverage] = useState<ApiProviderProfile['coverage']>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'details' | 'services' | 'coverage' | 'portfolio' | 'team' | 'association' | null
    if (tabParam && ['details', 'services', 'coverage', 'portfolio', 'team', 'association'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  function switchTab(nextTab: 'details' | 'services' | 'coverage' | 'portfolio' | 'team' | 'association') {
    setActiveTab(nextTab)
    setSearchParams({ tab: nextTab })
  }

  useEffect(() => {
    if (!data.data) return
    const p = data.data
    setValues({
      displayName: p.display_name,
      username: p.username || '',
      headline: p.headline || '',
      description: p.description,
      experienceSummary: p.experience_summary || '',
      languages: Array.isArray(p.languages) ? p.languages.join(', ') : (p.languages || ''),
      specializations: Array.isArray(p.specializations) ? p.specializations.join(', ') : (p.specializations || ''),
      contact: p.contact,
      website: p.website || '',
      instagram: p.instagram || '',
      youtube: p.youtube || '',
      availabilityNote: p.availability_note || '',
      talentCategory: p.talent_category || '',
      performanceStyles: Array.isArray(p.performance_styles) ? p.performance_styles.join(', ') : (p.performance_styles || ''),
      logo: p.logo || '',
      coverImage: p.cover_image || '',
      isPublic: p.is_public ?? true,
    })
    setKind(p.kind)
    setSelected(p.categories)
    setCoverage(p.coverage)
  }, [data.data])

  function handleKindChange(nextKind: ProviderKind) {
    setKind(nextKind)
    if (nextKind === 'INDIVIDUAL_SERVICE_PROVIDER' && selected.length > 1) {
      setSelected(selected.slice(0, 1))
    }
  }

  function toggleCategory(code: string) {
    if (kind === 'INDIVIDUAL_SERVICE_PROVIDER') {
      setSelected([code])
      return
    }
    setSelected((items) => (items.includes(code) ? items.filter((item) => item !== code) : [...items, code]))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (!selected.length) {
      setError('Choose at least one service category.')
      return
    }
    if (kind === 'INDIVIDUAL_SERVICE_PROVIDER' && selected.length > 1) {
      setError('Individual Service Providers can select only one primary service category.')
      return
    }
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      await profilesApi.saveProviderProfile({
        display_name: values.displayName.trim(),
        username: values.username.trim() || undefined,
        headline: values.headline.trim() || undefined,
        kind,
        description: values.description.trim(),
        experience_summary: values.experienceSummary.trim() || undefined,
        languages: values.languages.trim() ? values.languages.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        specializations: values.specializations.trim() ? values.specializations.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        contact: values.contact.trim(),
        website: values.website.trim() || undefined,
        instagram: values.instagram.trim() || undefined,
        youtube: values.youtube.trim() || undefined,
        availability_note: values.availabilityNote.trim() || undefined,
        talent_category: kind === 'TALENT' ? values.talentCategory.trim() : undefined,
        performance_styles:
          kind === 'TALENT' && values.performanceStyles.trim()
            ? values.performanceStyles
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        logo: values.logo.trim() || undefined,
        cover_image: values.coverImage.trim() || undefined,
        is_public: values.isPublic,
        categories: selected,
        coverage: coverage.map(({ pin_code, locality, city, state }) => ({ pin_code, locality, city, state })),
      })
      showToast('Profile updated.', 'success')
      data.reload()
    } catch (caught) {
      if (isApiError(caught)) setFieldErrors(caught.fields)
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const profile = data.data
  const scoreInfo = useMemo(
    () => calculateProfileScore(profile, portfolioData.data?.length ?? 0),
    [profile, portfolioData.data],
  )

  return (
    <section className="customer-page">
      <PageHeading
        eyebrow="PROFILE & PORTFOLIO"
        title="Professional Profile & Portfolio"
        intro="Manage your public business profile, services, coverage locations, showcase items, and team delegation."
        action={
          profile ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <a
                href={`/providers/${profile.username || profile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button button--secondary"
                style={{ textDecoration: 'none' }}
              >
                Preview Public Profile ↗
              </a>
            </div>
          ) : undefined
        }
      />

      {profile && (
        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>Profile Strength & Readiness: {scoreInfo.score}%</strong>
                <Badge tone={values.isPublic ? 'success' : 'neutral'}>
                  {values.isPublic ? 'Publicly Listed' : 'Draft / Private'}
                </Badge>
                <Badge tone={profile.verification_status === 'VERIFIED' ? 'success' : 'neutral'}>
                  {verificationStatusLabels[profile.verification_status]}
                </Badge>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                {scoreInfo.score === 100
                  ? '🎉 Outstanding! Your profile is 100% complete with services, coverage, and media showcase.'
                  : `Next step: Add ${scoreInfo.missing.slice(0, 2).join(' & ')} to reach full customer discoverability.`}
              </p>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              {providerKindLabels[profile.kind]} · {profile.completed_at ? `Profile completed ${formatShortDate(profile.completed_at)}` : 'Incomplete'}
            </div>
          </div>
          <div style={{ background: 'var(--color-border, #ebd7cd)', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${scoreInfo.score}%`,
                background: scoreInfo.score > 80
                  ? 'linear-gradient(90deg, #f8b6c1, #ff7a00)'
                  : scoreInfo.score > 50
                  ? 'linear-gradient(90deg, #f8b6c1, #e66e00)'
                  : 'var(--color-espresso-light)',
                height: '100%',
                borderRadius: '9999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', margin: '1.5rem 0', overflowX: 'auto' }}>
        <button
          type="button"
          className="tab-button"
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'details' ? '2.5px solid var(--color-orange)' : 'none',
            fontWeight: activeTab === 'details' ? 'bold' : 'normal',
            color: activeTab === 'details' ? 'var(--color-orange)' : 'var(--color-muted)',
          }}
          onClick={() => switchTab('details')}
        >
          Profile Details
        </button>
        <button
          type="button"
          className="tab-button"
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'services' ? '2.5px solid var(--color-orange)' : 'none',
            fontWeight: activeTab === 'services' ? 'bold' : 'normal',
            color: activeTab === 'services' ? 'var(--color-orange)' : 'var(--color-muted)',
          }}
          onClick={() => switchTab('services')}
        >
          Services & Pricing
        </button>
        <button
          type="button"
          className="tab-button"
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'coverage' ? '2.5px solid var(--color-orange)' : 'none',
            fontWeight: activeTab === 'coverage' ? 'bold' : 'normal',
            color: activeTab === 'coverage' ? 'var(--color-orange)' : 'var(--color-muted)',
          }}
          onClick={() => switchTab('coverage')}
        >
          Service Coverage
        </button>
        <button
          type="button"
          className="tab-button"
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'portfolio' ? '2.5px solid var(--color-orange)' : 'none',
            fontWeight: activeTab === 'portfolio' ? 'bold' : 'normal',
            color: activeTab === 'portfolio' ? 'var(--color-orange)' : 'var(--color-muted)',
          }}
          onClick={() => switchTab('portfolio')}
        >
          Portfolio & Showcase
        </button>
        {kind === 'MANAGER' && (
          <button
            type="button"
            className="tab-button"
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'team' ? '2.5px solid var(--color-orange)' : 'none',
              fontWeight: activeTab === 'team' ? 'bold' : 'normal',
              color: activeTab === 'team' ? 'var(--color-orange)' : 'var(--color-muted)',
            }}
            onClick={() => switchTab('team')}
          >
            Team & Delegation
          </button>
        )}
        {kind === 'ASSOCIATED_SERVICE_PROVIDER' && (
          <button
            type="button"
            className="tab-button"
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'association' ? '2.5px solid var(--color-orange)' : 'none',
              fontWeight: activeTab === 'association' ? 'bold' : 'normal',
              color: activeTab === 'association' ? 'var(--color-orange)' : 'var(--color-muted)',
            }}
            onClick={() => switchTab('association')}
          >
            Manager Network
          </button>
        )}
        {kind === 'ASSOCIATED_SERVICE_PROVIDER' && (
          <button
            type="button"
            className="tab-button"
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'association' ? '2px solid var(--color-primary)' : 'none',
              fontWeight: activeTab === 'association' ? 'bold' : 'normal',
            }}
            onClick={() => switchTab('association')}
          >
            Manager Affiliation
          </button>
        )}
      </div>

      {data.loading && <Spinner label="Loading your profile" />}
      {data.error && <ErrorState description={data.error} onRetry={data.reload} />}

      {profile && activeTab === 'details' && (
        <form className="customer-form" onSubmit={submit} noValidate>
          <div className="event-form-grid">
            <Input
              label="Professional or business name"
              name="displayName"
              required
              minLength={2}
              maxLength={150}
              value={values.displayName}
              onChange={(event) => setValues((current) => ({ ...current, displayName: event.target.value }))}
              error={fieldErrors.display_name}
            />
            <Input
              label="Public profile username"
              name="username"
              placeholder="e.g. soundcraft-audio"
              value={values.username}
              onChange={(event) => setValues((current) => ({ ...current, username: event.target.value }))}
              error={fieldErrors.username}
              hint="Creates your permanent clean URL: /providers/username"
            />
          </div>

          <Input
            label="Professional headline"
            name="headline"
            maxLength={200}
            placeholder="e.g. Premier Destination Wedding Sound & Light Specialist"
            value={values.headline}
            onChange={(event) => setValues((current) => ({ ...current, headline: event.target.value }))}
            error={fieldErrors.headline}
          />

          <Select
            label="How you work"
            name="kind"
            value={kind}
            onChange={(event) => handleKindChange(event.target.value as ProviderKind)}
            required
            hint="Select your professional identity on HiddenStage."
          >
            <option value="MANAGER">Manager — coordinate events and build a team</option>
            <option value="INDIVIDUAL_SERVICE_PROVIDER">Individual Service Provider — deliver a single specialized service directly</option>
            <option value="ASSOCIATED_SERVICE_PROVIDER">Associated Service Provider — independent provider affiliated with an event company</option>
            <option value="TALENT">Talent / Performer — artist, DJ, musician, anchor, dancer, entertainer</option>
            <option value="WORKER">Worker / Crew — event setup, coordination, and on-ground operations</option>
          </Select>

          {kind === 'TALENT' && (
            <div style={{ background: 'var(--color-surface-subtle, #f8f9fa)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Talent & Performance Details</h3>
              <div className="event-form-grid">
                <Input
                  label="Talent category"
                  name="talentCategory"
                  placeholder="e.g. DJ, Solo Guitarist, Emcee"
                  value={values.talentCategory}
                  onChange={(event) => setValues((current) => ({ ...current, talentCategory: event.target.value }))}
                />
                <Input
                  label="Performance styles"
                  name="performanceStyles"
                  placeholder="e.g. Commercial, Bollywood, Western Acoustic"
                  value={values.performanceStyles}
                  onChange={(event) => setValues((current) => ({ ...current, performanceStyles: event.target.value }))}
                />
              </div>
            </div>
          )}

          <Textarea
            label="About your work"
            name="description"
            rows={4}
            required
            minLength={20}
            maxLength={1000}
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            hint="20–1000 characters. What you do, equipment, style, and track record."
            error={fieldErrors.description}
          />

          <Textarea
            label="Experience & Track Record"
            name="experienceSummary"
            rows={3}
            maxLength={2000}
            value={values.experienceSummary}
            onChange={(event) => setValues((current) => ({ ...current, experienceSummary: event.target.value }))}
            placeholder="Years in business, venues worked, notable celebrations, awards, or signature production milestones."
            hint="Displayed prominently in your profile's Experience & Story section."
          />

          <div className="event-form-grid">
            <Input
              label="Languages spoken (comma separated)"
              name="languages"
              placeholder="e.g. English, Hindi, Kannada, Tamil"
              value={values.languages}
              onChange={(event) => setValues((current) => ({ ...current, languages: event.target.value }))}
            />
            <Input
              label="Specializations (comma separated)"
              name="specializations"
              placeholder="e.g. Destination Weddings, Sangeet Night, Corporate Galas"
              value={values.specializations}
              onChange={(event) => setValues((current) => ({ ...current, specializations: event.target.value }))}
            />
          </div>

          <div className="event-form-grid">
            <Input
              label="Contact phone or email"
              name="contact"
              required
              minLength={5}
              value={values.contact}
              onChange={(event) => setValues((current) => ({ ...current, contact: event.target.value }))}
              hint="Only shared with an organiser who chooses you."
              error={fieldErrors.contact}
            />
            <Input
              label="Availability notes (optional)"
              name="availabilityNote"
              placeholder="e.g. Available across South India with 3-day notice"
              value={values.availabilityNote}
              onChange={(event) => setValues((current) => ({ ...current, availabilityNote: event.target.value }))}
            />
          </div>

          <div className="event-form-grid">
            <Input
              label="Website or portfolio URL"
              name="website"
              value={values.website}
              onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
            />
            <Input
              label="Instagram URL or handle"
              name="instagram"
              value={values.instagram}
              onChange={(event) => setValues((current) => ({ ...current, instagram: event.target.value }))}
            />
            <Input
              label="YouTube link"
              name="youtube"
              value={values.youtube}
              onChange={(event) => setValues((current) => ({ ...current, youtube: event.target.value }))}
            />
          </div>

          <div className="event-form-grid">
            <Input
              label="Cover banner image URL"
              name="coverImage"
              placeholder="https://... high-resolution landscape photo for profile header"
              value={values.coverImage}
              onChange={(event) => setValues((current) => ({ ...current, coverImage: event.target.value }))}
            />
            <Input
              label="Logo or avatar URL"
              name="logo"
              placeholder="https://... square logo or brand image"
              value={values.logo}
              onChange={(event) => setValues((current) => ({ ...current, logo: event.target.value }))}
            />
          </div>

          <div style={{ background: 'var(--color-surface-subtle, #f9fafb)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', margin: '1rem 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={values.isPublic}
                onChange={(e) => setValues((current) => ({ ...current, isPublic: e.target.checked }))}
                style={{ width: '1.15rem', height: '1.15rem' }}
              />
              <span>Publish profile to public directory and client search</span>
            </label>
            <p style={{ margin: '0.25rem 0 0 1.9rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              When enabled, your business profile and showcase can be discovered by customers at /providers and via search engines.
            </p>
          </div>

          <fieldset className="provider-onboarding__categories">
            <legend>Service categories</legend>
            {kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? (
              <p><strong>Individual Service Providers specialize in exactly one primary category.</strong></p>
            ) : (
              <p>Removing a category hides it from matching. Existing quotations keep their history.</p>
            )}
            <div>
              {(categoriesState.data ?? []).map((category) => (
                <label key={category.code}>
                  <input
                    type={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'radio' : 'checkbox'}
                    name={kind === 'INDIVIDUAL_SERVICE_PROVIDER' ? 'providerPrimaryCategory' : undefined}
                    checked={selected.includes(category.code)}
                    onChange={() => toggleCategory(category.code)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
            {fieldErrors.categories && <span className="field__error">{fieldErrors.categories}</span>}
          </fieldset>

          {error && <p className="customer-error" role="alert">{error}</p>}
          <div className="customer-form__actions">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
          </div>
        </form>
      )}

      {profile && activeTab === 'services' && (
        <EmbeddedServicesManager providerKind={kind} onServicesChanged={() => data.reload()} />
      )}

      {profile && activeTab === 'coverage' && (
        <EmbeddedCoverageManager onCoverageChanged={() => data.reload()} />
      )}

      {profile && activeTab === 'portfolio' && (
        <PortfolioManager
          categories={categoriesState.data ?? []}
          onItemsChanged={() => {
            portfolioData.reload()
            data.reload()
          }}
        />
      )}

      {profile && activeTab === 'team' && (
        <TeamManager />
      )}

      {profile && activeTab === 'association' && (
        <AssociationManager />
      )}
    </section>
  )
}

function EmbeddedCoverageManager({ onCoverageChanged }: { onCoverageChanged?: () => void }) {
  const { showToast } = useToast()
  const data = useApiData(() => profilesApi.listProviderCoverage(), [])
  const coverage = data.data ?? []
  const [values, setValues] = useState({ pinCode: '', locality: '', city: '', state: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    setSaving(true)
    setError('')
    try {
      await profilesApi.createProviderCoverage({
        pin_code: values.pinCode,
        locality: values.locality.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
      })
      setValues({ pinCode: '', locality: '', city: '', state: '' })
      showToast('Coverage location added.', 'success')
      data.reload()
      onCoverageChanged?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add that location.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="coverage-manager">
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Service Coverage Locations ({coverage.length})</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>
          HiddenStage matches client event requests strictly by the exact PIN codes and localities you cover. A city name alone does not imply coverage of all areas.
        </p>
      </div>

      {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
      {data.loading && <Spinner label="Loading coverage" />}

      {coverage.length === 0 && !data.loading && (
        <EmptyState title="No coverage locations yet" description="Add at least one PIN code so organisers in that area can find and invite you." />
      )}

      {coverage.length > 0 && (
        <div className="coverage-list" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {coverage.map((location) => (
            <div className="card coverage-row" key={location.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem' }}>
              <div>
                <strong>{location.locality}</strong>
                <small style={{ display: 'block', color: 'var(--color-muted)' }}>
                  {location.city}, {location.state} · PIN {location.pin_code}
                </small>
              </div>
              <Button
                type="button"
                size="sm"
                variant="quiet"
                onClick={() =>
                  void profilesApi.deleteProviderCoverage(location.id).then(() => {
                    showToast('Coverage removed.', 'success')
                    data.reload()
                    onCoverageChanged?.()
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="card customer-form" style={{ padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 1rem 0' }}>Add a new coverage location</h4>
        <form onSubmit={submit} noValidate>
          <div className="event-form-grid">
            <Input
              label="PIN code"
              name="pinCode"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={values.pinCode}
              onChange={(event) => setValues((current) => ({ ...current, pinCode: event.target.value.replace(/\D/g, '') }))}
            />
            <Input
              label="Locality / Area"
              name="locality"
              required
              minLength={2}
              value={values.locality}
              onChange={(event) => setValues((current) => ({ ...current, locality: event.target.value }))}
            />
          </div>
          <div className="event-form-grid">
            <Input
              label="City"
              name="city"
              required
              minLength={2}
              value={values.city}
              onChange={(event) => setValues((current) => ({ ...current, city: event.target.value }))}
            />
            <Input
              label="State"
              name="state"
              required
              minLength={2}
              value={values.state}
              onChange={(event) => setValues((current) => ({ ...current, state: event.target.value }))}
            />
          </div>
          {error && <p className="customer-error" role="alert">{error}</p>}
          <div style={{ marginTop: '1rem' }}>
            <Button type="submit" disabled={saving}>{saving ? 'Adding…' : '+ Add coverage location'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmbeddedServicesManager({ providerKind, onServicesChanged }: { providerKind: ProviderKind; onServicesChanged?: () => void }) {
  const { showToast } = useToast()
  const categoriesState = useCategories()
  const data = useApiData(() => profilesApi.listProviderServices(), [])
  const services: ApiProviderService[] = data.data ?? []
  const categories = categoriesState.data ?? []
  const available = categories.filter((category) => !services.some((service) => service.category === category.code))
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ApiProviderService | null>(null)
  const [busy, setBusy] = useState(false)

  const isIndividual = providerKind === 'INDIVIDUAL_SERVICE_PROVIDER'
  const canAddMore = !isIndividual || services.length === 0

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newCategory) {
      setError('Choose a category to add.')
      return
    }
    if (isIndividual && services.length >= 1) {
      setError('Individual Service Providers can offer only one primary service category.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await profilesApi.createProviderService({ category: newCategory })
      setNewCategory('')
      showToast('Service added. Configure pricing and description.', 'success')
      data.reload()
      onServicesChanged?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add service.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="services-manager">
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Services & Packages ({services.length})</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>
          {isIndividual
            ? 'Individual Service Providers offer one specialized service. Keep starting prices and details accurate.'
            : 'List all services, packages, and starting prices you offer for events.'}
        </p>
      </div>

      {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
      {data.loading && <Spinner label="Loading services" />}

      {!data.loading && services.length === 0 && (
        <EmptyState title="No services configured" description="Add a service category to display on your profile and receive quote requests." />
      )}

      {services.length > 0 && (
        <div className="service-manage-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {services.map((service) => (
            <div className={`card service-manage ${service.is_active ? '' : 'service-manage--inactive'}`} key={service.id} style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0 }}>{service.title || service.category_name}</h4>
                    <Badge tone={service.is_active ? 'success' : 'neutral'}>{service.is_active ? 'Active' : 'Hidden'}</Badge>
                  </div>
                  <small style={{ color: 'var(--color-muted)' }}>
                    {service.category_name} · {service.base_price_paise !== null ? `Starting from ${formatPaise(service.base_price_paise)}` : 'Price on request'}
                  </small>
                  {service.description && <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>{service.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button type="button" size="sm" variant="quiet" onClick={() => setEditing(service)}>Edit</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="quiet"
                    onClick={() =>
                      void profilesApi.updateProviderService(service.id, { is_active: !service.is_active }).then(() => {
                        data.reload()
                        onServicesChanged?.()
                      })
                    }
                  >
                    {service.is_active ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canAddMore ? (
        <div className="card customer-form" style={{ padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Add a service category</h4>
          {available.length === 0 ? (
            <p className="muted-note">All catalogue categories are already in your services.</p>
          ) : (
            <form onSubmit={add} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <Select label="Category" name="newCategory" value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                  <option value="">Choose a category</option>
                  {available.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={busy}>{busy ? 'Adding…' : '+ Add Service'}</Button>
            </form>
          )}
          {error && <p className="customer-error" role="alert">{error}</p>}
        </div>
      ) : (
        <p className="muted-note" style={{ fontSize: '0.875rem' }}>
          Individual Service Providers can offer only one primary category. Change your profile role in "Profile Details" if you manage multiple categories.
        </p>
      )}

      {editing && (
        <ServiceDialog
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            data.reload()
            onServicesChanged?.()
            showToast('Service updated.', 'success')
          }}
        />
      )}
    </div>
  )
}

function PortfolioManager({ categories, onItemsChanged }: { categories: { code: string; name: string }[]; onItemsChanged?: () => void }) {
  const { showToast } = useToast()
  const data = useApiData(() => profilesApi.listPortfolioItems(), [])
  const items = data.data ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [mediaKind, setMediaKind] = useState<PortfolioMediaKind>('IMAGE')
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<PortfolioVisibility>('PUBLIC')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError('')
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      if (description.trim()) formData.append('description', description.trim())
      if (category) formData.append('category', category)
      if (eventDate) formData.append('event_date', eventDate)
      formData.append('media_kind', mediaKind)
      if (externalUrl.trim()) formData.append('external_url', externalUrl.trim())
      formData.append('visibility', visibility)
      if (file) formData.append('media', file)

      await profilesApi.createPortfolioItem(formData)
      showToast('Portfolio item added.', 'success')
      setShowAdd(false)
      setTitle(''); setDescription(''); setCategory(''); setEventDate(''); setFile(null); setExternalUrl('')
      data.reload()
      onItemsChanged?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add portfolio item.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await profilesApi.deletePortfolioItem(id)
      showToast('Portfolio item removed.', 'success')
      data.reload()
      onItemsChanged?.()
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not delete item.', 'error')
    }
  }

  return (
    <div className="portfolio-manager">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Work Showcase ({items.length})</h3>
        <Button type="button" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Close form' : '+ Add showcase item'}</Button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
          <form onSubmit={handleAdd} noValidate>
            <h4 style={{ margin: '0 0 1rem 0' }}>Add Portfolio Showcase</h4>
            <div className="event-form-grid">
              <Input label="Title" name="portfolioTitle" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grand Ballroom Reception" />
              <Select label="Category" name="portfolioCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Choose category</option>
                {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            </div>
            <div className="event-form-grid">
              <Select label="Media Type" name="mediaKind" value={mediaKind} onChange={(e) => setMediaKind(e.target.value as PortfolioMediaKind)}>
                <option value="IMAGE">Image / Photo</option>
                <option value="VIDEO">Video Link (YouTube / Vimeo)</option>
                <option value="DOCUMENT">Document / Brochure (PDF)</option>
                <option value="LINK">External Link</option>
              </Select>
              <Select label="Visibility" name="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as PortfolioVisibility)}>
                <option value="PUBLIC">Public — visible on public profile</option>
                <option value="PRIVATE">Private — client reference only</option>
              </Select>
            </div>
            {mediaKind === 'IMAGE' || mediaKind === 'DOCUMENT' ? (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Upload File</label>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            ) : (
              <Input label="External URL" name="externalUrl" placeholder="https://..." value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
            )}
            <Input label="Event Date (optional)" name="portfolioDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <Textarea label="Description" name="portfolioDescription" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the work and outcome..." />
            {error && <p className="customer-error" role="alert">{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add Item'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No showcase items yet" description="Add photos, videos or documents from past events to attract more clients." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Badge>{item.media_kind}</Badge>
                  <Badge tone={item.visibility === 'PUBLIC' ? 'success' : 'neutral'}>{item.visibility}</Badge>
                </div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{item.title}</h4>
                {item.description && <p style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0', color: 'var(--color-muted)' }}>{item.description}</p>}
                {item.external_url && (
                  <a href={item.external_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem' }}>
                    View Link ↗
                  </a>
                )}
                {item.media && (
                  <a href={item.media} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem' }}>
                    View Media ↗
                  </a>
                )}
              </div>
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="button" size="sm" variant="quiet" onClick={() => void handleDelete(item.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamManager() {
  const { showToast } = useToast()
  const data = useApiData(() => profilesApi.listTeamMembers(), [])
  const team = data.data ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<ProfileTeamPermission[]>([
    'MANAGE_PORTFOLIO',
    'VIEW_EVENTS',
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const allPermissions: { key: ProfileTeamPermission; label: string }[] = [
    { key: 'MANAGE_BUSINESS_PROFILE', label: 'Manage Business Profile & Details' },
    { key: 'MANAGE_PORTFOLIO', label: 'Manage Portfolio & Showcase' },
    { key: 'MANAGE_SERVICES', label: 'Manage Services & Pricing' },
    { key: 'MANAGE_TEAM', label: 'Manage Team Members' },
    { key: 'VIEW_EVENTS', label: 'View Client Events & Briefs' },
    { key: 'MANAGE_EVENTS', label: 'Manage Quotations & Events' },
  ]

  function togglePermission(key: ProfileTeamPermission) {
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]))
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) { setError('Email is required.'); return }
    setSaving(true); setError('')
    try {
      await profilesApi.createTeamMember({ email: email.trim(), permissions })
      showToast('Team assistant invited.', 'success')
      setShowAdd(false)
      setEmail('')
      data.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add team member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    try {
      await profilesApi.deleteTeamMember(id)
      showToast('Team member access revoked.', 'success')
      data.reload()
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not revoke member.', 'error')
    }
  }

  return (
    <div className="team-manager">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3>Team & Assistant Delegation ({team.length})</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-muted)' }}>Grant trusted team members permission to manage your profile, portfolio, and quotes.</p>
        </div>
        <Button type="button" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Close form' : '+ Add Team Assistant'}</Button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
          <form onSubmit={handleAdd} noValidate>
            <h4 style={{ margin: '0 0 1rem 0' }}>Invite Team Assistant</h4>
            <Input label="Assistant User Email" name="assistantEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="assistant@example.com" />
            <fieldset style={{ border: 'none', padding: 0, margin: '1rem 0' }}>
              <legend style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Permissions Granted:</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                {allPermissions.map((p) => (
                  <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={permissions.includes(p.key)} onChange={() => togglePermission(p.key)} />
                    {p.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="customer-error" role="alert">{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Grant Permissions'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {team.length === 0 ? (
        <EmptyState title="No assistants added" description="Managers can delegate profile and event management permissions to staff or coordinators." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {team.map((member) => (
            <div key={member.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
              <div>
                <strong>{member.member_name || member.member_email}</strong> <span style={{ color: 'var(--color-muted)' }}>({member.member_email})</span>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {member.permissions.map((p) => (
                    <Badge key={p}>{p.replace('MANAGE_', '').replace('VIEW_', '')}</Badge>
                  ))}
                </div>
              </div>
              <Button type="button" size="sm" variant="quiet" onClick={() => void handleRemove(member.id)}>Revoke</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AssociationManager() {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ApiManagerSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const networkData = useApiData(() => networkApi.listAssociations(), [])
  const associations = networkData.data ?? []

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await profilesApi.searchManagers(query.trim())
      setResults(res)
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }

  async function handleRequest(managerUserId: string) {
    try {
      await networkApi.requestAssociation(managerUserId, 'Requesting association to collaborate on events.')
      showToast('Association request sent.', 'success')
      networkData.reload()
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not send request.', 'error')
    }
  }

  return (
    <div className="association-manager">
      <h3>Affiliated Managers ({associations.length})</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>Associated Service Providers can partner with Event Management agencies to receive opportunities directly.</p>

      {associations.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {associations.map((assoc) => (
            <div key={assoc.id} className="card" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{assoc.counterpart_profile?.display_name || 'Manager'}</strong>
                {' '}<Badge tone="success">Associated</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '1rem' }}>
        <h4>Find & Connect with Managers</h4>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <Input label="Manager search" name="assocQuery" placeholder="Search by name, company, or username..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="button" variant="secondary" onClick={() => void handleSearch()} disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {results.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {results.map((m) => (
              <div key={m.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{m.display_name}</strong>
                    <span className="manager-id-tag">Manager ID: {m.manager_id || `@${m.username}` || m.user_id.slice(0, 8)}</span>
                  </div>
                  {m.business_name && <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: '0.2rem 0 0 0' }}>{m.business_name}</p>}
                  {m.headline && <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>{m.headline}</p>}
                </div>
                <Button type="button" size="sm" onClick={() => void handleRequest(m.user_id)}>Request Association</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ServicesPage() {
  const { showToast } = useToast()
  const categoriesState = useCategories()
  const data = useApiData(() => profilesApi.listProviderServices(), [])
  const services: ApiProviderService[] = data.data ?? []
  const categories = categoriesState.data ?? []
  const available = categories.filter((category) => !services.some((service) => service.category === category.code))
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ApiProviderService | null>(null)
  const [busy, setBusy] = useState(false)

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newCategory) { setError('Choose a category to add.'); return }
    setBusy(true); setError('')
    try {
      await profilesApi.createProviderService({ category: newCategory })
      setNewCategory('')
      showToast('Service added. Add a title and price so organisers understand it.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add that service.') } finally { setBusy(false) }
  }

  return <section className="customer-page">
    <PageHeading eyebrow="SERVICES" title="What you offer" intro="Each category you offer becomes a service. Titles and prices are optional, but a clear offer wins more invitations." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading services" />}
    {!data.loading && services.length === 0 && <EmptyState title="No services yet" description="Add a service category so organisers can find you. You can refine titles and prices at any time." />}

    {services.length > 0 && <div className="service-manage-list">{services.map((service) => <Card className={`service-manage ${service.is_active ? '' : 'service-manage--inactive'}`} key={service.id}>
      <div>
        <div className="service-manage__title"><h3>{service.title || service.category_name}</h3><Badge tone={service.is_active ? 'success' : 'neutral'}>{service.is_active ? 'Active' : 'Hidden'}</Badge></div>
        <small>{service.category_name}{service.base_price_paise !== null ? ` · from ${formatPaise(service.base_price_paise)}` : ' · price on request'}</small>
        {service.description && <p>{service.description}</p>}
      </div>
      <div className="service-manage__actions">
        <Button type="button" size="sm" variant="quiet" onClick={() => setEditing(service)}>Edit</Button>
        <Button type="button" size="sm" variant="quiet" onClick={() => void profilesApi.updateProviderService(service.id, { is_active: !service.is_active }).then(() => data.reload())}>{service.is_active ? 'Hide' : 'Show'}</Button>
      </div>
    </Card>)}</div>}

    <Card className="customer-form">
      <h2>Add a service category</h2>
      {available.length === 0
        ? <p className="muted-note">You offer every category in the catalogue.</p>
        : <form className="inline-form" onSubmit={add}>
          <Select label="Category" name="newCategory" value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
            <option value="">Choose a category</option>
            {available.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
          </Select>
          <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add service'}</Button>
        </form>}
      {error && <p className="customer-error" role="alert">{error}</p>}
    </Card>

    {editing && <ServiceDialog service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); data.reload(); showToast('Service updated.', 'success') }} />}
  </section>
}

function ServiceDialog({ service, onClose, onSaved }: { service: ApiProviderService; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(service.title)
  const [description, setDescription] = useState(service.description)
  const [price, setPrice] = useState(service.base_price_paise === null ? '' : String(service.base_price_paise / 100))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return <Modal open title={`Edit ${service.category_name}`} onClose={onClose}>
    <div className="modal-stack">
      <Input label="Service title" name="serviceTitle" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={service.category_name} />
      <Textarea label="Description" name="serviceDescription" rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
      <Input label="Typical starting price in ₹ (optional)" name="servicePrice" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9.]/g, ''))} hint="A guide only — quotes are prepared per event." />
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="button" disabled={saving} onClick={async () => {
          setSaving(true); setError('')
          try {
            await profilesApi.updateProviderService(service.id, { title: title.trim(), description: description.trim(), base_price_paise: parseRupeesToPaise(price) })
            onSaved()
          } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this service.') } finally { setSaving(false) }
        }}>{saving ? 'Saving…' : 'Save service'}</Button>
      </div>
    </div>
  </Modal>
}

function CoveragePage() {
  const { showToast } = useToast()
  const data = useApiData(() => profilesApi.listProviderCoverage(), [])
  const coverage = data.data ?? []
  const [values, setValues] = useState({ pinCode: '', locality: '', city: '', state: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    setSaving(true); setError('')
    try {
      await profilesApi.createProviderCoverage({ pin_code: values.pinCode, locality: values.locality.trim(), city: values.city.trim(), state: values.state.trim() })
      setValues({ pinCode: '', locality: '', city: '', state: '' })
      showToast('Coverage added. Matching organisers in that area can now find you.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add that location.') } finally { setSaving(false) }
  }

  return <section className="customer-page">
    <PageHeading eyebrow="COVERAGE" title="Where you work" intro="Matching uses only the exact PIN codes you list. A city name alone does not imply coverage of every area within it." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading coverage" />}
    {coverage.length === 0 && !data.loading && <EmptyState title="No coverage locations yet" description="Add at least one PIN code so organisers in that area can match with you." />}
    {coverage.length > 0 && <div className="coverage-list">{coverage.map((location) => <Card className="coverage-row" key={location.id}>
      <div><strong>{location.locality}</strong><small>{location.city}, {location.state} · {location.pin_code}</small></div>
      <Button type="button" size="sm" variant="quiet" onClick={() => void profilesApi.deleteProviderCoverage(location.id).then(() => { showToast('Coverage removed.', 'success'); data.reload() })}>Remove</Button>
    </Card>)}</div>}

    <Card className="customer-form">
      <h2>Add a coverage location</h2>
      <form className="customer-form" onSubmit={submit} noValidate>
        <Input label="PIN code" name="pinCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={values.pinCode} onChange={(event) => setValues((current) => ({ ...current, pinCode: event.target.value.replace(/\D/g, '') }))} />
        <Input label="Locality" name="locality" required minLength={2} value={values.locality} onChange={(event) => setValues((current) => ({ ...current, locality: event.target.value }))} />
        <div className="event-form-grid">
          <Input label="City" name="city" required minLength={2} value={values.city} onChange={(event) => setValues((current) => ({ ...current, city: event.target.value }))} />
          <Input label="State" name="state" required minLength={2} value={values.state} onChange={(event) => setValues((current) => ({ ...current, state: event.target.value }))} />
        </div>
        {error && <p className="customer-error" role="alert">{error}</p>}
        <div className="customer-form__actions"><Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add location'}</Button></div>
      </form>
    </Card>
  </section>
}

function OpportunitiesPage() {
  const data = useApiData(() => marketplaceApi.listProviderOpportunities(), [])
  const opportunities: ApiProviderOpportunity[] = data.data ?? []
  return <section className="customer-page">
    <PageHeading
      eyebrow="MATCHED REQUESTS"
      title="Opportunities for your services"
      intro="Open event requests that match your declared services and coverage. You can prepare a quotation without waiting for an invitation; customer contact details and the exact venue stay private until the organiser chooses you."
      action={<ButtonLink to={routes.provider.requests} variant="secondary">Invitations</ButtonLink>}
    />
    {data.loading && <Spinner label="Loading matched requests" />}
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {!data.loading && !data.error && opportunities.length === 0 && <EmptyState
      title="No matched requests yet"
      description="Add the services you deliver and the PIN codes or cities you cover. New public requests that match both will appear here."
      action={<ButtonLink to={routes.provider.services}>Review your services</ButtonLink>}
    />}
    <div className="opportunity-list">
      {opportunities.map((opportunity) => <Card as="article" className="opportunity-card" key={opportunity.id}>
        <div className="opportunity-card__head">
          <div>
            <span className="eyebrow">{opportunity.event_type.toUpperCase()}</span>
            <h2>{opportunity.name}</h2>
            <p>{formatDate(opportunity.event_date)} · {formatTimeRange(opportunity.start_time, opportunity.end_time)} · {opportunity.guest_count} guests</p>
            <p>{opportunity.locality}, {opportunity.city}, {opportunity.state}</p>
          </div>
          <div className="opportunity-card__status">
            {opportunity.invitation_status === 'ACCEPTED' && <Badge tone="success">Invitation accepted</Badge>}
            {opportunity.invitation_status === 'PENDING' && <Badge tone="warning">Invited</Badge>}
            {opportunity.already_quoted && <Badge tone="neutral">Quotation started</Badge>}
          </div>
        </div>
        <div className="opportunity-card__requirements">
          {opportunity.requirements.map((requirement) => <div key={requirement.id}>
            <strong>{requirement.title}</strong>
            <span>{requirement.category_name} · {requirement.budget_paise === null ? 'No budget given' : `Budget ${formatPaise(requirement.budget_paise)}`}</span>
            {requirement.description && <p>{requirement.description}</p>}
          </div>)}
        </div>
        <div className="opportunity-card__actions">
          <ButtonLink to={providerQuotePath(opportunity.id)}>{opportunity.already_quoted ? 'Continue quotation' : 'Prepare quotation'}</ButtonLink>
        </div>
      </Card>)}
    </div>
  </section>
}

function InboxPage() {
  const { showToast } = useToast()
  const data = useApiData(() => marketplaceApi.listProviderInvitations(), [])
  const invitations = data.data ?? []
  const [pendingId, setPendingId] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('ALL')
  const filtered = tab === 'PENDING' ? invitations.filter((item) => item.status === 'PENDING') : invitations

  async function respond(invitation: ApiInvitation, accept: boolean) {
    setPendingId(invitation.id); setError('')
    try {
      await marketplaceApi.respondToInvitation(invitation.id, accept)
      showToast(accept ? 'Invitation accepted. You can now prepare a quotation.' : 'Invitation declined.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not respond to this invitation.') } finally { setPendingId('') }
  }

  return <section className="customer-page">
    <PageHeading eyebrow="INVITATIONS" title="Requests for you" intro="An invitation means an organiser has read your profile and wants a quotation for a specific event." />
    {error && <p className="customer-error" role="alert">{error}</p>}
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading invitations" />}
    {!data.loading && invitations.length === 0 && <EmptyState title="No invitations yet" description="Complete your profile and coverage so matching organisers can find you." action={<ButtonLink to={routes.provider.profile}>Edit your profile</ButtonLink>} />}
    {invitations.length > 0 && <>
      <div className="segment-control" role="group" aria-label="Filter invitations">
        <button type="button" aria-pressed={tab === 'PENDING'} className={tab === 'PENDING' ? 'segment-control__active' : ''} onClick={() => setTab('PENDING')}>Awaiting reply ({invitations.filter((item) => item.status === 'PENDING').length})</button>
        <button type="button" aria-pressed={tab === 'ALL'} className={tab === 'ALL' ? 'segment-control__active' : ''} onClick={() => setTab('ALL')}>All ({invitations.length})</button>
      </div>
      {filtered.length === 0 && <EmptyState title="Nothing awaiting your reply" description="Older invitations are still available under All." />}
      <div className="invitation-cards">{filtered.map((invitation) => <Card className="invitation-card" key={invitation.id}>
        <div className="invitation-card__head">
          <div>
            <span className="eyebrow">EVENT INVITATION</span>
            <h2>{invitation.event_name}</h2>
            {invitation.event_detail && <p>{formatDate(invitation.event_detail.event_date)} · {formatTimeRange(invitation.event_detail.start_time, invitation.event_detail.end_time)} · {invitation.event_detail.guest_count} guests · {invitation.event_detail.locality}, {invitation.event_detail.city} {invitation.event_detail.pin_code}</p>}
          </div>
          <InvitationStatusBadge status={invitation.status} />
        </div>
        {invitation.requirement_title && <p className="invitation-card__scope">Requested service: <strong>{invitation.requirement_title}</strong></p>}
        {invitation.message && <blockquote className="invitation-card__message">“{invitation.message}”</blockquote>}
        {invitation.event_detail && <div className="invitation-card__requirements">
          <h3>Services in this request</h3>
          <ul>{invitation.event_detail.requirements.map((requirement) => <li key={requirement.id}>
            <span>{requirement.title}</span>
            <small>{requirement.budget_paise === null ? 'No budget given' : `Budget ${formatPaise(requirement.budget_paise)}`} · {requirement.status.toLowerCase()}</small>
          </li>)}</ul>
        </div>}
        <div className="invitation-card__actions">
          {invitation.status === 'PENDING' && <>
            <Button type="button" variant="secondary" disabled={pendingId === invitation.id} onClick={() => void respond(invitation, false)}>Decline</Button>
            <Button type="button" disabled={pendingId === invitation.id} onClick={() => void respond(invitation, true)}>{pendingId === invitation.id ? 'Saving…' : 'Accept and quote'}</Button>
          </>}
          {invitation.status === 'ACCEPTED' && <ButtonLink to={providerQuotePath(invitation.event)}>Prepare quotation</ButtonLink>}
          {invitation.status === 'DECLINED' && <span className="muted-note">You declined this invitation.</span>}
          {invitation.status === 'WITHDRAWN' && <span className="muted-note">The organiser withdrew this invitation.</span>}
        </div>
      </Card>)}</div>
    </>}
  </section>
}

function QuotationsPage() {
  const data = useApiData(() => marketplaceApi.listProviderQuotations(), [])
  const quotations = data.data ?? []
  return <section className="customer-page">
    <PageHeading eyebrow="QUOTATIONS" title="Quotes you have prepared" intro="A submitted revision is what the organiser sees. Revisions keep the full history of what changed." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading quotations" />}
    {!data.loading && quotations.length === 0 && <EmptyState title="No quotations yet" description="Accept an invitation, then prepare a quotation against the organiser's brief." action={<ButtonLink to={routes.provider.requests}>Open invitations</ButtonLink>} />}
    <div className="quote-list">{quotations.map((quotation) => <Card className="provider-quote-row" key={quotation.id}>
      <div className="provider-quote-row__head">
        <div>
          <span className="eyebrow">{quotation.status === 'WITHDRAWN' ? 'WITHDRAWN' : 'QUOTATION'}</span>
          <h2>{quotation.event_name}</h2>
          <p>{quotation.revisions.length} revision{quotation.revisions.length === 1 ? '' : 's'}{latestRevision(quotation)?.valid_until ? ` · valid until ${formatShortDate(latestRevision(quotation)?.valid_until)}` : ''}</p>
        </div>
        <div className="provider-quote-row__amount"><strong>{formatPaise(latestRevision(quotation)?.total_paise ?? 0)}</strong>{latestRevision(quotation) && <RevisionStatusBadge status={latestRevision(quotation)!.status} />}</div>
      </div>
      {latestRevision(quotation) && <QuoteBreakdown revision={latestRevision(quotation)!} />}
      <div className="provider-quote-row__actions">
        <Link className="text-link" to={customerEventPath(quotation.event)}>View request</Link>
        <div>
          {quotation.status === 'OPEN' && <ButtonLink to={providerQuotePath(quotation.event)} size="sm" variant="secondary">{latestRevision(quotation)?.status === 'SUBMITTED' ? 'Revise quote' : 'Continue quote'}</ButtonLink>}
          {quotation.status === 'OPEN' && latestRevision(quotation)?.status === 'SUBMITTED' && <Button type="button" size="sm" variant="quiet" onClick={() => void marketplaceApi.withdrawQuotation(quotation.id).then(() => data.reload())}>Withdraw</Button>}
        </div>
      </div>
    </Card>)}</div>
  </section>
}

type DraftItem = { requirementId: string; include: boolean; title: string; description: string; price: string }

function QuoteEditorPage() {
  const { eventId = '' } = useParams()
  const { showToast } = useToast()
  const data = useApiData(async () => {
    const [opportunities, invitations, quotations] = await Promise.all([
      marketplaceApi.listProviderOpportunities(),
      marketplaceApi.listProviderInvitations(),
      marketplaceApi.listProviderQuotations(),
    ])
    return { opportunities, invitations, quotations }
  }, [eventId])
  const invitation = (data.data?.invitations ?? []).find((item) => item.event === eventId)
  const opportunity = (data.data?.opportunities ?? []).find((item) => item.id === eventId)
  const quotation: ApiQuotation | undefined = (data.data?.quotations ?? []).find((item) => item.event === eventId)
  const draftRevision: ApiQuoteRevision | undefined = quotation?.revisions.find((revision) => revision.status === 'DRAFT')
  const [items, setItems] = useState<DraftItem[]>([])
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
  const [dateBounds] = useState(() => ({
    min: new Date().toISOString().slice(0, 10),
    max: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
  }))
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const brief = invitation?.event_detail ?? opportunity
  const requirements = useMemo(() => brief?.requirements ?? [], [brief])
  const openRequirements = useMemo(() => requirements.filter((requirement) => requirement.status === 'OPEN'), [requirements])
  useEffect(() => {
    if (!requirements.length) return
    setItems((current) => current.length ? current : requirements.map((requirement) => ({
      requirementId: requirement.id,
      include: false,
      title: requirement.title,
      description: '',
      price: '',
    })))
  }, [requirements])
  useEffect(() => {
    if (!draftRevision) return
    setNotes(draftRevision.notes)
    if (draftRevision.valid_until) setValidUntil(draftRevision.valid_until)
    if (draftRevision.items.length) setItems(draftRevision.items.map((item) => ({
      requirementId: item.requirement,
      include: true,
      title: item.title,
      description: item.description,
      price: String(item.amount_paise / 100),
    })))
  }, [draftRevision])

  function updateItem(requirementId: string, field: keyof DraftItem, value: string | boolean) {
    setItems((current) => current.map((item) => item.requirementId === requirementId ? { ...item, [field]: value } : item))
  }

  async function ensureDraft() {
    if (!quotation) throw new Error('Start the quotation first.')
    if (draftRevision) return draftRevision
    return marketplaceApi.createRevision(quotation.id)
  }

  async function saveDraft() {
    setBusy('save'); setError('')
    try {
      const revision = await ensureDraft()
      await marketplaceApi.updateRevision(quotation!.id, revision.id, {
        notes: notes.trim(),
        valid_until: validUntil,
        items: items.filter((item) => item.include).map((item) => ({
          requirement_id: item.requirementId,
          kind: 'LINE' as const,
          title: item.title.trim() || 'Service',
          description: item.description.trim(),
          amount_paise: parseRupeesToPaise(item.price) ?? 0,
        })),
      })
      showToast('Draft quotation saved.', 'success')
      data.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the quotation.') } finally { setBusy('') }
  }

  async function submit() {
    const chosen = items.filter((item) => item.include)
    if (!chosen.length) { setError('Select at least one service and add a price.'); return }
    if (chosen.some((item) => (parseRupeesToPaise(item.price) ?? 0) <= 0)) { setError('Every selected service needs a price greater than zero.'); return }
    if (!validUntil) { setError('Choose how long this quotation is valid.'); return }
    setBusy('submit'); setError('')
    try {
      const revision = await ensureDraft()
      await marketplaceApi.updateRevision(quotation!.id, revision.id, {
        notes: notes.trim(),
        valid_until: validUntil,
        items: chosen.map((item) => ({
          requirement_id: item.requirementId,
          kind: 'LINE' as const,
          title: item.title.trim() || 'Service',
          description: item.description.trim(),
          amount_paise: parseRupeesToPaise(item.price) ?? 0,
        })),
      })
      await marketplaceApi.submitRevision(quotation!.id, revision.id)
      showToast('Quotation submitted. The organiser can now review it.', 'success')
      data.reload()
    } catch (caught) {
      if (isApiError(caught)) setError(caught.message)
      else setError(caught instanceof Error ? caught.message : 'Could not submit the quotation.')
    } finally { setBusy('') }
  }

  if (data.loading) return <section className="customer-page"><Spinner label="Loading the request" /></section>
  if (data.error) return <section className="customer-page"><ErrorState description={data.error} onRetry={data.reload} /></section>
  if (!invitation && !opportunity) return <section className="customer-page"><EmptyState title="This request is not available" description="This event is not matched to your services and coverage, and you have not been invited to it." action={<ButtonLink to={routes.provider.opportunities}>Back to opportunities</ButtonLink>} /></section>
  if (!opportunity && invitation && invitation.status !== 'ACCEPTED') return <section className="customer-page">
    <PageHeading eyebrow="QUOTATION" title="Accept the invitation first" intro="The organiser asked you to quote, but the invitation is not accepted yet." />
    <ButtonLink to={routes.provider.requests}>Respond to the invitation</ButtonLink>
  </section>

  const total = items.filter((item) => item.include).reduce((sum, item) => sum + (parseRupeesToPaise(item.price) ?? 0), 0)
  const latestSubmitted = quotation?.revisions.find((revision) => revision.status === 'SUBMITTED')

  return <section className="customer-page">
    <PageHeading
      eyebrow="QUOTATION"
      title={invitation?.event_name ?? opportunity?.name ?? 'Matched request'}
      intro={brief ? `${formatDate(brief.event_date)} · ${formatTimeRange(brief.start_time, brief.end_time)} · ${brief.guest_count} guests · ${brief.city}${'pin_code' in brief ? ` ${brief.pin_code}` : ''}` : 'Prepare your quotation against the organiser’s brief.'}
      action={<ButtonLink to={routes.provider.quotes} variant="secondary">All quotations</ButtonLink>}
    />
    {invitation?.message && <blockquote className="invitation-card__message">“{invitation.message}”</blockquote>}
    {opportunity && invitation?.status !== 'ACCEPTED' && <p className="form-note">This request matches your declared services and coverage, so you can quote it directly. The customer’s contact details appear only after they choose your quotation.</p>}

    {!quotation && <Card className="customer-form">
      <h2>Start a quotation</h2>
      <p className="detail-card__hint">A quotation starts as a draft revision only you can see. The organiser sees it when you submit.</p>
      <div className="customer-form__actions"><Button type="button" disabled={busy === 'start'} onClick={async () => {
        setBusy('start'); setError('')
        try { await marketplaceApi.createQuotation(eventId); showToast('Quotation started. Add your prices.', 'success'); data.reload() }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start the quotation.') }
        finally { setBusy('') }
      }}>{busy === 'start' ? 'Starting…' : 'Start quotation'}</Button></div>
      {error && <p className="customer-error" role="alert">{error}</p>}
    </Card>}

    {quotation && latestSubmitted && !draftRevision && <Card className="submitted-quote">
      <div className="submitted-quote__head">
        <div><span className="eyebrow">SUBMITTED</span><h2>Revision {latestSubmitted.revision_number} is with the organiser</h2><p>They can compare it with other quotations and choose the services they want.</p></div>
        <RevisionStatusBadge status={latestSubmitted.status} />
      </div>
      <QuoteBreakdown revision={latestSubmitted} />
      {quotation.status === 'OPEN' && openRequirements.length > 0 && <div className="submitted-quote__actions">
        <Button type="button" disabled={busy === 'revise'} onClick={async () => {
          setBusy('revise'); setError('')
          try { await marketplaceApi.createRevision(quotation.id); showToast('New revision started.', 'success'); data.reload() }
          catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start a new revision.') }
          finally { setBusy('') }
        }}>{busy === 'revise' ? 'Starting…' : 'Prepare a revision'}</Button>
      </div>}
      {quotation.status === 'OPEN' && openRequirements.length === 0 && <p className="muted-note">Every service in this request is committed. Revisions are unavailable in this release.</p>}
      {error && <p className="customer-error" role="alert">{error}</p>}
    </Card>}

    {quotation && (draftRevision || !latestSubmitted) && <Card className="customer-form quote-editor">
      <div className="quote-editor__head"><div><h2>{draftRevision ? `Draft revision ${draftRevision.revision_number}` : 'New quotation'}</h2><p>Price only the services you can deliver. The organiser sees the total and each line.</p></div></div>
      <div className="quote-editor__items">
        {requirements.length === 0 && <p className="muted-note">This request has no service lines available to quote.</p>}
        {items.map((item) => {
          const requirement = requirements.find((entry) => entry.id === item.requirementId)
          const selectable = requirement?.status === 'OPEN'
          return <div className={`quote-editor__item ${item.include ? 'quote-editor__item--on' : ''}`} key={item.requirementId}>
            <label className="quote-editor__toggle">
              <input type="checkbox" checked={item.include} disabled={!selectable} onChange={(event) => updateItem(item.requirementId, 'include', event.target.checked)} />
              <span><strong>{requirement?.title ?? item.title}</strong><small>{requirement?.budget_paise === null || requirement?.budget_paise === undefined ? 'No budget given' : `Organiser budget ${formatPaise(requirement.budget_paise)}`}</small></span>
            </label>
            {item.include && <div className="quote-editor__fields">
              <Input label="Line title" name={`title-${item.requirementId}`} value={item.title} onChange={(event) => updateItem(item.requirementId, 'title', event.target.value)} />
              <Input label="Price in ₹" name={`price-${item.requirementId}`} inputMode="decimal" required value={item.price} onChange={(event) => updateItem(item.requirementId, 'price', event.target.value.replace(/[^0-9.]/g, ''))} />
              <Textarea label="What is included" name={`description-${item.requirementId}`} rows={2} maxLength={1000} value={item.description} onChange={(event) => updateItem(item.requirementId, 'description', event.target.value)} hint="Deliverables, exclusions, crew, travel." />
            </div>}
          </div>
        })}
      </div>
      <Textarea label="Message to the organiser" name="quoteNotes" rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} hint="Explain your approach, assumptions or any additional costs." />
      <Input label="Quotation valid until" name="validUntil" type="date" required value={validUntil} min={dateBounds.min} max={dateBounds.max} onChange={(event) => setValidUntil(event.target.value)} hint="Up to 90 days from today." />
      {error && <p className="customer-error" role="alert">{error}</p>}
      <div className="quote-editor__total"><span>Quotation total</span><strong>{formatPaise(total)}</strong></div>
      <div className="customer-form__actions">
        <Button type="button" variant="secondary" disabled={busy !== ''} onClick={() => void saveDraft()}>{busy === 'save' ? 'Saving…' : 'Save draft'}</Button>
        <Button type="button" disabled={busy !== ''} onClick={() => void submit()}>{busy === 'submit' ? 'Submitting…' : 'Submit quotation'}</Button>
      </div>
      <p className="form-note">Submitted revisions are locked. Start a revision to change a price or add detail; the organiser keeps the history.</p>
    </Card>}
  </section>
}

function CommitmentsPage() {
  const data = useApiData(async () => {
    const [profile, commitments] = await Promise.all([
      profilesApi.getProviderProfile(),
      marketplaceApi.listProviderCommitments(),
    ])
    return { profile, commitments }
  }, [])
  const commitments: ApiCommitment[] = data.data?.commitments ?? []
  const isManager = data.data?.profile?.kind === 'MANAGER'
  return <section className="customer-page">
    <PageHeading eyebrow="COMMITMENTS" title="Services chosen by organisers" intro="When an organiser selects your quotation, the agreed scope and price are recorded here for both sides." />
    {data.error && <ErrorState description={data.error} onRetry={data.reload} />}
    {data.loading && <Spinner label="Loading commitments" />}
    {!data.loading && commitments.length === 0 && <EmptyState title="No commitments yet" description="A commitment appears when an organiser chooses services from one of your quotations." action={<ButtonLink to={routes.provider.quotes}>Your quotations</ButtonLink>} />}
    <div className="commitment-list">{commitments.map((commitment) => <Card className="commitment-card" key={commitment.id}>
      <div className="commitment-card__head">
        <div><span className="eyebrow">EVENT</span><h2>{commitment.event_name}</h2><p>{formatDate(commitment.event_date)} · accepted {formatShortDate(commitment.accepted_at)}</p></div>
        <div className="commitment-card__amount"><strong>{formatPaise(commitment.total_paise)}</strong><CommitmentStatusBadge status={commitment.status} /></div>
      </div>
      <ul className="commitment-lines">{commitment.lines.map((line) => <li key={line.id}><span>{line.title}<small>{line.package_key ? `Package · ${line.package_key}` : line.requirement_title}</small></span><strong>{formatPaise(line.amount_paise)}</strong></li>)}</ul>
      {commitment.status === 'RELEASED' && <p className="muted-note">Released {formatShortDate(commitment.released_at)}{commitment.release_reason ? ` — ${commitment.release_reason}` : ''}. The history stays available to both sides.</p>}
      {isManager && commitment.status === 'ACTIVE' && <div className="commitment-card__actions"><ButtonLink size="sm" to={`${routes.provider.assignments}?commitment=${commitment.id}`}>Manage team</ButtonLink><Link className="text-link" to={`${routes.provider.assignments}?commitment=${commitment.id}`}>Assign Workers</Link></div>}
    </Card>)}</div>
  </section>
}
