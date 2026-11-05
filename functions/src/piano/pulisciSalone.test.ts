import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))
vi.mock('firebase-admin/storage', () => ({ getStorage: () => ({ bucket: () => ({ deleteFiles: async () => undefined }) }) }))

import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { pulisciPersona, pulisciRaccolteSalone } from './pulisciSalone'

const db = () => getFirestore() as unknown as Firestore

describe('pulizia di Assistenza e feedback', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('accounts/u1', { salonId: 's1' })
    archivio.set('accounts/u1/avvisi/a1', { titolo: 'Risposta' })
    archivio.set('assistenza/suggerimento_x', { uid: 'u1', salonId: 's1' })
    archivio.set('assistenza/suggerimento_y', { uid: 'u2', salonId: 's1' })
    archivio.set('assistenza/feedback_z', { uid: 'u3', salonId: 's2' })
    archivio.set('betaFeedback/f1', { uid: 'u1', salonId: 's1' })
    archivio.set('betaFeedback/f2', { uid: 'u2', salonId: 's1' })
    archivio.set('betaFeedback/f3', { uid: 'u3', salonId: 's2' })
    archivio.set('comunicazioni/c1', { uids: ['u1', 'u3'] })
    archivio.set('comunicazioni/c2', { uids: ['u3'] })
  })

  it('con la persona vanno avvisi, assistenza, feedback e il suo uid nelle comunicazioni', async () => {
    await pulisciPersona(db(), { uid: 'u1', emails: [] })
    expect(archivio.has('accounts/u1/avvisi/a1')).toBe(false)
    expect(archivio.has('assistenza/suggerimento_x')).toBe(false)
    expect(archivio.has('betaFeedback/f1')).toBe(false)
    expect(archivio.get('comunicazioni/c1')?.uids).toEqual(['u3'])
  })

  it('non tocca le altre persone', async () => {
    await pulisciPersona(db(), { uid: 'u1', emails: [] })
    expect(archivio.has('assistenza/suggerimento_y')).toBe(true)
    expect(archivio.has('betaFeedback/f2')).toBe(true)
    expect(archivio.get('comunicazioni/c2')?.uids).toEqual(['u3'])
  })

  it('col salone vanno assistenza e feedback di tutte le sue persone, solo quelli', async () => {
    await pulisciRaccolteSalone(db(), 's1')
    expect(archivio.has('assistenza/suggerimento_x')).toBe(false)
    expect(archivio.has('assistenza/suggerimento_y')).toBe(false)
    expect(archivio.has('betaFeedback/f1')).toBe(false)
    expect(archivio.has('betaFeedback/f2')).toBe(false)
    expect(archivio.has('assistenza/feedback_z')).toBe(true)
    expect(archivio.has('betaFeedback/f3')).toBe(true)
  })
})
