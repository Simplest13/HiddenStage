import { useEffect, useRef, useState, type FormEvent } from 'react'
import { networkApi } from '../../shared/api/backend/ecosystem'
import type { ApiChatMessage, ApiConversation, ApiCustomerConnection } from '../../shared/api/backend/types'
import { Avatar, Button, Card, Spinner } from '../../shared/ui'

export function CustomerNetworkPage() {
  const [connections, setConnections] = useState<ApiCustomerConnection[]>([])
  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<ApiConversation | null>(null)
  const [messages, setMessages] = useState<ApiChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  // Find & Add Specialists Modal
  const [showFindModal, setShowFindModal] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadData() {
    try {
      setLoading(true)
      const [conns, convs] = await Promise.all([
        networkApi.listConnections(),
        networkApi.listConversations(),
      ])
      setConnections(conns)
      setConversations(convs)
      if (convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!activeConvId) return
    let active = true
    async function fetchThread() {
      try {
        setLoadingMessages(true)
        const res = await networkApi.getConversation(activeConvId!)
        if (!active) return
        setActiveConv(res.conversation)
        setMessages(res.messages)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } catch {
        // ignore
      } finally {
        if (active) setLoadingMessages(false)
      }
    }
    void fetchThread()
    const timer = setInterval(() => {
      void fetchThread()
    }, 8000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [activeConvId])

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault()
    if (!activeConvId || (!messageText.trim() && !attachmentFile)) return
    try {
      setSending(true)
      const newMsg = await networkApi.sendMessage(activeConvId, messageText.trim(), attachmentFile || undefined)
      setMessages((prev) => [...prev, newMsg])
      setMessageText('')
      setAttachmentFile(null)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  async function handleSearchDirectory(q: string) {
    setFindQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    try {
      setSearching(true)
      const res = await networkApi.searchProviders(q.trim())
      setSearchResults(res)
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }

  async function handleConnect(provider: any) {
    try {
      setConnectingId(provider.id)
      await networkApi.connect(provider.id, provider.username, 'Connected from Directory')
      await loadData()
      // Open or create conversation
      const conv = await networkApi.startConversation(provider.id)
      setActiveConvId(conv.id)
      setShowFindModal(false)
    } catch {
      // ignore
    } finally {
      setConnectingId(null)
    }
  }

  async function handleDisconnect(providerId: string) {
    if (!window.confirm('Remove this specialist from your network?')) return
    try {
      await networkApi.disconnect(providerId)
      setConnections((prev) => prev.filter((c) => c.provider !== providerId))
    } catch {
      // ignore
    }
  }

  async function handleSelectConnection(conn: ApiCustomerConnection) {
    const existing = conversations.find((c) => c.provider === conn.provider)
    if (existing) {
      setActiveConvId(existing.id)
    } else {
      try {
        const conv = await networkApi.startConversation(conn.provider)
        setConversations((prev) => [conv, ...prev])
        setActiveConvId(conv.id)
      } catch {
        // ignore
      }
    }
  }

  // Filtered connections
  const filteredConnections = connections.filter((c) => {
    const q = searchQuery.toLowerCase().replace(/^@/, '')
    const matchesQ =
      !q ||
      c.provider_name.toLowerCase().includes(q) ||
      (c.provider_username && c.provider_username.toLowerCase().includes(q)) ||
      c.business_name.toLowerCase().includes(q)
    const matchesCat = categoryFilter === 'ALL' || c.category.toUpperCase().includes(categoryFilter)
    return matchesQ && matchesCat
  })

  return (
    <div className="customer-page" style={{ height: 'calc(100vh - 9rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="customer-page__heading" style={{ flexShrink: 0 }}>
        <div>
          <span className="eyebrow eyebrow--accent">RELATIONSHIP NETWORK</span>
          <h1>My Network &amp; Messages</h1>
          <p>Connect directly with trusted event specialists and coordinate requirements in real time.</p>
        </div>
        <Button onClick={() => setShowFindModal(true)}>+ Find Specialists by @username</Button>
      </div>

      {/* Main 2-Panel Chat & Network Layout */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: '1rem',
          minHeight: 0,
          marginTop: '0.75rem',
        }}
      >
        {/* Left Panel: Specialist Network Roster */}
        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            background: 'var(--color-paper-bright)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {/* Search & Filter Header */}
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--color-line)' }}>
            <div style={{ position: 'relative' }}>
              <input
                className="control"
                placeholder="Search @username, specialist…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: '2.4rem', fontSize: '0.82rem', paddingLeft: '1.8rem' }}
              />
              <span style={{ position: 'absolute', left: '0.6rem', top: '0.55rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                🔍
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.65rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
              {['ALL', 'CATERING', 'PHOTO', 'SOUND'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-pill)',
                    border: 'none',
                    background: categoryFilter === cat ? 'var(--color-orange)' : 'var(--color-tint)',
                    color: categoryFilter === cat ? '#fff' : 'var(--color-ink)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat === 'ALL' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Connections List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner label="Loading network…" />
              </div>
            ) : filteredConnections.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.4rem' }}>👥</span>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No specialists match your search.</p>
                <Button
                  size="sm"
                  variant="quiet"
                  style={{ marginTop: '0.6rem' }}
                  onClick={() => setShowFindModal(true)}
                >
                  Search Directory
                </Button>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {filteredConnections.map((conn) => {
                  const conv = conversations.find((c) => c.provider === conn.provider)
                  const isSelected = conv && conv.id === activeConvId
                  return (
                    <li key={conn.id}>
                      <div
                        onClick={() => void handleSelectConnection(conn)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderBottom: '1px solid var(--color-line)',
                          background: isSelected ? 'var(--color-orange-soft)' : 'transparent',
                          borderLeft: isSelected ? '4px solid var(--color-orange)' : '4px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          transition: 'background 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                          {conn.provider_avatar ? (
                            <img
                              src={conn.provider_avatar}
                              alt={conn.provider_name}
                              style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <Avatar name={conn.provider_name} size="md" />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong
                                style={{
                                  fontSize: '0.88rem',
                                  color: 'var(--color-ink)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {conn.business_name || conn.provider_name}
                              </strong>
                              {conn.has_active_booking && (
                                <span
                                  style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-pill)',
                                    background: 'var(--color-success-soft)',
                                    color: 'var(--color-success)',
                                  }}
                                >
                                  BOOKED
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'block' }}>
                              {conn.provider_username ? `@${conn.provider_username}` : 'Specialist'} • {conn.category}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                          <button
                            type="button"
                            title="Disconnect specialist"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDisconnect(conn.provider)
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-muted)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              padding: '0.2rem',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Right Panel: Active Chat Thread */}
        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            background: 'var(--color-paper-bright)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {activeConv ? (
            <>
              {/* Chat Thread Header */}
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid var(--color-line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-paper-bright)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {activeConv.other_user.avatar ? (
                    <img
                      src={activeConv.other_user.avatar}
                      alt={activeConv.other_user.name}
                      style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Avatar name={activeConv.other_user.name} size="md" />
                  )}
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-ink)', display: 'block' }}>
                      {activeConv.other_user.business_name || activeConv.other_user.name}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {activeConv.other_user.username ? `@${activeConv.other_user.username}` : 'Specialist'} • Verified Partner
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button size="sm" variant="secondary" onClick={() => window.open(`tel:+918047182200`)}>
                    📞 Contact Support
                  </Button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  background: 'var(--color-canvas)',
                }}
              >
                {loadingMessages && messages.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <Spinner label="Loading conversation…" />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem' }}>💬</span>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Send a message to coordinate your event requirements.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.is_me
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '0.75rem 1rem',
                            borderRadius: isMe ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                            background: isMe ? 'var(--color-orange)' : 'var(--color-paper-bright)',
                            color: isMe ? '#ffffff' : 'var(--color-ink)',
                            border: isMe ? 'none' : '1px solid var(--color-line)',
                            boxShadow: 'var(--shadow-soft)',
                          }}
                        >
                          <div style={{ fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>
                          {msg.attachment && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <a
                                href={msg.attachment}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: isMe ? 'rgba(255,255,255,0.2)' : 'var(--color-tint)',
                                  color: isMe ? '#ffffff' : 'var(--color-orange)',
                                  fontSize: '0.78rem',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                }}
                              >
                                📎 View Attachment
                              </a>
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: '0.65rem',
                              textAlign: 'right',
                              marginTop: '0.25rem',
                              color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--color-muted)',
                            }}
                          >
                            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '0.85rem 1.25rem',
                  borderTop: '1px solid var(--color-line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--color-paper-bright)',
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: attachmentFile ? 'var(--color-orange-soft)' : 'var(--color-tint)',
                    border: '1px solid var(--color-line)',
                    borderRadius: '50%',
                    width: '2.4rem',
                    height: '2.4rem',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  📎
                </button>

                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    className="control"
                    placeholder="Type a message or proposal inquiry…"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    style={{ height: '2.6rem', fontSize: '0.9rem' }}
                  />
                  {attachmentFile && (
                    <span
                      style={{
                        position: 'absolute',
                        right: '0.6rem',
                        top: '0.55rem',
                        fontSize: '0.72rem',
                        background: 'var(--color-tint)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-orange)',
                        fontWeight: 600,
                      }}
                    >
                      {attachmentFile.name}
                    </span>
                  )}
                </div>

                <Button type="submit" disabled={sending || (!messageText.trim() && !attachmentFile)}>
                  {sending ? '…' : 'Send'}
                </Button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>💬</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Select a specialist to start messaging</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Coordinate quotes, schedules, and event details directly.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Find Specialists Directory Modal */}
      {showFindModal && (
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
          onClick={() => setShowFindModal(false)}
        >
          <div
            style={{
              width: 'min(36rem, 100%)',
              maxHeight: '80vh',
              overflowY: 'auto',
              background: 'var(--color-paper-bright)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lift)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span className="eyebrow eyebrow--accent">DIRECTORY SEARCH</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem' }}>Find Specialists by @username</h2>
              </div>
              <Button size="sm" variant="quiet" onClick={() => setShowFindModal(false)}>
                ✕ Close
              </Button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                className="control"
                placeholder="Search by @royal_heritage, @lens_craft, name or city…"
                value={findQuery}
                onChange={(e) => void handleSearchDirectory(e.target.value)}
                autoFocus
              />
            </div>

            {searching ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner label="Searching directory…" />
              </div>
            ) : searchResults.length === 0 && findQuery ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                No specialists found matching "{findQuery}".
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--color-tint)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-line)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} style={{ width: '2.6rem', height: '2.6rem', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <Avatar name={p.name} size="md" />
                      )}
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--color-ink)' }}>{p.business_name || p.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block' }}>
                          {p.username ? `@${p.username}` : ''} • {p.category} • 📍 {p.city}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={p.is_connected || connectingId === p.id}
                      onClick={() => void handleConnect(p)}
                    >
                      {p.is_connected ? 'Connected' : connectingId === p.id ? 'Connecting…' : '+ Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerNetworkPage

