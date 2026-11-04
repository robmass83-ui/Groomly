import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import { avviaProvaPer } from './avviaProva'

const adesso = new Date('2026-11-04T10:00:00.000Z')
const titolare = { salonId: 's1', role: 'titolare' }

describe('avviaProvaPer e provaSelfService', () => {
  beforeEach(() => {
    archivio.clear()
  })

  it('con la config assente rifiuta e non scrive', async () => {
    await expect(avviaProvaPer('s1', titolare, adesso)).rejects.toThrow('Prova non disponibile')
    expect(archivio.has('salons/s1/pro/main')).toBe(false)
  })

  it('con provaSelfService spenta rifiuta e non scrive', async () => {
    archivio.set('config/globale', { mostraPiani: true, piani: { provaSelfService: false } })
    await expect(avviaProvaPer('s1', titolare, adesso)).rejects.toThrow('Prova non disponibile')
    expect(archivio.has('salons/s1/pro/main')).toBe(false)
  })

  it('con provaSelfService accesa scrive la prova a un Go puro', async () => {
    archivio.set('config/globale', { piani: { provaSelfService: true } })
    await expect(avviaProvaPer('s1', titolare, adesso)).resolves.toEqual({ ok: true })
    expect(archivio.get('salons/s1/pro/main')).toMatchObject({ piano: 'pro', stato: 'prova', fonte: 'prova', provaUsata: true })
  })

  it('anche accesa, un ex beta non ha la prova', async () => {
    archivio.set('config/globale', { piani: { provaSelfService: true } })
    archivio.set('salons/s1/pro/main', { piano: 'base', stato: 'scaduto', fonte: null, exBeta: true })
    await expect(avviaProvaPer('s1', titolare, adesso)).rejects.toThrow('Prova non disponibile')
  })
})
