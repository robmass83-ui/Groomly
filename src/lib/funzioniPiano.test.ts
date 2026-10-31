import { describe, expect, it } from 'vitest'
import {
  decisioneVip,
  eVip,
  funzioneAccesa,
  prenotazioniConcesse,
  livelloElenco,
  strumentoVisibile,
} from './funzioniPiano'

const adesso = new Date('2026-10-26T10:00:00.000Z')
const vip = { piano: 'salone' as const, stato: 'attivo' as const, fonte: 'omaggio' as const, scadeIl: null }

describe('piani visibili', () => {
  it('riconosce il VIP e non lo abbassa', () => {
    expect(eVip(vip)).toBe(true)
    expect(eVip({ piano: 'salone', stato: 'attivo', fonte: 'manuale', scadeIl: null })).toBe(false)
    expect(livelloElenco(vip, adesso)).toBe('vip')
    expect(livelloElenco({ piano: 'pro', stato: 'attivo', fonte: 'omaggio' }, adesso)).toBe('pro')
    expect(livelloElenco(undefined, adesso)).toBe('base')
    expect(decisioneVip(vip, 'base')).toEqual({ ok: false, message: 'Il piano VIP resta attivo' })
    expect(decisioneVip(vip, 'salone').ok).toBe(true)
    expect(decisioneVip(undefined, 'base').ok).toBe(true)
  })

  it('il WhatsApp manuale è nel base e la mappa funzioni non decide più l’accesso del salone', () => {
    expect(funzioneAccesa('base', undefined, 'messaggi', adesso)).toBe(true)
    expect(funzioneAccesa('base', { messaggi: false }, 'messaggi', adesso)).toBe(false)
    expect(funzioneAccesa('base', undefined, 'prenotazioni', adesso)).toBe(false)
    expect(funzioneAccesa('base', undefined, 'whatsappAuto', adesso)).toBe(false)
    expect(strumentoVisibile('messaggi', undefined)).toBe(true)
    expect(strumentoVisibile('messaggi', { strumenti: { messaggi: false } })).toBe(false)
    expect(strumentoVisibile('affidabilita', undefined)).toBe(false)
    expect(strumentoVisibile('affidabilita', { strumenti: { affidabilita: true } })).toBe(true)
    expect(prenotazioniConcesse(undefined, adesso)).toBe(false)
    expect(prenotazioniConcesse({ funzioni: { prenotazioni: true } }, adesso)).toBe(false)
    expect(prenotazioniConcesse({ piano: 'pro', stato: 'attivo', fonte: 'omaggio' }, adesso)).toBe(true)
    expect(prenotazioniConcesse({ piano: 'pro', stato: 'attivo', funzioni: { prenotazioni: false } }, adesso)).toBe(true)
  })
})