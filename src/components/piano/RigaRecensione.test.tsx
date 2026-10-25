import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RigaRecensione } from './RigaRecensione'

describe('riga recensione', () => {
  it('con i piani spenti non si vede', () => {
    const { container } = render(<RigaRecensione mostra={false} proponi onChiedi={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('col flag e la proposta mostra il testo senza sconti', () => {
    render(<RigaRecensione mostra proponi onChiedi={() => undefined} />)
    expect(screen.getByRole('region', { name: 'Recensione Google' }).textContent ?? '').not.toMatch(/sconto/i)
  })
})
