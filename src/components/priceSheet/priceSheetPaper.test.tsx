// @vitest-environment happy-dom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedPriceSheet } from '../../data/seed/priceSheet'
import { PriceSheetPaper } from './PriceSheetPaper'

describe('PriceSheetPaper', () => {
  it('con il seed rende il foglio chiaro e il nome della razza con Tipo', () => {
    const sheet = seedPriceSheet({ name: '', phone: '', address: '' })
    const { container } = render(<PriceSheetPaper sheet={sheet} format="A4" />)
    const fly = container.querySelector('.fly')
    expect(fly).not.toBeNull()
    expect(container.textContent).toContain('Tipo Yorkshire')
    expect(container.textContent).toContain('TAGLIA PICCOLA')
    expect(container.textContent).toContain('Grazie per la fiducia!')
    expect(container.textContent).toContain('su valutazione')
  })

  it('nasconde SERVIZI EXTRA se extra non è visibile', () => {
    const sheet = seedPriceSheet({ name: '', phone: '', address: '' })
    const hidden = {
      ...sheet,
      sezioni: sheet.sezioni.map((section) =>
        section.id === 'extra' ? { ...section, visibile: false } : section,
      ),
    }
    const { container } = render(<PriceSheetPaper sheet={hidden} format="A4" />)
    expect(container.textContent).not.toContain('SERVIZI EXTRA')
  })

  it('A3 è largo 1123 rispetto a 794 dell’A4', () => {
    const sheet = seedPriceSheet({ name: '', phone: '', address: '' })
    const a4 = render(<PriceSheetPaper sheet={sheet} format="A4" />)
    const a4Fly = a4.container.querySelector('.fly') as HTMLElement
    const a4s = Number(a4Fly.style.getPropertyValue('--s'))
    a4.unmount()
    const a3 = render(<PriceSheetPaper sheet={sheet} format="A3" />)
    const a3Fly = a3.container.querySelector('.fly') as HTMLElement
    const a3s = Number(a3Fly.style.getPropertyValue('--s'))
    expect(a4s).toBe(1)
    expect(a3s / a4s).toBeCloseTo(1123 / 794)
  })
})
