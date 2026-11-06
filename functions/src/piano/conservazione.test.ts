import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { pulisciConservazione, richiestaDaCancellare } from './conservazione'

const ADESSO = new Date('2026-11-06T03:30:00.000Z')
const giorniFa = (n: number) => new Date(ADESSO.getTime() - n * 86_400_000).toISOString()
const db = () => getFirestore() as unknown as Firestore

describe('quali richieste si cancellano', () => {
  it('una rifiutata o scaduta oltre 90 giorni sì, entro no', () => {
    expect(richiestaDaCancellare({ status: 'rifiutata', chiusaIl: giorniFa(91) }, ADESSO)).toBe(true)
    expect(richiestaDaCancellare({ status: 'scaduta', chiusaIl: giorniFa(91) }, ADESSO)).toBe(true)
    expect(richiestaDaCancellare({ status: 'rifiutata', chiusaIl: giorniFa(89) }, ADESSO)).toBe(false)
  })

  it('una accettata, nuova, proposta o disdetta resta, anche vecchissima', () => {
    for (const status of ['accettata', 'nuova', 'proposta', 'disdetta', undefined]) {
      expect(richiestaDaCancellare({ status, chiusaIl: giorniFa(900) }, ADESSO)).toBe(false)
    }
  })

  it('senza una data che si legge resta', () => {
    expect(richiestaDaCancellare({ status: 'rifiutata' }, ADESSO)).toBe(false)
    expect(richiestaDaCancellare({ status: 'rifiutata', end: 'non è una data' }, ADESSO)).toBe(false)
  })

  it('una richiesta di prima conta dalla data più recente, per non anticipare', () => {
    expect(richiestaDaCancellare({ status: 'scaduta', consensoIl: giorniFa(200), end: giorniFa(10) }, ADESSO)).toBe(false)
    expect(richiestaDaCancellare({ status: 'scaduta', consensoIl: giorniFa(200), end: giorniFa(100) }, ADESSO)).toBe(true)
  })

  it('chiusaIl vince sulle altre date', () => {
    expect(richiestaDaCancellare({ status: 'rifiutata', chiusaIl: giorniFa(5), end: giorniFa(300) }, ADESSO)).toBe(false)
  })
})

describe('il giro della notte', () => {
  beforeEach(() => archivio.clear())

  it('toglie solo le richieste scadute dai tempi, in ogni salone', async () => {
    archivio.set('salons/s1/richieste/vecchia', { status: 'rifiutata', chiusaIl: giorniFa(91) })
    archivio.set('salons/s1/richieste/recente', { status: 'rifiutata', chiusaIl: giorniFa(89) })
    archivio.set('salons/s1/richieste/accettata', { status: 'accettata', chiusaIl: giorniFa(500) })
    archivio.set('salons/s2/richieste/vecchia', { status: 'scaduta', end: giorniFa(120) })
    expect(await pulisciConservazione(db(), ADESSO)).toMatchObject({ richieste: 2 })
    expect(archivio.has('salons/s1/richieste/vecchia')).toBe(false)
    expect(archivio.has('salons/s2/richieste/vecchia')).toBe(false)
    expect(archivio.has('salons/s1/richieste/recente')).toBe(true)
    expect(archivio.has('salons/s1/richieste/accettata')).toBe(true)
  })

  it('una copia di sicurezza scaduta sparisce con i suoi file', async () => {
    archivio.set('salons/s1/meta/ripristino-sicurezza', { scadeIl: giorniFa(1), presenti: ['f1'] })
    archivio.set('salons/s1/sicurezza/f1', { name: 'foto' })
    archivio.set('salons/s1/sicurezza/f1/chunks/0', { dati: 'x' })
    expect(await pulisciConservazione(db(), ADESSO)).toMatchObject({ copie: 1 })
    expect(archivio.has('salons/s1/meta/ripristino-sicurezza')).toBe(false)
    expect(archivio.has('salons/s1/sicurezza/f1')).toBe(false)
    expect(archivio.has('salons/s1/sicurezza/f1/chunks/0')).toBe(false)
  })

  it('una copia ancora valida resta', async () => {
    archivio.set('salons/s1/meta/ripristino-sicurezza', { scadeIl: giorniFa(-3) })
    await pulisciConservazione(db(), ADESSO)
    expect(archivio.has('salons/s1/meta/ripristino-sicurezza')).toBe(true)
  })

  it('una copia di prima, senza data, resta e riceve 30 giorni da adesso', async () => {
    archivio.set('salons/s1/meta/ripristino-sicurezza', { presenti: [] })
    await pulisciConservazione(db(), ADESSO)
    expect(archivio.get('salons/s1/meta/ripristino-sicurezza')?.scadeIl).toBe(giorniFa(-30))
  })
})
