import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio, errore } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>(), errore: vi.fn() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))
vi.mock('firebase-functions/logger', () => ({ error: errore, warn: vi.fn(), info: vi.fn(), log: vi.fn(), debug: vi.fn() }))

import { getFirestore } from 'firebase-admin/firestore'
import { chiudiProveScadute } from './chiudiProve'

const adesso = new Date('2026-11-02T10:00:00.000Z')
const passata = '2026-11-01T10:00:00.000Z'
const futura = '2026-12-01T10:00:00.000Z'

type Transazione = (corpo: (tx: unknown) => Promise<unknown>) => Promise<unknown>

describe('chiudiProveScadute', () => {
  beforeEach(() => {
    archivio.clear()
    errore.mockClear()
    vi.restoreAllMocks()
    archivio.set('salons/a/pro/main', { piano: 'salone', stato: 'grazia', fonte: 'play', scadeIl: passata, enabled: true })
    archivio.set('salons/b/pro/main', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null, enabled: true })
    archivio.set('salons/c/pro/main', { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: passata, enabled: false })
  })

  it('chiude ogni piano scaduto e lascia stare chi non ha data', async () => {
    expect(await chiudiProveScadute(adesso)).toBe(2)
    expect(archivio.get('salons/a/pro/main')).toMatchObject({
      piano: 'base', stato: 'scaduto', enabled: false, updatedAt: adesso.toISOString(),
    })
    expect(archivio.get('salons/c/pro/main')).toMatchObject({ piano: 'base', stato: 'scaduto' })
    expect(archivio.get('salons/b/pro/main')).toMatchObject({ piano: 'salone', stato: 'attivo', enabled: true })
    expect(errore).not.toHaveBeenCalled()
  })

  it('rilegge il documento nella transazione: un piano rinnovato dopo la lettura non si chiude', async () => {
    const db = getFirestore() as unknown as { runTransaction: Transazione }
    const vera = db.runTransaction.bind(db)
    vi.spyOn(db, 'runTransaction').mockImplementationOnce(async (corpo) => {
      // Tra la lettura oraria e la transazione Play rinnova il Salone di «a».
      archivio.set('salons/a/pro/main', { piano: 'salone', stato: 'attivo', fonte: 'play', scadeIl: futura, enabled: true })
      return vera(corpo)
    })
    expect(await chiudiProveScadute(adesso)).toBe(1)
    expect(archivio.get('salons/a/pro/main')).toEqual({ piano: 'salone', stato: 'attivo', fonte: 'play', scadeIl: futura, enabled: true })
    expect(archivio.get('salons/c/pro/main')).toMatchObject({ piano: 'base', stato: 'scaduto' })
  })

  it('un errore su un documento si registra e gli altri si chiudono lo stesso', async () => {
    const db = getFirestore() as unknown as { runTransaction: Transazione }
    vi.spyOn(db, 'runTransaction').mockImplementationOnce(async () => { throw new Error('ABORTED') })
    expect(await chiudiProveScadute(adesso)).toBe(1)
    expect(archivio.get('salons/a/pro/main')).toMatchObject({ piano: 'salone', stato: 'grazia', enabled: true })
    expect(archivio.get('salons/c/pro/main')).toMatchObject({ piano: 'base', stato: 'scaduto' })
    expect(errore).toHaveBeenCalledWith('Piano scaduto non chiuso', expect.objectContaining({ path: 'salons/a/pro/main' }))
  })

  it('chiude una beta scaduta e lascia la traccia', async () => {
    archivio.clear()
    archivio.set('salons/d/pro/main', {
      piano: 'salone', stato: 'attivo', fonte: 'beta', scadeIl: passata, enabled: true,
      exBeta: true, betaPiano: 'salone', betaDal: '2026-10-02T10:00:00.000Z', betaFinoAl: passata, earlyAdopter: true,
    })
    expect(await chiudiProveScadute(adesso)).toBe(1)
    expect(archivio.get('salons/d/pro/main')).toMatchObject({
      piano: 'base', stato: 'scaduto', fonte: null, enabled: false,
      exBeta: true, betaPiano: 'salone', betaFinoAl: passata, earlyAdopter: true,
    })
  })
})
