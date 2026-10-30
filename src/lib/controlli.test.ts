import { describe, expect, it } from 'vitest'
import { codaPromozione, compleanniDelMese, dateNonVenuti, etichettaAffidabilita, firmaCollage, inRitardo, messaggioWhatsapp, nonVenutiRecenti } from './affidabilita'
import { puoSuggerirePrezzo } from './prezzoSuggerito'

const adesso = new Date('2026-10-25T12:00:00.000Z')
const giorno = (mesiFa: number) => new Date(adesso.getFullYear(), adesso.getMonth() - mesiFa, adesso.getDate())

describe('controlli manuali', () => {
  it('tre non venuti in sei mesi danno l’etichetta e zero no', () => {
    expect(etichettaAffidabilita([giorno(1), giorno(2), giorno(3)], adesso)).toBe('Spesso non viene')
    expect(etichettaAffidabilita([], adesso)).toBeNull()
    expect(dateNonVenuti([
      { dogId: 'luna', status: 'non_venuto', start: giorno(1) },
      { dogId: 'luna', status: 'programmato', start: giorno(1) },
      { dogId: 'altro', status: 'non_venuto', start: giorno(1) },
    ], 'luna')).toEqual([giorno(1)])
    expect(etichettaAffidabilita([giorno(1), giorno(2)], adesso)).toBeNull()
    expect(nonVenutiRecenti([giorno(1), giorno(2), giorno(8)], adesso)).toBe(2)
  })

  it('WhatsApp è manuale', () => {
    const messaggio = messaggioWhatsapp('Ciao {{nome}}', { nome: 'Ada' }, '3331234567')
    expect(messaggio.canale).toBe('wa_manuale')
    expect(messaggio.stato).toBe('aperto')
    expect(messaggio.url).toContain('wa.me/3331234567')
    expect(messaggio.testo).toBe('Ciao Ada')
  })

  it('ritardo, compleanni, coda, prezzo e firma restano manuali', () => {
    expect(inRitardo(10, 16, false)).toBe(true)
    expect(inRitardo(10, 10, false)).toBe(false)
    expect(compleanniDelMese([{ nome: 'Rex', nascita: '2020-10-02' }, { nome: 'Senza' }], 9)).toEqual(['Rex'])
    const coda = codaPromozione(['Bagno'], 10)
    expect(coda.invioAutomatico).toBe(false)
    expect(coda.testi[0]).toBe('Bagno a meno 10%')
    expect(puoSuggerirePrezzo([
      { taglia: 'media', razza: 'Barboncino' },
      { taglia: 'media', razza: 'Barboncino' },
      { taglia: 'media', razza: 'Barboncino' },
    ])).toBe(true)
    expect(puoSuggerirePrezzo([{ taglia: 'media', razza: 'Barboncino' }, { taglia: 'media', razza: 'Barboncino' }])).toBe(false)
    expect(firmaCollage(true, false)).toBe('Fatto con Groomly')
    expect(firmaCollage(true, true)).toBeNull()
  })
})
