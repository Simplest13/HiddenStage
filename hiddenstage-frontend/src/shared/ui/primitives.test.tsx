import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Button, CardButton, CardLink, Input } from './primitives'

describe('accessible UI primitives', () => {
  it('renders a named button with its selected visual variant', () => {
    render(<Button variant="secondary">Review details</Button>)
    expect(screen.getByRole('button', { name: 'Review details' })).toHaveClass('button--secondary')
  })

  it('associates an input label and hint with the control', () => {
    render(<Input label="Email address" name="email" type="email" hint="Use the address on your account." />)
    const input = screen.getByRole('textbox', { name: 'Email address' })
    expect(input).toHaveAccessibleDescription('Use the address on your account.')
  })

  it('renders an interactive card as a route link', () => {
    const router = createMemoryRouter([{ path: '/', element: <CardLink to="/details">Open details</CardLink> }])
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('link', { name: 'Open details' })).toHaveAttribute('href', '/details')
  })

  it('renders an interactive card as a button for in-page actions', () => {
    render(<CardButton aria-pressed="true" onClick={() => {}}>Active items</CardButton>)
    expect(screen.getByRole('button', { name: 'Active items' })).toHaveAttribute('aria-pressed', 'true')
  })
})
