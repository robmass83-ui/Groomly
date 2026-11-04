import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { invitaBetaPer } from './invitaBeta'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true }
const ADESSO = new Date('2026-11-04T10:00:00.000Z')
const FUTURO = '2026-12-01T00:00:00.000Z'

function salone(id: string, pro?: Record<string, unknown>) {
  archivio.set(`accounts/${id}`, { salonId: id, role: 'titolare', email: `${id}@example.it`, lingua: 'it' })
  if (pro) archivio.set(`salons/${id}/pro/main`, pro)
}

function invita(over: Record<string, unknown> = {}, posta = vi.fn(async () => undefined)) {
  return invitaBetaPer({ token: ROBERTO, adesso: ADESSO, apiKey: 'k', posta, salonIds: ['s1'], piano: 'pro', giorni: 60, ...over })
}

describe('invitaBetaPer', () => {
  beforeEach(() => {
    archivio.clear()
    salone('s1')
  })

  it('chi non è operatore non invita', async () => {
    await expect(invitaBetaPer({ token: { operatorEmail: 'x@y.it', emailVerified: true }, salonIds: ['s1'], piano: 'pro', giorni: 60 }))
      .rejects.toThrow('Accesso negato')
  })

  it('input non valido: errore e nessuna scrittura', async () => {
    for (const over of [
      { salonIds: [] }, { salonIds: Array.from({ length: 51 }, (_, i) => `s${i}`) }, { salonIds: 's1' },
      { giorni: 0 }, { giorni: 366 }, { giorni: 1.5 }, { piano: 'oro' }, { messaggio: 'x'.repeat(501) }, { messaggio: 3 },
    ]) {
      await expect(invita(over)).rejects.toThrow('Invito non valido')
    }
    expect(archivio.has('betaInviti/s1')).toBe(false)
  })

  it('scrive invito, avviso ed email; il messaggio vuoto diventa null', async () => {
    const posta = vi.fn(async () => undefined)
    const esito = await invita({ salonIds: ['s1', 's1'], messaggio: '  Ciao Anna  ' }, posta)
    expect(esito).toEqual({ invitati: ['s1'], saltati: [] })
    expect(archivio.get('betaInviti/s1')).toMatchObject({
      salonId: 's1', piano: 'pro', giorni: 60, messaggio: 'Ciao Anna', stato: 'invitato',
      invitatoIl: ADESSO.toISOString(), scadeInvitoIl: '2026-11-18T10:00:00.000Z',
      rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null,
      invitatoDa: 'masala.roberto@hotmail.it', aggiornatoIl: ADESSO.toISOString(),
    })
    expect(archivio.get('salons/s1/avvisi/beta')).toEqual({
      tipo: 'invito', piano: 'pro', scadeIl: '2026-11-18T10:00:00.000Z', giorni: 60, testo: 'Ciao Anna', at: ADESSO.toISOString(), letto: false,
    })
    expect(posta).toHaveBeenCalledTimes(1)
    expect(posta.mock.calls[0][1]).toBe('s1@example.it')
    await invita({ messaggio: '   ' })
  })

  it('salta shared, non trovati, VIP, già invitati e piani attivi', async () => {
    salone('vip', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null })
    salone('manuale', { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null })
    salone('inbeta', { piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: FUTURO })
    salone('aperto')
    archivio.set('betaInviti/aperto', { salonId: 'aperto', piano: 'pro', giorni: 30, stato: 'invitato', invitatoIl: 'x', scadeInvitoIl: FUTURO })
    archivio.set('accounts/socio', { salonId: 'altro', role: 'socio' })
    const esito = await invita({ salonIds: ['shared', 'manca', 'socio', 'vip', 'aperto', 'inbeta', 'manuale', 's1'] })
    expect(esito.invitati).toEqual(['s1'])
    expect(esito.saltati).toEqual([
      { salonId: 'shared', motivo: 'shared' },
      { salonId: 'manca', motivo: 'non-trovato' },
      { salonId: 'socio', motivo: 'non-trovato' },
      { salonId: 'vip', motivo: 'vip' },
      { salonId: 'aperto', motivo: 'gia-invitato' },
      { salonId: 'inbeta', motivo: 'gia-invitato' },
      { salonId: 'manuale', motivo: 'piano-attivo' },
    ])
    expect(archivio.has('betaInviti/vip')).toBe(false)
  })

  it('invita chi è in prova e chi ha un invito scaduto; il vecchio va nello storico', async () => {
    salone('prova', { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: FUTURO })
    archivio.set('betaInviti/s1', { salonId: 's1', piano: 'pro', giorni: 30, stato: 'rifiutato', invitatoIl: 'vecchio', scadeInvitoIl: 'x' })
    const esito = await invita({ salonIds: ['prova', 's1'], piano: 'salone' })
    expect(esito.invitati).toEqual(['prova', 's1'])
    const storico = [...archivio.keys()].filter((k) => k.startsWith('betaInviti/s1/storico/'))
    expect(storico).toHaveLength(1)
    expect(archivio.get(storico[0])).toMatchObject({ stato: 'rifiutato', invitatoIl: 'vecchio' })
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'invitato', piano: 'salone' })
    expect(archivio.get('salons/prova/pro/main')).toMatchObject({ fonte: 'prova' })
  })

  it('un invito aperto ma scaduto non blocca; un secondo invito subito dopo sì', async () => {
    archivio.set('betaInviti/s1', { salonId: 's1', piano: 'pro', giorni: 30, stato: 'invitato', invitatoIl: 'x', scadeInvitoIl: '2026-11-01T00:00:00.000Z' })
    expect((await invita()).invitati).toEqual(['s1'])
    expect((await invita()).saltati).toEqual([{ salonId: 's1', motivo: 'gia-invitato' }])
  })

  it('un’email fallita non annulla l’invito', async () => {
    const esito = await invita({}, vi.fn(async () => { throw new Error('brevo') }))
    expect(esito.invitati).toEqual(['s1'])
    expect(archivio.get('betaInviti/s1')).toMatchObject({ stato: 'invitato' })
  })
})
