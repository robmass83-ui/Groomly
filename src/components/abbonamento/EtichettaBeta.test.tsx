// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BarraGiorni } from './BarraGiorni'
import { EtichettaBeta } from './EtichettaBeta'

describe('EtichettaBeta', () => {
  afterEach(cleanup)

  it('scrive BETA con il colore del piano', () => {
    render(<EtichettaBeta piano="pro" />)
    const pillola = screen.getByText('BETA')
    expect(pillola.style.height).toBe('18px')
    expect(pillola.style.color).toBe('var(--plus-ink)')
    expect(pillola.style.background).toBe('var(--plus-s)')
  })

  it('Salon usa i suoi token', () => {
    render(<EtichettaBeta piano="salone" />)
    expect(screen.getByText('BETA').style.color).toBe('var(--sal-ink)')
  })

  it('la variante piena è bianca al 22% e senza bordo', () => {
    render(<EtichettaBeta piano="pro" piena />)
    const pillola = screen.getByText('BETA')
    expect(pillola.style.background).toMatch(/^rgba\(255, ?255, ?255, ?0?\.22\)$/)
    expect(pillola.style.borderStyle === '' || pillola.style.borderStyle === 'none').toBe(true)
    expect(pillola.style.color).toBe('#fff')
  })
})

describe('BarraGiorni', () => {
  afterEach(cleanup)

  it('10 giorni su 30: barra al 33% e «10 gg»', () => {
    render(<BarraGiorni rimasti={10} totali={30} />)
    const barra = screen.getByRole('progressbar', { name: '10 giorni rimasti' })
    expect(barra.getAttribute('aria-valuenow')).toBe('10')
    expect(screen.getByTestId('barra-piena').style.width).toBe('33%')
    expect(screen.getByText('10 gg')).toBeInTheDocument()
  })

  it('senza totale resta solo il numero', () => {
    render(<BarraGiorni rimasti={4} totali={null} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('4 gg')).toBeInTheDocument()
  })
})
