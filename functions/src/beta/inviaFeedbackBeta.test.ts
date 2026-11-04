import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { inviaFeedbackBetaPer } from './inviaFeedbackBeta'

const ADESSO = new Date('2026-11-04T10:00:00.000Z')
const BUONO = {
  voto: 4, funzioni: { prenotazioni: 'utile', fedelta: 'non-usata' }, nonVa: '  lento  ', manca: '', pagheresti: 'si', quanto: '5-10',
  ricontatto: true, fineBeta: false, versioneApp: '1.2.3',
}

function feedback(dati: unknown, uid = 's1', adesso = ADESSO, posta = vi.fn(async () => undefined)) {
  return inviaFeedbackBetaPer({ uid, dati, adesso, apiKey: 'k', posta })
}

function salvati() {
  return [...archivio.entries()].filter(([k]) => k.startsWith('betaFeedback/')).map(([, v]) => v)
}

describe('inviaFeedbackBetaPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('accounts/s1', { salonId: 's1', role: 'titolare', email: 'anna@example.it' })
    archivio.set('accounts/socio', { salonId: 's1', role: 'socio' })
    archivio.set('accounts/collab', { salonId: 's1', role: 'collaboratore' })
    archivio.set('salons/s1/pro/main', { piano: 'base', stato: 'scaduto', fonte: null, exBeta: true, betaPiano: 'salone' })
  })

  it('salva il feedback del titolare con i campi dal server e scrive a Roberto', async () => {
    const posta = vi.fn(async () => undefined)
    expect(await feedback(BUONO, 's1', ADESSO, posta)).toEqual({ ok: true })
    expect(salvati()).toEqual([{
      salonId: 's1', uid: 's1', piano: 'salone', voto: 4, funzioni: { prenotazioni: 'utile', fedelta: 'non-usata' },
      nonVa: 'lento', manca: '', pagheresti: 'si', quanto: '5-10', ricontatto: true, fineBeta: false, versioneApp: '1.2.3',
      creatoIl: ADESSO.toISOString(),
    }])
    expect(posta).toHaveBeenCalledTimes(1)
    expect(posta.mock.calls[0][1]).toBe('info@groomlyapp.it')
  })

  it('anche il socio; il collaboratore no; chi non ha fatto la beta no', async () => {
    await feedback(BUONO, 'socio')
    expect(salvati()[0]).toMatchObject({ uid: 'socio', salonId: 's1' })
    await expect(feedback(BUONO, 'collab')).rejects.toThrow('Accesso negato')
    archivio.set('salons/s1/pro/main', { piano: 'pro', stato: 'prova', fonte: 'prova' })
    await expect(feedback(BUONO)).rejects.toThrow('Il feedback è per chi ha provato la beta')
    archivio.set('accounts/shared', { salonId: 'shared', role: 'titolare' })
    await expect(feedback(BUONO, 'shared')).rejects.toThrow('Accesso negato')
  })

  it('con «no» la fascia diventa null; con «forse» può mancare', async () => {
    await feedback({ ...BUONO, pagheresti: 'no', quanto: 'piu-20' })
    await feedback({ ...BUONO, pagheresti: 'forse', quanto: null })
    expect(salvati().map((f) => f.quanto)).toEqual([null, null])
  })

  it('rifiuta i dati non validi senza salvare', async () => {
    for (const over of [
      { voto: 0 }, { voto: 6 }, { voto: 2.5 }, { funzioni: { boh: 'utile' } }, { funzioni: { prenotazioni: 'bella' } }, { funzioni: [] },
      { nonVa: 'x'.repeat(1001) }, { manca: 3 }, { pagheresti: 'magari' }, { quanto: '100' }, { ricontatto: 'si' },
      { fineBeta: undefined }, { versioneApp: 'x'.repeat(41) },
    ]) {
      await expect(feedback({ ...BUONO, ...over })).rejects.toThrow('Feedback non valido')
    }
    await expect(feedback(null)).rejects.toThrow('Feedback non valido')
    expect(salvati()).toHaveLength(0)
  })

  it('massimo 5 al giorno per salone, il giorno dopo si riparte', async () => {
    for (let i = 0; i < 5; i += 1) await feedback(BUONO, i % 2 ? 'socio' : 's1')
    await expect(feedback(BUONO)).rejects.toThrow('Hai già mandato 5 feedback oggi')
    expect(salvati()).toHaveLength(5)
    await feedback(BUONO, 's1', new Date('2026-11-05T10:00:00.000Z'))
    expect(salvati()).toHaveLength(6)
    expect(archivio.get('betaFeedbackLimiti/s1')).toEqual({ giorno: '2026-11-05', n: 1 })
  })
})
