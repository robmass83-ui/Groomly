import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingSplash } from './LoadingSplash'

describe('schermata di caricamento', () => {
  it('mostra il saluto sotto il logo', () => {
    render(<LoadingSplash greeting="Ciao Laura" />)
    const splash = screen.getByRole('status', { name: 'Caricamento Groomly' })
    const greeting = screen.getByText('Ciao Laura')
    expect(greeting).toHaveClass('loading-splash__greeting')
    expect(splash).toContainElement(greeting)
    const logo = splash.querySelector('.loading-splash__logo--light')
    expect(logo!.compareDocumentPosition(greeting) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('senza saluto mostra solo il logo', () => {
    render(<LoadingSplash />)
    expect(screen.getByRole('status', { name: 'Caricamento Groomly' }).querySelector('.loading-splash__greeting')).toBeNull()
  })
})
