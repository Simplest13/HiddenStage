import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { networkApi } from '../../shared/api/backend/ecosystem'
import { subscribeToRealtime } from '../../shared/api/realtime'
import type { ApiChatMessage, ApiConversation, ApiCustomerConnection } from '../../shared/api/backend/types'
import { Avatar, Button, Card, Spinner } from '../../shared/ui'
import { useAuth } from '../../app/auth/useAuth'

export function CustomerNetworkPage() {
  const auth = useAuth()
  const isProvider = auth.status === 'authenticated' && auth.roles.includes('PROVIDER') && !auth.roles.includes('CUSTOMER')

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

  // Live suggestions for left search bar
  const [liveSuggestions, setLiveSuggestions] = useState<any[]>([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)
  const [connectingSuggestionId, setConnectingSuggestionId] = useState<string | null>(null)

  // Find & Add Specialists Modal
  const [showFindModal, setShowFindModal] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Live debounced search against platform profiles when user types in left search input
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setLiveSuggestions([])
      setSearchingSuggestions(false)
      return
    }

    setSearchingSuggestions(true)
    const timer = setTimeout(async () => {
      try {
        const data = await networkApi.searchProviders(q)
        setLiveSuggestions(data)
      } catch {
        setLiveSuggestions([])
      } finally {
        setSearchingSuggestions(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!activeConvId) return
    let active = true
    async function fetchThread(isBackground = false) {
      try {
        if (!isBackground) setLoadingMessages(true)
        const res = await networkApi.getConversation(activeConvId!)
        if (!active) return
        setActiveConv(res.conversation)
        setMessages((prev) => {
          if (
            prev.length === res.messages.length &&
            prev[prev.length - 1]?.id === res.messages[res.messages.length - 1]?.id
          ) {
            return prev
          }
          return res.messages
        })
        if (!isBackground) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      } catch {
        // ignore
      } finally {
        if (active && !isBackground) setLoadingMessages(false)
      }
    }
    void fetchThread(false)

    // Realtime instant push for incoming messages
    const unsubscribe = subscribeToRealtime((evt) => {
      if (!active) return
      if (evt.type === 'chat_message' && evt.data?.conversation_id === activeConvId) {
        const incoming = evt.data.message
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev
          return [...prev, incoming]
        })
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 50)
      }
    })

    // Passive fallback sync
    const timer = setInterval(() => {
      void fetchThread(true)
    }, 45000)

    return () => {
      active = false
      unsubscribe()
      clearInterval(timer)
    }
  }, [activeConvId])

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault()
    if (!activeConvId || (!messageText.trim() && !attachmentFile)) return
    const textToSend = messageText.trim()
    const fileToSend = attachmentFile

    // Optimistic UI update: message appears instantly in chat window (0ms)
    const tempId = `temp-${Date.now()}`
    const currentUser = (auth as any).user
    const optimisticMsg: ApiChatMessage = {
      id: tempId,
      conversation: activeConvId,
      sender: currentUser?.id || '',
      sender_name: currentUser?.full_name || 'Me',
      sender_username: currentUser?.username || '',
      sender_avatar: currentUser?.avatar || '',
      is_me: true,
      content: textToSend,
      attachment: fileToSend ? URL.createObjectURL(fileToSend) : undefined,
      created_at: new Date().toISOString(),
      is_read: false,
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setMessageText('')
    setAttachmentFile(null)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 20)

    try {
      setSending(true)
      const newMsg = await networkApi.sendMessage(activeConvId, textToSend, fileToSend || undefined)
      setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)))
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  function handleSearchDirectory(q: string) {
    setFindQuery(q)
    if (modalSearchTimerRef.current) clearTimeout(modalSearchTimerRef.current)
    if (!q.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    modalSearchTimerRef.current = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await networkApi.searchProviders(q.trim())
        setSearchResults(res)
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 250)
  }

  async function handleConnect(provider: any) {
    try {
      setConnectingId(provider.id)
      // Parallel execution: connect and open conversation concurrently in one round-trip
      const [, conv] = await Promise.all([
        networkApi.connect(provider.id, provider.username, 'Connected from Directory'),
        networkApi.startConversation(provider.id),
      ])
      if (conv?.id) {
        setActiveConvId(conv.id)
      }
      setShowFindModal(false)
      void loadData()
    } catch {
      // ignore
    } finally {
      setConnectingId(null)
    }
  }

  async function handleAddSuggestionToNetwork(profile: any) {
    try {
      setConnectingSuggestionId(profile.id)
      // Parallel execution: connect and open conversation concurrently
      const [, conv] = await Promise.all([
        networkApi.connect(profile.id, profile.username || undefined, 'Added from Network search'),
        networkApi.startConversation(profile.id),
      ])
      if (conv?.id) {
        setActiveConvId(conv.id)
      }
      setLiveSuggestions((prev) => prev.filter((p) => p.id !== profile.id))
      void loadData()
    } catch (err: any) {
      alert(err?.message || 'Failed to add to network')
    } finally {
      setConnectingSuggestionId(null)
    }
  }

  async function handleDisconnect(partnerId: string) {
    if (!window.confirm(isProvider ? 'Remove this client from your network?' : 'Remove this specialist from your network?')) return
    try {
      await networkApi.disconnect(partnerId)
      setConnections((prev) => prev.filter((c) => c.provider !== partnerId && c.customer !== partnerId))
    } catch {
      // ignore
    }
  }

  async function handleSelectConnection(conn: ApiCustomerConnection) {
    const existing = conversations.find(
      (c) =>
        c.id === conn.id ||
        (conn.customer && c.customer === conn.customer) ||
        c.provider === conn.provider ||
        c.other_user?.id === conn.provider ||
        (conn.customer && c.other_user?.id === conn.customer)
    )
    if (existing) {
      setActiveConvId(existing.id)
    } else {
      try {
        const targetId = isProvider ? (conn.customer || conn.provider) : conn.provider
        const conv = await networkApi.startConversation(targetId)
        setConversations((prev) => [conv, ...prev])
        setActiveConvId(conv.id)
      } catch {
        // ignore
      }
    }
  }

  // Merged list of contacts from connections and conversations
  const allContacts: ApiCustomerConnection[] = [...connections]
  for (const conv of conversations) {
    const alreadyPresent = allContacts.some(
      (c) =>
        c.id === conv.id ||
        (c.customer && c.customer === conv.customer) ||
        c.provider === conv.provider ||
        c.provider === conv.other_user?.id ||
        (c.customer && c.customer === conv.other_user?.id)
    )
    if (!alreadyPresent && conv.other_user) {
      allContacts.push({
        id: conv.id,
        customer: conv.customer,
        provider: conv.provider,
        provider_name: conv.other_user.name,
        provider_username: conv.other_user.username,
        provider_avatar: conv.other_user.avatar,
        business_name: conv.other_user.business_name || conv.other_user.name,
        category: isProvider ? 'Customer' : 'Specialist',
        city: 'Direct Client',
        notes: '',
        has_active_booking: false,
        unread_messages_count: conv.unread_count || 0,
        created_at: conv.created_at,
      })
    }
  }

  // Filtered connections
  const filteredConnections = allContacts.filter((c) => {
    const q = searchQuery.toLowerCase().replace(/^@/, '').trim()
    const matchesQ =
      !q ||
      c.provider_name.toLowerCase().includes(q) ||
      (c.provider_username && c.provider_username.toLowerCase().includes(q)) ||
      c.business_name.toLowerCase().includes(q)
    const matchesCat = categoryFilter === 'ALL' || c.category.toUpperCase().includes(categoryFilter)
    return matchesQ && matchesCat
  })

  // Set of connected user IDs (both provider and customer sides)
  const connectedUserIds = useMemo(() => {
    const ids = new Set<string>()
    for (const c of allContacts) {
      if (c.provider) ids.add(c.provider)
      if (c.customer) ids.add(c.customer)
      if (c.id) ids.add(c.id)
    }
    return ids
  }, [allContacts])

  // Filter out suggestions that are already in active network
  const unaddedSuggestions = useMemo(() => {
    return liveSuggestions.filter((p) => !connectedUserIds.has(p.id))
  }, [liveSuggestions, connectedUserIds])

  function renderConnectionItem(conn: ApiCustomerConnection) {
    const conv = conversations.find(
      (c) =>
        c.id === conn.id ||
        (conn.customer && c.customer === conn.customer) ||
        c.provider === conn.provider ||
        c.other_user?.id === conn.provider ||
        (conn.customer && c.other_user?.id === conn.customer)
    )
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
              title={isProvider ? 'Disconnect client' : 'Disconnect specialist'}
              onClick={(e) => {
                e.stopPropagation()
                const partnerId = isProvider ? (conn.customer || conn.provider) : conn.provider
                void handleDisconnect(partnerId)
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
  }

  return (
    <div className="customer-page" style={{ height: 'calc(100vh - 9rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="customer-page__heading" style={{ flexShrink: 0 }}>
        <div>
          <span className="eyebrow eyebrow--accent">
            {isProvider ? 'CUSTOMER NETWORK' : 'RELATIONSHIP NETWORK'}
          </span>
          <h1>{isProvider ? 'Customer Network & Messages' : 'My Network & Messages'}</h1>
          <p>
            {isProvider
              ? 'Communicate directly with clients and hosts who connected with your services.'
              : 'Connect directly with trusted event specialists and coordinate requirements in real time.'}
          </p>
        </div>
        {!isProvider && <Button onClick={() => setShowFindModal(true)}>+ Find Specialists by @username</Button>}
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

          {/* Connections & Suggestions List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner label="Loading network…" />
              </div>
            ) : !searchQuery.trim() ? (
              filteredConnections.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                  <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.4rem' }}>👥</span>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    {isProvider ? 'No customers connected yet.' : 'Your network is empty.'}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    Type an @username in the search box above to find contacts.
                  </p>
                  {!isProvider && (
                    <Button
                      size="sm"
                      variant="quiet"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => setShowFindModal(true)}
                    >
                      Browse Directory
                    </Button>
                  )}
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {filteredConnections.map((conn) => renderConnectionItem(conn))}
                </ul>
              )
            ) : (
              /* Search query active */
              <div>
                {/* 1. Existing Network Connections matching search */}
                {filteredConnections.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '0.45rem 1rem',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: 'var(--color-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        background: 'var(--color-tint)',
                        borderBottom: '1px solid var(--color-line)',
                      }}
                    >
                      In Your Network ({filteredConnections.length})
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {filteredConnections.map((conn) => renderConnectionItem(conn))}
                    </ul>
                  </div>
                )}

                {/* 2. Searching Spinner */}
                {searchingSuggestions && (
                  <div style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <Spinner label="Searching platform profiles…" />
                  </div>
                )}

                {/* 3. Platform Profiles / Known Contacts Suggestions */}
                {unaddedSuggestions.length > 0 && (
                  <div style={{ borderTop: filteredConnections.length > 0 ? '2px solid var(--color-line)' : 'none' }}>
                    <div
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: 'var(--color-orange)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        background: 'var(--color-orange-soft)',
                        borderBottom: '1px solid var(--color-line)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>Suggested Profiles ({unaddedSuggestions.length})</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'none', fontWeight: 500 }}>
                        Click to add to feed
                      </span>
                    </div>

                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {unaddedSuggestions.map((p) => {
                        const isConnecting = connectingSuggestionId === p.id
                        return (
                          <li
                            key={p.id}
                            style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid var(--color-line)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.75rem',
                              background: 'var(--color-paper-bright)',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                              {p.avatar ? (
                                <img
                                  src={p.avatar}
                                  alt={p.name}
                                  style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                />
                              ) : (
                                <Avatar name={p.name} size="md" />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <strong
                                    style={{
                                      fontSize: '0.88rem',
                                      color: 'var(--color-ink)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {p.business_name || p.name}
                                  </strong>
                                  {p.username && (
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--color-orange)',
                                        fontWeight: 700,
                                        background: 'var(--color-tint)',
                                        padding: '0.05rem 0.35rem',
                                        borderRadius: 'var(--radius-pill)',
                                      }}
                                    >
                                      @{p.username}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'block' }}>
                                  {p.category} • 📍 {p.city}
                                </span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              disabled={isConnecting}
                              onClick={() => void handleAddSuggestionToNetwork(p)}
                              style={{
                                flexShrink: 0,
                                fontSize: '0.75rem',
                                padding: '0.35rem 0.75rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isConnecting ? 'Adding…' : '+ Add to my network'}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* 4. Empty State if nothing matches */}
                {filteredConnections.length === 0 && unaddedSuggestions.length === 0 && !searchingSuggestions && (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.4rem' }}>🔍</span>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      No profiles found matching "{searchQuery}".
                    </p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      Try typing the exact @username or specialist name.
                    </p>
                  </div>
                )}
              </div>
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

