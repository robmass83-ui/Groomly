import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { schedaSaloneAdminPer } from './schedaSaloneAdmin'

const ADESSO = new Date('2026-11-05T10:00:00.000Z')
const ADMIN = { admin: true }
const fa = (giorni: number) => ADESSO.getTime() - giorni * 86_400_000

describe('schedaSaloneAdminPer', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('salons/s1/dogs/d1', { name: 'Fido', contact: { name: 'Mario', phone: '333' } })
    archivio.set('salons/s1/dogs/d2', { name: 'Rex' })
    archivio.set('salons/s1/appointments/a1', { start: fa(1), dogId: 'd1' })
    archivio.set('salons/s1/appointments/a2', { start: fa(40), dogId: 'd1' })
    archivio.set('salons/s1/appointments/a3', { start: fa(-3), dogId: 'd2' })
    archivio.set('salons/s1/members/m1', { status: 'attivo' })
    archivio.set('salons/s1/members/m2', { status: 'uscito' })
    archivio.set('accounts/t', { salonId: 's1', role: 'titolare', lingua: 'de', email: 'privata@a.it' })
    archivio.set('accounts/c', { salonId: 's1', role: 'collaboratore', lingua: 'it' })
    archivio.set('accounts/t/devices/x', { appVersion: '1.1.99' })
    archivio.set('accounts/c/devices/y', { appVersion: '1.1.100' })
  })

  it('senza claim nega', async () => {
    await expect(schedaSaloneAdminPer({ token: { admin: false }, salonId: 's1', adesso: ADESSO })).rejects.toThrow('Accesso negato')
  })

  it('un id non valido è rifiutato', async () => {
    await expect(schedaSaloneAdminPer({ token: ADMIN, salonId: 'a/b', adesso: ADESSO })).rejects.toThrow('Richiesta non valida')
  })

  it('conta cani, appuntamenti, persone attive; la versione più recente è numerica', async () => {
    await expect(schedaSaloneAdminPer({ token: ADMIN, salonId: 's1', adesso: ADESSO })).resolves.toEqual({
      cani: 2,
      appuntamenti: 3,
      appuntamenti30: 1,
      persone: 1,
      versioneApp: '1.1.100',
      lingua: 'de',
    })
  })

  it('risponde solo con i campi aggregati, niente dati dei clienti', async () => {
    const esito = await schedaSaloneAdminPer({ token: ADMIN, salonId: 's1', adesso: ADESSO })
    expect(Object.keys(esito).sort()).toEqual(['appuntamenti', 'appuntamenti30', 'cani', 'lingua', 'persone', 'versioneApp'])
    expect(JSON.stringify(esito)).not.toMatch(/Mario|333|Fido|privata/)
  })

  it('un salone vuoto dà zeri', async () => {
    await expect(schedaSaloneAdminPer({ token: ADMIN, salonId: 'vuoto', adesso: ADESSO })).resolves.toEqual({ cani: 0, appuntamenti: 0, appuntamenti30: 0, persone: 0, versioneApp: null, lingua: null })
  })

  it('non scrive nulla', async () => {
    const prima = JSON.stringify([...archivio])
    await schedaSaloneAdminPer({ token: ADMIN, salonId: 's1', adesso: ADESSO })
    expect(JSON.stringify([...archivio])).toBe(prima)
  })
})
