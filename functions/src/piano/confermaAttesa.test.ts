import type { Firestore } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { confermaAttesaPer } from './confermaAttesa'

// Un Firestore in memoria con quanto serve alla conferma: documenti, collezioni, where '==' e transazioni
// che si mettono in fila, come i tentativi veri quando due richieste toccano gli stessi documenti.
type Dati = Record<string, unknown>

function memoria(iniziale: Record<string, Dati>) {
  const store = new Map<string, Dati>(Object.entries(iniziale))
  let contatore = 0
  let coda: Promise<unknown> = Promise.resolve()

  const snap = (path: string) => {
    const dati = store.get(path)
    return {
      id: path.split('/').pop() as string,
      exists: dati !== undefined,
      ref: ref(path),
      data: () => (dati ? structuredClone(dati) : undefined),
      get: (campo: string) => dati?.[campo],
    }
  }
  const ref = (path: string) => ({ path, id: path.split('/').pop() as string, get: async () => snap(path) })
  const interroga = (path: string, filtri: [string, unknown][], max: number) => ({
    where: (campo: string, _op: string, valore: unknown) => interroga(path, [...filtri, [campo, valore]], max),
    limit: (n: number) => interroga(path, filtri, n),
    doc: (id?: string) => ref(`${path}/${id ?? `auto${++contatore}`}`),
    get: async () => {
      const docs = [...store.keys()]
        .filter((chiave) => chiave.startsWith(`${path}/`) && !chiave.slice(path.length + 1).includes('/'))
        .filter((chiave) => filtri.every(([campo, valore]) => store.get(chiave)?.[campo] === valore))
        .slice(0, max)
        .map((chiave) => snap(chiave))
      return { docs, empty: docs.length === 0 }
    },
  })
  const db = {
    doc: (path: string) => ref(path),
    collection: (path: string) => interroga(path, [], Infinity),
    runTransaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const giro = coda.then(async () => {
        const scritture: (() => void)[] = []
        const tx = {
          get: (cosa: { path: string, get: () => Promise<unknown> }) => cosa.get(),
          set: (r: { path: string }, dati: Dati, opzioni?: { merge?: boolean }) => {
            scritture.push(() => store.set(r.path, opzioni?.merge ? { ...(store.get(r.path) ?? {}), ...dati } : structuredClone(dati)))
          },
          update: (r: { path: string }, dati: Dati) => {
            scritture.push(() => store.set(r.path, { ...(store.get(r.path) ?? {}), ...dati }))
          },
        }
        const risultato = await fn(tx)
        scritture.forEach((scrivi) => scrivi())
        return risultato
      })
      coda = giro.catch(() => undefined)
      return giro
    },
  }
  const elenco = (path: string) => [...store.keys()].filter((chiave) => chiave.startsWith(`${path}/`)).map((chiave) => ({ id: chiave.slice(path.length + 1), ...store.get(chiave) as Dati }))
  return { db: db as unknown as Firestore, store, elenco }
}

const TOKEN = 'ab'.repeat(32)
const INIZIO = '2026-11-04T09:00:00.000Z'
const ADESSO = new Date('2026-11-04T08:00:00.000Z')
const BASE = 'salons/s1'

function salone(extra: Record<string, Dati> = {}, modo = 'manuale') {
  return memoria({
    [`${BASE}/settings/main`]: { serviziEmail: { attesa: { modo } } },
    [`${BASE}/appointments/v1`]: { id: 'v1', dogId: 'd0', start: Date.parse(INIZIO), end: Date.parse(INIZIO) + 3_600_000, status: 'disdetto', services: [] },
    [`${BASE}/buchiAttesa/v1`]: { appointmentId: 'v1', inizio: INIZIO, nomeCane: 'Luna' },
    [`${BASE}/offerteAttesa/attesa:v1:i1`]: { token: TOKEN, appointmentId: 'v1', iscrittoId: 'i1', inizio: INIZIO, inviataIl: '2026-11-04T07:00:00.000Z' },
    [`${BASE}/attesa/i1`]: {
      attivo: true, nome: 'Mario', phone: '+3900000000', email: 'm@example.com', nomeCane: 'Rex', specie: 'cane', taglia: 'media',
      servizioId: 'bagno', trattamento: 'Bagno', durataMin: 60, creatoIl: '2026-11-01T10:00:00.000Z',
    },
    [`${BASE}/services/bagno`]: { name: 'Bagno', price: { piccola: 20, media: 30, grande: 40 } },
    ...extra,
  })
}

const conferma = (db: Firestore, azione: 'leggi' | 'conferma' | 'rifiuta' | 'resta' | 'esci', adesso = ADESSO, token = TOKEN) =>
  confermaAttesaPer({ salonId: 's1', token, azione, adesso }, db)

describe('confermaAttesaPer', () => {
  it('conferma con il posto libero scrive la visita, toglie l’iscritto e lascia l’avviso', async () => {
    const { db, store, elenco } = salone()
    const esito = await conferma(db, 'conferma')
    expect(esito.ok && esito.esito === 'confermato').toBe(true)
    const nuove = elenco(`${BASE}/appointments`).filter((visita) => visita.id !== 'v1')
    expect(nuove).toHaveLength(1)
    const visita = nuove[0]
    expect(visita).toMatchObject({
      status: 'programmato',
      start: Date.parse(INIZIO),
      end: Date.parse(INIZIO) + 60 * 60_000,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 30 }],
    })
    expect(esito).toMatchObject({ appointmentId: visita.id, dogId: visita.dogId })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(false)
    const avvisi = elenco(`${BASE}/avvisiAttesa`)
    expect(avvisi).toHaveLength(1)
    expect(avvisi[0]).toMatchObject({ cane: 'Rex', trattamento: 'Bagno', altro: 'Luna', giorno: '2026-11-04' })
    const cani = elenco(`${BASE}/dogs`)
    expect(cani).toHaveLength(1)
    expect(cani[0]).toMatchObject({ id: visita.dogId, name: 'Rex', species: 'cane', size: 'media' })
  })

  it('due conferme dello stesso token: la seconda trova occupato e non scrive un’altra visita', async () => {
    const { db, elenco } = salone()
    const prima = await conferma(db, 'conferma')
    const seconda = await conferma(db, 'conferma')
    expect(prima).toMatchObject({ ok: true, esito: 'confermato' })
    expect(seconda).toEqual({ ok: true, esito: 'occupato' })
    expect(elenco(`${BASE}/appointments`).filter((visita) => visita.id !== 'v1')).toHaveLength(1)
    expect(elenco(`${BASE}/dogs`)).toHaveLength(1)
    expect(elenco(`${BASE}/avvisiAttesa`)).toHaveLength(1)
  })

  it('due conferme insieme: una visita sola', async () => {
    const { db, elenco } = salone()
    const [a, b] = await Promise.all([conferma(db, 'conferma'), conferma(db, 'conferma')])
    expect([a, b].filter((esito) => esito.ok && esito.esito === 'confermato')).toHaveLength(1)
    expect([a, b].filter((esito) => esito.ok && esito.esito === 'occupato')).toHaveLength(1)
    expect(elenco(`${BASE}/appointments`).filter((visita) => visita.id !== 'v1')).toHaveLength(1)
  })

  it('stessa email e stesso nome del cane, dopo trim: usa il cane che c’è e non ne crea un altro', async () => {
    const { db, elenco } = salone({
      [`${BASE}/dogs/gia`]: { id: 'gia', name: ' Rex ', contact: { name: 'Mario', phone: '1', email: ' m@example.com ' }, status: 'attivo' },
      [`${BASE}/dogs/altro`]: { id: 'altro', name: 'rex', contact: { name: 'Mario', phone: '1', email: 'm@example.com' }, status: 'attivo' },
    })
    const esito = await conferma(db, 'conferma')
    expect(esito).toMatchObject({ ok: true, esito: 'confermato', dogId: 'gia' })
    expect(elenco(`${BASE}/dogs`)).toHaveLength(2)
    expect(elenco(`${BASE}/appointments`).find((visita) => visita.id !== 'v1')).toMatchObject({ dogId: 'gia' })
  })

  it('rifiuta lascia attivo e non scrive, resta lascia attivo, esci spegne', async () => {
    const { db, store, elenco } = salone()
    expect(await conferma(db, 'rifiuta')).toEqual({ ok: true, esito: 'rifiutato' })
    expect(await conferma(db, 'resta')).toEqual({ ok: true, esito: 'restato' })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(true)
    expect(elenco(`${BASE}/appointments`)).toHaveLength(1)
    expect(elenco(`${BASE}/avvisiAttesa`)).toHaveLength(0)
    expect(await conferma(db, 'esci')).toEqual({ ok: true, esito: 'uscito' })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(false)
  })

  it('leggi non scrive niente e dice libero', async () => {
    const { db, store } = salone()
    const prima = JSON.stringify([...store.entries()])
    expect(await conferma(db, 'leggi')).toEqual({ ok: true, esito: 'visto', motivo: 'libero' })
    expect(JSON.stringify([...store.entries()])).toBe(prima)
  })

  it('token sconosciuto: errore token, e un id salone strano non legge niente', async () => {
    const { db } = salone()
    expect(await conferma(db, 'leggi', ADESSO, 'cd'.repeat(32))).toEqual({ ok: false, errore: 'token' })
    expect(await conferma(db, 'conferma', ADESSO, 'corto')).toEqual({ ok: false, errore: 'token' })
    expect(await confermaAttesaPer({ salonId: 'a/b', token: TOKEN, azione: 'leggi', adesso: ADESSO }, db)).toEqual({ ok: false, errore: 'token' })
  })

  it('servizio spento: errore spento e nessuna scrittura', async () => {
    const { db, store, elenco } = salone({}, 'spento')
    expect(await conferma(db, 'conferma')).toEqual({ ok: false, errore: 'spento' })
    expect(await conferma(db, 'leggi')).toEqual({ ok: false, errore: 'spento' })
    expect(store.get(`${BASE}/attesa/i1`)?.attivo).toBe(true)
    expect(elenco(`${BASE}/appointments`)).toHaveLength(1)
  })

  it('la durata sfora il prossimo appuntamento: conferma dice occupato senza visita, leggi dice non_ci_sta', async () => {
    const { db, elenco } = salone({
      [`${BASE}/appointments/dopo`]: { id: 'dopo', dogId: 'd9', start: Date.parse(INIZIO) + 30 * 60_000, end: Date.parse(INIZIO) + 90 * 60_000, status: 'programmato', services: [] },
    })
    expect(await conferma(db, 'leggi')).toEqual({ ok: true, esito: 'visto', motivo: 'non_ci_sta' })
    expect(await conferma(db, 'conferma')).toEqual({ ok: true, esito: 'occupato' })
    expect(elenco(`${BASE}/appointments`)).toHaveLength(2)
    expect(elenco(`${BASE}/dogs`)).toHaveLength(0)
  })

  it('un altro cliente ha preso l’ora, oppure l’ora è passata: leggi lo dice', async () => {
    const preso = salone({
      [`${BASE}/appointments/altro`]: { id: 'altro', dogId: 'd9', start: Date.parse(INIZIO), end: Date.parse(INIZIO) + 3_600_000, status: 'programmato', services: [] },
    })
    expect(await conferma(preso.db, 'leggi')).toEqual({ ok: true, esito: 'visto', motivo: 'occupato' })
    expect(await conferma(preso.db, 'rifiuta')).toEqual({ ok: true, esito: 'visto', motivo: 'occupato' })
    const passato = salone()
    expect(await conferma(passato.db, 'leggi', new Date('2026-11-04T09:30:00.000Z'))).toEqual({ ok: true, esito: 'visto', motivo: 'passato' })
    expect(await conferma(passato.db, 'conferma', new Date('2026-11-04T09:30:00.000Z'))).toEqual({ ok: true, esito: 'occupato' })
    expect(passato.elenco(`${BASE}/appointments`)).toHaveLength(1)
  })

  it('esci vale anche con l’ora presa, e un iscritto già uscito con l’ora libera trova uscito', async () => {
    const preso = salone({
      [`${BASE}/appointments/altro`]: { id: 'altro', dogId: 'd9', start: Date.parse(INIZIO), end: Date.parse(INIZIO) + 3_600_000, status: 'programmato', services: [] },
    })
    expect(await conferma(preso.db, 'esci')).toEqual({ ok: true, esito: 'uscito' })
    expect(preso.store.get(`${BASE}/attesa/i1`)?.attivo).toBe(false)
    const uscito = salone({ [`${BASE}/attesa/i1`]: { attivo: false, nome: 'Mario', nomeCane: 'Rex', email: 'm@example.com', servizioId: 'bagno', trattamento: 'Bagno', durataMin: 60 } })
    expect(await conferma(uscito.db, 'conferma')).toEqual({ ok: true, esito: 'uscito' })
    expect(uscito.elenco(`${BASE}/appointments`)).toHaveLength(1)
  })
})
