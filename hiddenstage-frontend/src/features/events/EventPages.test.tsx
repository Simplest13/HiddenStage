import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import EventPages from './EventPages'
import { eventsApi } from '../../shared/api/backend/events'
import { marketplaceApi } from '../../shared/api/backend/marketplace'
import { ToastProvider } from '../../shared/ui/Toast'

vi.mock('../../shared/api/backend/events', () => ({
  eventsApi: {
    categories: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    submit: vi.fn(),
  },
}))

vi.mock('../../shared/api/backend/marketplace', () => ({
  marketplaceApi: {
    listEventInvitations: vi.fn(),
    inviteProvider: vi.fn(),
  },
}))

describe('EventPages - Event Type and Custom Event Type Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(eventsApi.categories).mockResolvedValue([
      { id: 'cat-1', code: 'catering', name: 'Food & Drink', description: '', sort_order: 1 },
    ])
    vi.mocked(marketplaceApi.listEventInvitations).mockResolvedValue([])
  })

  function renderPage() {
    return render(
      <ToastProvider>
        <MemoryRouter>
          <EventPages />
        </MemoryRouter>
      </ToastProvider>
    )
  }

  it('does not display the other event type text box for standard event types', () => {
    renderPage()

    const select = screen.getByLabelText(/type of event/i) as HTMLSelectElement
    expect(screen.queryByLabelText(/other type of event/i)).not.toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'Wedding' } })
    expect(screen.queryByLabelText(/other type of event/i)).not.toBeInTheDocument()
  })

  it('renders a separate text box when Other is chosen and allows specifying the custom event type', () => {
    renderPage()

    const select = screen.getByLabelText(/type of event/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Other' } })

    const customInput = screen.getByLabelText(/other type of event/i) as HTMLInputElement
    expect(customInput).toBeInTheDocument()
    expect(customInput.placeholder).toContain('Baby shower')

    fireEvent.change(customInput, { target: { value: 'Gala Dinner' } })
    expect(customInput.value).toBe('Gala Dinner')

    // If user switches away from Other, the box disappears
    fireEvent.change(select, { target: { value: 'Birthday' } })
    expect(screen.queryByLabelText(/other type of event/i)).not.toBeInTheDocument()
  })

  it('shows a validation error if Other is chosen but the custom type is left empty', async () => {
    renderPage()

    const select = screen.getByLabelText(/type of event/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Other' } })

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByText(/specify what type of event this is/i)).toBeInTheDocument()
    })
  })
})
