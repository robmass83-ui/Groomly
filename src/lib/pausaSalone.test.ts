import { describe, expect, it } from 'vitest'
import { leggiPausa, pausaDa, ripresaDa } from './pausaSalone'

const adesso = new Date('2026-11-02T10:00:00Z')
const iso = '2026-11-02T10:00:00.000Z'

describe('pausaSalone', () => {
  it('pausaDa ricorda i valori e spegne prenotazioni e attesa', () => {
    const r = pausaDa({ prenotazioniOnline: true, serviziEmail: { attesa: { modo: 'automatico' } } }, adesso)
    expect(r.pausa).toEqual({ prenotazioniOnline: true, attesa: { modo: 'automatico' }, dal: iso })
    expect(r.settings.updatedAt).toBe(iso)
    expect(r.settings.prenotazioniOnline).toBe(false)
    expect(r.settings.serviziEmail).toEqual({ attesa: { modo: 'spento' } })
  })

  it('pausaDa con impostazioni vuote', () => {
    const r = pausaDa({}, adesso)
    expect(r.pausa.prenotazioniOnline).toBe(false)
    expect(r.pausa.attesa).toBeNull()
  })

  it('ripresaDa rimette i valori se sono ancora spenti', () => {
    const pausa = { prenotazioniOnline: true, attesa: { modo: 'automatico' as const }, dal: iso }
    const settings = { prenotazioniOnline: false, serviziEmail: { attesa: { modo: 'spento' } } }
    expect(ripresaDa(settings, pausa, adesso)).toEqual({ prenotazioniOnline: true, attesa: { modo: 'automatico' }, updatedAt: iso })
  })

  it('ripresaDa non tocca quello che un socio ha già riacceso', () => {
    const pausa = { prenotazioniOnline: true, attesa: { modo: 'automatico' as const }, dal: iso }
    const settings = { prenotazioniOnline: true, serviziEmail: { attesa: { modo: 'manuale' } } }
    expect(ripresaDa(settings, pausa, adesso)).toBeNull()
  })

  it('ripresaDa toglie l’attesa se prima non c’era', () => {
    const pausa = { prenotazioniOnline: false, attesa: null, dal: iso }
    const settings = { prenotazioniOnline: false, serviziEmail: { attesa: { modo: 'spento' } } }
    expect(ripresaDa(settings, pausa, adesso)).toEqual({ attesa: 'togli', updatedAt: iso })
  })

  it('leggiPausa valida il campo', () => {
    expect(leggiPausa(undefined)).toBeNull()
    expect(leggiPausa({ prenotazioniOnline: 'x' })).toBeNull()
    expect(leggiPausa({ prenotazioniOnline: true, attesa: null, dal: iso })).toEqual({ prenotazioniOnline: true, attesa: null, dal: iso })
  })
})
