import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio, authCancellati } = vi.hoisted(() => ({
  archivio: new Map<string, Record<string, unknown>>(),
  authCancellati: [] as string[],
}))

vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUser: async (uid: string) => ({ uid, email: `${uid}@test.it` }),
    deleteUser: async (uid: string) => {
      authCancellati.push(uid)
    },
  }),
}))
vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: () => ({ deleteFiles: async () => undefined }) }),
}))

import { decisioneEliminaSalone, eliminaSalonePer } from './eliminaSalone'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true, chiamante: 'rob', salonChiamante: 'shared' }

describe('eliminazione di una toelettatura dai test', () => {
  it('Roberto o Laura cancellano un salone di prova con i suoi collaboratori', () => {
    const persone = [{ uid: 'prova', emails: ['prova@test.it'] }, { uid: 'collab', emails: ['collab@test.it'] }]
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'prova', persone })).toEqual({ ok: true })
    expect(decisioneEliminaSalone({ ...ROBERTO, operatorEmail: 'laura.masala@tiscali.it', salonId: 'prova', persone })).toEqual({ ok: true })
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'vuoto', persone: [] })).toEqual({ ok: true })
  })

  it('chi non è operatore, o non ha l’email verificata, non cancella nulla', () => {
    expect(decisioneEliminaSalone({ ...ROBERTO, operatorEmail: 'altro@test.it', salonId: 'prova', persone: [] }).ok).toBe(false)
    expect(decisioneEliminaSalone({ ...ROBERTO, emailVerified: false, salonId: 'prova', persone: [] }).ok).toBe(false)
    expect(decisioneEliminaSalone({ ...ROBERTO, operatorEmail: 'altro@test.it', admin: true, salonId: 'prova', persone: [] })).toEqual({ ok: true })
  })

  it('il salone condiviso, un percorso o un id vuoto sono rifiutati', () => {
    for (const salonId of ['', '  ', 'shared', 'a/b']) {
      expect(decisioneEliminaSalone({ ...ROBERTO, salonId, persone: [] })).toEqual({ ok: false, message: 'Accesso negato' })
    }
  })

  it('non tocca mai il salone di Laura, di Roberto o di chi chiama', () => {
    const vieto = { ok: false, message: 'Questa toelettatura non si può eliminare' }
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'l', persone: [{ uid: 'l', emails: ['Laura.Masala@tiscali.it'] }] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'x', persone: [{ uid: 'y', emails: ['altro@test.it', 'masala.roberto@hotmail.it'] }] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'rob', persone: [] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonChiamante: 'mio', salonId: 'mio', persone: [] })).toEqual(vieto)
    expect(decisioneEliminaSalone({ ...ROBERTO, salonId: 'x', persone: [{ uid: 'rob', emails: [] }] })).toEqual(vieto)
  })
})

describe('eliminare un salone con persone che hanno un salone proprio', () => {
  beforeEach(() => {
    archivio.clear()
    authCancellati.length = 0
    archivio.set('accounts/prova', { salonId: 'prova', role: 'titolare', email: 'prova@test.it' })
    archivio.set('salons/prova/settings/main', { business: { salonName: 'Prova' } })
    archivio.set('accounts/collab', { salonId: 'prova', role: 'collaboratore', email: 'collab@test.it' })
    archivio.set('accounts/vuoto', { salonId: 'prova', role: 'collaboratore', email: 'vuoto@test.it' })
    archivio.set('salons/collab/dogs/d1', { nome: 'Fido' })
    archivio.set('salons/collab/pro/main', { pausa: { prenotazioniOnline: true, attesa: null, dal: '2026-01-02T00:00:00.000Z' } })
    archivio.set('salons/vuoto/settings/main', { business: { salonName: 'Vuoto' } })
  })

  const chiama = () => eliminaSalonePer({ operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true, chiamante: 'rob', salonId: 'prova' })

  it('chi ha dei dati resta titolare del proprio salone, in pausa; gli altri si cancellano', async () => {
    await expect(chiama()).resolves.toEqual({ ok: true, persone: 2, riportate: 1 })
    expect(archivio.get('accounts/collab')).toMatchObject({ salonId: 'collab', role: 'titolare', email: 'collab@test.it' })
    expect(archivio.get('salons/collab/pro/main')).toHaveProperty('pausa')
    expect(archivio.has('salons/collab/dogs/d1')).toBe(true)
    expect(authCancellati).not.toContain('collab')
    expect(authCancellati.sort()).toEqual(['prova', 'vuoto'])
    expect(archivio.has('accounts/vuoto')).toBe(false)
    expect(archivio.has('accounts/prova')).toBe(false)
    expect(archivio.has('salons/prova/settings/main')).toBe(false)
  })

  it('anche le sole prenotazioni contano come dati', async () => {
    archivio.delete('salons/collab/dogs/d1')
    archivio.set('salons/collab/appointments/a1', { x: 1 })
    await expect(chiama()).resolves.toMatchObject({ riportate: 1 })
    expect(authCancellati).not.toContain('collab')
  })
})
