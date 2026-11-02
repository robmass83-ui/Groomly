import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))

vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import * as firestore from 'firebase-admin/firestore'
import { getFirestore, type Firestore, type Transaction } from 'firebase-admin/firestore'
import { leggiPerPausa, riprendiSalone, scriviPausa, scriviRipresa } from './pausaSalone'

const stato = (firestore as unknown as { stato: { scritture: number } }).stato
const adesso = new Date('2026-11-02T10:00:00.000Z')

describe('pausa del salone personale', () => {
  beforeEach(() => {
    archivio.clear()
    stato.scritture = 0
  })

  it('riprendiSalone rimette prenotazioni e lista d’attesa salvate e toglie la pausa', async () => {
    archivio.set('salons/u1/settings/main', {
      business: { salonName: 'Bauci' },
      prenotazioniOnline: false,
      serviziEmail: { attesa: { modo: 'spento' }, promemoria: { modo: 'automatico' } },
    })
    archivio.set('salons/u1/pro/main', {
      enabled: false,
      pausa: { prenotazioniOnline: true, attesa: { modo: 'automatico' }, dal: '2026-10-01T08:00:00.000Z' },
    })
    await riprendiSalone(getFirestore() as unknown as Firestore, 'u1', adesso)
    const settings = archivio.get('salons/u1/settings/main') as Record<string, any>
    expect(settings.prenotazioniOnline).toBe(true)
    expect(settings.serviziEmail.attesa.modo).toBe('automatico')
    expect(settings.serviziEmail.promemoria).toEqual({ modo: 'automatico' })
    expect(typeof settings.updatedAt).toBe('string')
    expect(settings.business).toEqual({ salonName: 'Bauci' })
    const pro = archivio.get('salons/u1/pro/main') as Record<string, unknown>
    expect('pausa' in pro).toBe(false)
    expect(pro.enabled).toBe(false)
  })

  it('riprendiSalone con una lista d’attesa che prima non c’era la toglie', async () => {
    archivio.set('salons/u1/settings/main', { prenotazioniOnline: false, serviziEmail: { attesa: { modo: 'spento' } } })
    archivio.set('salons/u1/pro/main', { pausa: { prenotazioniOnline: false, attesa: null, dal: '2026-10-01T08:00:00.000Z' } })
    await riprendiSalone(getFirestore() as unknown as Firestore, 'u1', adesso)
    const settings = archivio.get('salons/u1/settings/main') as Record<string, any>
    expect(settings.serviziEmail).toEqual({})
    expect(settings.prenotazioniOnline).toBe(false)
    expect('pausa' in (archivio.get('salons/u1/pro/main') as object)).toBe(false)
  })

  it('riprendiSalone senza pausa non cambia nulla', async () => {
    const prima = { prenotazioniOnline: false, serviziEmail: { attesa: { modo: 'spento' } } }
    archivio.set('salons/u1/settings/main', structuredClone(prima))
    archivio.set('salons/u1/pro/main', { enabled: true })
    await riprendiSalone(getFirestore() as unknown as Firestore, 'u1', adesso)
    expect(archivio.get('salons/u1/settings/main')).toEqual(prima)
    expect(archivio.get('salons/u1/pro/main')).toEqual({ enabled: true })
    expect(stato.scritture).toBe(0)
  })

  it('scriviPausa con una pausa già salvata non scrive nulla', async () => {
    archivio.set('salons/u1/settings/main', { prenotazioniOnline: false, serviziEmail: { attesa: { modo: 'spento' } } })
    archivio.set('salons/u1/pro/main', { pausa: { prenotazioniOnline: true, attesa: { modo: 'manuale' }, dal: '2026-10-01T08:00:00.000Z' } })
    const db = getFirestore() as unknown as Firestore
    await db.runTransaction(async (tx: Transaction) => {
      const letto = await leggiPerPausa(tx, db, 'u1')
      expect(letto.pausa).toEqual({ prenotazioniOnline: true, attesa: { modo: 'manuale' }, dal: '2026-10-01T08:00:00.000Z' })
      scriviPausa(tx, db, 'u1', letto, adesso)
    })
    expect(stato.scritture).toBe(0)
    expect((archivio.get('salons/u1/pro/main') as Record<string, any>).pausa.attesa).toEqual({ modo: 'manuale' })
  })

  it('scriviPausa ricorda le scelte e spegne prenotazioni e lista d’attesa', async () => {
    archivio.set('salons/u1/settings/main', {
      prenotazioniOnline: true,
      serviziEmail: { attesa: { modo: 'automatico' }, auguri: { modo: 'automatico', ora: '09:00' } },
    })
    const db = getFirestore() as unknown as Firestore
    await db.runTransaction(async (tx: Transaction) => {
      scriviPausa(tx, db, 'u1', await leggiPerPausa(tx, db, 'u1'), adesso)
    })
    const settings = archivio.get('salons/u1/settings/main') as Record<string, any>
    expect(settings.prenotazioniOnline).toBe(false)
    expect(settings.serviziEmail.attesa).toEqual({ modo: 'spento' })
    expect(settings.serviziEmail.auguri).toEqual({ modo: 'automatico', ora: '09:00' })
    expect(settings.updatedAt).toBe(adesso.toISOString())
    expect((archivio.get('salons/u1/pro/main') as Record<string, unknown>).pausa).toEqual({
      prenotazioniOnline: true,
      attesa: { modo: 'automatico' },
      dal: adesso.toISOString(),
    })
  })

  it('scriviRipresa senza pausa non scrive', async () => {
    archivio.set('salons/u1/settings/main', { prenotazioniOnline: false })
    const db = getFirestore() as unknown as Firestore
    await db.runTransaction(async (tx: Transaction) => {
      scriviRipresa(tx, db, 'u1', await leggiPerPausa(tx, db, 'u1'), adesso)
    })
    expect(stato.scritture).toBe(0)
  })
})
