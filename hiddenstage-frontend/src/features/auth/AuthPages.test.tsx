import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routeConfig } from '../../app/router/router'
import { AppProviders } from '../../app/providers/AppProviders'

function renderRoute(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] })
  return render(<AppProviders><RouterProvider router={router}/></AppProviders>)
}

describe('demo authentication forms', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('validates matching registration passwords and makes the demo verification explicit', async () => {
    const user = userEvent.setup()
    renderRoute('/auth/register')
    await user.type(await screen.findByLabelText('Full name'), 'Morgan Customer')
    await user.type(screen.getByLabelText('Email address'), 'morgan@example.test')
    await user.type(screen.getByLabelText('New password'), 'Preview123!')
    await user.type(screen.getByLabelText('Confirm password'), 'different123')
    await user.click(screen.getByLabelText(/I agree to the/))
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match')
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'Preview123!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
    expect(screen.getByText(/does not send email/i)).toBeInTheDocument()
  })

  it('shows a recoverable error for invalid demo credentials and supports password visibility', async () => {
    const user = userEvent.setup()
    renderRoute('/auth/login')
    const password = await screen.findByLabelText('Password')
    await user.type(screen.getByLabelText('Email address'), 'demo@hiddenstage.test')
    await user.type(password, 'incorrect123')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('did not match a demo account')
  })
})
