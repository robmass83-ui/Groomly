import type { Firestore } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { slugRiservato } from '../../../src/lib/slug'
import { MAX_LINK_SALONE, registraSlug, slugDalSalone } from './pubblici'

type Dati = Record<string, unknown>

// Un Firestore in memoria con quanto serve a registraSlug: documenti di pubblici, una query per salonId e le transazioni.
function memoria(iniziale: Record<string, Dati> = {}) {
  const store = new Map<string, Dati>(Object.entries(iniziale))
  const snap = (path: string) => {
    const dati = store.get(path)
    return { id: path.split('/').pop() as string, ref: { path }, exists: dati !== undefined, data: () => (dati ? { ...dati } : undefined) }
  }
  const doc = (path: string) => ({ path, get: async () => snap(path) })
  const query = (campo: string, valore: unknown) => ({
    query: true,
    righe: () => [...store.keys()].filter((k) => k.startsWith('pubblici/') && store.get(k)?.[campo] === valore).map(snap),
  })
  const db = {
    doc,
    collection: () => ({ where: (campo: string, _op: string, valore: unknown) => query(campo, valore) }),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      const scritture: Array<() => void> = []
      const esito = await fn({
        get: async (r: { path?: string, query?: boolean, righe?: () => unknown[] }) => (r.query ? { docs: r.righe!() } : snap(r.path!)),
        set: (r: { path: string }, dati: Dati) => { scritture.push(() => store.set(r.path, { ...dati })) },
        delete: (r: { path: string }) => { scritture.push(() => store.delete(r.path)) },
      })
      scritture.forEach((scrivi) => scrivi())
      return esito
    },
  }
  const suoi = (salonId: string) => [...store.entries()].filter(([, v]) => v.salonId === salonId).map(([k]) => k.slice('pubblici/'.length)).sort()
  return { db: db as unknown as Firestore, store, suoi }
}

const giorno = (n: number) => new Date(Date.UTC(2026, 10, n))

describe('nomi riservati', () => {
  it('Groomly e le sue pagine non sono di nessun salone', () => {
    for (const nome of ['groomly', 'groomly-app', 'groom-ly', 'assistenza', 'admin', 'supporto', 'privacy']) expect(slugRiservato(nome), nome).toBe(true)
    for (const nome of ['canespa', 'pelosetti', 'toelettatura-groom']) expect(slugRiservato(nome), nome).toBe(false)
  })

  it('registraSlug li rifiuta come nome già preso', async () => {
    const { db, store } = memoria()
    await expect(registraSlug('s1', 'Groomly', db)).rejects.toThrow()
    await expect(registraSlug('s1', 'Assistenza', db)).rejects.toThrow()
    expect(store.size).toBe(0)
  })
})

describe('registraSlug: pochi link per salone', () => {
  it('dieci cambi di nome lasciano al salone solo gli ultimi link, e i nomi vecchi tornano liberi', async () => {
    const { db, suoi } = memoria()
    for (let i = 1; i <= 10; i += 1) await registraSlug('s1', `Salone ${i}`, db, giorno(i))
    expect(suoi('s1')).toHaveLength(MAX_LINK_SALONE)
    expect(suoi('s1')).toEqual(['salone-10', 'salone-8', 'salone-9'])
    expect(await registraSlug('s2', 'Salone 1', db, giorno(20))).toEqual({ slug: 'salone-1' })
  })

  it('i link senza data (di prima del limite) se ne vanno per primi', async () => {
    const { db, suoi } = memoria({
      'pubblici/vecchio-a': { salonId: 's1', slug: 'vecchio-a' },
      'pubblici/vecchio-b': { salonId: 's1', slug: 'vecchio-b' },
      'pubblici/recente': { salonId: 's1', slug: 'recente', creatoIl: giorno(1).toISOString() },
    })
    await registraSlug('s1', 'Nuovo', db, giorno(2))
    expect(suoi('s1')).toHaveLength(MAX_LINK_SALONE)
    expect(suoi('s1')).toContain('nuovo')
    expect(suoi('s1')).toContain('recente')
  })

  it('un nome già suo non scrive nulla e non toglie altri link', async () => {
    const { db, store, suoi } = memoria()
    await registraSlug('s1', 'Uno', db, giorno(1))
    await registraSlug('s1', 'Due', db, giorno(2))
    const prima = new Map(store)
    expect(await registraSlug('s1', 'Uno', db, giorno(3))).toEqual({ slug: 'uno' })
    expect(store).toEqual(prima)
    expect(suoi('s1')).toEqual(['due', 'uno'])
  })

  it('il nome di un altro salone porta al numero, come prima', async () => {
    const { db } = memoria({ 'pubblici/canespa': { salonId: 'altro', slug: 'canespa' } })
    expect(await registraSlug('s1', 'CaneSpa', db, giorno(1))).toEqual({ slug: 'canespa-2' })
    expect(await registraSlug('s1', 'Canespa', db, giorno(2))).toEqual({ slug: 'canespa-2' })
  })

  it('slugDalSalone usa le stesse regole', async () => {
    const { db, suoi } = memoria()
    await slugDalSalone('s1', 'Groomly ufficiale', db)
    expect(suoi('s1')).toEqual([])
    await slugDalSalone('s1', 'Pelosi', db)
    expect(suoi('s1')).toEqual(['pelosi'])
  })
})
