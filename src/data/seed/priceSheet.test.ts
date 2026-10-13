import { describe, expect, it } from 'vitest'
import { seedPriceSheet } from './priceSheet'

describe('seedPriceSheet', () => {
  const sheet = seedPriceSheet({ name: '', phone: '', address: '' })

  it('ha 28 righe: 7 piccola, 11 media, 10 grande', () => {
    expect(sheet.razze).toHaveLength(28)
    expect(sheet.razze.filter((breed) => breed.taglia === 'piccola')).toHaveLength(7)
    expect(sheet.razze.filter((breed) => breed.taglia === 'media')).toHaveLength(11)
    expect(sheet.razze.filter((breed) => breed.taglia === 'grande')).toHaveLength(10)
    expect(sheet.razze.map((breed) => breed.nome)).toContain('Yorkshire')
    expect(sheet.razze.map((breed) => breed.nome)).toContain('Maltese / Shih Tzu / Barboncino / Maltipoo')
    expect(sheet.razze.map((breed) => breed.nome)).toContain('Fonnese')
  })

  it('Chihuahua ha 4 voci e la tosatura è su valutazione, senza prezzo', () => {
    const row = sheet.razze.find((breed) => breed.nome === 'Chihuahua / Pinscher')
    expect(row?.voci.map((item) => item.nome)).toEqual(['Pelo corto', 'Pelo lungo', 'Bagno + sistemazione', 'Bagno + tosatura'])
    expect(row?.voci[0]).toMatchObject({ prezzo: 18, iconKey: 'pelo_corto', tipo: 'da' })
    expect(row?.voci[3]).toMatchObject({ tipo: 'valutazione', iconKey: 'bagno_taglio' })
    expect(row?.voci[3]?.prezzo).toBeUndefined()
  })

  it('riempie intestazione e testi del cartaceo quando l’attività è vuota', () => {
    expect(sheet.intestazione).toMatchObject({
      titolo: 'TOELETTATURA',
      sottotitolo: 'LISTINO',
      nome: 'I Pelosetti',
      descrizione: 'Servizio di toelettatura',
      indirizzo: 'corso Vitt. Emanuele 4/c',
      telefono: '349 0989700',
      colore: '#B8285E',
    })
    expect(sheet.noteTaglia.grande).toContain('Tosatura a partire da 55')
    expect(sheet.bagnoTosatura.voci.map((item) => item.prezzo)).toEqual([35, 50, 55])
    expect(sheet.extra.voci[1]?.sotto.map((item) => item.prezzo)).toEqual([3, 4, 5])
    expect(sheet.compresi.voci.map((item) => item.testo)).toEqual(['Taglio unghie', 'Pulizia orecchie', 'Pulizia occhi'])
    expect(sheet.saluto).toBe('Grazie per la fiducia!')
    expect(sheet.sezioni.map((section) => section.id)).toEqual([
      'piccola', 'media', 'grande', 'bagnoTosatura', 'extra', 'info', 'avviso', 'compresi', 'saluto',
    ])
    expect(sheet.sezioni.every((section) => section.visibile)).toBe(true)
    expect(sheet.version).toBe(1)
  })

  it('preferisce nome, indirizzo e telefono dell’attività', () => {
    const named = seedPriceSheet({ name: 'Daisy', phone: '333', address: 'via Roma 1' })
    expect(named.intestazione).toMatchObject({ nome: 'Daisy', telefono: '333', indirizzo: 'via Roma 1' })
  })
})
