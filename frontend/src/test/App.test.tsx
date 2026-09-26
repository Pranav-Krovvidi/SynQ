/**
 * Smoke test — verifies the App renders without crashing.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders the SynQ placeholder', () => {
    render(<App />)
    expect(screen.getByText('SynQ')).toBeInTheDocument()
  })
})
