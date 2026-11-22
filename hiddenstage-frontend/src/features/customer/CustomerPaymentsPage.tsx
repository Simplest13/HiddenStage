import { useEffect, useState } from 'react'
import { routes } from '../../app/routes/routePaths'
import { paymentsApi } from '../../shared/api/backend/ecosystem'
import type { ApiInvoice, ApiPaymentTransaction } from '../../shared/api/backend/types'
import { formatPaise, formatShortDate } from '../../shared/api/backend/format'
import { Badge, Button, ButtonLink, Card, Spinner } from '../../shared/ui'

export function CustomerPaymentsPage() {
  const [summary, setSummary] = useState<{
    total_booked_paise: number
    total_paid_paise: number
    advance_pending_paise: number
    final_pending_paise: number
    event_breakdown: Array<{
      event_id: string
      event_name: string
      event_date: string | null
      total_booked_paise: number
      total_paid_paise: number
      invoices_count: number
      status: string
    }>
  } | null>(null)

  const [invoices, setInvoices] = useState<ApiInvoice[]>([])
  const [transactions, setTransactions] = useState<ApiPaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'transactions'>('overview')
  const [invoiceFilter, setInvoiceFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL')

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null)
  const [payModalInvoice, setPayModalInvoice] = useState<ApiInvoice | null>(null)
  const [paying, setPaying] = useState(false)
  const [paySuccess, setPaySuccess] = useState<string | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      const [sumData, invData, txData] = await Promise.all([
        paymentsApi.getSummary(),
        paymentsApi.listInvoices(),
        paymentsApi.listTransactions(),
      ])
      setSummary(sumData)
      setInvoices(invData)
      setTransactions(txData)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleSimulatePayment(invoice: ApiInvoice) {
    try {
      setPaying(true)
      const res = await paymentsApi.simulatePayment(invoice.id)
      setPaySuccess(res.detail || 'Escrow deposit completed successfully!')
      setPayModalInvoice(null)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Payment simulation failed')
    } finally {
      setPaying(false)
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter === 'PAID') return inv.status === 'PAID'
    if (invoiceFilter === 'PENDING')
      return inv.status === 'ADVANCE_PENDING' || inv.status === 'PAYMENT_PENDING'
    return true
  })

  return (
    <div className="customer-payments-page" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-orange, #e05822)', textTransform: 'uppercase' }}>
            Escrow & Financial Ledger
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0 0.5rem', fontFamily: 'serif' }}>
            My Payments & Invoices
          </h1>
          <p style={{ color: 'var(--color-fg-muted)', margin: 0 }}>
            Every rupee is protected in HiddenStage Escrow until milestone verification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <ButtonLink to={routes.customer.bookings} variant="secondary">
            View Bookings
          </ButtonLink>
          <ButtonLink to={routes.customer.newRequest}>
            + New Event
          </ButtonLink>
        </div>
      </div>

      {paySuccess && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🛡️</span>
            <div>
              <strong style={{ color: '#16a34a', display: 'block' }}>Payment Confirmed & Escrow Secured</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-fg-muted)' }}>{paySuccess}</span>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPaySuccess(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-orange, #e05822)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase' }}>
            Total Contract Value
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0' }}>
            {formatPaise(summary?.total_booked_paise ?? 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
            Across all booked event milestones
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase' }}>
              Paid in Escrow
            </span>
            <Badge tone="success">100% Secured</Badge>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', margin: '0.35rem 0' }}>
            {formatPaise(summary?.total_paid_paise ?? 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
            Held safely until service delivery
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase' }}>
            Advance Pending
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: (summary?.advance_pending_paise ?? 0) > 0 ? '#d97706' : 'inherit', margin: '0.35rem 0' }}>
            {formatPaise(summary?.advance_pending_paise ?? 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
            Required to confirm bookings
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase' }}>
            Final Balance Pending
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0' }}>
            {formatPaise(summary?.final_pending_paise ?? 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
            Due prior to or upon completion
          </div>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '3px solid var(--color-orange, #e05822)' : '3px solid transparent',
            color: activeTab === 'overview' ? 'var(--color-fg)' : 'var(--color-fg-muted)',
          }}
        >
          Event Breakdown
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'invoices' ? '3px solid var(--color-orange, #e05822)' : '3px solid transparent',
            color: activeTab === 'invoices' ? 'var(--color-fg)' : 'var(--color-fg-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Invoices
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '10px', background: 'var(--color-bg-subtle)' }}>
            {invoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'transactions' ? '3px solid var(--color-orange, #e05822)' : '3px solid transparent',
            color: activeTab === 'transactions' ? 'var(--color-fg)' : 'var(--color-fg-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Transaction History
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '10px', background: 'var(--color-bg-subtle)' }}>
            {transactions.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Spinner label="Loading payments ledger…" />
        </div>
      ) : (
        <>
          {/* TAB 1: EVENT BREAKDOWN OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {(!summary?.event_breakdown || summary.event_breakdown.length === 0) ? (
                <Card style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-fg-muted)', margin: '0 0 1rem' }}>
                    No payment schedules active yet. Confirm quotations to establish escrow milestones.
                  </p>
                  <ButtonLink to={routes.customer.bookings}>Browse Bookings</ButtonLink>
                </Card>
              ) : (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {summary.event_breakdown.map((ev) => {
                    const pct = ev.total_booked_paise > 0
                      ? Math.min(100, Math.round((ev.total_paid_paise / ev.total_booked_paise) * 100))
                      : 0
                    return (
                      <Card key={ev.event_id} style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
                              {ev.event_name}
                            </h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-fg-muted)', display: 'flex', gap: '1rem' }}>
                              <span>📅 {ev.event_date ? formatShortDate(ev.event_date) : 'Date TBD'}</span>
                              <span>🧾 {ev.invoices_count} milestone invoice(s)</span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                              {formatPaise(ev.total_booked_paise)}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                              {formatPaise(ev.total_paid_paise)} secured in escrow ({pct}%)
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: pct === 100 ? '#22c55e' : 'var(--color-orange, #e05822)',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-fg-muted)' }}>
                            Status: <strong style={{ color: 'var(--color-fg)' }}>{ev.status}</strong>
                          </span>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setInvoiceFilter('ALL')
                                setActiveTab('invoices')
                              }}
                            >
                              View Invoices
                            </Button>
                            <ButtonLink
                              size="sm"
                              to={routes.customer.requestDetail.replace(':eventId', ev.event_id)}
                            >
                              Event Workspace →
                            </ButtonLink>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVOICES LIST */}
          {activeTab === 'invoices' && (
            <div>
              {/* Filter pills */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {(['ALL', 'PENDING', 'PAID'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={invoiceFilter === mode ? 'primary' : 'secondary'}
                    onClick={() => setInvoiceFilter(mode)}
                  >
                    {mode === 'ALL' ? 'All Invoices' : mode === 'PENDING' ? 'Pending Action' : 'Paid & Secured'}
                  </Button>
                ))}
              </div>

              {filteredInvoices.length === 0 ? (
                <Card style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-fg-muted)' }}>
                    No invoices matching this filter.
                  </p>
                </Card>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {filteredInvoices.map((inv) => {
                    const isPaid = inv.status === 'PAID'
                    const isPending = inv.status === 'ADVANCE_PENDING' || inv.status === 'PAYMENT_PENDING'
                    const desc = inv.items?.[0]?.description || (inv.status === 'ADVANCE_PENDING' ? 'Advance Deposit' : 'Service Milestone')

                    return (
                      <Card
                        key={inv.id}
                        style={{
                          padding: '1.25rem 1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                            <strong style={{ fontSize: '1.05rem' }}>{inv.invoice_number}</strong>
                            {isPaid ? (
                              <Badge tone="success">Paid in Escrow</Badge>
                            ) : isPending ? (
                              <Badge tone="warning">Payment Due</Badge>
                            ) : (
                              <Badge tone="neutral">Upcoming</Badge>
                            )}
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
                              • {desc}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.88rem', color: 'var(--color-fg-muted)', display: 'flex', gap: '1rem' }}>
                            <span>Event: <strong style={{ color: 'var(--color-fg)' }}>{inv.event_name}</strong></span>
                            {inv.due_date && <span>Due: {formatShortDate(inv.due_date)}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                              {formatPaise(inv.amount_paise)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-fg-muted)' }}>
                              {isPaid ? `Secured on ${formatShortDate(inv.created_at)}` : '0% Commission Fee'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button size="sm" variant="secondary" onClick={() => setSelectedInvoice(inv)}>
                              View
                            </Button>
                            {isPending && (
                              <Button
                                size="sm"
                                onClick={() => setPayModalInvoice(inv)}
                                style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
                              >
                                Pay Now (Escrow)
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSACTIONS HISTORY */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <Card style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-fg-muted)' }}>
                    No payment transactions recorded yet.
                  </p>
                </Card>
              ) : (
                <Card style={{ padding: '0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Ref ID</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Invoice #</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Method</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Amount</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Escrow Protection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                            {tx.reference}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--color-fg-muted)' }}>
                            {formatShortDate(tx.created_at)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {tx.invoice_number || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {tx.method}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>
                            {formatPaise(tx.amount_paise)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <Badge tone={tx.status === 'SUCCESS' ? 'success' : 'neutral'}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                              🛡️ Secured in Escrow
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: PAY NOW (ESCROW) CONFIRMATION */}
      {payModalInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setPayModalInvoice(null)}
        >
          <div
            style={{
              background: 'var(--color-paper-bright)',
              color: 'var(--color-ink)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                🛡️
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>
                  Escrow Deposit Authorization
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-fg-muted)' }}>
                  {payModalInvoice.invoice_number}
                </span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-subtle)',
                padding: '1.25rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-fg-muted)' }}>Event</span>
                <strong>{payModalInvoice.event_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-fg-muted)' }}>Provider</span>
                <span>{payModalInvoice.provider_business || payModalInvoice.provider_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-fg-muted)' }}>Platform Markup</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>₹0 (Zero Commission)</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px dashed var(--color-border)',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                }}
              >
                <span>Deposit Amount</span>
                <span style={{ color: 'var(--color-orange, #e05822)' }}>
                  {formatPaise(payModalInvoice.amount_paise)}
                </span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                color: 'var(--color-fg)',
                marginBottom: '1.75rem',
              }}
            >
              🔒 <strong>HiddenStage Escrow Guarantee:</strong> This payment is held in a protected settlement trust. Funds are only disbursed to the specialist once milestones are fulfilled and confirmed.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                variant="secondary"
                disabled={paying}
                onClick={() => setPayModalInvoice(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={paying}
                onClick={() => void handleSimulatePayment(payModalInvoice)}
                style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
              >
                {paying ? 'Securing Deposit…' : 'Authorize Escrow Deposit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW INVOICE */}
      {selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            style={{
              background: 'var(--color-paper-bright)',
              color: 'var(--color-ink)',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.5rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--color-orange, #e05822)' }}>
                  HIDDENSTAGE ESCROW INVOICE
                </span>
                <h2 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0.5rem', fontWeight: 800 }}>
                  {selectedInvoice.invoice_number}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-fg-muted)' }}>
                  Issued: {formatShortDate(selectedInvoice.created_at)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Badge tone={selectedInvoice.status === 'PAID' ? 'success' : 'warning'}>
                  {selectedInvoice.status === 'PAID' ? 'PAID IN ESCROW' : 'PAYMENT DUE'}
                </Badge>
              </div>
            </div>

            {/* Event & Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--color-fg-muted)', textTransform: 'uppercase', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  Event Details
                </strong>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedInvoice.event_name}</div>
                {selectedInvoice.due_date && <div>Due Date: {formatShortDate(selectedInvoice.due_date)}</div>}
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--color-fg-muted)', textTransform: 'uppercase', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  Payee / Specialist
                </strong>
                <div style={{ fontWeight: 700 }}>{selectedInvoice.provider_business || selectedInvoice.provider_name}</div>
                <div style={{ color: 'var(--color-fg-muted)' }}>Verified Service Provider</div>
              </div>
            </div>

            {/* Line items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0', fontWeight: 700 }}>Description</th>
                  <th style={{ padding: '0.6rem 0', textAlign: 'right', fontWeight: 700 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 0' }}>
                        <strong>{item.description}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
                          Service milestone for {selectedInvoice.event_name}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 700 }}>
                        {formatPaise(item.amount_paise)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 0' }}>
                      <strong>Service Payment Milestone</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)' }}>
                        Contracted service for {selectedInvoice.event_name}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 700 }}>
                      {formatPaise(selectedInvoice.amount_paise)}
                    </td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 0', color: 'var(--color-fg-muted)' }}>
                    HiddenStage Direct Booking Platform Fee
                  </td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>₹0.00 (0% Markup)</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ padding: '1rem 0', fontWeight: 800, fontSize: '1.1rem' }}>
                    Total Deposit Due
                  </td>
                  <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-orange, #e05822)' }}>
                    {formatPaise(selectedInvoice.amount_paise)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Footer notes */}
            <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '2rem' }}>
              <p style={{ margin: '0 0 0.5rem' }}>
                Note: Invoices are digitally generated by HiddenStage for verified events. All disbursements are governed by contract milestone approvals.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              <Button onClick={() => window.print()}>
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerPaymentsPage
