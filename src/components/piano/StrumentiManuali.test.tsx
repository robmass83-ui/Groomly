import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StrumentiManuali } from './StrumentiManuali'

describe('strumenti manuali', () => {
  it('con i piani spenti non compare', () => {
    const { container } = render(<StrumentiManuali mostra={false} accessoPagella base senzaFirma={false} microfono />)
    expect(container).toBeEmptyDOMElement()
  })

  it('in base mostra WhatsApp, il microfono e la firma, e non la pagella nuova', () => {
    render(<StrumentiManuali mostra accessoPagella={false} base senzaFirma={false} microfono={false} />)
    expect(screen.getByRole('link', { name: 'Scrivi su WhatsApp' })).toHaveAttribute('href', expect.stringContaining('wa.me'))
    expect(screen.getByText('Il microfono non è disponibile')).toBeInTheDocument()
    expect(screen.getByText('Fatto con Groomly')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuova pagella' })).not.toBeInTheDocument()
  })
})
