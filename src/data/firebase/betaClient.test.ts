import { beforeEach, describe, expect, it, vi } from 'vitest'

const chiamata = vi.fn(async (_data: unknown): Promise<unknown> => ({ data: { ok: true, scadeIl: '2026-12-04T10:00:00.000Z' } }))
const nomi: string[] = []
let ascolto: { path: string[]; dati: (snap: unknown) => void; errore: () => void } | null = null

vi.mock('firebase/app', () => ({ getApps: () => [{}], initializeApp: () => ({}), getApp: () => ({}) }))
vi.mock('../../lib/appCheck', () => ({ preparaAppCheck: vi.fn(async () => undefined) }))
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }))
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_f: unknown, nome: string) => { nomi.push(nome); return chiamata },
}))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}),
  getFirestore: () => ({}),
  persistentLocalCache: () => ({}),
  persistentMultipleTabManager: () => ({}),
  doc: (_db: unknown, ...path: string[]) => ({ path }),
  onSnapshot: (ref: { path: string[] }, dati: (snap: unknown) => void, errore: () => void) => {
    ascolto = { path: ref.path, dati, errore }
    return () => { ascolto = null }
  },
}))

import { ErroreBeta, inviaFeedbackBeta, listenInvitoBeta, rispondiInvitoBeta } from './betaClient'

const invito = {
  salonId: 's1', piano: 'pro', giorni: 30, messaggio: 'Ciao', stato: 'invitato',
  invitatoIl: '2026-11-03T10:00:00.000Z', scadeInvitoIl: '2026-11-17T10:00:00.000Z',
  rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null, invitatoDa: 'op@x', aggiornatoIl: '2026-11-03T10:00:00.000Z',
}

describe('betaClient', () => {
  beforeEach(() => { chiamata.mockClear(); nomi.length = 0; ascolto = null })

  it('rispondiInvitoBeta passa la risposta alla callable e restituisce la data di fine', async () => {
    await expect(rispondiInvitoBeta({ accetta: true })).resolves.toEqual({ ok: true, scadeIl: '2026-12-04T10:00:00.000Z' })
    expect(nomi).toEqual(['rispondiInvitoBeta'])
    expect(chiamata).toHaveBeenCalledWith({ accetta: true })
  })

  it('il rifiuto manda motivo e testo', async () => {
    chiamata.mockResolvedValueOnce({ data: { ok: true, scadeIl: null } })
    await expect(rispondiInvitoBeta({ accetta: false, motivo: 'altro', altro: 'Uso già un altro gestionale' })).resolves.toEqual({ ok: true, scadeIl: null })
    expect(chiamata).toHaveBeenCalledWith({ accetta: false, motivo: 'altro', altro: 'Uso già un altro gestionale' })
  })

  it("un failed-precondition arriva con il messaggio del server", async () => {
    chiamata.mockRejectedValueOnce(Object.assign(new Error('Questo invito è scaduto'), { code: 'functions/failed-precondition' }))
    const errore = await rispondiInvitoBeta({ accetta: true }).catch((e: unknown) => e)
    expect(errore).toBeInstanceOf(ErroreBeta)
    expect((errore as ErroreBeta).message).toBe('Questo invito è scaduto')
  })

  it('un errore generico non porta un messaggio da mostrare', async () => {
    chiamata.mockRejectedValueOnce(Object.assign(new Error('internal'), { code: 'functions/internal' }))
    const errore = await inviaFeedbackBeta({ voto: 3, funzioni: {}, nonVa: '', manca: '', pagheresti: 'no', quanto: null, ricontatto: false, fineBeta: false, versioneApp: '1.0.0' }).catch((e: unknown) => e)
    expect((errore as ErroreBeta).message).toBe('')
  })

  it('inviaFeedbackBeta chiama la callable con il feedback', async () => {
    chiamata.mockResolvedValueOnce({ data: { ok: true } })
    const feedback = { voto: 4 as const, funzioni: { export: 'utile' as const }, nonVa: 'x', manca: '', pagheresti: 'si' as const, quanto: '5-10' as const, ricontatto: true, fineBeta: false, versioneApp: '1.2.3' }
    await expect(inviaFeedbackBeta(feedback)).resolves.toEqual({ ok: true })
    expect(nomi).toEqual(['inviaFeedbackBeta'])
    expect(chiamata).toHaveBeenCalledWith(feedback)
  })

  it("listenInvitoBeta legge betaInviti/{salonId} e lo passa letto in modo difensivo", async () => {
    const ricevuti: unknown[] = []
    const stop = await listenInvitoBeta('s1', (dato) => ricevuti.push(dato))
    expect(ascolto?.path).toEqual(['betaInviti', 's1'])
    ascolto?.dati({ exists: () => true, data: () => invito })
    ascolto?.dati({ exists: () => true, data: () => ({ stato: 'boh' }) })
    ascolto?.dati({ exists: () => false, data: () => undefined })
    ascolto?.errore()
    expect(ricevuti).toEqual([expect.objectContaining({ salonId: 's1', stato: 'invitato', messaggio: 'Ciao' }), null, null, null])
    stop()
    expect(ascolto).toBeNull()
  })
})
