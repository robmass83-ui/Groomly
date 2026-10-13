// @vitest-environment happy-dom
import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedPriceSheet } from '../../data/seed/priceSheet'
import type { PriceSheet } from '../../types/priceSheet'
import { paperLayoutSignature, PriceSheetPaper } from './PriceSheetPaper'

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

  it('document.fonts.ready fa rifare il fit', async () => {
    let release!: () => void
    const ready = new Promise<void>((resolve) => {
      release = resolve
    })
    const previous = document.fonts
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } })
    const sheet = seedPriceSheet({ name: '', phone: '', address: '' })
    const { container } = render(<PriceSheetPaper sheet={sheet} format="A4" />)
    const fly = container.querySelector('.fly') as HTMLElement
    let refits = 0
    const original = fly.style.setProperty.bind(fly.style)
    fly.style.setProperty = (property: string, value: string, priority?: string) => {
      if (property === '--k') refits += 1
      return original(property, value, priority)
    }
    await act(async () => {
      release()
      await ready
    })
    expect(refits).toBeGreaterThan(0)
    Object.defineProperty(document, 'fonts', { configurable: true, value: previous })
  })

  it('la firma cambia se cambia una voce, a id e updatedAt uguali', () => {
    const sheet = seedPriceSheet({ name: '', phone: '', address: '' })
    const same = paperLayoutSignature(sheet, 'A4')
    expect(paperLayoutSignature(sheet, 'A4')).toBe(same)

    const changed: PriceSheet = {
      ...sheet,
      razze: sheet.razze.map((breed) =>
        breed.id === 'york'
          ? {
              ...breed,
              voci: breed.voci.map((voce, index) =>
                index === 0 ? { ...voce, prezzo: (voce.prezzo ?? 0) + 5 } : voce,
              ),
            }
          : breed,
      ),
    }
    expect(changed.updatedAt).toBe(sheet.updatedAt)
    expect(changed.razze.map((breed) => breed.id)).toEqual(sheet.razze.map((breed) => breed.id))
    expect(paperLayoutSignature(changed, 'A4')).not.toBe(same)
  })
})
