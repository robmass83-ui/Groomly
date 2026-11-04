import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { contatoriAdminPer } from './contatoriAdmin'
import { segnaAvvisoBetaPer } from './segnaAvvisoBeta'
import { impostaMostraPianiPer } from '../config/impostaMostraPiani'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true }
const ADESSO = new Date('2026-11-04T10:00:00.000Z')
const FUTURO = '2026-12-04T10:00:00.000Z'
const giorniFa = (n: number) => new Date(ADESSO.getTime() - n * 86_400_000).toISOString()

describe('contatoriAdminPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('accounts/a', { salonId: 'a', role: 'titolare' })
    archivio.set('accounts/a2', { salonId: 'a', role: 'collaboratore' })
    archivio.set('accounts/b', { salonId: 'b', role: 'titolare' })
    archivio.set('accounts/c', { salonId: 'c', role: 'titolare' })
    archivio.set('accounts/d', { salonId: 'd', role: 'titolare' })
    archivio.set('accounts/laura', { salonId: 'shared', role: 'titolare' })
    archivio.set('salons/a/pro/main', { piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: FUTURO })
    archivio.set('salons/b/pro/main', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null })
    archivio.set('salons/c/pro/main', { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: '2026-10-01T00:00:00.000Z' })
    archivio.set('betaInviti/a', { salonId: 'a', piano: 'pro', giorni: 30, stato: 'accettato', invitatoIl: 'x', scadeInvitoIl: 'x' })
    archivio.set('betaInviti/c', { salonId: 'c', piano: 'pro', giorni: 30, stato: 'invitato', invitatoIl: 'x', scadeInvitoIl: '2026-11-01T00:00:00.000Z' })
    archivio.set('betaInviti/d', { salonId: 'd', piano: 'pro', giorni: 30, stato: 'invitato', invitatoIl: 'x', scadeInvitoIl: FUTURO })
    archivio.set('betaInviti/d/storico/v1', { stato: 'rifiutato' })
    archivio.set('salons/a/interesse/team', { at: 'x' })
    archivio.set('salons/b/interesse/team', { at: 'x' })
    archivio.set('salons/b/interesse/piano-plus', { at: 'x' })
    archivio.set('salon/shared/interesse/team', { at: 'x' })
    archivio.set('salons/shared/interesse/export', { at: 'x' })
    archivio.set('betaFeedback/f1', { salonId: 'a', pagheresti: 'si' })
    archivio.set('betaFeedback/f2', { salonId: 'a', pagheresti: 'forse' })
    archivio.set('betaFeedback/f3', { salonId: 'b', pagheresti: 'si' })
  })

  it('conta saloni, piani, fonti, attività, inviti, Avvisami e feedback, senza shared', async () => {
    const accessi = new Map<string, string | null>([['a', giorniFa(20)], ['a2', giorniFa(1)], ['b', giorniFa(10)], ['c', null], ['laura', giorniFa(0)]])
    const ultimiAccessi = vi.fn(async (uids: string[]) => new Map(uids.map((uid) => [uid, accessi.get(uid) ?? null])))
    const esito = await contatoriAdminPer({ token: ROBERTO, adesso: ADESSO, ultimiAccessi })
    expect(ultimiAccessi.mock.calls[0][0]).not.toContain('laura')
    expect(esito).toEqual({
      saloni: { totali: 4, attivi7: 1, attivi30: 2 },
      perPiano: { base: 2, pro: 1, salone: 0, vip: 1 },
      perFonte: { play: 0, prova: 0, omaggio: 1, manuale: 0, beta: 1, nessuna: 2 },
      inviti: { invitato: 1, accettato: 1, rifiutato: 0, scaduto: 1, revocato: 0 },
      avvisami: { team: 2, 'piano-plus': 1 },
      interesse: { a: ['team'], b: ['team', 'piano-plus'] },
      feedback: { totali: 3, pagheresti: { si: 2, forse: 1, no: 0 } },
      inBeta: 1,
      ultimoAccesso: { a: giorniFa(1), b: giorniFa(10), c: null, d: null },
    })
  })

  it('solo operatori', async () => {
    await expect(contatoriAdminPer({ token: { operatorEmail: 'x@y.it', emailVerified: true }, ultimiAccessi: async () => new Map() }))
      .rejects.toThrow('Accesso negato')
  })
})

describe('impostaMostraPianiPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('config/globale', { mostraPiani: false, abbonamentiAttivi: false, piani: { provaSelfService: false } })
  })

  it('scrive solo mostraPiani', async () => {
    expect(await impostaMostraPianiPer({ token: ROBERTO, valore: true })).toEqual({ ok: true })
    expect(archivio.get('config/globale')).toEqual({ mostraPiani: true, abbonamentiAttivi: false, piani: { provaSelfService: false } })
  })

  it('rifiuta valori non booleani e chi non è operatore', async () => {
    await expect(impostaMostraPianiPer({ token: ROBERTO, valore: 'si' })).rejects.toThrow('Impostazione non valida')
    await expect(impostaMostraPianiPer({ token: { operatorEmail: 'x@y.it', emailVerified: true }, valore: true })).rejects.toThrow('Accesso negato')
    expect(archivio.get('config/globale')).toMatchObject({ mostraPiani: false })
  })
})

describe('segnaAvvisoBetaPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('accounts/s1', { salonId: 's1', role: 'titolare' })
    archivio.set('accounts/socio', { salonId: 's1', role: 'socio' })
  })

  it('segna letto l’avviso del titolare; senza avviso non scrive', async () => {
    expect(await segnaAvvisoBetaPer('s1')).toEqual({ ok: true })
    expect(archivio.has('salons/s1/avvisi/beta')).toBe(false)
    archivio.set('salons/s1/avvisi/beta', { tipo: 'invito', letto: false })
    await segnaAvvisoBetaPer('s1')
    expect(archivio.get('salons/s1/avvisi/beta')).toEqual({ tipo: 'invito', letto: true })
    await expect(segnaAvvisoBetaPer('socio')).rejects.toThrow('Accesso negato')
  })
})
