import { describe, expect, it } from 'vitest'
import { statoPiano } from './piano'
import {
  decisioneVip,
  eVip,
  funzioneAccesa,
  funzioneVisibile,
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

  it('il WhatsApp manuale è nel base e una funzione Pro si accende solo se il piano o l’operatore la concede', () => {
    const base = statoPiano(undefined, adesso)
    const salone = statoPiano(vip, adesso)
    expect(funzioneAccesa('base', undefined, 'messaggi', adesso)).toBe(true)
    expect(funzioneAccesa('base', { messaggi: false }, 'messaggi', adesso)).toBe(false)
    expect(funzioneAccesa('base', undefined, 'prenotazioni', adesso)).toBe(false)
    expect(funzioneAccesa('base', { prenotazioni: true }, 'prenotazioni', adesso)).toBe(true)
    expect(funzioneAccesa('vip', { fedelta: false }, 'fedelta', adesso)).toBe(false)
    expect(funzioneVisibile(salone, undefined, 'team')).toBe(true)
    expect(funzioneVisibile(base, undefined, 'team')).toBe(false)
    expect(strumentoVisibile('messaggi', undefined, undefined)).toBe(true)
    expect(strumentoVisibile('messaggi', { strumenti: { messaggi: false } }, undefined)).toBe(false)
    expect(strumentoVisibile('affidabilita', undefined, { affidabilita: true })).toBe(true)
    expect(strumentoVisibile('noteVocali', { strumenti: { noteVocali: true } }, { noteVocali: false })).toBe(false)
    expect(funzioneAccesa('base', undefined, 'whatsappAuto', adesso)).toBe(false)
  })
})