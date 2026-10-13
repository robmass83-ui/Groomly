import { describe, expect, it } from 'vitest'
import { seedPriceSheet } from '../data/seed/priceSheet'
import type { Breed } from '../types/priceSheet'
import {
  applyBulk,
  breedsBySize,
  commitDraft,
  duplicateBreed,
  fitColumnScale,
  fitTitleScale,
  formatPriceApp,
  formatPricePaper,
  iconForName,
  moveBreed,
  moveSection,
  paginate,
  removeBreed,
  toggleSection,
  upsertBreed,
} from './priceSheet'

const sheet = seedPriceSheet({ name: '', phone: '', address: '' })

describe('formatPriceApp', () => {
  it('scrive da, fisso, decimali e valutazione', () => {
    expect(formatPriceApp({ tipo: 'da', prezzo: 25 })).toBe('da 25 €')
    expect(formatPriceApp({ tipo: 'fisso', prezzo: 25 })).toBe('25 €')
    expect(formatPriceApp({ tipo: 'da', prezzo: 27.5 })).toBe('da 27,50 €')
    expect(formatPriceApp({ tipo: 'valutazione' })).toBe('su valutazione')
  })
})

describe('formatPricePaper', () => {
  it('separa lead e importo, o testo su valutazione', () => {
    expect(formatPricePaper({ tipo: 'da', prezzo: 25 }, true)).toEqual({ lead: 'a partire da ', amount: '25' })
    expect(formatPricePaper({ tipo: 'da', prezzo: 25 }, false)).toEqual({ lead: '', amount: '25' })
    expect(formatPricePaper({ tipo: 'fisso', prezzo: 4 }, true)).toEqual({ lead: '', amount: '4' })
    expect(formatPricePaper({ tipo: 'valutazione' }, true)).toEqual({ text: 'su valutazione' })
  })
})

describe('breedsBySize', () => {
  it('restituisce le 7 piccole nell’ordine del seed', () => {
    const piccola = breedsBySize(sheet, 'piccola')
    expect(piccola[0]?.nome).toBe('Yorkshire')
    expect(piccola).toHaveLength(7)
    expect(piccola.map((breed) => breed.nome)).toEqual([
      'Yorkshire',
      'Maltese / Shih Tzu / Barboncino / Maltipoo',
      'Jack Russell',
      'Chihuahua / Pinscher',
      'Volpino / Pomerania',
      'Bassotto pelo corto',
      'Bassotto pelo lungo',
    ])
  })
})

describe('applyBulk', () => {
  it('alza del 10% il bagno Yorkshire a 28 e non tocca il foglio né la valutazione', () => {
    const before = structuredClone(sheet)
    const draft = applyBulk(sheet, 'piccola', 'p10')
    expect(draft['york:york-bagno']).toBe(28)
    expect(draft['chihuahua:chihuahua-bt']).toBeUndefined()
    expect(sheet).toEqual(before)
    expect(sheet.razze.find((breed) => breed.id === 'york')?.voci.find((item) => item.id === 'york-bagno')?.prezzo).toBe(25)
  })

  it('riparte dalla bozza: 28 × 1,10 → 31', () => {
    expect(applyBulk(sheet, 'piccola', 'p10', { 'york:york-bagno': 28 })['york:york-bagno']).toBe(31)
  })

  it('con e-1 un prezzo 0 resta 0', () => {
    const zeroSheet = structuredClone(sheet)
    const york = zeroSheet.razze.find((breed) => breed.id === 'york')
    const bagno = york?.voci.find((item) => item.id === 'york-bagno')
    if (bagno) bagno.prezzo = 0
    const draft = applyBulk(zeroSheet, 'piccola', 'e-1')
    expect(draft['york:york-bagno'] ?? 0).toBe(0)
  })

  it('sull’extra alza unghie e sotto-voce shampoo', () => {
    const draft = applyBulk(sheet, 'extra', 'e+1')
    expect(draft['extra-unghie:extra-unghie']).toBe(6)
    expect(draft['extra-shampoo:extra-shampoo-mini']).toBe(4)
    expect(draft['bagnoTosatura:bt-piccola']).toBe(36)
    expect(draft['bagnoTosatura:bt-media']).toBe(51)
    expect(draft['bagnoTosatura:bt-grande']).toBe(56)
  })
})

describe('commitDraft', () => {
  it('scrive 28 sul bagno Yorkshire e usa il now passato', () => {
    const now = '2026-10-13T10:00:00.000Z'
    const next = commitDraft(sheet, { 'york:york-bagno': 28 }, now)
    expect(next.razze.find((breed) => breed.id === 'york')?.voci.find((item) => item.id === 'york-bagno')?.prezzo).toBe(28)
    expect(next.updatedAt).toBe(now)
  })
})

describe('upsertBreed', () => {
  const nova: Breed = {
    id: 'nova',
    taglia: 'piccola',
    nome: 'Nova',
    voci: [{ id: 'nova-bagno', nome: 'Bagno', iconKey: 'bagno', tipo: 'da', prezzo: 10 }],
  }

  it('aggiunge una razza nuova in coda alla sua taglia', () => {
    const next = upsertBreed(sheet, nova)
    const ids = next.razze.map((breed) => breed.id)
    expect(ids.indexOf('nova')).toBe(ids.indexOf('bassotto-lungo') + 1)
    expect(ids.indexOf('cocker')).toBe(ids.indexOf('nova') + 1)
    expect(breedsBySize(next, 'piccola')).toHaveLength(8)
  })

  it('con lo stesso id sostituisce', () => {
    const next = upsertBreed(sheet, { ...sheet.razze[0]!, nome: 'Yorkie' })
    expect(next.razze.find((breed) => breed.id === 'york')?.nome).toBe('Yorkie')
    expect(next.razze.filter((breed) => breed.id === 'york')).toHaveLength(1)
  })
})

describe('removeBreed', () => {
  it('toglie Yorkshire', () => {
    const next = removeBreed(sheet, 'york')
    expect(next.razze.find((breed) => breed.id === 'york')).toBeUndefined()
    expect(next.razze.map((breed) => breed.nome)).not.toContain('Yorkshire')
  })
})

describe('duplicateBreed', () => {
  it('inserisce Yorkshire (copia) subito dopo, con id nuovi', () => {
    let n = 0
    const newId = () => {
      const id = n === 0 ? 'york-copy' : `york-copy-${n}`
      n += 1
      return id
    }
    const next = duplicateBreed(sheet, 'york', newId)
    const index = next.razze.findIndex((breed) => breed.id === 'york')
    const copy = next.razze[index + 1]
    expect(copy?.nome).toBe('Yorkshire (copia)')
    expect(copy?.id).toBe('york-copy')
    const ids = [copy!.id, ...copy!.voci.map((item) => item.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toEqual(expect.arrayContaining(['york', 'york-bagno', 'york-bt', 'york-bs']))
    for (const id of ids) {
      expect(['york', 'york-bagno', 'york-bt', 'york-bs']).not.toContain(id)
    }
  })
})

describe('moveBreed', () => {
  it('Jack Russell sale di uno e resta piccola', () => {
    const next = moveBreed(sheet, 'jack', -1)
    expect(breedsBySize(next, 'piccola').map((breed) => breed.id)).toEqual([
      'york',
      'jack',
      'maltese',
      'chihuahua',
      'volpino',
      'bassotto-corto',
      'bassotto-lungo',
    ])
    expect(next.razze.find((breed) => breed.id === 'jack')?.taglia).toBe('piccola')
  })
})

describe('moveSection', () => {
  it('non esce dai bordi e scambia le prime due', () => {
    expect(moveSection(sheet, 0, -1).sezioni.map((section) => section.id)).toEqual(
      sheet.sezioni.map((section) => section.id),
    )
    expect(moveSection(sheet, 0, 1).sezioni.map((section) => section.id)).toEqual([
      'media',
      'piccola',
      'grande',
      'bagnoTosatura',
      'extra',
      'info',
      'avviso',
      'compresi',
      'saluto',
    ])
  })
})

describe('toggleSection', () => {
  it('nasconde extra e lascia le altre visibili', () => {
    const sezioni = toggleSection(sheet, 'extra').sezioni
    expect(sezioni.find((section) => section.id === 'extra')?.visibile).toBe(false)
    expect(sezioni.filter((section) => section.id !== 'extra').every((section) => section.visibile)).toBe(true)
  })
})

describe('iconForName', () => {
  it('sceglie sistemazione prima di bagno+taglio, poi fallback bagno', () => {
    expect(iconForName('Bagno + sistemazione pelo')).toBe('bagno_sistemazione')
    expect(iconForName('Bagno + tosatura')).toBe('bagno_taglio')
    expect(iconForName('Qualcosa')).toBe('bagno')
  })
})

describe('paginate', () => {
  it('taglia al primo che non entra, o 1 se il primo è troppo alto', () => {
    expect(paginate([10, 10, 10], 25)).toBe(2)
    expect(paginate([10, 10], 25)).toBe(2)
    expect(paginate([40], 10)).toBe(1)
    expect(paginate([], 10)).toBe(0)
  })
})

describe('fitColumnScale', () => {
  it('scende di 0,02 da 1,12 fino a 0,62', () => {
    expect(fitColumnScale(() => false)).toEqual({ k: 1.12, ok: true })
    expect(fitColumnScale((k) => k > 0.74)).toEqual({ k: 0.74, ok: true })
    expect(fitColumnScale(() => true)).toEqual({ k: 0.62, ok: false })
  })
})

describe('fitTitleScale', () => {
  it('scende di 0,04 da 1 fino a 0,5', () => {
    expect(fitTitleScale(() => false)).toBe(1)
    expect(fitTitleScale(() => true)).toBe(0.5)
  })
})
