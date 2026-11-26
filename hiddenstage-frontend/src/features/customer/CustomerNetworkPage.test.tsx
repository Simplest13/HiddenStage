import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CustomerNetworkPage } from './CustomerNetworkPage'
import { networkApi } from '../../shared/api/backend/ecosystem'

vi.mock('../../shared/api/backend/ecosystem', () => ({
  networkApi: {
    listConnections: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    startConversation: vi.fn(),
    sendMessage: vi.fn(),
    disconnect: vi.fn(),
    searchProviders: vi.fn(),
  },
}))

vi.mock('../../shared/api/realtime', () => ({
  subscribeToRealtime: vi.fn(() => () => {}),
}))

const mockProviderAuth = {
  status: 'authenticated' as const,
  roles: ['PROVIDER'],
  user: {
    id: 'provider-user-123',
    fullName: 'Demo Specialist',
    email: 'specialist@test.com',
    phone: '',
    emailVerified: true,
    emailVerificationRequired: true,
    profileCompleted: true,
    accountType: 'PROVIDER' as const,
  },
}

vi.mock('../../app/auth/useAuth', () => ({
  useAuth: () => mockProviderAuth,
}))

describe('CustomerNetworkPage chat selection', () => {
  const connectionsMock = [
    {
      id: 'conn-1',
      customer: 'cust-ishikaa',
      provider: 'provider-user-123',
      provider_name: 'Ishikaa Singh',
      provider_username: 'isshhuu_bhai',
      provider_avatar: null,
      business_name: 'Ishikaa Singh',
      category: 'Specialist',
      city: 'Delhi',
      has_active_booking: false,
      unread_messages_count: 0,
      customer_details: { id: 'cust-ishikaa', full_name: 'Ishikaa Singh' },
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'conn-2',
      customer: 'cust-madhav',
      provider: 'provider-user-123',
      provider_name: 'madhav singh',
      provider_username: 'madhav_jii',
      provider_avatar: null,
      business_name: 'madhav singh',
      category: 'Specialist',
      city: 'Bangalore',
      has_active_booking: false,
      unread_messages_count: 0,
      customer_details: { id: 'cust-madhav', full_name: 'madhav singh' },
      created_at: '2026-01-02T00:00:00Z',
    },
  ]

  const conversationsMock = [
    {
      id: 'conv-ishikaa',
      customer: 'cust-ishikaa',
      provider: 'provider-user-123',
      other_user: {
        id: 'cust-ishikaa',
        name: 'Ishikaa Singh',
        username: 'isshhuu_bhai',
        avatar: null,
        business_name: 'Ishikaa Singh',
      },
      latest_message: {
        id: 'msg-1',
        content: 'Hello from Ishikaa',
        sender_id: 'cust-ishikaa',
        created_at: '2026-01-01T10:00:00Z',
        is_read: true,
      },
      unread_count: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
    },
    {
      id: 'conv-madhav',
      customer: 'cust-madhav',
      provider: 'provider-user-123',
      other_user: {
        id: 'cust-madhav',
        name: 'madhav singh',
        username: 'madhav_jii',
        avatar: null,
        business_name: 'madhav singh',
      },
      latest_message: {
        id: 'msg-2',
        content: 'Hi from Madhav',
        sender_id: 'cust-madhav',
        created_at: '2026-01-02T10:00:00Z',
        is_read: true,
      },
      unread_count: 0,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T10:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(networkApi.listConnections).mockResolvedValue(connectionsMock as any)
    vi.mocked(networkApi.listConversations).mockResolvedValue(conversationsMock as any)
    vi.mocked(networkApi.getConversation).mockImplementation((id: string) => {
      const conv = conversationsMock.find((c) => c.id === id) || conversationsMock[0]
      return Promise.resolve({
        conversation: conv as any,
        messages: [
          {
            id: `msg-${id}`,
            conversation: id,
            sender: conv.other_user.id,
            sender_name: conv.other_user.name,
            sender_username: conv.other_user.username,
            sender_avatar: null,
            is_me: false,
            content: `Message in ${conv.other_user.name} thread`,
            is_read: true,
            created_at: '2026-01-01T12:00:00Z',
          },
        ],
      })
    })
  })

  it('selects and opens the chat box of the clicked user in the roster', async () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <CustomerNetworkPage /> }],
      { initialEntries: ['/'] }
    )

    render(<RouterProvider router={router} />)

    // Wait for heading and connections to render
    await waitFor(() => {
      expect(screen.getByText('Customer Network & Messages')).toBeInTheDocument()
      expect(screen.getByText('Ishikaa Singh')).toBeInTheDocument()
      expect(screen.getByText('madhav singh')).toBeInTheDocument()
    })

    // Click on "madhav singh" in the roster list
    const madhavItem = screen.getByText('madhav singh')
    fireEvent.click(madhavItem)

    // The messaging chat box for madhav singh must open immediately!
    await waitFor(() => {
      expect(networkApi.getConversation).toHaveBeenCalledWith('conv-madhav')
    })
  })

  it('renders the username as a clickable link pointing to the provider portfolio page', async () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <CustomerNetworkPage /> }],
      { initialEntries: ['/'] }
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText('madhav singh')).toBeInTheDocument()
    })

    // Click on madhav singh to open his chat
    fireEvent.click(screen.getByText('madhav singh'))

    await waitFor(() => {
      // Chat header should render the username link pointing to /providers/madhav_jii
      const usernameLinks = screen.getAllByRole('link', { name: /@madhav_jii/i })
      expect(usernameLinks.length).toBeGreaterThan(0)
      expect(usernameLinks[0]).toHaveAttribute('href', '/providers/madhav_jii')

      // View Portfolio button link should also point to /providers/madhav_jii
      const viewPortfolioLink = screen.getByRole('link', { name: /view portfolio/i })
      expect(viewPortfolioLink).toHaveAttribute('href', '/providers/madhav_jii')
    })
  })
})
