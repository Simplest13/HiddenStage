import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './overlays'

describe('Modal', () => {
  it('labels the dialog and restores keyboard focus within it', () => {
    render(<Modal open title="Event details" onClose={vi.fn()}><button type="button">Continue</button></Modal>)
    const close = screen.getByRole('button', { name: 'Close dialog' })
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(screen.getByRole('dialog', { name: 'Event details' })).toBeInTheDocument()
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(continueButton).toHaveFocus()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<Modal open title="Confirm" onClose={onClose}>Details</Modal>)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close dialog' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
