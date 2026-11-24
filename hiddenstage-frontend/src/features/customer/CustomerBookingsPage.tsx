import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerEventPath, routes } from '../../app/routes/routePaths'
import { bookingsApi } from '../../shared/api/backend/ecosystem'
import { useApiData } from '../../shared/api/backend/useApiData'
import type { ApiBooking } from '../../shared/api/backend/types'
import { formatPaise, formatShortDate } from '../../shared/api/backend/format'
import { Avatar, Button, ButtonLink, Card, Spinner } from '../../shared/ui'

const LIFECYCLE_STEPS = [
  { key: 'service_requested', label: '1. Request' },
  { key: 'invitation_sent', label: '2. Invited' },
  { key: 'quotation_received', label: '3. Quote' },
  { key: 'quotation_revised', label: '4. Revised' },
  { key: 'quotation_accepted', label: '5. Accepted' },
  { key: 'advance_payment_pending', label: '6. Advance Due' },
  { key: 'advance_paid_booking_confirmed', label: '7. Confirmed' },
  { key: 'service_in_progress', label: '8. In Progress' },
  { key: 'final_payment_pending', label: '9. Final Due' },
  { key: 'event_completed', label: '10. Completed' },
  { key: 'review_submitted', label: '11. Reviewed' },
]

export function CustomerBookingsPage() {
  const { data: bookingsData, loading, reload: loadBookings } = useApiData(
    () => bookingsApi.list(),
    [],
    { key: 'customer-bookings' }
  )
  const bookings = bookingsData ?? []
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CONFIRMED' | 'COMPLETED'>('ALL')
  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null)
  const [completeBooking, setCompleteBooking] = useState<ApiBooking | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [completing, setCompleting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleCompleteEvent(booking: ApiBooking) {
    try {
      setCompleting(true)
      await bookingsApi.complete(booking.id, feedbackText)
      setFeedbackSuccess('Event marked as completed! Your feedback has been shared with your specialists.')
      setTimeout(() => {
        setCompleteBooking(null)
        setFeedbackSuccess(null)
        setFeedbackText('')
      }, 1500)
      await loadBookings()
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Could not complete event.')
    } finally {
      setCompleting(false)
    }
  }

  // KPI calculations
  const totalBookings = bookings.length
  const activeBookings = bookings.filter((b) => b.status === 'SUBMITTED').length
  const completedEvents = bookings.filter((b) => b.lifecycle_stage === 'event_completed' || b.status === 'CLOSED').length
  const totalSpendPaise = bookings.reduce((sum, b) => sum + (b.financial_summary?.total_paid_paise || 0), 0)

  // Filtering
  const filteredBookings = bookings.filter((b) => {
    if (filter === 'ACTIVE') return b.status === 'SUBMITTED'
    if (filter === 'CONFIRMED')
      return (
        b.lifecycle_stage === 'advance_paid_booking_confirmed' ||
        b.lifecycle_stage === 'service_in_progress' ||
        b.commitments?.length > 0
      )
    if (filter === 'COMPLETED') return b.lifecycle_stage === 'event_completed' || b.status === 'CLOSED'
    return true
  })

  function getStepIndex(stage: string): number {
    const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === stage)
    return idx >= 0 ? idx : 0
  }

  return (
    <div className="customer-page">
      <div className="customer-page__heading">
        <div>
          <span className="eyebrow eyebrow--accent">EVENT ECOSYSTEM</span>
          <h1>My Bookings</h1>
          <p>Track your confirmed specialists, 11-step event lifecycle milestones, and payment status.</p>
        </div>
        <ButtonLink to={routes.customer.newRequest}>+ Request New Event</ButtonLink>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>TOTAL BOOKINGS</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0.25rem 0' }}>{totalBookings}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Created event journeys</span>
        </Card>

        <Card style={{ padding: '1.25rem', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>ACTIVE EVENTS</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-orange)', margin: '0.25rem 0' }}>{activeBookings}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>In negotiation or progress</span>
        </Card>

        <Card style={{ padding: '1.25rem', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>COMPLETED GATHERINGS</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-success)', margin: '0.25rem 0' }}>{completedEvents}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Past celebrations</span>
        </Card>

        <Card style={{ padding: '1.25rem', background: 'var(--color-paper-bright)', border: '1px solid var(--color-line)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>TOTAL ESCROW PAID</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0.25rem 0' }}>{formatPaise(totalSpendPaise)}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Secured in escrow</span>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-line)', paddingBottom: '0.75rem' }}>
        {[
          { key: 'ALL', label: 'All Events' },
          { key: 'ACTIVE', label: 'Active Requests' },
          { key: 'CONFIRMED', label: 'Confirmed Bookings' },
          { key: 'COMPLETED', label: 'Completed' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key as any)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              border: filter === f.key ? '1px solid var(--color-orange)' : '1px solid var(--color-line)',
              background: filter === f.key ? 'var(--color-orange-soft)' : 'var(--color-paper-bright)',
              color: filter === f.key ? 'var(--color-orange)' : 'var(--color-ink)',
              fontWeight: filter === f.key ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Spinner label="Loading your event bookings…" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--color-paper-bright)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>No bookings found</h2>
          <p style={{ color: 'var(--color-muted)', maxWidth: '28rem', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            Submit an event request to receive quotations from vetted catering, photography, sound, and venue specialists.
          </p>
          <ButtonLink to={routes.customer.newRequest}>Create Event Request</ButtonLink>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {filteredBookings.map((b) => {
            const stepIdx = getStepIndex(b.lifecycle_stage)
            return (
              <Card
                key={b.id}
                style={{
                  padding: '1.5rem',
                  background: 'var(--color-paper-bright)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-pill)',
                          background: 'var(--color-tint)',
                          color: 'var(--color-muted)',
                        }}
                      >
                        {b.event_type}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.65rem',
                          borderRadius: 'var(--radius-pill)',
                          background:
                            b.lifecycle_stage === 'event_completed'
                              ? 'var(--color-success-soft)'
                              : 'var(--color-orange-soft)',
                          color:
                            b.lifecycle_stage === 'event_completed'
                              ? 'var(--color-success)'
                              : 'var(--color-orange)',
                        }}
                      >
                        {b.lifecycle_label}
                      </span>
                    </div>

                    <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem', color: 'var(--color-ink)' }}>{b.name}</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                      📍 {b.venue_name ? `${b.venue_name}, ` : ''}{b.city}, {b.state} • 🗓{' '}
                      {b.event_date ? formatShortDate(b.event_date) : 'Date TBD'}{' '}
                      {b.guest_count ? `• 👥 ${b.guest_count} Guests` : ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <ButtonLink to={customerEventPath(b.id)} size="sm">
                      {b.commitments && b.commitments.length > 0 ? 'Event Workspace' : (b.quotations_count > 0 ? 'Review Quotes' : 'Manage Event')}
                    </ButtonLink>
                    {b.commitments && b.commitments.length > 0 && b.lifecycle_stage !== 'event_completed' && b.lifecycle_stage !== 'review_submitted' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setCompleteBooking(b)
                          setFeedbackText('')
                          setFeedbackSuccess(null)
                        }}
                      >
                        ✓ Mark Completed
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setSelectedBooking(b)}>
                      View Timeline
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => navigate(routes.customer.network)}>
                      Message Specialists
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => navigate(routes.customer.payments)}>
                      View Invoices
                    </Button>
                  </div>
                </div>

                {/* 11-Step Lifecycle Visualizer */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                      LIFECYCLE PROGRESS: {stepIdx + 1} of 11 ({b.lifecycle_label})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {Math.round(((stepIdx + 1) / 11) * 100)}% Complete
                    </span>
                  </div>

                  <div
                    style={{
                      height: '6px',
                      borderRadius: '999px',
                      background: 'var(--color-line)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${((stepIdx + 1) / 11) * 100}%`,
                        background: 'linear-gradient(90deg, var(--color-rose) 0%, var(--color-orange) 100%)',
                        borderRadius: '999px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Horizontal step indicators */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(11, 1fr)',
                      gap: '0.2rem',
                      marginTop: '0.45rem',
                      overflowX: 'auto',
                    }}
                  >
                    {LIFECYCLE_STEPS.map((s, idx) => (
                      <div
                        key={s.key}
                        style={{
                          fontSize: '0.62rem',
                          textAlign: 'center',
                          color: idx <= stepIdx ? 'var(--color-orange)' : 'var(--color-muted)',
                          fontWeight: idx === stepIdx ? 800 : 500,
                          lineHeight: 1.2,
                        }}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booked Specialists & Financials */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '1.25rem',
                    marginTop: '1.25rem',
                    padding: '1rem',
                    background: 'var(--color-tint)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--color-ink)', display: 'block', marginBottom: '0.5rem' }}>
                      BOOKED EVENT SPECIALISTS ({b.commitments?.length || 0})
                    </strong>
                    {(!b.commitments || b.commitments.length === 0) ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        No confirmed specialist commitments yet. Quotations available to review.
                      </span>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {b.commitments.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--color-paper-bright)',
                              padding: '0.5rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-line)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              {c.provider_avatar ? (
                                <img
                                  src={c.provider_avatar}
                                  alt={c.provider_name}
                                  style={{ width: '1.8rem', height: '1.8rem', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Avatar name={c.provider_name} size="sm" />
                              )}
                              <div>
                                <strong style={{ fontSize: '0.82rem', display: 'block' }}>{c.business_name || c.provider_name}</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                                  {c.provider_username ? `@${c.provider_username}` : 'Specialist'}
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                              {formatPaise(c.total_paise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--color-ink)', display: 'block', marginBottom: '0.5rem' }}>
                      PAYMENT STATUS
                    </strong>
                    <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-muted)' }}>Agreed Total:</span>
                        <strong>{formatPaise(b.financial_summary?.total_booked_paise || 0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-muted)' }}>Paid to Escrow:</span>
                        <strong style={{ color: 'var(--color-success)' }}>
                          {formatPaise(b.financial_summary?.total_paid_paise || 0)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-muted)' }}>Pending Due:</span>
                        <strong style={{ color: (b.financial_summary?.total_pending_paise || 0) > 0 ? 'var(--color-orange)' : 'var(--color-ink)' }}>
                          {formatPaise(b.financial_summary?.total_pending_paise || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Timeline Modal */}
      {selectedBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setSelectedBooking(null)}
        >
          <div
            style={{
              width: 'min(38rem, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--color-paper-bright)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.8rem',
              boxShadow: 'var(--shadow-lift)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span className="eyebrow eyebrow--accent">EVENT TIMELINE &amp; MILESTONES</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.35rem' }}>{selectedBooking.name}</h2>
              </div>
              <Button size="sm" variant="quiet" onClick={() => setSelectedBooking(null)}>
                ✕ Close
              </Button>
            </div>

            <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.5rem', position: 'relative' }}>
              {LIFECYCLE_STEPS.map((step, idx) => {
                const currentIdx = getStepIndex(selectedBooking.lifecycle_stage)
                const isPassed = idx <= currentIdx
                const isCurrent = idx === currentIdx
                return (
                  <div
                    key={step.key}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                      opacity: isPassed ? 1 : 0.45,
                    }}
                  >
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: isCurrent
                          ? 'var(--color-orange)'
                          : isPassed
                          ? 'var(--color-success)'
                          : 'var(--color-line)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                      }}
                    >
                      {isPassed && !isCurrent ? '✓' : idx + 1}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: isCurrent ? 'var(--color-orange)' : 'var(--color-ink)' }}>
                        {step.label.slice(3)}
                      </strong>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        {step.key === 'service_requested' && `Submitted on ${formatShortDate(selectedBooking.created_at)}`}
                        {step.key === 'invitation_sent' && 'Suppliers invited & briefed with requirements'}
                        {step.key === 'quotation_received' && `${selectedBooking.quotations_count || 1} proposal(s) submitted`}
                        {step.key === 'quotation_accepted' && 'Commercial terms locked with accepted specialists'}
                        {step.key === 'advance_paid_booking_confirmed' && 'Advance escrow deposit held securely by HiddenStage'}
                        {step.key === 'service_in_progress' && `Scheduled event day: ${formatShortDate(selectedBooking.event_date || '')}`}
                        {step.key === 'event_completed' && 'Celebration executed successfully'}
                        {step.key === 'review_submitted' && 'Feedback submitted and ratings published'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {/* Event Completion & Feedback Modal */}
      {completeBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: '1.5rem',
          }}
          onClick={() => !completing && setCompleteBooking(null)}
        >
          <div
            style={{
              width: 'min(36rem, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--color-paper-bright)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.8rem',
              boxShadow: 'var(--shadow-lift)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span className="eyebrow eyebrow--accent">EVENT COMPLETION</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.35rem' }}>{completeBooking.name}</h2>
              </div>
              <Button size="sm" variant="quiet" disabled={completing} onClick={() => setCompleteBooking(null)}>
                ✕ Close
              </Button>
            </div>

            {feedbackSuccess ? (
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(46, 125, 50, 0.1)',
                  color: 'var(--color-success, #2e7d32)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  margin: '1rem 0',
                }}
              >
                ✓ {feedbackSuccess}
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-ink)', lineHeight: 1.5, margin: '0 0 1rem' }}>
                  Marking your event completed confirms that your booked specialists have delivered their services.
                  You can also leave a note of appreciation or review feedback that will be delivered directly to their
                  communication channel.
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="feedback-textarea"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-ink)' }}
                  >
                    SPECIALIST APPRECIATION &amp; FEEDBACK (OPTIONAL)
                  </label>
                  <textarea
                    id="feedback-textarea"
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Thank you for an incredible performance! Arrived on time, set up seamlessly, and kept our guests engaged throughout..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-line)',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <Button variant="secondary" disabled={completing} onClick={() => setCompleteBooking(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={completing}
                    onClick={() => void handleCompleteEvent(completeBooking)}
                  >
                    {completing ? 'Confirming...' : 'Confirm Completion'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerBookingsPage

