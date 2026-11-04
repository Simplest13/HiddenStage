import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routeConfig } from '../../app/router/router'
import { AppProviders } from '../../app/providers/AppProviders'

function renderRoute(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] })
  return render(<AppProviders><RouterProvider router={router}/></AppProviders>)
}

describe('public discovery pages', () => {
  it('filters demo services by category search and location', async () => {
    const user = userEvent.setup()
    renderRoute('/services')
    await screen.findByLabelText('Location')
    expect(document.querySelector('main h1')?.textContent).toContain('Explore event services')
    await user.type(screen.getByLabelText('Location'), 'Pune')
    expect(screen.getByRole('heading', { name: 'Food & drink' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Spaces' })).not.toBeInTheDocument()
  })

  it('filters provider records by PIN code and opens a demo profile', async () => {
    const user = userEvent.setup()
    renderRoute('/providers')
    expect(await screen.findByText('Meet event professionals')).toBeInTheDocument()
    await user.type(screen.getByLabelText('PIN code'), '560')
    expect(screen.getByRole('heading', { name: 'Studio Ambar (demo)' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'The Small Feast (demo)' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /view demo profile/i }))
    expect(await screen.findByRole('heading', { name: 'Studio Ambar (demo)' })).toBeInTheDocument()
    expect(screen.getByText(/Demo verification state: approved/i)).toBeInTheDocument()
    expect(screen.getByText('Sample table setting')).toBeInTheDocument()
  })

  it('validates contact details and clearly reports that nothing was sent', async () => {
    const user = userEvent.setup()
    renderRoute('/contact')
    await screen.findByRole('heading', { name: 'A note for the HiddenStage team.' })
    await user.type(screen.getByLabelText('Your name'), 'Taylor Guest')
    await user.type(screen.getByLabelText('Email address'), 'taylor@example.com')
    await user.type(screen.getByLabelText('How can we help?'), 'I would like to learn about the preview.')
    await user.click(screen.getByRole('button', { name: 'Validate message' }))
    expect(screen.getByRole('status')).toHaveTextContent('Your message has not been sent')
  })

  it('labels policy content as unapproved draft', async () => {
    renderRoute('/privacy')
    expect(await screen.findByText('DRAFT — NOT APPROVED')).toBeInTheDocument()
  })
})
