import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { estendiBetaPer } from './estendiBeta'
import { revocaBetaPer } from './revocaBeta'
import { segnaEarlyAdopterPer } from './segnaEarlyAdopter'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true }
const ESTRANEO = { operatorEmail: 'x@y.it', emailVerified: true }
const ADESSO = new Date('2026-11-04T10:00:00.000Z')
const FINE = '2026-12-04T10:00:00.000Z'
const TRACCIA = { exBeta: true, betaPiano: 'pro', betaDal: '2026-10-05T10:00:00.000Z', betaFinoAl: FINE, earlyAdopter: true }

function invito(stato: string) {
  archivio.set('betaInviti/s1', {
    salonId: 's1', piano: 'pro', giorni: 60, messaggio: null, stato, invitatoIl: 'x', scadeInvitoIl: '2026-11-18T10:00:00.000Z',
    rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null, invitatoDa: 'r', aggiornatoIl: 'x',
  })
}

function betaInCorso() {
  invito('accettato')
  archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: FINE, enabled: false, ...TRACCIA })
}

beforeEach(() => {
  archivio.clear()
  archivio.set('accounts/s1', { salonId: 's1', role: 'titolare', email: 'anna@example.it', lingua: 'en' })
})

describe('revocaBetaPer', () => {
  const revoca = (over: Record<string, unknown> = {}, posta = vi.fn(async () => undefined)) =>
    revocaBetaPer({ token: ROBERTO, salonId: 's1', adesso: ADESSO, apiKey: 'k', posta, ...over })

  it('solo operatore, mai shared', async () => {
    await expect(revocaBetaPer({ token: ESTRANEO, salonId: 's1' })).rejects.toThrow('Accesso negato')
    await expect(revoca({ salonId: 'shared' })).rejects.toThrow('Accesso negato')
  })

  it('ritira un invito aperto senza toccare il piano', async () => {
    invito('invitato')
    const posta = vi.fn(async () => undefined)
    expect(await revoca({ testo: ' Scusa ' }, posta)).toEqual({ ok: true, emailStato: 'inviata' })
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'revocato', revocatoIl: ADESSO.toISOString(), testoRevoca: 'Scusa' })
    expect(archivio.get('salons/s1/avvisi/beta')).toMatchObject({ tipo: 'invito-ritirato', piano: 'pro', testo: 'Scusa', letto: false })
    expect(archivio.has('salons/s1/pro/main')).toBe(false)
    expect(posta.mock.calls[0][2]).toContain('withdrawn')
  })

  it('chiude una beta in corso: torna a Go e la traccia resta', async () => {
    betaInCorso()
    expect(await revoca({}, vi.fn(async () => { throw new Error('x') }))).toEqual({ ok: true, emailStato: 'non_inviata' })
    expect(archivio.get('salons/s1/pro/main')).toMatchObject({ piano: 'base', stato: 'scaduto', fonte: null, enabled: false, provaUsata: true, ...TRACCIA })
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'revocato', testoRevoca: null })
    expect(archivio.get('salons/s1/avvisi/beta')).toMatchObject({ tipo: 'revoca' })
  })

  it('beta già finita o niente da revocare: errore senza scritture', async () => {
    invito('accettato')
    const chiusa = { piano: 'base', stato: 'scaduto', fonte: null, ...TRACCIA }
    archivio.set('salons/s1/pro/main', chiusa)
    await expect(revoca()).rejects.toThrow('La beta è già finita')
    expect(archivio.get('salons/s1/pro/main')).toEqual(chiusa)
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'accettato' })
    invito('rifiutato')
    await expect(revoca()).rejects.toThrow('Niente da revocare')
    archivio.delete('betaInviti/s1')
    await expect(revoca()).rejects.toThrow('Niente da revocare')
    await expect(revoca({ testo: 'x'.repeat(401) })).rejects.toThrow('Testo troppo lungo')
  })
})

describe('estendiBetaPer', () => {
  const estendi = (giorni: unknown, posta = vi.fn(async () => undefined)) =>
    estendiBetaPer({ token: ROBERTO, salonId: 's1', giorni, adesso: ADESSO, apiKey: 'k', posta })

  it('allunga dalla fine attuale, segna l’estensione e avvisa', async () => {
    betaInCorso()
    const posta = vi.fn(async () => undefined)
    const nuova = '2027-01-03T10:00:00.000Z'
    expect(await estendi(30, posta)).toEqual({ ok: true, scadeIl: nuova })
    expect(archivio.get('salons/s1/pro/main')).toMatchObject({ scadeIl: nuova, betaFinoAl: nuova, fonte: 'beta', betaDal: TRACCIA.betaDal })
    expect(archivio.get('betaInviti/s1')).toMatchObject({ estensioni: [{ il: ADESSO.toISOString(), giorni: 30, scadeIl: nuova }] })
    expect(archivio.get('salons/s1/avvisi/beta')).toMatchObject({ tipo: 'estensione', giorni: 30, scadeIl: nuova, letto: false })
    expect(posta).toHaveBeenCalledTimes(1)
    await estendi(15)
    expect((archivio.get('betaInviti/s1')?.estensioni as unknown[]).length).toBe(2)
  })

  it('non oltre 365 giorni da oggi, giorni validi, solo beta in corso', async () => {
    betaInCorso()
    await expect(estendi(365)).rejects.toThrow('Al massimo 365 giorni da oggi')
    await expect(estendi(0)).rejects.toThrow('Durata non valida')
    await expect(estendi(2.5)).rejects.toThrow('Durata non valida')
    archivio.set('salons/s1/pro/main', { piano: 'base', stato: 'scaduto', fonte: null, ...TRACCIA })
    await expect(estendi(30)).rejects.toThrow('La beta non è in corso')
    invito('invitato')
    await expect(estendi(30)).rejects.toThrow('La beta non è in corso')
    await expect(estendiBetaPer({ token: ESTRANEO, salonId: 's1', giorni: 30 })).rejects.toThrow('Accesso negato')
  })
})

describe('segnaEarlyAdopterPer', () => {
  it('scrive in merge e non tocca il resto', async () => {
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: FINE, ...TRACCIA })
    expect(await segnaEarlyAdopterPer({ token: ROBERTO, salonId: 's1', valore: false })).toEqual({ ok: true })
    expect(archivio.get('salons/s1/pro/main')).toMatchObject({ earlyAdopter: false, fonte: 'beta', exBeta: true })
  })

  it('rifiuta salone mancante, shared, valore non booleano e non operatori', async () => {
    await expect(segnaEarlyAdopterPer({ token: ROBERTO, salonId: 'manca', valore: true })).rejects.toThrow('Salone non trovato')
    await expect(segnaEarlyAdopterPer({ token: ROBERTO, salonId: 'shared', valore: true })).rejects.toThrow('Accesso negato')
    await expect(segnaEarlyAdopterPer({ token: ROBERTO, salonId: 's1', valore: 'si' })).rejects.toThrow('Valore non valido')
    await expect(segnaEarlyAdopterPer({ token: ESTRANEO, salonId: 's1', valore: true })).rejects.toThrow('Accesso negato')
  })
})
