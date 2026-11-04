import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button, Input } from './primitives'

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
})
