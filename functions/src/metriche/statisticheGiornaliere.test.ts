import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { calcolaStatistiche, pulisciRegistroAdmin, salvaStatistiche } from './statisticheGiornaliere'

const ADESSO = new Date('2026-11-05T02:30:00.000Z')
const IERI = new Date('2026-11-04T10:00:00.000Z').getTime()
const giorniFa = (n: number) => new Date(ADESSO.getTime() - n * 86_400_000).toISOString()

const CREATI: Record<string, string> = { a: giorniFa(40), b: giorniFa(0.5), c: giorniFa(40), vecchio: giorniFa(200) }

function accessi(mappa: Record<string, string | null>, admin: string[] = []) {
  return async (uids: string[]) => new Map(uids.map((uid) => [uid, { ultimo: mappa[uid] ?? null, creato: CREATI[uid] ?? null, admin: admin.includes(uid) }]))
}

function spia(): { db: Firestore; letti: string[] } {
  const vero = getFirestore()
  const letti: string[] = []
  const db = {
    doc: (percorso: string) => { letti.push(percorso); return vero.doc(percorso) },
    collection: (percorso: string) => { letti.push(percorso); return vero.collection(percorso) },
    collectionGroup: (nome: string) => { letti.push(`gruppo:${nome}`); return vero.collectionGroup(nome) },
  } as unknown as Firestore
  return { db, letti }
}

describe('calcolaStatistiche', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('accounts/a', { salonId: 'a', role: 'titolare', email: 'a@b.it' })
    archivio.set('accounts/a2', { salonId: 'a', role: 'collaboratore', email: 'c@b.it' })
    archivio.set('accounts/b', { salonId: 'b', role: 'titolare', email: 'b@b.it' })
    archivio.set('accounts/senza', { salonId: 'senza', role: 'titolare', email: 's@b.it' })
    archivio.set('salons/a/dogs/d1', { nome: 'Rex' })
    archivio.set('salons/a/appointments/v1', { start: IERI })
    archivio.set('salons/a/appointments/v2', { start: IERI + 1000 })
    archivio.set('salons/a/appointments/v3', { start: IERI - 3 * 86_400_000 })
    archivio.set('salons/b/dogs/d1', { nome: 'Fido' })
    archivio.set('salons/a/interesse/piano-plus', { at: 'x' })
    archivio.set('salons/b/interesse/piano-salone', { at: 'x' })
    archivio.set('salons/a/pro/main', { piano: 'pro', stato: 'attivo' })
    // Esclusi
    archivio.set('accounts/shared1', { salonId: 'shared', role: 'titolare', email: 'x@b.it' })
    archivio.set('accounts/laura', { salonId: 'laura', role: 'titolare', email: 'laura.masala@tiscali.it' })
    archivio.set('accounts/rob', { salonId: 'laura', role: 'socio', email: 'r@b.it' })
    archivio.set('salons/laura/dogs/d1', { nome: 'Vero' })
    archivio.set('accounts/finto', { salonId: 'finto', role: 'titolare', email: 'salone1@test.groomly' })
    archivio.set('salons/finto/dogs/d1', { nome: 'Finto' })
    archivio.set('accounts/vip', { salonId: 'vip', role: 'titolare', email: 'v@b.it' })
    archivio.set('salons/vip/pro/main', { vip: true, piano: 'salone', stato: 'attivo', fonte: 'omaggio' })
    archivio.set('salons/vip/dogs/d1', { nome: 'Vip' })
    archivio.set('accounts/admin', { salonId: '', role: 'titolare', email: 'admin@b.it' })
  })

  const ULTIMI = { a: giorniFa(0.5), a2: giorniFa(20), b: giorniFa(3) }

  it('conta solo i saloni veri', async () => {
    const { db } = spia()
    const riga = await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi(ULTIMI) })
    expect(riga).toMatchObject({
      giorno: '2026-11-04', saloni: 3, nuovi: 1, attivi1: 1, attivi7: 2, attivi30: 2, attivati: 1,
      appuntamenti: 2, mediaAppuntamenti: 2, avvisami: { plus: 1, salon: 1 }, esclusi: 4,
    })
  })

  it('di shared, Laura e dei saloni finti non legge nulla', async () => {
    const { db, letti } = spia()
    const uids: string[][] = []
    await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: async (lista) => { uids.push(lista); return new Map() } })
    expect(letti.filter((percorso) => /salons?\/(shared|laura|finto)/.test(percorso))).toEqual([])
    expect(letti.filter((percorso) => percorso.startsWith('gruppo:'))).toEqual([])
    expect(uids.flat()).not.toContain('laura')
  })

  it('di un salone con un admin non legge nulla', async () => {
    archivio.set('accounts/op', { salonId: 'op', role: 'titolare', email: 'op@b.it' })
    archivio.set('salons/op/dogs/d1', { nome: 'Vecchio' })
    const { db, letti } = spia()
    const riga = await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi({}, ['op']) })
    expect(letti.filter((percorso) => percorso.includes('salons/op'))).toEqual([])
    expect(riga.saloni).toBe(3)
    expect(riga.esclusi).toBe(5)
  })

  it('di un VIP legge solo pro/main', async () => {
    const { db, letti } = spia()
    await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi({}) })
    expect(letti.filter((percorso) => percorso.includes('salons/vip'))).toEqual(['salons/vip/pro/main'])
  })

  it('nel documento non restano id, email o nomi', async () => {
    const { db } = spia()
    const testo = JSON.stringify(await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi(ULTIMI) }))
    for (const parola of ['a@b.it', 'Rex', '"a"', '"b"', 'laura']) expect(testo).not.toContain(parola)
  })

  it('le coorti contano chi è tornato dopo 7 e 30 giorni', async () => {
    archivio.set('accounts/a', { salonId: 'a', role: 'titolare', email: 'a@b.it' })
    archivio.set('accounts/c', { salonId: 'c', role: 'titolare', email: 'c2@b.it' })
    const { db } = spia()
    const riga = await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi({ a: giorniFa(1), c: giorniFa(35) }) })
    const coorte = riga.coorti.find((voce) => voce.saloni === 2)
    expect(coorte).toEqual({ settimana: '2026-09-21', saloni: 2, rimasti7: 1, rimasti30: 1 })
  })

  it('tiene al massimo 12 settimane', async () => {
    archivio.set('accounts/vecchio', { salonId: 'vecchio', role: 'titolare', email: 'o@b.it' })
    const { db } = spia()
    const riga = await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi({}) })
    expect(riga.coorti.length).toBeLessThanOrEqual(12)
    expect(riga.coorti.every((voce) => voce.settimana >= '2026-08-10')).toBe(true)
  })

  it('un salone senza data di registrazione non ferma il calcolo', async () => {
    const { db } = spia()
    const riga = await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi({}) })
    expect(riga.saloni).toBe(3)
    expect(riga.coorti.reduce((somma, voce) => somma + voce.saloni, 0)).toBe(2)
  })

  it('il giorno del cambio d’ora conta tutte le 25 ore', async () => {
    archivio.set('salons/a/appointments/v4', { start: new Date('2026-10-25T22:30:00.000Z').getTime() })
    const { db } = spia()
    const riga = await calcolaStatistiche({ db, adesso: new Date('2026-10-26T02:30:00.000Z'), infoPersone: accessi({}) })
    expect(riga.giorno).toBe('2026-10-25')
    expect(riga.appuntamenti).toBe(1)
  })

  it('rieseguirla sovrascrive lo stesso giorno', async () => {
    const { db } = spia()
    const riga = await calcolaStatistiche({ db, adesso: ADESSO, infoPersone: accessi({}) })
    await salvaStatistiche(getFirestore(), riga)
    await salvaStatistiche(getFirestore(), { ...riga, saloni: 99 })
    expect(archivio.get('statsGiornaliere/2026-11-04')?.saloni).toBe(99)
  })
})

describe('pulisciRegistroAdmin', () => {
  it('cancella oltre 24 mesi e tiene il resto', async () => {
    archivio.clear()
    archivio.set('adminLog/vecchia', { quando: '2024-11-01T00:00:00.000Z' })
    archivio.set('adminLog/recente', { quando: '2024-11-10T00:00:00.000Z' })
    const tolte = await pulisciRegistroAdmin(getFirestore(), ADESSO)
    expect(tolte).toBe(1)
    expect(archivio.has('adminLog/vecchia')).toBe(false)
    expect(archivio.has('adminLog/recente')).toBe(true)
  })
})
